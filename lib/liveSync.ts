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

import { useEffect, useRef } from "react";

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
  "mentor.message": [LIVE_DOMAINS.mentorMessages, LIVE_DOMAINS.notifications],
  "mentor.mentorship": [LIVE_DOMAINS.mentorMentorship, LIVE_DOMAINS.notifications],
  "mentor.program": [LIVE_DOMAINS.mentorProgram, LIVE_DOMAINS.customOccurrences],
};

export const SERVER_EVENT = "arion:server-event";
const CHANNEL = "arion-live";
const PING_KEY = "arion-live-ping";
const STORAGE_PREFIX = "panelMohammad:";
const FOCUS_THROTTLE_MS = 3000;

type Listener = { keys: string[]; cb: (changed: string[]) => void };

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
let pendingKeys: Set<string> | null = null;
function scheduleNotify(keys: string[]) {
  if (!pendingKeys) {
    pendingKeys = new Set();
    queueMicrotask(flush);
  }
  for (const k of keys) pendingKeys.add(k);
}
function flush() {
  const keys = Array.from(pendingKeys ?? []);
  pendingKeys = null;
  if (!keys.length) return;
  for (const l of Array.from(listeners)) {
    const hit = keys.filter((k) => l.keys.some((lk) => keyMatches(lk, k)));
    if (hit.length) {
      try { l.cb(hit); } catch (e) { console.error(e); }
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
  scheduleNotify(toArray(keys));
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
  runInvalidators(list);
  publishLocal(list);
}

export function subscribe(keys: string | string[], cb: (changed: string[]) => void): () => void {
  ensureStarted();
  const l: Listener = { keys: toArray(keys), cb };
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/**
 * هر بار یکی از این دامنه‌ها عوض شد (یا کاربر به تب برگشت)، cb دوباره صدا
 * زده می‌شه. cb همیشه آخرین نسخه‌ست (ref)، پس لازم نیست useCallback بشه.
 * `includeFocus: false` یعنی فقط تغییرِ واقعیِ داده، نه برگشت به تب.
 */
export function useLiveRefresh(
  keys: string | string[],
  cb: (changed: string[]) => void,
  opts: { includeFocus?: boolean; enabled?: boolean } = {}
) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const keyStr = toArray(keys).join("|");
  const includeFocus = opts.includeFocus !== false;
  const enabled = opts.enabled !== false;
  useEffect(() => {
    if (!enabled) return;
    const list = keyStr.split("|");
    return subscribe(list, (changed) => {
      if (!includeFocus && changed.every((k) => k === ALL)) return;
      cbRef.current(changed);
    });
  }, [keyStr, includeFocus, enabled]);
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
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const enabled = opts.enabled !== false;
  const rtInterval = opts.realtimeIntervalMs ?? intervalMs * 6;
  useEffect(() => {
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
  const detail = (e as CustomEvent).detail as { type?: string; keys?: string[] } | undefined;
  if (!detail?.type) return;
  const keys = new Set<string>();
  if (Array.isArray(detail.keys)) for (const k of detail.keys) if (typeof k === "string" && k) keys.add(k);
  for (const k of SERVER_EVENT_KEYS[detail.type] ?? []) keys.add(k);
  if (keys.size) invalidate(Array.from(keys));
}

export function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  lastRevalidate = Date.now();

  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (ev) => {
        const m = ev.data as { from?: string; keys?: string[] } | null;
        if (!m || m.from === tabId || !Array.isArray(m.keys)) return;
        invalidate(m.keys);
      };
    } catch { channel = null; }
  }

  window.addEventListener("storage", (ev) => {
    if (!ev.key) return;
    if (ev.key === PING_KEY) {
      if (channel) return; // همون پیام از BroadcastChannel هم رسیده
      try {
        const m = JSON.parse(ev.newValue || "null");
        if (m && m.from !== tabId && Array.isArray(m.keys)) invalidate(m.keys);
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
