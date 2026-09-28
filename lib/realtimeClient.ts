// ─────────────────────────────────────────────────────────────────────────
// کلاینتِ WebSocketِ `/ws` — یک اتصالِ واحد برای کلِ تب (singleton).
//
// هر رویدادِ سرور عیناً به‌صورتِ
//   window.dispatchEvent(new CustomEvent("arion:server-event", { detail }))
// پخش می‌شه؛ lib/liveSync.ts گوش می‌ده و به دامنه‌ها (کلیدها) ترجمه‌ش می‌کنه،
// و هوکِ useServerEvent (پایین) برای جاهایی که شناسه‌ی دقیق لازم دارن
// (مثلا گفت‌وگوی باز با mentorshipIdِ خودش).
//
// رفتار:
//  • فقط برای کاربرِ لاگین‌کرده (components/RealtimeProvider.tsx).
//  • reconnect با backoffِ نمایی + jitter (۱s → ۳۰s)؛ آفلاین = مکث؛
//    برگشتِ شبکه/برگشت به تب = تلاشِ فوری.
//  • window.__arionRealtimeConnected — پولینگ‌ها (useVisiblePolling) با این
//    تصمیم می‌گیرن تند بزنن یا فقط تورِ ایمنی باشن.
//  • بعد از وصلِ دوباره (نه اولین اتصال) یک «همه‌چیز رو تازه کن» پخش می‌شه،
//    چون رویدادهای دورانِ قطعی از دست رفتن.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

export const SERVER_EVENT = "arion:server-event";
export const REALTIME_STATUS_EVENT = "arion:realtime-status";

export type ClientServerEvent = {
  type: string;
  keys?: string[];
  data?: Record<string, string | number | boolean>;
  src?: string;
};

const BASE_DELAY = 1000;
const MAX_DELAY = 30_000;

let ws: WebSocket | null = null;
let wanted = false;
let connected = false;
let everConnected = false;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;
let stopReconnect = false;

function setConnected(v: boolean) {
  connected = v;
  if (typeof window === "undefined") return;
  (window as any).__arionRealtimeConnected = v;
  window.dispatchEvent(new CustomEvent(REALTIME_STATUS_EVENT, { detail: { connected: v } }));
}

export function isRealtimeConnected(): boolean {
  return connected;
}

function dispatchServerEvent(detail: ClientServerEvent) {
  window.dispatchEvent(new CustomEvent(SERVER_EVENT, { detail }));
}

function wsUrl(): string {
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleReconnect() {
  clearRetry();
  if (!wanted || stopReconnect) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return; // «online» خودش بیدار می‌کنه
  const exp = Math.min(MAX_DELAY, BASE_DELAY * 2 ** attempt);
  const delay = exp / 2 + Math.random() * (exp / 2); // full-jitter نصفه — پخش‌کردنِ هجومِ بعد از ری‌استارت
  attempt++;
  retryTimer = setTimeout(connect, delay);
}

function connect() {
  clearRetry();
  if (!wanted || ws) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  let sock: WebSocket;
  try {
    sock = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  ws = sock;

  sock.onopen = () => {
    if (ws !== sock) return;
    attempt = 0;
    setConnected(true);
    if (everConnected) dispatchServerEvent({ type: "data.changed", keys: ["*"] });
    everConnected = true;
  };

  sock.onmessage = (ev) => {
    if (ws !== sock || typeof ev.data !== "string") return;
    let msg: ClientServerEvent | null = null;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "hello") {
      const w = (msg as any).worker;
      if (w !== undefined) (window as any).__arionRealtimeWorker = w;
      return;
    }
    dispatchServerEvent(msg);
  };

  sock.onclose = (ev) => {
    if (ws !== sock) return;
    ws = null;
    if (connected) setConnected(false);
    // نشستِ منقضی/ابطال‌شده: تلاشِ دوباره بی‌فایده‌ست تا وقتی وضعیتِ ورود عوض بشه
    // (RealtimeProvider با تغییرِ نشست از نو شروع می‌کنه).
    if (ev.code === 4001 || ev.code === 4003) {
      stopReconnect = true;
      return;
    }
    scheduleReconnect();
  };

  sock.onerror = () => {
    // onclose بعدش صدا زده می‌شه
  };
}

function onOnline() {
  if (!wanted) return;
  attempt = 0;
  stopReconnect = false;
  if (!ws) connect();
}

function onOffline() {
  clearRetry();
  // سوکتِ نیمه‌مرده رو نگه نمی‌داریم؛ با برگشتِ شبکه تمیز از نو وصل می‌شه
  if (ws) {
    const s = ws;
    ws = null;
    try { s.close(); } catch {}
    if (connected) setConnected(false);
  }
}

function onVisible() {
  if (document.visibilityState !== "visible" || !wanted) return;
  if (!ws) {
    attempt = 0;
    connect();
  }
}

function installListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
}

/** شروعِ اتصال (idempotent) — فقط وقتی کاربر لاگینه */
export function startRealtime() {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return;
  installListeners();
  wanted = true;
  stopReconnect = false;
  attempt = 0;
  if (!ws) connect();
}

/** قطعِ اتصال (خروج از حساب) */
export function stopRealtime() {
  wanted = false;
  everConnected = false;
  clearRetry();
  if (ws) {
    const s = ws;
    ws = null;
    try { s.close(1000, "logout"); } catch {}
  }
  if (connected) setConnected(false);
}

/**
 * شنیدنِ رویدادهای مشخصِ سرور. cb همیشه آخرین نسخه‌ست (ref)، پس لازم نیست
 * useCallback بشه. برای به‌روزرسانیِ دامنه‌ای (بدونِ شناسه) useLiveRefresh
 * در lib/liveSync.ts مناسب‌تره.
 */
export function useServerEvent(types: string | string[], cb: (e: ClientServerEvent) => void, enabled = true) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const key = (Array.isArray(types) ? types : [types]).join("|");
  useEffect(() => {
    if (!enabled) return;
    const set = new Set(key.split("|"));
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as ClientServerEvent | undefined;
      if (d && set.has(d.type)) cbRef.current(d);
    };
    window.addEventListener(SERVER_EVENT, h);
    return () => window.removeEventListener(SERVER_EVENT, h);
  }, [key, enabled]);
}

/** وضعیتِ اتصال به‌صورتِ state (برای کم/زیاد کردنِ پولینگ) */
export function useRealtimeConnected(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    setV(connected);
    const h = (e: Event) => setV(!!(e as CustomEvent).detail?.connected);
    window.addEventListener(REALTIME_STATUS_EVENT, h);
    return () => window.removeEventListener(REALTIME_STATUS_EVENT, h);
  }, []);
  return v;
}
