"use client";

// چرت: منطق خالص زمان + ذخیره‌ی تایمر در localStorage (جان‌سالم از ریلود و بستن پنجره)
// + هوک useNapTimer. زنگ پایان (صدای WebAudio، لرزش، اعلان) فقط وقتی صفحه باز است.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { tr } from "@/lib/i18n";

export const NAP_KEY = "arion:napTimer";
export const NAP_PRESETS = [10, 20, 30, 90] as const;
export const NAP_LATENCY_MAX = 60;
const NAP_MAX_MIN = 240;

export type NapTimer = { startedAt: number; endsAt: number; minutes: number };

// ── منطق خالص ──
export function normalizeNapMinutes(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(1, Math.min(NAP_MAX_MIN, n)) : 20;
}
export function normalizeNapLatency(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(NAP_LATENCY_MAX, n)) : 0;
}
/** لحظه‌ی بیدارشدن = شروع + مدت چرت + زمان به خواب رفتن */
export function napEndsAt(startMs: number, minutes: number, latency: number): number {
  return startMs + (normalizeNapMinutes(minutes) + normalizeNapLatency(latency)) * 60000;
}
export function napRemainingSec(endsAt: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
}
/** پیشرفت 0 تا 1 */
export function napProgress(t: Pick<NapTimer, "startedAt" | "endsAt">, nowMs: number): number {
  const span = t.endsAt - t.startedAt;
  if (!(span > 0)) return 1;
  return Math.max(0, Math.min(1, (nowMs - t.startedAt) / span));
}
export function napIsEnded(t: Pick<NapTimer, "endsAt">, nowMs: number): boolean {
  return nowMs >= t.endsAt;
}
/** ساعت بیدارشدن به‌صورت HH:MM (ساعت محلی) */
export function napWakeClock(startMs: number, minutes: number, latency: number): string {
  const d = new Date(napEndsAt(startMs, minutes, latency));
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function napClockOf(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
/** mm:ss یا h:mm:ss */
export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
/** تجزیه‌ی امن مقدار ذخیره‌شده؛ هر چیز نامعتبر = null */
export function parseNapTimer(raw: string | null): NapTimer | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    const { startedAt, endsAt, minutes } = o as Record<string, unknown>;
    if (typeof startedAt !== "number" || typeof endsAt !== "number" || typeof minutes !== "number") return null;
    if (!Number.isFinite(startedAt) || !Number.isFinite(endsAt) || endsAt <= startedAt) return null;
    if (endsAt - startedAt > (NAP_MAX_MIN + NAP_LATENCY_MAX) * 60000 + 1000) return null;
    return { startedAt, endsAt, minutes };
  } catch { return null; }
}

// ── فروشگاه کوچک ماژول ──
let current: NapTimer | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { current = parseNapTimer(window.localStorage.getItem(NAP_KEY)); } catch { current = null; }
  window.addEventListener("storage", (e) => {
    if (e.key !== NAP_KEY) return;
    current = parseNapTimer(e.newValue);
    emit();
  });
}
function emit() { listeners.forEach((l) => l()); }
function subscribe(l: () => void) { load(); listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot(): NapTimer | null { load(); return current; }
function getServerSnapshot(): NapTimer | null { return null; }

function write(t: NapTimer | null) {
  current = t;
  try {
    if (t) window.localStorage.setItem(NAP_KEY, JSON.stringify(t));
    else window.localStorage.removeItem(NAP_KEY);
  } catch { /* حافظه در دسترس نیست؛ فقط در حافظه‌ی همین تب می‌ماند */ }
  emit();
}

export function startNap(minutes: number, latency: number, nowMs: number = Date.now()) {
  const m = normalizeNapMinutes(minutes);
  write({ startedAt: nowMs, endsAt: napEndsAt(nowMs, m, latency), minutes: m });
}
export function cancelNap() { write(null); }

// ── زنگ پایان ──
const seenRunning = new Set<number>();
const fired = new Set<number>();

function playChime() {
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    void ctx.resume?.();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t0 = ctx.currentTime + 0.05;
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const s = t0 + i * 0.7;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.16 + i * 0.03, s + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 1.6);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(s); osc.stop(s + 1.7);
    });
    window.setTimeout(() => { try { void ctx.close(); } catch { /* */ } }, 5000);
  } catch { /* مرورگر اجازه نداد */ }
}
function alarm() {
  playChime();
  try { navigator.vibrate?.([200, 120, 200, 120, 400]); } catch { /* */ }
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(tr("وقت بیدار شدنه", "Time to wake up"), { body: tr("چرتت تموم شد", "Your nap is over"), tag: "arion-nap" });
    }
  } catch { /* */ }
}

export type NapTimerApi = {
  /** تایمر شروع شده و هنوز تموم نشده */
  running: boolean;
  /** تایمر تموم شده و هنوز بسته نشده (صفحه‌ی بیدار شو) */
  ended: boolean;
  startedAt: number | null;
  endsAt: number | null;
  minutes: number | null;
  remainingSec: number;
  progress: number;
  start: (minutes: number, latency: number) => void;
  cancel: () => void;
};

export function useNapTimer(): NapTimerApi {
  const timer = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    setNow(Date.now());
    const ended = Date.now() >= timer.endsAt;
    if (ended) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer]);

  // زنگ فقط وقتی تایمر را همین‌جا در حال اجرا دیده باشیم و فقط یک بار برای هر تایمر
  useEffect(() => {
    if (!timer) return;
    if (now < timer.endsAt) { seenRunning.add(timer.startedAt); return; }
    if (seenRunning.has(timer.startedAt) && !fired.has(timer.startedAt)) {
      fired.add(timer.startedAt);
      alarm();
    }
  }, [timer, now]);

  const start = useCallback((m: number, latency: number) => startNap(m, latency), []);
  const cancel = useCallback(() => cancelNap(), []);

  if (!timer) return { running: false, ended: false, startedAt: null, endsAt: null, minutes: null, remainingSec: 0, progress: 0, start, cancel };
  const ended = napIsEnded(timer, now);
  return {
    running: !ended, ended, startedAt: timer.startedAt, endsAt: timer.endsAt, minutes: timer.minutes,
    remainingSec: napRemainingSec(timer.endsAt, now), progress: napProgress(timer, now), start, cancel,
  };
}
