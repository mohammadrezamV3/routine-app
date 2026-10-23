// منطق خالص کارت «هفت شب اخیر»: مدل هر شب، بهترین شب، نوسان ساعت خواب و
// اختلاف با هدف. بدون وابستگی به React تا تست‌پذیر بمونه.
import { addDaysIso, circularMeanMinutes, minuteOfDay, scoreBand, sleepMinutes, type ScoreBand, type SleepRecord } from "@/lib/sleep";

export type WeekNight = {
  iso: string;
  rec: SleepRecord | null;
  min: number;
  score: number | null;
  band: ScoreBand | null;
  /** مدت منهای هدف (دقیقه، می‌تونه منفی باشه)؛ null وقتی ثبت نشده */
  diffGoal: number | null;
};

/** هفت شب منتهی به todayIso (قدیمی به جدید) */
export function buildWeekNights(
  todayIso: string,
  records: SleepRecord[],
  scores: { date: string; score: number }[],
  goalMin: number,
  count = 7,
): WeekNight[] {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const scoreBy = new Map(scores.map((s) => [s.date, s.score]));
  const out: WeekNight[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const iso = addDaysIso(todayIso, -i);
    const r = byDate.get(iso) ?? null;
    const rec = r && sleepMinutes(r) > 0 ? r : null;
    const min = rec ? sleepMinutes(rec) : 0;
    const score = rec ? scoreBy.get(iso) ?? null : null;
    out.push({ iso, rec, min, score, band: score != null ? scoreBand(score) : null, diffGoal: rec ? min - goalMin : null });
  }
  return out;
}

/** آخرین شب ثبت‌شده */
export function lastLogged(nights: WeekNight[]): WeekNight | null {
  for (let i = nights.length - 1; i >= 0; i--) if (nights[i].rec) return nights[i];
  return null;
}

/** بهترین شب: بیشترین امتیاز، در تساوی مدت بلندتر؛ بدون امتیاز null */
export function bestNight(nights: WeekNight[]): WeekNight | null {
  let best: WeekNight | null = null;
  for (const n of nights) {
    if (!n.rec || n.score == null) continue;
    if (!best || n.score > (best.score as number) || (n.score === best.score && n.min > best.min)) best = n;
  }
  return best;
}

/** پراکندگی ساعت خواب (دقیقه، بیشینه منهای کمینه نسبت به میانگین دایره‌ای)؛ کمتر از 3 شب = null */
export function bedSpread(recs: Pick<SleepRecord, "sleptAt">[]): number | null {
  if (recs.length < 3) return null;
  const mins = recs.map((r) => minuteOfDay(r.sleptAt));
  const mean = circularMeanMinutes(mins);
  if (mean === null) return null;
  const dev = mins.map((m) => ((m - mean + 1440 + 720) % 1440) - 720);
  return Math.round(Math.max(...dev) - Math.min(...dev));
}

/** میانگین مدت شب‌های ثبت‌شده (دقیقه) یا null */
export function weekAverage(nights: WeekNight[]): number | null {
  const l = nights.filter((n) => n.rec);
  return l.length ? Math.round(l.reduce((a, n) => a + n.min, 0) / l.length) : null;
}

/** ارتفاع ستون: نسبت مدت به سقف، با حداقل برای دیده‌شدن */
export function barHeight(min: number, maxMin: number, full: number, minH: number): number {
  if (min <= 0) return 0;
  return Math.max(minH, Math.min(1, min / maxMin) * full);
}

/** اختلاف با هدف به شکل علامت‌دار: +0:30 یا -1:05 (نویسه‌ی منفی ASCII) */
export function signedDuration(diffMin: number): string {
  const a = Math.abs(Math.round(diffMin));
  const h = Math.floor(a / 60), m = a % 60;
  const body = `${h}:${String(m).padStart(2, "0")}`;
  if (a < 5) return "0:00";
  return `${diffMin > 0 ? "+" : "-"}${body}`;
}

/** سطح اختلاف با هدف: within = تا 30 دقیقه، over/under */
export function goalDiffKind(diffMin: number): "within" | "over" | "under" {
  if (Math.abs(diffMin) <= 30) return "within";
  return diffMin > 0 ? "over" : "under";
}
