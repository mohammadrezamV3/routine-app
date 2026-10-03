// چرخه‌های خواب — منطق خالص (بدون fetch/React). پنجره‌ی «چرخه‌های خواب» در
// components/SleepCycleSheet.tsx از این‌جا می‌خونه. هر چرخه تقریبا 90 دقیقه‌ست و
// بیدارشدن نزدیک مرز چرخه معمولا سبک‌تره تا وسط خواب عمیق.
// زمان‌ها «دقیقه‌ی روز» (0..1439) و ساعت‌ها "HH:mm" با ارقام لاتین‌اند.

import { CYCLE_MIN, DEFAULT_LATENCY, minutesToClock } from "./sleep";

export { CYCLE_MIN, DEFAULT_LATENCY };

/** گزینه‌های زمان به خواب رفتن (دقیقه) */
export const LATENCY_PRESETS = [5, 10, 15, 20, 30] as const;
export const MIN_CYCLES = 3;
export const MAX_CYCLES = 6;

/** عدد نامعتبر یا خارج از بازه → نزدیک‌ترین گزینه‌ی مجاز */
export function normalizeLatency(v: unknown): number {
  if (v == null || v === "") return DEFAULT_LATENCY;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return DEFAULT_LATENCY;
  let best: number = LATENCY_PRESETS[0];
  for (const p of LATENCY_PRESETS) if (Math.abs(p - n) < Math.abs(best - n)) best = p;
  return best;
}

export type CycleOption = {
  cycles: number;
  /** "HH:mm" لحظه‌ی بیدارشدن یا دراز کشیدن */
  clock: string;
  /** دقیقه‌ی روز */
  atMin: number;
  /** مدت خواب واقعی (بدون زمان به خواب رفتن) */
  sleepMin: number;
  /** نزدیک‌ترین به مدت هدف */
  best: boolean;
};

const wrap = (m: number) => ((Math.round(m) % 1440) + 1440) % 1440;

/** گزینه‌ای که مدتش به هدف نزدیک‌تره (مساوی → چرخه‌ی بیشتر) */
function markBest(list: Omit<CycleOption, "best">[], goalMin: number): CycleOption[] {
  let bi = -1;
  let bd = Infinity;
  list.forEach((o, i) => {
    const d = Math.abs(o.sleepMin - goalMin);
    if (d < bd || (d === bd && bi >= 0 && o.cycles > list[bi].cycles)) { bd = d; bi = i; }
  });
  return list.map((o, i) => ({ ...o, best: i === bi }));
}

/** اگه از bedMin دراز بکشی، ساعت‌های بیداری برای 3 تا 6 چرخه (زودترین اول) */
export function wakeOptions(bedMin: number, latency: number, goalMin: number): CycleOption[] {
  const list: Omit<CycleOption, "best">[] = [];
  for (let c = MIN_CYCLES; c <= MAX_CYCLES; c++) {
    const at = wrap(bedMin + latency + c * CYCLE_MIN);
    list.push({ cycles: c, atMin: at, clock: minutesToClock(at), sleepMin: c * CYCLE_MIN });
  }
  return markBest(list, goalMin);
}

/** برای بیدارشدن در wakeMin، ساعت‌های دراز کشیدن برای 6/5/4/3 چرخه (زودترین اول) */
export function bedOptions(wakeMin: number, latency: number, goalMin: number): CycleOption[] {
  const list: Omit<CycleOption, "best">[] = [];
  for (let c = MAX_CYCLES; c >= MIN_CYCLES; c--) {
    const at = wrap(wakeMin - latency - c * CYCLE_MIN);
    list.push({ cycles: c, atMin: at, clock: minutesToClock(at), sleepMin: c * CYCLE_MIN });
  }
  return markBest(list, goalMin);
}

/**
 * نقطه‌های مرز چرخه روی پنجره‌ی هدف (برای نشانه‌های ریز روی صفحه‌ی ساعت):
 * هر 90 دقیقه بعد از (ساعت خواب + زمان به خواب رفتن)، تا قبل از ساعت بیداری.
 */
export function cycleBoundaries(bedMin: number, wakeMin: number, latency: number): number[] {
  const total = (((wakeMin - bedMin) % 1440) + 1440) % 1440;
  const out: number[] = [];
  for (let t = latency + CYCLE_MIN; t < total; t += CYCLE_MIN) out.push(wrap(bedMin + t));
  return out;
}

// ── دیشب ─────────────────────────────────────────────────────────────

export type WakeVerdict = "good" | "ok" | "groggy";

export type NightCycles = {
  /** مدت خواب واقعی بعد از کسر زمان به خواب رفتن */
  asleepMin: number;
  fullCycles: number;
  /** دقیقه‌ی گذشته از چرخه‌ی ناقص آخر (0..89) */
  intoCycleMin: number;
  /** فاصله تا نزدیک‌ترین مرز چرخه */
  offBoundaryMin: number;
  verdict: WakeVerdict;
};

/** نزدیک مرز (تا 15 دقیقه) خوب؛ وسط چرخه (بیش از 30 دقیقه از مرز) سنگین؛ بین‌شون معمولی */
export function analyzeNight(totalMin: number, latency: number): NightCycles {
  const asleep = Math.max(0, Math.round(totalMin - latency));
  const full = Math.floor(asleep / CYCLE_MIN);
  const into = asleep - full * CYCLE_MIN;
  const off = Math.min(into, CYCLE_MIN - into);
  const verdict: WakeVerdict = off <= 15 ? "good" : off > 30 ? "groggy" : "ok";
  return { asleepMin: asleep, fullCycles: full, intoCycleMin: into, offBoundaryMin: off, verdict };
}

export type Stage = "awake" | "rem" | "light" | "deep";
export type StageSegment = { stage: Stage; from: number; to: number };

// سهم هر مرحله در چرخه‌ی i ام: عمیق در چرخه‌های اول زیاد و بعد کم، REM برعکس.
const DEEP = [0.32, 0.26, 0.16, 0.08, 0.04, 0.02];
const REM = [0.08, 0.14, 0.22, 0.28, 0.32, 0.34];

/**
 * الگوی تخمینی مراحل خواب (نه اندازه‌گیری واقعی): اول زمان به خواب رفتن
 * (بیدار)، بعد برای هر چرخه سبک ← عمیق ← سبک ← REM. زمان‌ها از لحظه‌ی دراز
 * کشیدن (دقیقه) و پیوسته‌ان؛ آخر الگو به مدت واقعی خواب بریده می‌شه.
 */
export function hypnogram(totalMin: number, latency: number): StageSegment[] {
  const segs: StageSegment[] = [];
  const total = Math.max(0, Math.round(totalMin));
  const lat = Math.min(Math.max(0, latency), total);
  let t = 0;
  const push = (stage: Stage, len: number) => {
    if (len <= 0 || t >= total) return;
    const to = Math.min(total, t + len);
    segs.push({ stage, from: t, to });
    t = to;
  };
  push("awake", lat);
  for (let i = 0; t < total; i++) {
    const k = Math.min(i, DEEP.length - 1);
    const deep = CYCLE_MIN * DEEP[k], rem = CYCLE_MIN * REM[k];
    const light = CYCLE_MIN - deep - rem;
    push("light", light * 0.4);
    push("deep", deep);
    push("light", light * 0.6);
    push("rem", rem);
  }
  return segs;
}

export const STAGE_LABEL: Record<Stage, string> = { awake: "بیدار", rem: "REM", light: "سبک", deep: "عمیق" };
