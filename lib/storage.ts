// لایه داده — برای مهمان‌ها (لاگین‌نکرده) روی localStorage کار می‌کند، و برای
// کاربرهای لاگین‌کرده به API واقعی (Prisma/Postgres) وصل می‌شود. هر تابع
// اول وضعیت session رو چک می‌کنه؛ بقیه کد اپ (کامپوننت‌ها) اصلا نمی‌دونن
// داده از کجا میاد — همون قراردادی که از اول قرار بود برقرار بمونه.

import { getSession } from "next-auth/react";
import { takePreloaded, getPreloadedBootstrap, clearPreloadedBootstrap } from "./preload";
import { BOOTSTRAP_SETTING_KEYS } from "./userSettingKeys";
import type { SleepRecord } from "./sleep";
import { ALL, broadcast, keyMatches, publishLocal, registerInvalidator, reportLiveError } from "./liveSync";

const PREFIX = "panelMohammad:";

function hasLocalStorage() {
  try {
    const k = "__test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// کش/دیدوپ درخواست‌ها — دلیل اصلی کندی لود سایت همین‌جا بود.
//
// اندازه‌گیری واقعی (لود /weekly، کاربر لاگین‌کرده) قبل از این تغییر:
//   ۳۵ درخواست API برای یک بار باز کردن صفحه —
//   /api/auth/session ×۶ · settings/removedOccurrences ×۶ ·
//   settings/customOccurrences ×۶ · tasks/daily/range ×۵ (یکیشون
//   دقیقا یک بازه‌ی تکراری، سه بار) · tasks/daily ×۳ · …
// چون خیلی از کامپوننت‌ها (NotificationEngine، useMyStreak، DashReminderCard،
// HistoryCalendar، getTodayStats و…) هرکدوم مستقلا همون چند تا کلید ثابت رو
// می‌خونن. روی مرورگر واقعی که هر هاست حداکثر ~۶ کانکشن همزمان داره، این
// یعنی صفحه چند «موج» پشت‌سرهم منتظر شبکه می‌مونه — دقیقا همون «دیر لود
// می‌شه / ناقص لود می‌شه».
//
// دو کش این‌جا اضافه شده:
//   ۱) وضعیت لاگین  ۲) پاسخ GETهای خواندنی (settings / daily / range)
// هردو با TTL کوتاه + دیدوپ درخواست در حال اجرا. نوشتن‌ها (setSetting/
// setDaily) کش رو write-through آپدیت می‌کنن، پس هیچ‌وقت داده‌ی بیات دیده
// نمی‌شه.
// ─────────────────────────────────────────────────────────────────────────

// TTL وضعیت لاگین — فقط باید انفجار فراخوانی‌های هم‌زمان لحظه‌ی mount رو
// جمع کنه. لاگین/لاگ‌اوت خودشون صریحا invalidateStorageCache() صدا می‌زنن،
// پس این عدد سقف «بیات موندن» نیست، فقط تور ایمنیه.
const SESSION_TTL_MS = 60_000;
// TTL پاسخ‌های خواندنی — به‌اندازه‌ای که کل موج mount یک صفحه (و پیمایش
// کلاینتی بلافاصله بعدش) داخلش جا بشه، و به‌اندازه‌ای کوتاه که داده‌ی
// عوض‌شده از یه تب دیگه خیلی زود دیده بشه.
const GET_TTL_MS = 15_000;

let sessionCache: { loggedIn: boolean; at: number } | null = null;
let inFlightSession: Promise<boolean> | null = null;

// وقتی SessionProvider وضعیت رو حل کرد، همین‌جا اعلامش می‌کنه (SessionBridge).
// هر خواندنی که در این فاصله منتظر مونده با همون بیدار می‌شه.
let sessionResolvers: ((loggedIn: boolean) => void)[] = [];

/**
 * پل بین SessionProvider و این لایه.
 *
 * چرا لازم بود: `getSession()` از next-auth/react هر بار یه فچ *تازه* به
 * `/api/auth/session` می‌زنه و از context SessionProvider نمی‌خونه. یعنی
 * هر لود صفحه دو بار همون اندپوینت رو می‌گرفت (یکی SessionProvider، یکی
 * این‌جا) و — مهم‌تر از تعداد — خواندن داده‌ها پشت فچ *دومی* منتظر می‌موند:
 * دو رفت‌وبرگشت سریالی قبل از این‌که اولین بایت داده‌ی واقعی درخواست بشه.
 * روی یه اتصال ۳۰۰ms این یعنی بیش از نیم ثانیه معطلی خالص.
 *
 * حالا SessionBridge (که داخل SessionProvider نشسته) نتیجه‌ی همون فچ اولیه
 * رو این‌جا می‌ذاره، و هیچ فچ دومی لازم نیست.
 */
export function publishSessionState(loggedIn: boolean) {
  sessionCache = { loggedIn, at: Date.now() };
  const waiting = sessionResolvers;
  sessionResolvers = [];
  for (const r of waiting) r(loggedIn);
}

// getSession() فقط به‌عنوان تور ایمنی می‌مونه: اگه به هر دلیلی SessionBridge
// مونت نشده باشه (مثلا یه مسیر رندر متفاوت)، این لایه نباید برای همیشه
// معطل بمونه.
const SESSION_BRIDGE_TIMEOUT_MS = 3000;

async function isLoggedIn(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const cached = sessionCache;
  if (cached && Date.now() - cached.at < SESSION_TTL_MS) return cached.loggedIn;
  if (!inFlightSession) {
    inFlightSession = new Promise<boolean>((resolve) => {
      sessionResolvers.push(resolve);
      setTimeout(() => {
        // هنوز خبری از پل نشده — خودمون می‌پرسیم
        if (sessionCache && Date.now() - sessionCache.at < SESSION_TTL_MS) return;
        getSession()
          .then((session) => publishSessionState(!!(session?.user as any)?.id))
          .catch(() => publishSessionState(false));
      }, SESSION_BRIDGE_TIMEOUT_MS);
    }).finally(() => { inFlightSession = null; });
  }
  return inFlightSession;
}

const getCache = new Map<string, { at: number; data: any }>();
const inFlightGets = new Map<string, Promise<any>>();

// سقفِ زمانیِ خواندن + تکرارِ خطای گذرا. قبلا درخواستی که جواب نمی‌گرفت (سرور وسطِ
// ری‌استارت/دیپلوی، شبکه‌ی موبایلِ قطع‌ووصل) تا ابد در inFlightGets می‌موند و چون
// دیدوپ می‌شد، تازه‌سازی‌های بعدی (focus/online/polling) هم پشتِ همون گیر می‌کردن —
// صفحه تا ریلودِ دستی روی «در حال بارگذاری» می‌موند. ۴xx و ۵۰۰ تکرار نمی‌شن (قطعی‌ان).
const READ_TIMEOUT_MS = 10_000;
const READ_RETRY_DELAYS_MS = [1_500, 4_000];

async function readJson(url: string): Promise<any | null> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS) : undefined;
    let transient = false;
    try {
      const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (res.ok) return await res.json();
      transient = res.status >= 502 && res.status <= 504;
    } catch {
      transient = true;
    } finally {
      clearTimeout(timer);
    }
    if (!transient || attempt >= READ_RETRY_DELAYS_MS.length) return null;
    await new Promise((r) => setTimeout(r, READ_RETRY_DELAYS_MS[attempt]));
  }
}

/**
 * GET کش‌شده و دیدوپ‌شده. همه‌ی صداهای هم‌زمان روی یک URL یک درخواست واحد
 * رو به اشتراک می‌ذارن، و تا GET_TTL_MS بعدش از کش جواب می‌گیرن.
 * خطا/پاسخ ناموفق کش نمی‌شه (تا یه قطعی لحظه‌ای، داده رو برای کل TTL خراب نکنه).
 */
async function cachedGet<T>(url: string, pick: (json: any) => T, fallback: T): Promise<T> {
  const hit = getCache.get(url);
  if (hit && Date.now() - hit.at < GET_TTL_MS) return pick(hit.data);

  let pending = inFlightGets.get(url);
  if (!pending) {
    // اگه اسکریپت inline layout این URL رو از قبل درخواست کرده، همون رو
    // برمی‌داریم — یعنی داده تقریبا یک رفت‌وبرگشت کامل زودتر آماده‌ست.
    const preloaded = takePreloaded(url);
    pending = (preloaded ?? readJson(url))
      .then((json: any) => {
        if (json !== null) getCache.set(url, { at: Date.now(), data: json });
        return json;
      })
      .catch(() => null)
      .finally(() => { inFlightGets.delete(url); });
    inFlightGets.set(url, pending);
  }

  const json = await pending;
  return json === null ? fallback : pick(json);
}

/** بعد از یک نوشتن موفق، پاسخ تازه رو مستقیم توی کش می‌ذاره (بدون رفت دوباره به سرور) */
function primeCache(url: string, data: any) {
  getCache.set(url, { at: Date.now(), data });
}

/** ورودی‌های کش خواندنی که با یک الگو جور در میان رو دور می‌ریزه */
function dropCache(predicate: (url: string) => boolean) {
  for (const key of Array.from(getCache.keys())) {
    if (predicate(key)) getCache.delete(key);
  }
}

/**
 * هر جا هویت کاربر عوض می‌شه (ورود/خروج) باید صدا زده بشه — وگرنه لایه‌ی
 * داده تا انقضای TTL فکر می‌کنه هنوز همون کاربر قبلی (یا مهمان) پشت خطه و
 * از منبع اشتباه (localStorage به‌جای API، یا داده‌ی کاربر قبلی) می‌خونه.
 * صفحه‌ی ورود بعد از signIn موفق، و منو/پنل کاربری قبل از signOut، صداش می‌زنن.
 */
export function invalidateStorageCache() {
  sessionCache = null;
  inFlightSession = null;
  sessionResolvers = [];
  getCache.clear();
  inFlightGets.clear();
  clearRangeCache();
  clearPreloadedBootstrap();
  pendingDaily.clear();
  pendingSettings.clear();
  staleBootstrapKeys.clear();
  bootstrapSettingsStale = false;
}

// ─────────────────────────────────────────────────────────────────────────
// لایه‌ی زنده (lib/liveSync.ts) — optimistic + هم‌گامی بین تب‌ها
//
// نوشتن‌ها دیگه منتظرِ شبکه نمی‌مونن: مقدارِ تازه همون لحظه توی یه «روکش»
// (pendingDaily/pendingSettings) می‌شینه و دامنه‌اش publish می‌شه، پس هر
// کامپوننتی که همون داده رو نشون می‌ده (حلقه‌ی پیشرفت، استریک، تقویم
// تاریخچه، …) همون لحظه از نو می‌خونه و مقدارِ تازه رو می‌بینه. تا وقتی
// درخواست در راهه، هر خواندنی (حتی از کش یا bootstrap یا یه فچِ قدیمی‌تر
// که دیرتر رسیده) از روکش جواب می‌گیره. اگه سرور رد کرد، روکش برداشته و
// کش دور ریخته می‌شه، دوباره publish می‌شه (یعنی UI به حالتِ واقعیِ سرور
// برمی‌گرده) و پیامِ خطا نشون داده می‌شه. موفق بود → به بقیه‌ی تب‌ها خبر.
//
// نوشتن‌های پشتِ‌سرهمِ یک کلید سریال می‌شن تا ترتیبشون روی سرور به‌هم نخوره.
// ─────────────────────────────────────────────────────────────────────────

const pendingDaily = new Map<string, DailyRecord>();
const pendingSettings = new Map<string, unknown>();
const writeQueues = new Map<string, Promise<unknown>>();

/** کلیدهای bootstrap که بعد از لود عوض شدن — دیگه مرجع نیستن */
const staleBootstrapKeys = new Set<string>();
let bootstrapSettingsStale = false;

function enqueueWrite<T>(queueKey: string, run: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(queueKey) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(run);
  const tail = next.catch(() => {});
  writeQueues.set(queueKey, tail);
  tail.then(() => { if (writeQueues.get(queueKey) === tail) writeQueues.delete(queueKey); });
  return next;
}

const SAVE_FAILED = "ذخیره نشد — تغییر برگردانده شد. اتصال را چک کن و دوباره امتحان کن";

function dailyUrl(dateKey: string) {
  return `/api/tasks/daily?date=${encodeURIComponent(dateKey)}`;
}

/** یک روز رو توی هر بازه‌ی کش‌شده‌ای که شاملشه write-through می‌کنه */
function patchRanges(dateKey: string, rec: DailyRecord) {
  for (const e of rangeEntries) {
    if (e.from <= dateKey && e.to >= dateKey) {
      e.data = e.data.then((d) => (d ? { ...d, [dateKey]: rec } : d));
    }
  }
}

// تغییری از *بیرون* (تب دیگه، سرور/WebSocket، برگشت به تب): کشِ خواندنیِ
// همون کلیدها دور ریخته می‌شه تا خواندنِ بعدی تازه از سرور بیاد. روکشِ
// نوشتن‌های در راه دست نمی‌خوره — اون‌ها هنوز تازه‌ترین حالتِ همین کاربرن.
if (typeof window !== "undefined") {
  registerInvalidator((keys) => {
    if (keys.includes(ALL)) {
      getCache.clear();
      clearRangeCache();
      bootstrapSettingsStale = true;
      return;
    }
    for (const k of keys) {
      if (keyMatches("daily", k)) {
        dropCache((url) => url.startsWith("/api/tasks/daily"));
        clearRangeCache();
        continue;
      }
      if (k.includes(":")) continue;
      dropCache((url) => url === settingsUrl(k));
      staleBootstrapKeys.add(k);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// کش بازه‌آگاه برای DailyEntry
//
// کش بالا کلیدش URLه، پس دو بازه‌ی *متفاوت* هیچ‌وقت به‌هم نمی‌رسن — حتی اگه
// یکی کاملا داخل اون یکی باشه. اندازه‌گیری روی `/weekly` نشون داد چهار
// درخواست هم‌پوشان از یک جدول می‌رفت:
//     range 2026-08-13..2026-08-27   (تایم‌لاین خود صفحه، ±۷ روز)
//     range 2026-05-22..2026-08-19   (useMyStreak، ۹۰ روز)
//     range 2026-08-15..2026-08-21   (آمار همین هفته)
//     daily 2026-08-20               (امروز — که *داخل* بازه‌ی اوله)
//
// این لایه بازه‌های درخواست‌شده رو نگه می‌داره و اگه بازه‌ی تازه زیرمجموعه‌ی
// یکی از اون‌ها باشه (چه رسیده باشه چه هنوز در راه)، از همون بریده می‌شه.
// تاریخ‌های `YYYY-MM-DD` از نظر رشته‌ای هم‌ترتیب زمانی‌ان، پس مقایسه‌ی ساده کافیه.
// ─────────────────────────────────────────────────────────────────────────

type RangeEntry = { from: string; to: string; at: number; data: Promise<Record<string, DailyRecord> | null> };

let rangeEntries: RangeEntry[] = [];

// بازه‌ی پهنی که اسکریپت inline از قبل گرفته، همون اولین باری که کسی
// سراغ DailyEntry میاد وارد کش پوشش‌محور می‌شه — بعدش هر زیربازه‌ای (و هر
// روز تکی) از همون بریده می‌شه، بدون هیچ درخواست تازه‌ای.
let preloadedRangeAdopted = false;
function adoptPreloadedRange() {
  if (preloadedRangeAdopted) return;
  preloadedRangeAdopted = true;
  const pre = getPreloadedBootstrap();
  if (!pre) return;
  const entry: RangeEntry = {
    from: pre.from,
    to: pre.to,
    at: Date.now(),
    data: pre.data.then((b) => (b?.dailyRange ? (b.dailyRange.entries as Record<string, DailyRecord>) : null)),
  };
  entry.data.then((d) => { if (d === null) rangeEntries = rangeEntries.filter((e) => e !== entry); });
  rangeEntries.push(entry);
}

function findCoveringRange(from: string, to: string): RangeEntry | null {
  adoptPreloadedRange();
  const now = Date.now();
  for (const e of rangeEntries) {
    if (e.from <= from && e.to >= to && now - e.at < GET_TTL_MS) return e;
  }
  return null;
}

function sliceRange(entries: Record<string, DailyRecord>, from: string, to: string): Record<string, DailyRecord> {
  const out: Record<string, DailyRecord> = {};
  for (const [k, v] of Object.entries(entries)) {
    if (k >= from && k <= to) out[k] = v;
  }
  return out;
}

function fetchRange(from: string, to: string): RangeEntry {
  const entry: RangeEntry = {
    from,
    to,
    at: Date.now(),
    data: readJson(`/api/tasks/daily/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((json) => (json ? ((json.entries || {}) as Record<string, DailyRecord>) : null))
      .catch(() => null),
  };
  // بازه‌ای که ناموفق بود نباید تا آخر TTL بقیه رو هم گمراه کنه
  entry.data.then((d) => { if (d === null) rangeEntries = rangeEntries.filter((e) => e !== entry); });
  rangeEntries.push(entry);
  return entry;
}

function clearRangeCache() {
  rangeEntries = [];
}

/** یک کلید رو از پاسخ bootstrap حذف می‌کنه تا دیگه از اون‌جا خونده نشه */
// (قبلا کلید رو از خودِ payload پاک می‌کرد؛ ولی getSetting برای کلیدهای
// bootstrap نبودنِ کلید رو «مقداری ذخیره نشده» تعبیر می‌کنه و fallback
// برمی‌گردوند — یعنی بعد از اولین نوشتن، مثلا لیست برنامه‌ها خالی خونده
// می‌شد. حالا فقط علامت می‌خوره که دیگه مرجع نیست و از کش/API خونده بشه.)
function forgetBootstrapSetting(key: string) {
  staleBootstrapKeys.add(key);
}

function settingsUrl(key: string) {
  return `/api/settings/${encodeURIComponent(key)}`;
}

export type DailyRecord = {
  tasks: Record<string, boolean>;
  wake: string | null;
};

export async function getDaily(dateKey: string): Promise<DailyRecord> {
  if (await isLoggedIn()) {
    const pending = pendingDaily.get(dateKey);
    if (pending) return pending;
    // اگه بازه‌ای که همین روز رو در بر می‌گیره از قبل درخواست شده، همون کافیه
    // — یه درخواست جدا برای یک روز داخل اون بازه فقط یه کانکشن اضافه‌ست.
    const covering = findCoveringRange(dateKey, dateKey);
    if (covering) {
      const data = await covering.data;
      if (data !== null) return data[dateKey] ?? { tasks: {}, wake: null };
    }
    return cachedGet<DailyRecord>(
      `/api/tasks/daily?date=${encodeURIComponent(dateKey)}`,
      (json) => ({ tasks: json?.tasks ?? {}, wake: json?.wake ?? null }),
      { tasks: {}, wake: null }
    );
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return { tasks: {}, wake: null };
  const raw = window.localStorage.getItem(PREFIX + "daily:" + dateKey);
  return raw ? JSON.parse(raw) : { tasks: {}, wake: null };
}

export async function setDaily(dateKey: string, data: DailyRecord): Promise<void> {
  const topic = "daily:" + dateKey;
  if (await isLoggedIn()) {
    // optimistic: همون لحظه همه‌جا دیده می‌شه
    pendingDaily.set(dateKey, data);
    publishLocal(topic);
    await enqueueWrite(topic, async () => {
      let ok = false;
      try {
        const res = await fetch("/api/tasks/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateKey, tasks: data.tasks, wake: data.wake }),
        });
        ok = res.ok;
      } catch {}
      const latest = pendingDaily.get(dateKey) === data;
      if (ok) {
        // write-through: خود روز و هر بازه‌ی کش‌شده‌ای که شاملشه
        primeCache(dailyUrl(dateKey), { tasks: data.tasks, wake: data.wake });
        patchRanges(dateKey, data);
        dropCache((url) => url === "/api/tasks/daily/keys");
        if (latest) pendingDaily.delete(dateKey);
        broadcast(topic);
        return;
      }
      // rollback — فقط اگه نوشتنِ تازه‌تری جاش ننشسته
      if (!latest) return;
      pendingDaily.delete(dateKey);
      dropCache((url) => url.startsWith("/api/tasks/daily"));
      clearRangeCache();
      publishLocal(topic);
      reportLiveError(SAVE_FAILED);
    });
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  try {
    window.localStorage.setItem(PREFIX + "daily:" + dateKey, JSON.stringify(data));
  } catch {
    reportLiveError("حافظه‌ی مرورگر پر است — تغییر ذخیره نشد");
  }
  // بقیه‌ی تب‌ها رویداد `storage` خودِ مرورگر رو می‌گیرن
  publishLocal(topic);
}

export async function listDailyKeys(): Promise<Set<string>> {
  if (await isLoggedIn()) {
    const keys = await cachedGet<Set<string>>(
      "/api/tasks/daily/keys",
      (json) => new Set<string>(json?.keys || []),
      new Set<string>()
    );
    pendingDaily.forEach((_v, k) => keys.add(k));
    return keys;
  }
  const keys = new Set<string>();
  if (typeof window === "undefined" || !hasLocalStorage()) return keys;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX + "daily:")) {
      keys.add(k.slice((PREFIX + "daily:").length));
    }
  }
  return keys;
}

/**
 * نسخه سریع getDaily برای یک بازه تاریخی — یک درخواست شبکه به‌جای N تا.
 * برای کاربر لاگین‌کرده از /api/tasks/daily/range استفاده می‌کنه؛ برای مهمان
 * (localStorage) از قبل سریع بود، فقط همون کلیدهای موجود رو می‌خونه.
 */
export async function getDailyRange(fromIso: string, toIso: string): Promise<Record<string, DailyRecord>> {
  return (await getDailyRangeStrict(fromIso, toIso)) ?? {};
}

/**
 * همون getDailyRange، ولی شکستِ شبکه/سرور رو به‌صورتِ null برمی‌گردونه (نه {}) —
 * برای جایی که «داده نیومد» باید از «هیچ روزی تیک نخورده» جدا باشه (نقشه‌ی
 * ثباتِ سالانه: {} یعنی همه‌ی روزها ۰٪ِ قرمز، که گمراه‌کننده‌ست).
 */
export async function getDailyRangeStrict(fromIso: string, toIso: string): Promise<Record<string, DailyRecord> | null> {
  if (await isLoggedIn()) {
    const covering = findCoveringRange(fromIso, toIso) ?? fetchRange(fromIso, toIso);
    let data = await covering.data;
    // اگه بازه‌ی پوشاننده شکست خورد، خودمون مستقیم می‌گیریم (نه اینکه خالی برگردونیم)
    if (data === null) data = await fetchRange(fromIso, toIso).data;
    if (data === null) return null;
    const out = sliceRange(data, fromIso, toIso);
    // نوشتن‌های در راه (optimistic) روی جوابِ سرور/کش می‌شینن
    pendingDaily.forEach((rec, k) => { if (k >= fromIso && k <= toIso) out[k] = rec; });
    return out;
  }
  const result: Record<string, DailyRecord> = {};
  if (typeof window === "undefined" || !hasLocalStorage()) return result;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX + "daily:")) {
      const dateKey = k.slice((PREFIX + "daily:").length);
      if (dateKey >= fromIso && dateKey <= toIso) {
        try {
          result[dateKey] = JSON.parse(window.localStorage.getItem(k) || "{}");
        } catch {}
      }
    }
  }
  return result;
}

// ---------- تنظیمات کلید-مقداری عمومی (تم، occurrenceهای حذف/اضافه‌شده) ----------

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (await isLoggedIn()) {
    if (pendingSettings.has(key)) return pendingSettings.get(key) as T;
    // اگه bootstrap این کلید رو آورده، همون کافیه — یه درخواست جدا برای
    // کلیدی که از قبل در پاسخ واحد اومده فقط یه رفت‌وبرگشت اضافه‌ست.
    // bootstrap یه لیست *مشخص* از کلیدها رو می‌خونه، پس برای همون‌ها پاسخش
    // مرجع کامله: نبودن کلید یعنی «مقداری ذخیره نشده»، نه «پرسیده نشده».
    // (اولش با hasOwnProperty چک می‌شد و همین باعث می‌شد کلیدی که کاربر
    // هیچ‌وقت مقداری براش ذخیره نکرده، بی‌خود یه درخواست جدا بزنه.)
    if (
      !bootstrapSettingsStale &&
      !staleBootstrapKeys.has(key) &&
      (BOOTSTRAP_SETTING_KEYS as readonly string[]).includes(key)
    ) {
      const boot = getPreloadedBootstrap();
      if (boot) {
        const payload = await boot.data;
        if (payload) return ((payload.settings[key] ?? fallback) as T);
      }
    }
    return cachedGet<T>(settingsUrl(key), (json) => (json?.value ?? fallback) as T, fallback);
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return fallback;
  const raw = window.localStorage.getItem(PREFIX + "settings:" + key);
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * نسخه‌ی «موفقیت واقعی» — setSetting معمولی هر خطایی (شبکه، ۴۰۰، ۵۰۰) رو
 * silently می‌بلعد (طراحی عمدی برایِ تنظیماتِ کم‌اهمیتی مثلِ تم/فیلترها که
 * شکستِ بی‌صدا بهتر از قطع‌کردنِ کاربره)، ولی برای چیزی مثلِ داروها که
 * واقعاً داده‌ی کاربره، این بی‌صدایی یعنی «ثبت شد» نشان داده می‌شه درحالی‌که
 * چیزی ذخیره نشده. این تابع همون مسیر رو می‌ره ولی res.ok و پیامِ خطای
 * سرور رو واقعاً برمی‌گردونه.
 */
export async function setSettingChecked<T>(key: string, value: T): Promise<{ ok: true } | { ok: false; error: string }> {
  return writeSetting(key, value, false);
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await writeSetting(key, value, true);
}

/**
 * مسیرِ مشترکِ نوشتنِ تنظیمات. optimistic: مقدار همون لحظه خونده/دیده می‌شه؛
 * اگه سرور رد کرد برمی‌گرده. `toastOnError`: setSetting معمولی خطا رو به
 * صدازننده برنمی‌گردونه، پس پیامش سراسری نشون داده می‌شه؛ setSettingChecked
 * خطا رو برمی‌گردونه و خودِ صدازننده نشونش می‌ده.
 */
async function writeSetting<T>(key: string, value: T, toastOnError: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isLoggedIn()) {
    pendingSettings.set(key, value);
    publishLocal(key);
    return enqueueWrite(`setting:${key}`, async () => {
      let error: string | null = null;
      try {
        const res = await fetch(settingsUrl(key), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          error = data?.error || `ذخیره ناموفق بود (کد ${res.status})`;
        }
      } catch {
        error = "ارتباط با سرور برقرار نشد — اتصال اینترنت را چک کن";
      }
      const latest = pendingSettings.get(key) === value;
      if (!error) {
        primeCache(settingsUrl(key), { value });
        // پاسخ bootstrap مقدار قدیمی همین کلید رو داره؛ بعد نوشتن دیگه
        // نباید مرجع باشه، وگرنه خواندن بعدی مقدار بیات می‌گیره.
        forgetBootstrapSetting(key);
        if (latest) pendingSettings.delete(key);
        broadcast(key);
        return { ok: true as const };
      }
      if (latest) {
        pendingSettings.delete(key);
        dropCache((url) => url === settingsUrl(key));
        publishLocal(key);
        if (toastOnError) reportLiveError(SAVE_FAILED);
      }
      return { ok: false as const, error };
    });
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return { ok: false, error: "ذخیره‌سازی در این مرورگر در دسترس نیست" };
  try {
    window.localStorage.setItem(PREFIX + "settings:" + key, JSON.stringify(value));
  } catch {
    if (toastOnError) reportLiveError("حافظه‌ی مرورگر پر است — تغییر ذخیره نشد");
    return { ok: false, error: "حافظه‌ی مرورگر پر است" };
  }
  publishLocal(key);
  return { ok: true };
}

/**
 * وقتی *سرور* یک تنظیم را عوض کرده (نه این کلاینت) — مثلا دستیارِ روتین که
 * برنامه‌ها را سمتِ سرور می‌نویسد — مقدارِ تازه را مستقیم توی کش می‌نشاند.
 *
 * بدونِ این، خواندنِ بعدی تا انقضای TTL (یا تا وقتی پاسخِ bootstrap مرجع
 * است) مقدارِ *قدیمی* را می‌داد و کاربر تغییری که همین الان اعمال شده را
 * نمی‌دید — یعنی «انجام شد» می‌گفتیم و صفحه هنوز حالتِ قبل را نشان می‌داد.
 */
export function primeSettingCache<T>(key: string, value: T): void {
  primeCache(settingsUrl(key), { value });
  forgetBootstrapSetting(key);
  publishLocal(key);
  broadcast(key);
}

export async function getRemovedOccurrences(): Promise<string[]> {
  return getSetting<string[]>("removedOccurrences", []);
}
export async function setRemovedOccurrences(arr: string[]): Promise<void> {
  return setSetting("removedOccurrences", arr);
}

// میزان حساسیت/اهمیت هر برنامه — چهار سطح، پیش‌فرض «کم» (رکوردهای قدیمی که
// این فیلد رو ندارن هم همینطور رفتار می‌کنن). فقط موارد «زیاد»/«خیلی زیاد»
// توی بخش «یادآوری‌ها»ی داشبورد نشون داده می‌شن.
export type Importance = "low" | "medium" | "high" | "veryHigh";
export const IMPORTANCE_LABELS: Record<Importance, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  veryHigh: "خیلی زیاد",
};

export type CustomOccurrence = {
  id: string;
  name: string;
  jsDay: number;
  time: string;
  startDate?: string; // ISO (YYYY-MM-DD) — روزی که برنامه ثبت شده؛ نبودش (آیتم‌های قدیمی) یعنی همیشه اعمال بشه
  endDate?: string;
  importance?: Importance;
  tag?: string;
  notify?: boolean; // false یعنی صریحا خاموش‌شده؛ نبودش (undefined) یعنی روشن
  /**
   * اگر این برنامه از یک رودمپ ساخته شده باشد، شناسه‌ی همان رودمپ. با همین
   * فیلد، کلیک روی برنامه در «روتین من» به‌جای کارتِ معمولی، مستقیم صفحه‌ی
   * جلسه‌های همان مسیر را باز می‌کند.
   */
  roadmapId?: string;
  /** آینه‌ی یک برنامه‌ی ROUTINEِ منتور (lib/mentorProgramMirror.ts) — فقط سرور می‌سازه/حذفش می‌کنه */
  mentorProgramId?: string;
  /** آیتمِ همان برنامه‌ی منتور؛ ویرایش/جابه‌جایی باید نگهش دارد تا تیک به پیشرفتِ خودکارِ همان آیتم برسد */
  mentorItemId?: string;
  /**
   * برنامه‌ی «لیستی»: آیتم‌های زیرمجموعه که تک‌تک تیک می‌خورن (lib/routineChecklist.ts).
   * تیکِ هر آیتم کلیدِ `${id}~${itemId}` در DailyRecord.tasks داره و کلیدِ خودِ
   * برنامه همیشه = «همه‌ی آیتم‌ها انجام شدن».
   */
  items?: { id: string; name: string }[];
};

export async function getCustomOccurrences(): Promise<CustomOccurrence[]> {
  return getSetting<CustomOccurrence[]>("customOccurrences", []);
}
export async function setCustomOccurrences(arr: CustomOccurrence[]): Promise<void> {
  return setSetting("customOccurrences", arr);
}

export async function getThemeSetting(): Promise<"dark" | "light" | null> {
  return getSetting<"dark" | "light" | null>("theme", null);
}
export async function setThemeSetting(value: "dark" | "light"): Promise<void> {
  // یک کوکی هم می‌نویسیم (علاوه بر localStorage/DB) — چون کوکی، برخلاف اون دوتا،
  // سمت سرور توی layout.tsx هم قابل‌خوندنه؛ همین باعث می‌شه data-theme از همون
  // اولین HTML سرور درست باشه، نه این‌که با یه تاخیر (بعد از resolve شدن
  // getThemeSetting سمت کلاینت) یهو از تاریک به روشن (یا برعکس) عوض بشه.
  if (typeof document !== "undefined") {
    // روی https فلگِ Secure هم می‌گیرد تا روی یک درخواستِ اتفاقیِ http لو
    // نرود — این کوکی حساس نیست، ولی بی‌دلیل هم نباید cleartext برود.
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
    document.cookie = `theme=${value}; path=/; max-age=31536000; samesite=lax${secure}`;
  }
  return setSetting("theme", value);
}

// ---------- روزهای «بیرون رفتن» (حالا فقط داخل تقویم اصلی نشون داده می‌شه) ----------

export async function getOutingDates(): Promise<string[]> {
  return getSetting<string[]>("outingDates", []);
}
export async function toggleOutingDate(iso: string): Promise<string[]> {
  const current = await getOutingDates();
  const next = current.includes(iso) ? current.filter((d) => d !== iso) : [...current, iso];
  await setSetting("outingDates", next);
  return next;
}

// ---------- خواب (lib/sleep.ts) ----------
// همون قراردادِ بقیه: مهمان → localStorage، کاربرِ واردشده → /api/sleep.
// نوشتن بعد از پایانِ دوره‌ی رایگانِ «روتین من» ۴۰۳ می‌گیره — خطا بالا پرتاب
// می‌شه تا UI پیامِ خرید رو نشون بده (نه اینکه بی‌صدا بلعیده بشه).

export class SleepSaveError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function getSleepRange(fromIso: string, toIso: string): Promise<SleepRecord[]> {
  if (await isLoggedIn()) {
    const res = await fetch(`/api/sleep?from=${fromIso}&to=${toIso}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json?.entries) ? json.entries : [];
  }
  const out: SleepRecord[] = [];
  if (typeof window === "undefined" || !hasLocalStorage()) return out;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(PREFIX + "sleep:")) continue;
    const date = k.slice((PREFIX + "sleep:").length);
    if (date < fromIso || date > toIso) continue;
    try { out.push(JSON.parse(window.localStorage.getItem(k) || "null")); } catch {}
  }
  return out.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveSleep(rec: SleepRecord): Promise<void> {
  if (await isLoggedIn()) {
    const res = await fetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rec),
    }).catch(() => null);
    if (!res) throw new SleepSaveError("اتصال برقرار نشد — دوباره امتحان کن", 0);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new SleepSaveError(j?.error || "ذخیره نشد", res.status);
    }
    publishLocal("sleep");
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  try {
    window.localStorage.setItem(PREFIX + "sleep:" + rec.date, JSON.stringify(rec));
  } catch {
    throw new SleepSaveError("حافظه‌ی مرورگر پر است — ذخیره نشد", 0);
  }
  publishLocal("sleep");
}

export async function deleteSleep(dateIso: string): Promise<void> {
  if (await isLoggedIn()) {
    const res = await fetch(`/api/sleep?date=${dateIso}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) throw new SleepSaveError("حذف نشد", res?.status ?? 0);
    publishLocal("sleep");
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  window.localStorage.removeItem(PREFIX + "sleep:" + dateIso);
  publishLocal("sleep");
}
