"use client";

import { useSyncExternalStore } from "react";

// موتور صداهای خواب: همه‌چیز با WebAudio ساخته می‌شه (بدون فایل صوتی).
// وضعیت در سطح ماژول می‌مونه تا پخش بعد از بسته‌شدن پنجره ادامه پیدا کنه.

export type SleepSoundKind = "white" | "pink" | "brown" | "rain" | "ocean" | "fan";
export const SLEEP_SOUND_KINDS: readonly SleepSoundKind[] = ["rain", "ocean", "fan", "white", "pink", "brown"];
export const SLEEP_SOUND_TIMERS: readonly number[] = [15, 30, 45, 60, 90];
export const FADE_OUT_MS = 60_000;
export const SLEEP_SOUND_KEY = "arion:sleepSound";
const CROSSFADE_S = 1.5;

export type SleepSoundPrefs = { kind: SleepSoundKind; volume: number; timerMin: number | null };
export const DEFAULT_PREFS: SleepSoundPrefs = { kind: "rain", volume: 0.6, timerMin: null };

// ───── بخش‌های خالص ─────
export const clampVolume = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_PREFS.volume;
};

export function parseSleepSoundPrefs(raw: string | null | undefined): SleepSoundPrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const o = JSON.parse(raw) as Record<string, unknown> | null;
    if (!o || typeof o !== "object") return { ...DEFAULT_PREFS };
    const kind = SLEEP_SOUND_KINDS.includes(o.kind as SleepSoundKind) ? (o.kind as SleepSoundKind) : DEFAULT_PREFS.kind;
    const volume = o.volume === undefined ? DEFAULT_PREFS.volume : clampVolume(o.volume);
    const timerMin = typeof o.timerMin === "number" && SLEEP_SOUND_TIMERS.includes(o.timerMin) ? o.timerMin : null;
    return { kind, volume, timerMin };
  } catch {
    return { ...DEFAULT_PREFS };
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
  kind: SleepSoundKind; playing: boolean; volume: number; timerMin: number | null; endsAt: number | null;
};
const SERVER_SNAPSHOT: SleepSoundSnapshot = { ...DEFAULT_PREFS, playing: false, endsAt: null };
let snap: SleepSoundSnapshot | null = null;
const listeners = new Set<() => void>();

function loadPrefs(): SleepSoundPrefs {
  try { return parseSleepSoundPrefs(window.localStorage.getItem(SLEEP_SOUND_KEY)); } catch { return { ...DEFAULT_PREFS }; }
}
function current(): SleepSoundSnapshot {
  if (!snap) snap = { ...loadPrefs(), playing: false, endsAt: null };
  return snap;
}
function commit(patch: Partial<SleepSoundSnapshot>, save = false) {
  snap = { ...current(), ...patch };
  if (save) {
    try {
      const { kind, volume, timerMin } = snap;
      window.localStorage.setItem(SLEEP_SOUND_KEY, JSON.stringify({ kind, volume, timerMin }));
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
type Voice = { out: GainNode; dispose: () => void };
let ctx: AudioContext | null = null;
let master: GainNode | null = null; // فید تایمر و توقف
let volGain: GainNode | null = null;
let voice: Voice | null = null;
let tickId: ReturnType<typeof setInterval> | null = null;
const noiseCache: Partial<Record<"white" | "pink" | "brown", AudioBuffer>> = {};

const volCurve = (v: number) => v * v; // حس لگاریتمی‌تر

function makeNoise(c: AudioContext, type: "white" | "pink" | "brown"): AudioBuffer {
  const hit = noiseCache[type];
  if (hit && hit.sampleRate === c.sampleRate) return hit;
  const len = Math.floor(c.sampleRate * 6);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
    }
  }
  // درز حلقه: انتهای بافر رو به ابتدا محو می‌کنیم تا کلیک نیاد
  const x = Math.floor(c.sampleRate * 0.25);
  for (let i = 0; i < x; i++) {
    const t = i / x;
    d[i] = d[i] * t + d[len - x + i] * (1 - t);
  }
  const out = c.createBuffer(1, len - x, c.sampleRate);
  out.getChannelData(0).set(d.subarray(0, len - x));
  noiseCache[type] = out;
  return out;
}

function loopSrc(c: AudioContext, type: "white" | "pink" | "brown"): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = makeNoise(c, type);
  s.loop = true;
  s.loopStart = 0;
  s.start(0, Math.random() * 3);
  return s;
}

function buildVoice(c: AudioContext, kind: SleepSoundKind): Voice {
  const out = c.createGain();
  out.gain.value = 0;
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  let dead = false;

  if (kind === "white" || kind === "pink" || kind === "brown") {
    const s = loopSrc(c, kind); nodes.push(s);
    const g = c.createGain(); g.gain.value = kind === "white" ? 0.3 : kind === "pink" ? 0.55 : 0.6;
    s.connect(g).connect(out);
  } else if (kind === "rain") {
    const s = loopSrc(c, "pink"); nodes.push(s);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
    const g = c.createGain(); g.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = c.createGain(); lfoG.gain.value = 0.08;
    lfo.connect(lfoG).connect(g.gain); lfo.start(); nodes.push(lfo);
    s.connect(hp).connect(lp).connect(g).connect(out);
    // قطره‌های تصادفی
    const wb = makeNoise(c, "white");
    const drop = () => {
      if (dead) return;
      const src = c.createBufferSource(); src.buffer = wb;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 4200; bp.Q.value = 4;
      const eg = c.createGain(); const t = c.currentTime; const peak = 0.05 + Math.random() * 0.12;
      eg.gain.setValueAtTime(0, t); eg.gain.linearRampToValueAtTime(peak, t + 0.004); eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(bp).connect(eg).connect(out);
      src.start(t, Math.random() * 4, 0.06);
      timers.push(setTimeout(drop, 25 + Math.random() * 110));
      if (timers.length > 20) timers.splice(0, timers.length - 4);
    };
    drop();
  } else if (kind === "ocean") {
    const s = loopSrc(c, "brown"); nodes.push(s);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.1;
    const lfoG = c.createGain(); lfoG.gain.value = 0.38;
    lfo.connect(lfoG).connect(g.gain); lfo.start(); nodes.push(lfo);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.1;
    const lfo2G = c.createGain(); lfo2G.gain.value = 250;
    lfo2.connect(lfo2G).connect(lp.frequency); lfo2.start(); nodes.push(lfo2);
    s.connect(lp).connect(g).connect(out);
  } else {
    const s = loopSrc(c, "pink"); nodes.push(s);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = c.createGain(); g.gain.value = 0.55;
    s.connect(lp).connect(g).connect(out);
    const hum = c.createOscillator(); hum.type = "sine"; hum.frequency.value = 110; hum.start(); nodes.push(hum);
    const hg = c.createGain(); hg.gain.value = 0.025;
    hum.connect(hg).connect(out);
  }

  return {
    out,
    dispose() {
      dead = true;
      timers.forEach(clearTimeout);
      nodes.forEach((n) => { try { n.stop(); } catch { /* قبلا متوقف شده */ } });
      try { out.disconnect(); } catch { /* */ }
    },
  };
}

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

function startVoice(kind: SleepSoundKind) {
  const c = ctx; if (!c || !volGain) return;
  const next = buildVoice(c, kind);
  next.out.connect(volGain);
  const t = c.currentTime;
  next.out.gain.setValueAtTime(0, t);
  next.out.gain.linearRampToValueAtTime(1, t + CROSSFADE_S);
  const old = voice;
  voice = next;
  if (old) {
    old.out.gain.cancelScheduledValues(t);
    old.out.gain.setValueAtTime(old.out.gain.value, t);
    old.out.gain.linearRampToValueAtTime(0, t + CROSSFADE_S);
    setTimeout(() => old.dispose(), CROSSFADE_S * 1000 + 100);
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

export function playSleepSound(kind?: SleepSoundKind) {
  const c = ensureCtx();
  if (!c) return;
  const s = current();
  const k = kind ?? s.kind;
  // باید توی همون رویداد کاربر صدا زده بشه (iOS)
  if (c.state !== "running") { try { void c.resume(); } catch { /* */ } }
  const wasPlaying = s.playing;
  if (!wasPlaying) { fading = false; setMaster(1, 0.4); }
  if (!wasPlaying || k !== s.kind) startVoice(k);
  const endsAt = s.timerMin ? (wasPlaying && s.endsAt ? s.endsAt : Date.now() + s.timerMin * 60_000) : null;
  commit({ kind: k, playing: true, endsAt }, true);
  startTick();
}

export function stopSleepSound() {
  stopTick();
  const c = ctx, v = voice;
  voice = null;
  if (c && v) {
    setMaster(0, 0.5);
    setTimeout(() => {
      v.dispose();
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
    stop: stopSleepSound,
    setVolume: setSleepSoundVolume,
    setTimer: setSleepSoundTimer,
  };
}
