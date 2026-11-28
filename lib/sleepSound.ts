"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LAYER_VOLUME, isSleepSoundKind, normalizeLayers, setLayerVolume, toggleLayer,
  type SleepSoundKind, type SleepSoundLayer,
} from "@/lib/sleepSoundCatalog";
import { buildVoice, type Voice } from "@/lib/sleepSoundSynth";

// موتور صداهای خواب: همه‌چیز با WebAudio ساخته می‌شه (بدون فایل صوتی).
// وضعیت در سطح ماژول می‌مونه تا پخش بعد از بسته‌شدن پنجره ادامه پیدا کنه.

export { SLEEP_SOUND_KINDS, type SleepSoundKind, type SleepSoundLayer } from "@/lib/sleepSoundCatalog";
export const SLEEP_SOUND_TIMERS: readonly number[] = [15, 30, 45, 60, 90];
export const FADE_OUT_MS = 60_000;
export const SLEEP_SOUND_KEY = "arion:sleepSound";
const CROSSFADE_S = 1.5;

export type SleepSoundPrefs = { layers: SleepSoundLayer[]; volume: number; timerMin: number | null };
export const DEFAULT_PREFS: SleepSoundPrefs = { layers: [{ kind: "rain", volume: DEFAULT_LAYER_VOLUME }], volume: 0.6, timerMin: null };
const clonePrefs = (): SleepSoundPrefs => ({ ...DEFAULT_PREFS, layers: DEFAULT_PREFS.layers.map((l) => ({ ...l })) });

// ───── بخش‌های خالص ─────
export const clampVolume = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_PREFS.volume;
};

export function parseSleepSoundPrefs(raw: string | null | undefined): SleepSoundPrefs {
  if (!raw) return clonePrefs();
  try {
    const o = JSON.parse(raw) as Record<string, unknown> | null;
    if (!o || typeof o !== "object") return clonePrefs();
    // قالب قدیمی فقط kind داشت
    const legacy = isSleepSoundKind(o.kind) ? [{ kind: o.kind, volume: DEFAULT_LAYER_VOLUME }] : undefined;
    const layers = normalizeLayers(o.layers ?? legacy, DEFAULT_PREFS.layers);
    const volume = o.volume === undefined ? DEFAULT_PREFS.volume : clampVolume(o.volume);
    const timerMin = typeof o.timerMin === "number" && SLEEP_SOUND_TIMERS.includes(o.timerMin) ? o.timerMin : null;
    return { layers, volume, timerMin };
  } catch {
    return clonePrefs();
  }
}

export const remainingMs = (endsAt: number | null, now: number): number | null =>
  endsAt == null ? null : Math.max(0, endsAt - now);

/** ضریب صدا در آخرین دقیقه‌ی تایمر: 1 تا 0 به‌صورت نرم */
export function fadeFactor(remaining: number | null): number {
  if (remaining == null || remaining >= FADE_OUT_MS) return 1;
  const t = Math.max(0, remaining) / FADE_OUT_MS;
  return t * t * (3 - 2 * t);
}

/** m:ss یا h:mm:ss با رقم لاتین */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

// ───── وضعیت ─────
export type SleepSoundSnapshot = {
  /** صدای اول (برای نمایش خلاصه) */
  kind: SleepSoundKind; layers: SleepSoundLayer[];
  playing: boolean; volume: number; timerMin: number | null; endsAt: number | null;
};
const mkSnap = (p: SleepSoundPrefs): SleepSoundSnapshot => ({ ...p, kind: p.layers[0].kind, playing: false, endsAt: null });
const SERVER_SNAPSHOT: SleepSoundSnapshot = mkSnap(DEFAULT_PREFS);
let snap: SleepSoundSnapshot | null = null;
const listeners = new Set<() => void>();

function loadPrefs(): SleepSoundPrefs {
  try { return parseSleepSoundPrefs(window.localStorage.getItem(SLEEP_SOUND_KEY)); } catch { return clonePrefs(); }
}
function current(): SleepSoundSnapshot {
  if (!snap) snap = mkSnap(loadPrefs());
  return snap;
}
function commit(patch: Partial<SleepSoundSnapshot>, save = false) {
  const next = { ...current(), ...patch };
  if (patch.layers) next.kind = patch.layers[0].kind;
  snap = next;
  if (save) {
    try {
      const { layers, volume, timerMin } = snap;
      window.localStorage.setItem(SLEEP_SOUND_KEY, JSON.stringify({ layers, volume, timerMin }));
    } catch { /* ذخیره اختیاریه */ }
  }
  listeners.forEach((l) => l());
}
export function subscribeSleepSound(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export const getSleepSoundSnapshot = (): SleepSoundSnapshot => (typeof window === "undefined" ? SERVER_SNAPSHOT : current());

// ───── موتور صدا ─────
// هر لایه: voice.out -> layerGain (بلندی همون لایه) -> volGain (بلندی کل) -> master (فید تایمر)
type Active = { voice: Voice; layerGain: GainNode };
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volGain: GainNode | null = null;
const active = new Map<SleepSoundKind, Active>();
let tickId: ReturnType<typeof setInterval> | null = null;

const volCurve = (v: number) => v * v; // حس لگاریتمی‌تر

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1;
    volGain = ctx.createGain(); volGain.gain.value = volCurve(current().volume);
    volGain.connect(master).connect(ctx.destination);
  }
  return ctx;
}

function fadeOutAndDispose(a: Active, c: AudioContext) {
  const t = c.currentTime;
  a.voice.out.gain.cancelScheduledValues(t);
  a.voice.out.gain.setValueAtTime(a.voice.out.gain.value, t);
  a.voice.out.gain.linearRampToValueAtTime(0, t + CROSSFADE_S);
  setTimeout(() => { a.voice.dispose(); try { a.layerGain.disconnect(); } catch { /* */ } }, CROSSFADE_S * 1000 + 100);
}

/** صداهای در حال پخش رو با لایه‌های فعلی هم‌گام می‌کنه */
function syncVoices() {
  const c = ctx; if (!c || !volGain) return;
  const layers = current().layers;
  for (const [kind, a] of [...active]) {
    if (!layers.some((l) => l.kind === kind)) { active.delete(kind); fadeOutAndDispose(a, c); }
  }
  const t = c.currentTime;
  for (const l of layers) {
    const have = active.get(l.kind);
    if (have) { have.layerGain.gain.setTargetAtTime(volCurve(l.volume), t, 0.05); continue; }
    const voice = buildVoice(c, l.kind);
    const layerGain = c.createGain();
    layerGain.gain.value = volCurve(l.volume);
    voice.out.connect(layerGain).connect(volGain);
    voice.out.gain.setValueAtTime(0, t);
    voice.out.gain.linearRampToValueAtTime(1, t + CROSSFADE_S);
    active.set(l.kind, { voice, layerGain });
  }
}

function setMaster(target: number, seconds: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(target, t + Math.max(0.02, seconds));
}

let fading = false;
function tick() {
  const s = current();
  if (!s.playing || s.endsAt == null) return;
  const rem = s.endsAt - Date.now();
  if (rem <= 0) { stopSleepSound(); return; }
  if (rem < FADE_OUT_MS && !fading) {
    fading = true;
    // از ضریب فعلی تا صفر در باقی‌مانده، نرم
    if (master && ctx) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(fadeFactor(rem), t);
      master.gain.setTargetAtTime(0, t, rem / 1000 / 4);
    }
  }
}
function startTick() { if (tickId == null) tickId = setInterval(tick, 500); }
function stopTick() { if (tickId != null) { clearInterval(tickId); tickId = null; } fading = false; }

function startPlayback(layers: SleepSoundLayer[]) {
  const c = ensureCtx();
  if (!c) return;
  const s = current();
  // باید توی همون رویداد کاربر صدا زده بشه (iOS)
  if (c.state !== "running") { try { void c.resume(); } catch { /* */ } }
  const wasPlaying = s.playing;
  if (!wasPlaying) { fading = false; setMaster(1, 0.4); }
  const endsAt = s.timerMin ? (wasPlaying && s.endsAt ? s.endsAt : Date.now() + s.timerMin * 60_000) : null;
  commit({ layers, playing: true, endsAt }, true);
  syncVoices();
  startTick();
}

/** بدون آرگومان: پخش لایه‌های فعلی. با kind: فقط همون صدا (جایگزین ترکیب). */
export function playSleepSound(kind?: SleepSoundKind) {
  const s = current();
  startPlayback(kind ? [{ kind, volume: s.layers.find((l) => l.kind === kind)?.volume ?? DEFAULT_LAYER_VOLUME }] : s.layers);
}

/** زدن کاشی یک صدا: اضافه/برداشتن از ترکیب (تا 3 لایه). اگه پخش نمی‌شد، فقط همون صدا شروع می‌شه. */
export function toggleSleepSoundLayer(kind: SleepSoundKind) {
  const s = current();
  if (s.playing && s.layers.length === 1 && s.layers[0].kind === kind) { stopSleepSound(); return; }
  // وقتی چیزی پخش نمی‌شه، انتخاب تازه جای ترکیب قبلی رو می‌گیره
  startPlayback(s.playing ? toggleLayer(s.layers, kind) : [{ kind, volume: s.layers.find((l) => l.kind === kind)?.volume ?? DEFAULT_LAYER_VOLUME }]);
}

export function setSleepSoundLayerVolume(kind: SleepSoundKind, v: number) {
  const layers = setLayerVolume(current().layers, kind, v);
  const l = layers.find((x) => x.kind === kind);
  const a = active.get(kind);
  if (l && a && ctx) a.layerGain.gain.setTargetAtTime(volCurve(l.volume), ctx.currentTime, 0.05);
  commit({ layers }, true);
}

export function stopSleepSound() {
  stopTick();
  const c = ctx;
  const stopping = [...active.values()];
  active.clear();
  if (c && stopping.length) {
    setMaster(0, 0.5);
    setTimeout(() => {
      stopping.forEach((a) => { a.voice.dispose(); try { a.layerGain.disconnect(); } catch { /* */ } });
      if (!current().playing && c.state === "running") void c.suspend().catch(() => {});
    }, 600);
  }
  if (current().playing || current().endsAt != null) commit({ playing: false, endsAt: null });
}

export function setSleepSoundVolume(v: number) {
  const vol = clampVolume(v);
  if (ctx && volGain) volGain.gain.setTargetAtTime(volCurve(vol), ctx.currentTime, 0.05);
  commit({ volume: vol }, true);
}

export function setSleepSoundTimer(min: number | null) {
  const m = min != null && SLEEP_SOUND_TIMERS.includes(min) ? min : null;
  const s = current();
  const endsAt = s.playing && m ? Date.now() + m * 60_000 : null;
  if (s.playing) {
    fading = false;
    if (ctx && master) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(1, t, 0.15); }
  }
  commit({ timerMin: m, endsAt }, true);
}

export function useSleepSound() {
  const s = useSyncExternalStore(subscribeSleepSound, getSleepSoundSnapshot, () => SERVER_SNAPSHOT);
  return {
    ...s,
    play: playSleepSound,
    toggleLayer: toggleSleepSoundLayer,
    setLayerVolume: setSleepSoundLayerVolume,
    stop: stopSleepSound,
    setVolume: setSleepSoundVolume,
    setTimer: setSleepSoundTimer,
  };
}
