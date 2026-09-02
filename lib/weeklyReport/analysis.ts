import { Domain, DomainMetric, DOMAINS, DOMAIN_LABELS_FA } from "./metrics";
import { computeOverallScore } from "./score";
import { WEEK_ORDER } from "@/lib/schedule";
import { daysOfWeek } from "./weekRange";

export type ComparisonEntry = { current: number | null; previousWeek: number | null; avg4Week: number | null };
export type Comparison = Record<Domain, ComparisonEntry>;

function avgOf(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, v) => s + v, 0) / nums.length);
}

export function computeComparison(
  current: Record<Domain, DomainMetric>,
  previous: Record<Domain, DomainMetric>,
  trailing4: Record<Domain, DomainMetric>[]
): Comparison {
  const result = {} as Comparison;
  for (const d of DOMAINS) {
    result[d] = {
      current: current[d].score,
      previousWeek: previous[d].score,
      avg4Week: avgOf(trailing4.map((w) => w[d].score)),
    };
  }
  return result;
}

// میانگین همه‌ی دامنه‌های دارای‌داده در یک روز خاص — برای «بهترین/بدترین روز».
function overallDailyScores(domains: Record<Domain, DomainMetric>): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < 7; i++) {
    const vals = DOMAINS.filter((d) => domains[d].active).map((d) => domains[d].dailyScores[i]).filter((v): v is number => v != null);
    out.push(vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null);
  }
  return out;
}

function weekdayName(index: number): string {
  // dailyScores/daysOfWeek هردو با ترتیب شنبه..جمعه‌ن (weekRange.daysOfWeek)
  return WEEK_ORDER[index]?.name || "";
}

/** حداکثر ۵ مورد، هرکدوم evidence-based — بدون داده‌ی کافی چیزی تولید نمی‌شه. */
export function computeWins(current: Record<Domain, DomainMetric>, comparison: Comparison): string[] {
  const wins: string[] = [];

  // بزرگ‌ترین پیشرفت یک دامنه نسبت به هفته‌ی قبل
  let bestImprovement: { domain: Domain; delta: number } | null = null;
  for (const d of DOMAINS) {
    const c = comparison[d];
    if (c.current == null || c.previousWeek == null) continue;
    const delta = c.current - c.previousWeek;
    if (delta >= 10 && (!bestImprovement || delta > bestImprovement.delta)) bestImprovement = { domain: d, delta };
  }
  if (bestImprovement) {
    wins.push(`${DOMAIN_LABELS_FA[bestImprovement.domain]} ${bestImprovement.delta}٪ نسبت به هفته‌ی قبل بهتر شد`);
  }

  // استریک روتین کامل (۳ روز متوالی ۱۰۰٪)
  const routineDaily = current.routine.dailyScores;
  let streak = 0, maxStreak = 0;
  for (const v of routineDaily) { streak = v === 100 ? streak + 1 : 0; maxStreak = Math.max(maxStreak, streak); }
  if (maxStreak >= 3) wins.push(`${maxStreak} روز متوالی روتین کامل انجام شد`);

  // حضور کامل تمرین
  const fitnessRaw = current.fitness.raw as { completedSessions?: number; expectedSessions?: number | null };
  if (current.fitness.hasData && fitnessRaw.expectedSessions && fitnessRaw.completedSessions === fitnessRaw.expectedSessions) {
    wins.push(`همه‌ی ${fitnessRaw.expectedSessions} جلسه‌ی تمرین این هفته کامل انجام شد`);
  }

  // نرخ برد بالای ترید
  if (current.trading.score != null && current.trading.score >= 70) {
    const raw = current.trading.raw as { totalWins: number; totalClosed: number };
    wins.push(`${current.trading.score}٪ معاملات بسته‌شده‌ی این هفته (${raw.totalWins} از ${raw.totalClosed}) با نتیجه‌ی مثبت بسته شدن`);
  }

  // بهترین روز هفته
  const overallDaily = overallDailyScores(current);
  const bestIdx = overallDaily.reduce((best, v, i) => (v != null && (best == null || v > overallDaily[best]!) ? i : best), null as number | null);
  if (bestIdx != null && overallDaily[bestIdx]! >= 90) {
    wins.push(`بهترین روز هفته، ${weekdayName(bestIdx)} با میانگین ${overallDaily[bestIdx]}٪ بود`);
  }

  return wins.slice(0, 5);
}

/** حداکثر ۳ مورد، هرکدوم evidence-based. */
export function computeProblems(current: Record<Domain, DomainMetric>, comparison: Comparison): string[] {
  const problems: string[] = [];

  let worstDrop: { domain: Domain; delta: number } | null = null;
  for (const d of DOMAINS) {
    const c = comparison[d];
    if (c.current == null || c.previousWeek == null) continue;
    const delta = c.current - c.previousWeek;
    if (delta <= -10 && (!worstDrop || delta < worstDrop.delta)) worstDrop = { domain: d, delta };
  }
  if (worstDrop) {
    problems.push(`${DOMAIN_LABELS_FA[worstDrop.domain]} ${Math.abs(worstDrop.delta)}٪ نسبت به هفته‌ی قبل افت کرد`);
  }

  let lowest: { domain: Domain; score: number } | null = null;
  for (const d of DOMAINS) {
    const m = current[d];
    if (!m.active || m.score == null) continue;
    if (m.score < 40 && (!lowest || m.score < lowest.score)) lowest = { domain: d, score: m.score };
  }
  if (lowest && lowest.domain !== worstDrop?.domain) {
    problems.push(`کمترین امتیاز این هفته مربوط به ${DOMAIN_LABELS_FA[lowest.domain]} با ${lowest.score}٪ بود`);
  }

  const overallDaily = overallDailyScores(current);
  const worstIdx = overallDaily.reduce((worst, v, i) => (v != null && (worst == null || v < overallDaily[worst]!) ? i : worst), null as number | null);
  if (worstIdx != null && overallDaily[worstIdx]! < 40) {
    problems.push(`ضعیف‌ترین روز هفته، ${weekdayName(worstIdx)} با میانگین ${overallDaily[worstIdx]}٪ بود`);
  }

  return problems.slice(0, 3);
}

export type DailyBreakdownDay = { date: string; weekday: string; domains: Partial<Record<Domain, number | null>> };

export function computeDailyBreakdown(weekStart: Date, current: Record<Domain, DomainMetric>): DailyBreakdownDay[] {
  return daysOfWeek(weekStart).map((d, i) => {
    const domains: Partial<Record<Domain, number | null>> = {};
    for (const dom of DOMAINS) {
      if (current[dom].active) domains[dom] = current[dom].dailyScores[i];
    }
    return { date: d.toISOString().slice(0, 10), weekday: weekdayName(i), domains };
  });
}

export { computeOverallScore };
