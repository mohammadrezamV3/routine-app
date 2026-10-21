// منطق خالص پنجره‌های خواب (ثبت، هدف، چرخه‌ها): جابه‌جایی ساعت، پیش‌تنظیم‌های
// مدت، پیشنهاد چرخه‌ای برای هدف و هشدار بازه‌ی نامعقول. بدون React و fetch.

import { CYCLE_MIN, minutesToClock, SLEEP_MAX_MIN, SLEEP_MIN_MIN } from "./sleep";

export const NUDGE_MIN = 15;

/** مدت‌های آماده‌ی ثبت خواب و هدف (دقیقه) */
export const DURATION_PRESETS_MIN = [360, 420, 450, 480, 540] as const;
/** مدت‌های آماده‌ی هدف خواب (دقیقه) */
export const GOAL_PRESETS_MIN = [420, 450, 480, 510, 540] as const;

/** "HH:mm" → دقیقه‌ی روز، یا null اگه کامل و معتبر نیست */
export function clockMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}

/** ساعت رو delta دقیقه جابه‌جا می‌کنه (دور نیمه‌شب می‌چرخه). ورودی نامعتبر → همون ورودی */
export function shiftClock(v: string, delta: number): string {
  const m = clockMin(v);
  if (m === null) return v;
  return minutesToClock(m + delta);
}

/** فاصله‌ی ساعت خواب تا ساعت بیداری (دقیقه، 1..1440؛ برابر → 1440) */
export function spanMin(bed: string, wake: string): number | null {
  const b = clockMin(bed), w = clockMin(wake);
  if (b === null || w === null) return null;
  const d = (((w - b) % 1440) + 1440) % 1440;
  return d === 0 ? 1440 : d;
}

/** ساعت خواب برای رسیدن به مدت dur با ساعت بیداری ثابت */
export function bedForDuration(wake: string, durMin: number): string | null {
  const w = clockMin(wake);
  return w === null ? null : minutesToClock(w - durMin);
}

/** ساعت بیداری برای رسیدن به مدت dur با ساعت خواب ثابت */
export function wakeForDuration(bed: string, durMin: number): string | null {
  const b = clockMin(bed);
  return b === null ? null : minutesToClock(b + durMin);
}

export type DurationWarning = "invalid" | "short" | "long" | null;

/** هشدار مدت: خارج از 30 دقیقه تا 20 ساعت نامعتبره؛ زیر 4 ساعت یا بالای 12 ساعت غیرعادی */
export function durationWarning(durMin: number | null): DurationWarning {
  if (durMin == null || durMin < SLEEP_MIN_MIN || durMin > SLEEP_MAX_MIN) return "invalid";
  if (durMin < 240) return "short";
  if (durMin > 720) return "long";
  return null;
}

/** تعداد چرخه‌ی کامل یک خواب (بعد از کسر زمان به خواب رفتن) */
export function fullCyclesOf(durMin: number, latency: number): number {
  return Math.max(0, Math.floor((durMin - latency) / CYCLE_MIN));
}

export type GoalSuggestion = {
  cycles: number;
  /** ساعت دراز کشیدن */
  bed: string;
  /** مدت خواب واقعی (دقیقه) */
  sleepMin: number;
  /** مدت از دراز کشیدن تا بیداری (شامل زمان به خواب رفتن) */
  spanMin: number;
  /** نزدیک‌ترین به مدت هدف فعلی */
  best: boolean;
};

/**
 * برای ساعت بیداری مشخص، ساعت خواب‌های چرخه‌ای (4 تا 6 چرخه) — زودترین اول.
 * best = نزدیک‌ترین به مدت مرجع (refSpanMin).
 */
export function goalSuggestions(wake: string, latency: number, refSpanMin: number): GoalSuggestion[] {
  const w = clockMin(wake);
  if (w === null) return [];
  const list = [6, 5, 4].map((c) => {
    const span = c * CYCLE_MIN + latency;
    return { cycles: c, bed: minutesToClock(w - span), sleepMin: c * CYCLE_MIN, spanMin: span, best: false };
  });
  let bi = 0;
  list.forEach((o, i) => { if (Math.abs(o.spanMin - refSpanMin) < Math.abs(list[bi].spanMin - refSpanMin)) bi = i; });
  list[bi].best = true;
  return list;
}

/** مدت‌های هدف قابل تنظیم: کف 6 و سقف 10 ساعت (هم‌راستا با goalFromTargets) */
export function clampGoalSpan(min: number): number {
  return Math.min(600, Math.max(360, Math.round(min)));
}

/** برچسب کوتاه ساعت برای دکمه‌ها: 450 → 7.5 */
export function hoursShort(min: number): string {
  const h = min / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

export type HourTick = { /** 0..1 روی محور زمان */ at: number; label: string };

/**
 * برچسب‌های ساعت روی محور نمودار مراحل: از ساعت شروع (HH:mm)، هر ساعت‌گرد داخل
 * بازه‌ی totalMin؛ برای بازه‌های کوتاه هر ساعت و برای بلند هر 2 ساعت. تیک‌های
 * خیلی نزدیک به دو سر حذف می‌شن تا با برچسب شروع/پایان روی هم نیفتن.
 */
export function hourTicks(startClock: string, totalMin: number): HourTick[] {
  const s = clockMin(startClock);
  if (s === null || totalMin <= 0) return [];
  const step = totalMin > 6 * 60 ? 120 : 60;
  const out: HourTick[] = [];
  const first = Math.ceil(s / step) * step;
  for (let t = first; t - s < totalMin; t += step) {
    const off = t - s;
    const at = off / totalMin;
    if (at < 0.14 || at > 0.86) continue;
    out.push({ at, label: minutesToClock(t) });
  }
  return out;
}

/** مجموع دقیقه‌ی هر مرحله از قطعه‌های hypnogram */
export function stageTotals(segs: { stage: string; from: number; to: number }[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const s of segs) t[s.stage] = (t[s.stage] ?? 0) + (s.to - s.from);
  return t;
}
