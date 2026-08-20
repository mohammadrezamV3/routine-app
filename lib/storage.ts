// لایه داده — برای مهمان‌ها (لاگین‌نکرده) روی localStorage کار می‌کند، و برای
// کاربرهای لاگین‌کرده به API واقعی (Prisma/Postgres) وصل می‌شود. هر تابع
// اول وضعیت session رو چک می‌کنه؛ بقیه کد اپ (کامپوننت‌ها) اصلاً نمی‌دونن
// داده از کجا میاد — همون قراردادی که از اول قرار بود برقرار بمونه.

import { getSession } from "next-auth/react";

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
// کش/دیدوپِ درخواست‌ها — دلیلِ اصلیِ کندیِ لودِ سایت همین‌جا بود.
//
// اندازه‌گیریِ واقعی (لودِ /weekly، کاربرِ لاگین‌کرده) قبل از این تغییر:
//   ۳۵ درخواستِ API برای یک بار باز کردنِ صفحه —
//   /api/auth/session ×۶ · settings/removedOccurrences ×۶ ·
//   settings/customOccurrences ×۶ · tasks/daily/range ×۵ (یکیشون
//   دقیقاً یک بازه‌ی تکراری، سه بار) · tasks/daily ×۳ · …
// چون خیلی از کامپوننت‌ها (NotificationEngine، useMyStreak، DashReminderCard،
// HistoryCalendar، getTodayStats و…) هرکدوم مستقلاً همون چند تا کلیدِ ثابت رو
// می‌خونن. روی مرورگرِ واقعی که هر هاست حداکثر ~۶ کانکشنِ همزمان داره، این
// یعنی صفحه چند «موج» پشت‌سرهم منتظرِ شبکه می‌مونه — دقیقاً همون «دیر لود
// می‌شه / ناقص لود می‌شه».
//
// دو کش این‌جا اضافه شده:
//   ۱) وضعیتِ لاگین  ۲) پاسخِ GETهای خواندنی (settings / daily / range)
// هردو با TTLِ کوتاه + دیدوپِ درخواستِ در حالِ اجرا. نوشتن‌ها (setSetting/
// setDaily) کش رو write-through آپدیت می‌کنن، پس هیچ‌وقت داده‌ی بیات دیده
// نمی‌شه.
// ─────────────────────────────────────────────────────────────────────────

// TTLِ وضعیتِ لاگین — فقط باید انفجارِ فراخوانی‌های هم‌زمانِ لحظه‌ی mount رو
// جمع کنه. لاگین/لاگ‌اوت خودشون صریحاً invalidateStorageCache() صدا می‌زنن،
// پس این عدد سقفِ «بیات موندن» نیست، فقط تورِ ایمنیه.
const SESSION_TTL_MS = 60_000;
// TTLِ پاسخ‌های خواندنی — به‌اندازه‌ای که کلِ موجِ mountِ یک صفحه (و پیمایشِ
// کلاینتیِ بلافاصله بعدش) داخلش جا بشه، و به‌اندازه‌ای کوتاه که داده‌ی
// عوض‌شده از یه تبِ دیگه خیلی زود دیده بشه.
const GET_TTL_MS = 15_000;

let sessionCache: { loggedIn: boolean; at: number } | null = null;
let inFlightSession: Promise<boolean> | null = null;

// getSession() هر بار که صدا زده بشه یه فچِ تازه به /api/auth/session می‌زنه
// (برخلافِ هوکِ useSession که از contextِ مشترکِ SessionProvider می‌خونه).
// چون هر تکِ get/set از این لایه رد می‌شه، بدونِ کش هر خواندنِ داده عملاً
// دو رفت‌وبرگشتِ شبکه‌ی *سریالی* می‌شد (اول session، بعد خودِ داده).
async function isLoggedIn(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const cached = sessionCache;
  if (cached && Date.now() - cached.at < SESSION_TTL_MS) return cached.loggedIn;
  if (!inFlightSession) {
    inFlightSession = getSession()
      .then((session) => {
        const loggedIn = !!(session?.user as any)?.id;
        sessionCache = { loggedIn, at: Date.now() };
        return loggedIn;
      })
      .catch(() => false)
      .finally(() => { inFlightSession = null; });
  }
  return inFlightSession;
}

const getCache = new Map<string, { at: number; data: any }>();
const inFlightGets = new Map<string, Promise<any>>();

/**
 * GETِ کش‌شده و دیدوپ‌شده. همه‌ی صداهای هم‌زمان روی یک URL یک درخواستِ واحد
 * رو به اشتراک می‌ذارن، و تا GET_TTL_MS بعدش از کش جواب می‌گیرن.
 * خطا/پاسخِ ناموفق کش نمی‌شه (تا یه قطعیِ لحظه‌ای، داده رو برای کلِ TTL خراب نکنه).
 */
async function cachedGet<T>(url: string, pick: (json: any) => T, fallback: T): Promise<T> {
  const hit = getCache.get(url);
  if (hit && Date.now() - hit.at < GET_TTL_MS) return pick(hit.data);

  let pending = inFlightGets.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
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

/** بعد از یک نوشتنِ موفق، پاسخِ تازه رو مستقیم توی کش می‌ذاره (بدونِ رفتِ دوباره به سرور) */
function primeCache(url: string, data: any) {
  getCache.set(url, { at: Date.now(), data });
}

/** ورودی‌های کشِ خواندنی که با یک الگو جور در میان رو دور می‌ریزه */
function dropCache(predicate: (url: string) => boolean) {
  for (const key of Array.from(getCache.keys())) {
    if (predicate(key)) getCache.delete(key);
  }
}

/**
 * هر جا هویتِ کاربر عوض می‌شه (ورود/خروج) باید صدا زده بشه — وگرنه لایه‌ی
 * داده تا انقضای TTL فکر می‌کنه هنوز همون کاربرِ قبلی (یا مهمان) پشتِ خطه و
 * از منبعِ اشتباه (localStorage به‌جای API، یا داده‌ی کاربرِ قبلی) می‌خونه.
 * صفحه‌ی ورود بعد از signIn موفق، و منو/پنلِ کاربری قبل از signOut، صداش می‌زنن.
 */
export function invalidateStorageCache() {
  sessionCache = null;
  inFlightSession = null;
  getCache.clear();
  inFlightGets.clear();
  clearRangeCache();
}

// ─────────────────────────────────────────────────────────────────────────
// کشِ بازه‌آگاه برای DailyEntry
//
// کشِ بالا کلیدش URLه، پس دو بازه‌ی *متفاوت* هیچ‌وقت به‌هم نمی‌رسن — حتی اگه
// یکی کاملاً داخلِ اون یکی باشه. اندازه‌گیری روی `/weekly` نشون داد چهار
// درخواستِ هم‌پوشان از یک جدول می‌رفت:
//     range 2026-08-13..2026-08-27   (تایم‌لاینِ خودِ صفحه، ±۷ روز)
//     range 2026-05-22..2026-08-19   (useMyStreak، ۹۰ روز)
//     range 2026-08-15..2026-08-21   (آمارِ همین هفته)
//     daily 2026-08-20               (امروز — که *داخلِ* بازه‌ی اوله)
//
// این لایه بازه‌های درخواست‌شده رو نگه می‌داره و اگه بازه‌ی تازه زیرمجموعه‌ی
// یکی از اون‌ها باشه (چه رسیده باشه چه هنوز در راه)، از همون بریده می‌شه.
// تاریخ‌های `YYYY-MM-DD` از نظر رشته‌ای هم‌ترتیبِ زمانی‌ان، پس مقایسه‌ی ساده کافیه.
// ─────────────────────────────────────────────────────────────────────────

type RangeEntry = { from: string; to: string; at: number; data: Promise<Record<string, DailyRecord> | null> };

let rangeEntries: RangeEntry[] = [];

function findCoveringRange(from: string, to: string): RangeEntry | null {
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
    data: fetch(`/api/tasks/daily/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => (json ? ((json.entries || {}) as Record<string, DailyRecord>) : null))
      .catch(() => null),
  };
  // بازه‌ای که ناموفق بود نباید تا آخرِ TTL بقیه رو هم گمراه کنه
  entry.data.then((d) => { if (d === null) rangeEntries = rangeEntries.filter((e) => e !== entry); });
  rangeEntries.push(entry);
  return entry;
}

function clearRangeCache() {
  rangeEntries = [];
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
    // اگه بازه‌ای که همین روز رو در بر می‌گیره از قبل درخواست شده، همون کافیه
    // — یه درخواستِ جدا برای یک روزِ داخلِ اون بازه فقط یه کانکشنِ اضافه‌ست.
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
  if (await isLoggedIn()) {
    try {
      await fetch("/api/tasks/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, tasks: data.tasks, wake: data.wake }),
      });
      // خودِ همون روز رو write-through می‌کنیم، و هر بازه‌ای که ممکنه شاملش
      // باشه رو دور می‌ریزیم (بازه‌ها کلیدِ دقیق ندارن که بشه نقطه‌ای آپدیتشون کرد).
      primeCache(`/api/tasks/daily?date=${encodeURIComponent(dateKey)}`, { tasks: data.tasks, wake: data.wake });
      dropCache((url) => url.startsWith("/api/tasks/daily/range") || url === "/api/tasks/daily/keys");
      clearRangeCache();
    } catch {}
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  window.localStorage.setItem(PREFIX + "daily:" + dateKey, JSON.stringify(data));
}

export async function listDailyKeys(): Promise<Set<string>> {
  if (await isLoggedIn()) {
    return cachedGet<Set<string>>(
      "/api/tasks/daily/keys",
      (json) => new Set<string>(json?.keys || []),
      new Set<string>()
    );
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
  if (await isLoggedIn()) {
    const covering = findCoveringRange(fromIso, toIso) ?? fetchRange(fromIso, toIso);
    const data = await covering.data;
    // اگه بازه‌ی پوشاننده شکست خورد، خودمون مستقیم می‌گیریم (نه اینکه خالی برگردونیم)
    if (data === null) {
      const own = await fetchRange(fromIso, toIso).data;
      return own === null ? {} : sliceRange(own, fromIso, toIso);
    }
    return sliceRange(data, fromIso, toIso);
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

export async function setSetting<T>(key: string, value: T): Promise<void> {
  if (await isLoggedIn()) {
    try {
      await fetch(settingsUrl(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      primeCache(settingsUrl(key), { value });
    } catch {}
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  window.localStorage.setItem(PREFIX + "settings:" + key, JSON.stringify(value));
}

export async function getRemovedOccurrences(): Promise<string[]> {
  return getSetting<string[]>("removedOccurrences", []);
}
export async function setRemovedOccurrences(arr: string[]): Promise<void> {
  return setSetting("removedOccurrences", arr);
}

// میزان حساسیت/اهمیتِ هر برنامه — چهار سطح، پیش‌فرض «کم» (رکوردهای قدیمی که
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
  endDate?: string;
  importance?: Importance;
  tag?: string;
  notify?: boolean; // false یعنی صریحاً خاموش‌شده؛ نبودش (undefined) یعنی روشن
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
  // سمتِ سرور توی layout.tsx هم قابل‌خوندنه؛ همین باعث می‌شه data-theme از همون
  // اولین HTML سرور درست باشه، نه این‌که با یه تاخیر (بعد از resolve شدنِ
  // getThemeSetting سمتِ کلاینت) یهو از تاریک به روشن (یا برعکس) عوض بشه.
  if (typeof document !== "undefined") {
    document.cookie = `theme=${value}; path=/; max-age=31536000; samesite=lax`;
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
