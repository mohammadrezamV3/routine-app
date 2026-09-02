import { prisma } from "@/lib/prisma";
import { isoLocal } from "@/lib/jalali";
import { Domain, DomainMetric, DOMAINS, DOMAIN_LABELS_FA } from "./metrics";
import { DailyBreakdownDay } from "./analysis";
import { TrailingWeek } from "./trailing";

// ============================================================================
// V2 — لایه‌ی الگوی قطعی (Deterministic)، قبل از AI. خروجی این فایل عینا
// به‌عنوان ورودی AI Interpretation می‌ره (نه دیتابیس خام) — پس هر عددی
// این‌جا واقعیه، AI فقط تفسیر زبانی همین اعداد رو می‌نویسه.
// ============================================================================

function avg(nums: number[]): number {
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

// ---------------------------------------------------------------- Trend ----
export type TrendDirection = "up" | "down" | "flat" | "insufficient";
export type Trend = { domain: Domain; direction: TrendDirection; weeksConsidered: number };

/** حداقل ۳ نقطه (این‌هفته + ≥۲ هفته‌ی قبل) لازمه، وگرنه insufficient. */
export function detectTrends(currentMetrics: Record<Domain, DomainMetric>, trailingWeeks: TrailingWeek[]): Trend[] {
  const trends: Trend[] = [];
  for (const d of DOMAINS) {
    if (!currentMetrics[d].active) continue;
    const chronological = [...trailingWeeks].reverse().map((w) => w.metrics[d].score).concat(currentMetrics[d].score);
    const points = chronological.filter((v): v is number => v != null);
    if (points.length < 3) { trends.push({ domain: d, direction: "insufficient", weeksConsidered: points.length }); continue; }
    const mid = Math.floor(points.length / 2);
    const delta = avg(points.slice(mid)) - avg(points.slice(0, mid));
    trends.push({ domain: d, direction: delta > 5 ? "up" : delta < -5 ? "down" : "flat", weeksConsidered: points.length });
  }
  return trends;
}

// --------------------------------------------------------------- Streak ----
export type StreakInfo = { domain: Domain; currentStreakDays: number };
const MAX_STREAK_LOOKBACK_DAYS = 60;

async function scanBackwardStreak(
  since: Date, isDayComplete: (dateIso: string) => boolean
): Promise<number> {
  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1); // امروز ممکنه هنوز ناتمام باشه — از دیروز شروع می‌کنیم
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS && cursor >= since; i++) {
    if (!isDayComplete(isoLocal(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function routineStreak(userId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - MAX_STREAK_LOOKBACK_DAYS);
  const entries = await prisma.dailyEntry.findMany({ where: { userId, date: { gte: since } }, select: { date: true, completedItems: true } });
  const byDate = new Map(entries.map((e) => [isoLocal(e.date), e.completedItems as Record<string, boolean>]));
  return scanBackwardStreak(since, (iso) => {
    const items = byDate.get(iso);
    return !!items && Object.keys(items).length > 0 && Object.values(items).every(Boolean);
  });
}

async function fitnessStreak(userId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - MAX_STREAK_LOOKBACK_DAYS);
  const logs = await prisma.exerciseLog.findMany({ where: { userId, date: { gte: since } }, select: { date: true, completed: true } });
  const byDate = new Map(logs.map((l) => [isoLocal(l.date), l.completed]));
  return scanBackwardStreak(since, (iso) => byDate.get(iso) === true);
}

export async function detectStreaks(userId: string, activeDomains: Domain[]): Promise<StreakInfo[]> {
  const results: StreakInfo[] = [];
  if (activeDomains.includes("routine")) results.push({ domain: "routine", currentStreakDays: await routineStreak(userId) });
  if (activeDomains.includes("fitness")) results.push({ domain: "fitness", currentStreakDays: await fitnessStreak(userId) });
  return results.filter((s) => s.currentStreakDays >= 2); // استریک ۰-۱ روزه چیزی برای گفتن نداره
}

// -------------------------------------------------------------- Outlier ----
export type Outlier = { domain: Domain; date: string; weekday: string; value: number; typicalRange: [number, number] };

/**
 * روزی که امتیازش نسبت به میانگین همون دامنه در هفته‌های اخیر خیلی فاصله
 * داره (بیش از ۴۰ امتیاز اختلاف) — چون داده‌ی خام واحدهای فیزیکی (دقیقه‌ی
 * تمرین، حجم معامله) در schema نیست، این‌جا روی امتیاز نرمال‌شده‌ی ۰-۱۰۰
 * کار می‌کنه، نه واحد خام (محدودیت داده، نه انتخاب).
 */
export function detectOutliers(currentDaily: DailyBreakdownDay[], trailingWeeks: TrailingWeek[]): Outlier[] {
  const outliers: Outlier[] = [];
  for (const d of DOMAINS) {
    const historical = trailingWeeks.flatMap((w) => w.daily.map((day) => day.domains[d])).filter((v): v is number => v != null);
    if (historical.length < 5) continue;
    const mean = avg(historical);
    for (const day of currentDaily) {
      const v = day.domains[d];
      if (v == null) continue;
      if (Math.abs(v - mean) >= 40) {
        outliers.push({ domain: d, date: day.date, weekday: day.weekday, value: v, typicalRange: [Math.max(0, Math.round(mean - 15)), Math.min(100, Math.round(mean + 15))] });
      }
    }
  }
  return outliers;
}

// ----------------------------------------------------------- Correlation ---
export type Correlation = { domainA: Domain; domainB: Domain; withActiveAvg: number; withoutActiveAvg: number; sampleWith: number; sampleWithout: number };
const MIN_CORRELATION_SAMPLE = 4;

/**
 * برای هر جفت دامنه‌ی فعال: روزهایی که A داده داشته در برابر روزهایی که
 * نداشته، میانگین B رو مقایسه می‌کنه. حداقل نمونه اجباریه؛ خروجی همیشه
 * «همبستگی»، هیچ‌وقت «علت» (بند ۱۹/۲۶).
 */
export function detectCorrelations(activeDomains: Domain[], allDays: DailyBreakdownDay[]): Correlation[] {
  const correlations: Correlation[] = [];
  for (const a of activeDomains) {
    for (const b of activeDomains) {
      if (a === b) continue;
      const withA: number[] = [];
      const withoutA: number[] = [];
      for (const day of allDays) {
        const bVal = day.domains[b];
        if (bVal == null) continue;
        const aVal = day.domains[a];
        if (aVal != null && aVal >= 70) withA.push(bVal);
        else if (aVal != null) withoutA.push(bVal);
      }
      if (withA.length < MIN_CORRELATION_SAMPLE || withoutA.length < MIN_CORRELATION_SAMPLE) continue;
      const withAvg = Math.round(avg(withA));
      const withoutAvg = Math.round(avg(withoutA));
      if (Math.abs(withAvg - withoutAvg) < 10) continue; // اختلاف کوچیک ارزش گزارش‌شدن نداره
      correlations.push({ domainA: a, domainB: b, withActiveAvg: withAvg, withoutActiveAvg: withoutAvg, sampleWith: withA.length, sampleWithout: withoutA.length });
    }
  }
  return correlations.sort((x, y) => Math.abs(y.withActiveAvg - y.withoutActiveAvg) - Math.abs(x.withActiveAvg - x.withoutActiveAvg)).slice(0, 3);
}

export function patternsSummaryForAi(trends: Trend[], streaks: StreakInfo[], outliers: Outlier[], correlations: Correlation[]) {
  return {
    trends: trends.filter((t) => t.direction !== "insufficient").map((t) => ({ domain: DOMAIN_LABELS_FA[t.domain], direction: t.direction })),
    streaks: streaks.map((s) => ({ domain: DOMAIN_LABELS_FA[s.domain], days: s.currentStreakDays })),
    outliers: outliers.map((o) => ({ domain: DOMAIN_LABELS_FA[o.domain], weekday: o.weekday, value: o.value, typicalRange: o.typicalRange })),
    correlations: correlations.map((c) => ({
      domainA: DOMAIN_LABELS_FA[c.domainA], domainB: DOMAIN_LABELS_FA[c.domainB],
      withActiveAvg: c.withActiveAvg, withoutActiveAvg: c.withoutActiveAvg,
    })),
  };
}
