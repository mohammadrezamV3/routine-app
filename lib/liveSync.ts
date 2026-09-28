// ─────────────────────────────────────────────────────────────────────────
// لایه‌ی «زنده» — هر تغییری همون لحظه همه‌جا دیده بشه.
//
// یک باس رویدادِ کلید‌محور. هرجا داده‌ای عوض می‌شه، «دامنه»ی اون داده
// publish می‌شه؛ هر کامپوننتی که همون دامنه رو نشون می‌ده (با useLiveRefresh)
// همون لحظه دوباره می‌خونه و رندر می‌شه. منابع رویداد:
//
//   ۱) نوشتنِ همین تب  — lib/storage.ts (setDaily/setSetting/…) و روت‌های
//      دیگه (ترید/کالری/رودمپ/…) با publishChange. محلی و فوری (optimistic).
//   ۲) تب‌های دیگه‌ی همین مرورگر — BroadcastChannel (و برای مرورگرهای
//      بدون BroadcastChannel، رویداد `storage` خودِ localStorage). گیرنده
//      اول کشِ خواندنی رو برای همون کلیدها باطل می‌کنه، بعد خبر می‌ده.
//   ۳) سرور (WebSocket) — کلاینتِ realtime روی window رویدادِ
//      `arion:server-event` با detail = { type, keys?, data? } می‌فرسته
//      (lib/realtimeClient.ts). همین‌جا به کلیدها ترجمه می‌شه.
//   ۴) برگشتن به تب — focus / visibilitychange / online → همه‌چیز ("*")
//      باطل و دوباره خونده می‌شه (با ترتلِ کوتاه).
//
// قراردادِ ذخیره‌سازی (CLAUDE.md) دست نخورده: کامپوننت‌ها هنوز نمی‌دونن داده
// از localStorage میاد یا API — فقط می‌دونن «دامنه‌ی X عوض شد، دوباره بخون».
//
// ─── نام دامنه‌ها (کلیدها) — WS و کلاینت باید دقیقاً همین‌ها رو استفاده کنن ───
//   daily                 تیک‌های روزانه (DailyEntry). زیرکلید: `daily:YYYY-MM-DD`
//   customOccurrences     برنامه‌های سفارشی (UserSetting) — و به‌طور کلی هر
//   removedOccurrences    کلیدِ UserSetting با همون اسمِ خودش یه دامنه‌ست
//   wakeSleepTimes / outingDates / dashboardPrefs / notifPrefs / medications / …
//   trade                 حساب‌ها/معاملات/تگ‌ها/چک‌لیست‌ها/یادداشت‌های ترید
//   exercise              پلن/لاگِ ورزش
//   calorie               هدف/لاگِ کالری
//   roadmaps              رودمپ‌ها و پیشرفتشون
//   notifications         اعلان‌های سرور (و شمارنده‌ی خوانده‌نشده)
//   mentor                منتورشیپ. زیرکلیدها: `mentor:messages`,
//                         `mentor:mentorship`, `mentor:program`
//   account               حساب/پلن/ماژول‌ها
//
// قاعده‌ی تطبیق: مشترکِ `daily` با انتشارِ `daily:2026-09-27` بیدار می‌شه و
// مشترکِ `daily:2026-09-27` با انتشارِ `daily` هم (پیشوند در هر دو جهت).
// `*` با همه جوره.
// ─────────────────────────────────────────────────────────────────────────

// namespace import عمداً (نه `{ useEffect, useRef }`): این فایل از زنجیره‌ی
// storage → notifPrefs به یک route handler هم می‌رسه (app/api/push/send-reminders
// فقط DEFAULT_NOTIF_PREFS می‌خواد) و گاردِ RSCِ نکست import با نامِ هوک رو در
// گرافِ سرور رد می‌کنه و build می‌شکست. هوک‌ها فقط سمتِ کلاینت صدا زده می‌شن.
import * as React from "react";

export const LIVE_DOMAINS = {
  daily: "daily",
  customOccurrences: "customOccurrences",
  removedOccurrences: "removedOccurrences",
  wakeSleepTimes: "wakeSleepTimes",
  outingDates: "outingDates",
  dashboardPrefs: "dashboardPrefs",
  notifPrefs: "notifPrefs",
  medications: "medications",
  trade: "trade",
  exercise: "exercise",
  calorie: "calorie",
  roadmaps: "roadmaps",
  notifications: "notifications",
  mentor: "mentor",
  mentorMessages: "mentor:messages",
  mentorMentorship: "mentor:mentorship",
  mentorProgram: "mentor:program",
  account: "account",
} as const;

export const ALL = "*";

/** نوعِ رویدادهای سرور → دامنه‌ها (برای type هایی که keys ندارن) */
const SERVER_EVENT_KEYS: Record<string, string[]> = {
  "notification.new": [LIVE_DOMAINS.notifications],
  "notification.read": [LIVE_DOMAINS.notifications],
  "mentor.message": [LIVE_DOMAINS.mentorMessages, LIVE_DOMAINS.notifications],
  "mentor.mentorship": [LIVE_DOMAINS.mentorMentorship, LIVE_DOMAINS.notifications],
  "mentor.program": [LIVE_DOMAINS.mentorProgram, LIVE_DOMAINS.customOccurrences],
};

export const SERVER_EVENT = "arion:server-event";
const CHANNEL = "arion-live";
const PING_KEY = "arion-live-ping";
const STORAGE_PREFIX = "panelMohammad:";
const FOCUS_THROTTLE_MS = 3000;

/** remote = دست‌کم یکی از کلیدها از بیرونِ همین تب اومده (تب دیگه/سرور/برگشت به تب) */
export type LiveMeta = { remote: boolean };
type Listener = { keys: string[]; cb: (changed: string[], meta: LiveMeta) => void };

const listeners = new Set<Listener>();
const invalidators = new Set<(keys: string[]) => void>();
const errorListeners = new Set<(msg: string) => void>();

const tabId = Math.random().toString(36).slice(2);
let channel: BroadcastChannel | null = null;
let started = false;
let lastRevalidate = 0;

export function keyMatches(a: string, b: string): boolean {
  if (a === ALL || b === ALL || a === b) return true;
  return a.startsWith(b + ":") || b.startsWith(a + ":");
}

// ── اطلاع‌رسانی دسته‌ای: چند publish در یک tick = یک بار صدا زدنِ هر مشترک ──
let pendingKeys: Map<string, boolean> | null = null; // کلید → remote
function scheduleNotify(keys: string[], remote: boolean) {
  if (!pendingKeys) {
    pendingKeys = new Map();
    queueMicrotask(flush);
  }
  for (const k of keys) pendingKeys.set(k, remote || pendingKeys.get(k) === true);
}
function flush() {
  const entries = Array.from(pendingKeys ?? new Map<string, boolean>());
  pendingKeys = null;
  if (!entries.length) return;
  for (const l of Array.from(listeners)) {
    const hit = entries.filter(([k]) => l.keys.some((lk) => keyMatches(lk, k)));
    if (hit.length) {
      try { l.cb(hit.map(([k]) => k), { remote: hit.some(([, r]) => r) }); } catch (e) { console.error(e); }
    }
  }
}

/**
 * لایه‌ی داده (lib/storage.ts) این‌جا ثبت می‌کنه که با شنیدنِ «کلید X از
 * جای دیگه عوض شد» کدوم کش‌ها رو دور بریزه. جدا نگه داشته شده تا این فایل
 * به storage وابسته نباشه (وابستگیِ حلقوی).
 */
export function registerInvalidator(fn: (keys: string[]) => void): () => void {
  invalidators.add(fn);
  return () => { invalidators.delete(fn); };
}

function runInvalidators(keys: string[]) {
  for (const fn of Array.from(invalidators)) {
    try { fn(keys); } catch (e) { console.error(e); }
  }
}

function toArray(keys: string | string[]) {
  return Array.isArray(keys) ? keys : [keys];
}

/** فقط همین تب — برای به‌روزرسانیِ optimistic قبل از رسیدنِ جوابِ سرور */
export function publishLocal(keys: string | string[]) {
  ensureStarted();
  scheduleNotify(toArray(keys), false);
}

/** به تب‌های دیگه‌ی همین مرورگر خبر می‌ده (بعد از ذخیره‌ی موفق) */
export function broadcast(keys: string | string[]) {
  ensureStarted();
  const list = toArray(keys);
  const msg = { from: tabId, keys: list };
  if (channel) {
    try { channel.postMessage(msg); return; } catch {}
  }
  // fallback: رویداد storage فقط توی *بقیه‌ی* تب‌ها فایر می‌شه
  try { window.localStorage.setItem(PING_KEY, JSON.stringify({ ...msg, at: Date.now() })); } catch {}
}

/**
 * «داده‌ی این دامنه‌ها عوض شد» — هم همین تب (فوری) هم بقیه‌ی تب‌ها. برای
 * نوشتن‌هایی که از lib/storage.ts رد نمی‌شن (fetch مستقیمِ ترید/کالری/…)،
 * بعد از پاسخِ موفقِ سرور صدا زده بشه.
 */
export function publishChange(keys: string | string[]) {
  const list = toArray(keys);
  // کش‌های خواندنیِ همین تب هم باید باطل بشن — نوشتن از مسیری بوده که کش خبر نداشته
  runInvalidators(list);
  publishLocal(list);
  broadcast(list);
}

/** یه تغییر از بیرون (تب دیگه/سرور/برگشت به تب): کش باطل، بعد خبر */
export function invalidate(keys: string | string[]) {
  const list = toArray(keys);
  ensureStarted();
  runInvalidators(list);
  scheduleNotify(list, true);
}

export function subscribe(keys: string | string[], cb: (changed: string[], meta: LiveMeta) => void): () => void {
  ensureStarted();
  const l: Listener = { keys: toArray(keys), cb };
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/**
 * هر بار یکی از این دامنه‌ها عوض شد (یا کاربر به تب برگشت)، cb دوباره صدا
 * زده می‌شه. cb همیشه آخرین نسخه‌ست (ref)، پس لازم نیست useCallback بشه.
 * `includeFocus: false` یعنی فقط تغییرِ واقعیِ داده، نه برگشت به تب.
 * `remoteOnly: true` یعنی نوشتن‌های *همین تب* نادیده گرفته بشن — برای
 * صفحه‌ای که خودش optimistic به‌روز می‌شه و دوباره‌خوانیِ پژواکِ نوشتنِ
 * خودش (وسطِ چند تیکِ پشت‌سرهم) فقط باعثِ پرش می‌شد.
 */
export function useLiveRefresh(
  keys: string | string[],
  cb: (changed: string[], meta: LiveMeta) => void,
  opts: { includeFocus?: boolean; enabled?: boolean; remoteOnly?: boolean } = {}
) {
  const cbRef = React.useRef(cb);
  cbRef.current = cb;
  const keyStr = toArray(keys).join("|");
  const includeFocus = opts.includeFocus !== false;
  const enabled = opts.enabled !== false;
  const remoteOnly = opts.remoteOnly === true;
  React.useEffect(() => {
    if (!enabled) return;
    const list = keyStr.split("|");
    return subscribe(list, (changed, meta) => {
      if (!includeFocus && changed.every((k) => k === ALL)) return;
      if (remoteOnly && !meta.remote) return;
      cbRef.current(changed, meta);
    });
  }, [keyStr, includeFocus, enabled, remoteOnly]);
}

// ── خطای ذخیره (rollback) — LiveSyncToaster نشونش می‌ده ──
export function reportLiveError(msg: string) {
  for (const fn of Array.from(errorListeners)) {
    try { fn(msg); } catch {}
  }
}
export function subscribeLiveErrors(fn: (msg: string) => void): () => void {
  errorListeners.add(fn);
  return () => { errorListeners.delete(fn); };
}

// ── WebSocket ──
/** کلاینتِ realtime وقتی وصله `window.__arionRealtimeConnected = true` می‌ذاره */
export function isRealtimeConnected(): boolean {
  return typeof window !== "undefined" && (window as any).__arionRealtimeConnected === true;
}

function isVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * پولینگِ کم‌هزینه برای داده‌ای که *کاربرِ دیگه* عوضش می‌کنه (چت/اعلان):
 * فقط وقتی تب دیده می‌شه تیک می‌زنه؛ وقتی WebSocket وصله فاصله به
 * `realtimeIntervalMs` بلند می‌شه (فقط تورِ ایمنی — خودِ رویدادهای WS از
 * useLiveRefresh می‌رسن). برگشت به تب همون لحظه یه تیک می‌زنه.
 */
export function useVisiblePolling(
  cb: () => void,
  intervalMs: number,
  opts: { realtimeIntervalMs?: number; enabled?: boolean } = {}
) {
  const cbRef = React.useRef(cb);
  cbRef.current = cb;
  const enabled = opts.enabled !== false;
  const rtInterval = opts.realtimeIntervalMs ?? intervalMs * 6;
  React.useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const id = setInterval(() => {
      if (!isVisible()) return;
      const wait = isRealtimeConnected() ? rtInterval : intervalMs;
      if (Date.now() - last < wait - 50) return;
      last = Date.now();
      cbRef.current();
    }, Math.min(intervalMs, 1000 * 60));
    const onVis = () => {
      if (!isVisible()) return;
      last = Date.now();
      cbRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
    };
  }, [intervalMs, rtInterval, enabled]);
}

// ── نوشتن‌های مستقیم (fetch) — خبرِ خودکار ──
//
// ترید/کالری/ورزش/رودمپ/منتور/اعلان‌ها از lib/storage.ts رد نمی‌شن و هرکدوم
// مستقیم fetch می‌زنن. به‌جای دست‌بردن در ده‌ها نقطه‌ی نوشتن، هر درخواستِ
// *غیر-GET*ِ موفق به این مسیرها خودش دامنه‌اش رو publish می‌کنه (همین تب +
// تب‌های دیگه). ترتیب مهمه: خاص‌ترها اول.
// `/api/settings/*` و `/api/tasks/daily*` عمدا این‌جا نیستن — lib/storage.ts
// خودش optimistic و write-through خبرشون رو می‌ده؛ باطل‌کردنِ دوباره‌ی کش
// این‌جا فقط یه رفت‌وبرگشتِ اضافه می‌ساخت.
const MUTATION_DOMAINS: [RegExp, string[]][] = [
  [/^\/api\/mentorships\/[^/]+\/messages/, [LIVE_DOMAINS.mentorMessages]],
  [/^\/api\/mentorships/, [LIVE_DOMAINS.mentorMentorship]],
  [/^\/api\/mentor-programs/, [LIVE_DOMAINS.mentorProgram, LIVE_DOMAINS.customOccurrences]],
  [/^\/api\/mentor(\/|$|\?)/, [LIVE_DOMAINS.mentor]],
  [/^\/api\/trade/, [LIVE_DOMAINS.trade]],
  [/^\/api\/exercise/, [LIVE_DOMAINS.exercise]],
  [/^\/api\/calorie/, [LIVE_DOMAINS.calorie]],
  [/^\/api\/roadmaps/, [LIVE_DOMAINS.roadmaps]],
  [/^\/api\/notifications/, [LIVE_DOMAINS.notifications]],
  [/^\/api\/account/, [LIVE_DOMAINS.account]],
];

export function domainsForMutation(path: string): string[] {
  for (const [re, keys] of MUTATION_DOMAINS) if (re.test(path)) return keys;
  return [];
}

/** شناسه‌ی این تب — lib/realtime.ts (سرور) با همین، رویدادِ اکو رو علامت می‌زنه */
export const LIVE_TAB_ID = tabId;

function withTabHeader(input: RequestInfo | URL, init?: RequestInit): RequestInit | undefined {
  try {
    if (typeof input !== "string" && !(input instanceof URL)) return init;
    const method = (init?.method || "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") return init;
    const url = new URL(typeof input === "string" ? input : input.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return init;
    const headers = new Headers(init?.headers);
    if (!headers.has("x-arion-client")) headers.set("x-arion-client", tabId);
    return { ...init, headers };
  } catch {
    return init;
  }
}

function installFetchHook() {
  const orig = window.fetch;
  if (typeof orig !== "function" || (orig as any).__arionLive) return;
  const hooked = async function (input: RequestInfo | URL, init?: RequestInit) {
    // شناسه‌ی همین تب روی نوشتن‌های /api (هدرِ x-arion-client) — سرور همونو
    // توی `src`ِ رویدادِ WebSocket برمی‌گردونه تا این تب اکوی نوشتنِ خودش رو
    // (که قبلاً optimistic اعمال کرده) دوباره نخونه. فقط برای ورودیِ رشته/URL
    // (نه Request که هدرهاش immutableـه).
    init = withTabHeader(input, init);
    const res = await orig.call(window, input, init);
    try {
      const method = (init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "GET" && method !== "HEAD" && res.ok) {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
        const url = new URL(raw, window.location.href);
        if (url.origin === window.location.origin) {
          const keys = domainsForMutation(url.pathname);
          if (keys.length) publishChange(keys);
        }
      }
    } catch {}
    return res;
  };
  (hooked as any).__arionLive = true;
  window.fetch = hooked as typeof window.fetch;
}

// ── راه‌اندازیِ شنونده‌های سراسری (یک‌بار، تنبل) ──
function revalidateAll() {
  const now = Date.now();
  if (now - lastRevalidate < FOCUS_THROTTLE_MS) return;
  lastRevalidate = now;
  invalidate(ALL);
}

function storageKeyToDomain(key: string): string | null {
  if (!key.startsWith(STORAGE_PREFIX)) return null;
  const rest = key.slice(STORAGE_PREFIX.length);
  if (rest.startsWith("daily:")) return rest; // daily:YYYY-MM-DD
  if (rest.startsWith("settings:")) return rest.slice("settings:".length);
  return null;
}

function onServerEvent(e: Event) {
  const detail = (e as CustomEvent).detail as { type?: string; keys?: string[]; src?: string } | undefined;
  if (!detail?.type) return;
  // اکوی نوشتنِ خودِ همین تب — قبلاً محلی (publishChange/optimistic) اعمال شده
  if (detail.type === "data.changed" && detail.src === tabId) return;
  const keys = new Set<string>();
  if (Array.isArray(detail.keys)) for (const k of detail.keys) if (typeof k === "string" && k) keys.add(k);
  for (const k of SERVER_EVENT_KEYS[detail.type] ?? []) keys.add(k);
  let list = Array.from(keys);
  if (detail.type === "data.changed") list = dedupeFromWriter(detail.src, list, "ws");
  if (list.length) invalidate(list);
}

// ── یک نوشتن = یک بار دوباره‌خوانی ──
// نوشتنِ تبِ A به تبِ B همین مرورگر از *دو* راه می‌رسه: BroadcastChannel
// (فوری) و WebSocket (`data.changed` با src = شناسه‌ی تبِ A). هر دو باید
// کار کنن (WS برای دستگاه‌های دیگه، BroadcastChannel وقتی WS وصل نیست)،
// ولی دو باطل‌سازی پشتِ‌سرِ هم یعنی دو دور درخواستِ تکراری. هر خبری که از
// یک راه رسیده چند ثانیه نگه داشته می‌شه؛ اگه جفتش (همون نویسنده، کلیدِ
// جور، از راهِ *دیگه*) رسید، هر دو مصرف می‌شن و دومی نادیده گرفته می‌شه.
// یک‌به‌یکه: دو نوشتنِ پشتِ‌سرهمِ همون کلید (تیک و برداشتنِ تیک) هر کدوم
// جدا خبر داده می‌شن.
const WRITER_DEDUPE_MS = 5000;
type Via = "bc" | "ws";
const recentFromWriter = new Map<string, { key: string; via: Via; at: number }[]>();
function dedupeFromWriter(src: string | undefined, keys: string[], via: Via): string[] {
  if (!src) return keys;
  const now = Date.now();
  const seen = (recentFromWriter.get(src) ?? []).filter((r) => now - r.at < WRITER_DEDUPE_MS);
  const fresh: string[] = [];
  for (const k of keys) {
    const i = seen.findIndex((r) => r.via !== via && keyMatches(r.key, k));
    if (i >= 0) seen.splice(i, 1); // جفتش قبلاً اعمال شده
    else { fresh.push(k); seen.push({ key: k, via, at: now }); }
  }
  if (seen.length) recentFromWriter.set(src, seen);
  else recentFromWriter.delete(src);
  return fresh;
}

export function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  lastRevalidate = Date.now();
  installFetchHook();

  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (ev) => {
        const m = ev.data as { from?: string; keys?: string[] } | null;
        if (!m || m.from === tabId || !Array.isArray(m.keys)) return;
        const fresh = dedupeFromWriter(m.from, m.keys, "bc");
        if (fresh.length) invalidate(fresh);
      };
    } catch { channel = null; }
  }

  window.addEventListener("storage", (ev) => {
    if (!ev.key) return;
    if (ev.key === PING_KEY) {
      if (channel) return; // همون پیام از BroadcastChannel هم رسیده
      try {
        const m = JSON.parse(ev.newValue || "null");
        if (m && m.from !== tabId && Array.isArray(m.keys)) {
          const fresh = dedupeFromWriter(m.from, m.keys, "bc");
          if (fresh.length) invalidate(fresh);
        }
      } catch {}
      return;
    }
    // مهمان: localStorage خودش بین تب‌ها مشترکه — فقط باید خبر بدیم
    const domain = storageKeyToDomain(ev.key);
    if (domain) invalidate(domain);
  });

  window.addEventListener(SERVER_EVENT, onServerEvent);
  window.addEventListener("focus", revalidateAll);
  window.addEventListener("online", () => { lastRevalidate = 0; revalidateAll(); });
  document.addEventListener("visibilitychange", () => { if (isVisible()) revalidateAll(); });
}
