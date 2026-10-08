// کپی برنامه/قالب و جابه‌جایی تاریخ — تابع‌های خالص، بدون import سروری،
// تا هم روت duplicate و هم ویرایشگر کلاینت (پیش‌پرکردن از قالب) از همین
// یک منطق استفاده کنند و «تاریخ پایان» در دو جا دو جور حساب نشود.

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(iso: string): number {
  return Date.parse(iso.slice(0, 10) + "T00:00:00.000Z");
}

/** YYYY-MM-DD از یک رشته‌ی ISO یا @db.Date؛ نامعتبر → null */
export function isoDay(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = v.slice(0, 10);
  return ISO_RE.test(d) && !Number.isNaN(toUtc(d)) ? d : null;
}

export function shiftIso(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** تعداد روز از a تا b (b − a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** طول بازه‌ی برنامه به روز؛ فقط وقتی هر دو تاریخ هست و پایان ≥ شروع */
export function rangeDuration(startIso: string | null | undefined, endIso: string | null | undefined): number | null {
  const s = isoDay(startIso);
  const e = isoDay(endIso);
  if (!s || !e) return null;
  const d = daysBetween(s, e);
  return d >= 0 ? d : null;
}

/**
 * بازه‌ی برنامه‌ی کپی‌شده: شروع تازه + همان طول مبدا. بدون شروع تازه،
 * برنامه بی‌تاریخ می‌ماند (از روز پذیرش شروع می‌شود).
 */
export function shiftedRange(durationDays: number | null, newStartIso: string | null): { startDate: string | null; endDate: string | null } {
  const s = isoDay(newStartIso);
  if (!s) return { startDate: null, endDate: null };
  return { startDate: s, endDate: durationDays != null && durationDays >= 0 ? shiftIso(s, durationDays) : null };
}

/**
 * شروع پیش‌فرض برای «دوره‌ی بعد»: روز بعد از پایان برنامه‌ی مبدا، ولی
 * هرگز قبل از امروز.
 */
export function nextPeriodStart(sourceEndIso: string | null | undefined, todayIso: string): string {
  const e = isoDay(sourceEndIso);
  if (!e) return todayIso;
  const next = shiftIso(e, 1);
  return next > todayIso ? next : todayIso;
}

/** شکل آیتمی که هم از برنامه و هم از قالب می‌آید */
export type CopyableItem = {
  title: string;
  details?: string | null;
  repeat?: string;
  days?: number[];
  startTime?: string | null;
  durationMin?: number | null;
  sets?: number | null;
  reps?: string | null;
  weightKg?: number | null;
  restSec?: number | null;
};

/** آیتم → بدنه‌ی ItemInput API (فیلدهای خالی حذف می‌شوند) */
export function toItemInput(i: CopyableItem): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: i.title,
    repeat: i.repeat === "DAILY" ? "DAILY" : "WEEKLY",
    days: Array.isArray(i.days) ? [...i.days] : [],
  };
  if (i.details) out.details = i.details;
  if (i.startTime) out.startTime = i.startTime;
  if (i.durationMin != null) out.durationMin = i.durationMin;
  if (i.sets != null) out.sets = i.sets;
  if (i.reps) out.reps = i.reps;
  if (i.weightKg != null) out.weightKg = i.weightKg;
  if (i.restSec != null) out.restSec = i.restSec;
  return out;
}
