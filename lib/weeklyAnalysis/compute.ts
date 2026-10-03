import { prisma } from "@/lib/prisma";
import {
  ANALYSIS_DOMAINS, ANALYSIS_DOMAIN_MODULE,
  type AnalysisDomain, type DayCell, type DayDetails, type DomainResult, type TrendPoint, type WeeklyAnalysis,
} from "./types";
import { computeDomainWeeks, type DomainEnv, type DomainWeek, type WeekSpec } from "./domains";
import { confidenceFor, consistencyFor, dayScores, gradeFor, overallScore } from "./score";
import { buildInsights } from "./insights";
import { buildAchievements } from "./achievements";
import { predictWeek } from "./prediction";
import { detectArchetype } from "./archetype";
import { buildHeadline } from "./headline";
import { buildNumbers } from "./numbers";
import { weekFacts, type FactDay } from "./facts";
import {
  daysElapsed as daysElapsedFor, daysOfWeekIso, getWeekRange, safeTimezone, todayIso, weekLabelFa, weekdayFa,
} from "./week";

// نقطه‌ی ورود موتور آنالیز هفتگی. بخش‌های ai/goals/reflection رو لایه‌ی
// API اضافه می‌کنه؛ این‌جا فقط چیزهایی‌ه که از داده‌ی خام ماژول‌ها درمیاد.

const TREND_WEEKS = 8;

/** دامنه‌های فعال کاربر — سوپریوزر همه، وگرنه ModuleAccess فعال و منقضی‌نشده. */
async function activeDomains(userId: string, isSuperAdmin: boolean): Promise<AnalysisDomain[]> {
  if (isSuperAdmin) return [...ANALYSIS_DOMAINS];
  const rows = await prisma.moduleAccess.findMany({
    where: { userId, active: true },
    select: { module: true, expiresAt: true },
  });
  const now = Date.now();
  const ok = new Set(rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > now).map((r) => String(r.module)));
  return ANALYSIS_DOMAINS.filter((d) => ok.has(ANALYSIS_DOMAIN_MODULE[d]));
}

function weekSpecs(timezone: string, offset: number, count: number, now: Date): WeekSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const { weekStartIso } = getWeekRange(timezone, offset - (count - 1 - i), now);
    return { weekStartIso, days: daysOfWeekIso(weekStartIso) };
  });
}

/** برای همه‌ی دامنه‌ها، همه‌ی هفته‌ها — هر دامنه یک‌بار کوئری (موازی). */
async function computeAll(userId: string, domains: AnalysisDomain[], weeks: WeekSpec[], env: DomainEnv) {
  const res = await Promise.all(domains.map((d) => computeDomainWeeks(d, userId, weeks, env)));
  return new Map<AnalysisDomain, DomainWeek[]>(domains.map((d, i) => [d, res[i]]));
}

function normOffset(offset: number): number {
  const o = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  return Math.min(0, Math.max(-520, o)); // هفته‌ی آینده معنا نداره
}

/** بخش محاسبه‌شده‌ی آنالیز — هرچی لایه‌ی service بعدا اضافه می‌کنه (AI، اهداف، ریفلکشن، هفته‌نامه‌ی خوانده‌نشده) بیرونه. */
export type WeeklyAnalysisBase = Omit<WeeklyAnalysis, "ai" | "aiAvailable" | "goals" | "nextWeekGoals" | "reflection" | "unreadLetter">;

export async function computeWeeklyAnalysis(
  userId: string,
  opts: { timezone: string; offset: number; isSuperAdmin: boolean; now?: Date }
): Promise<WeeklyAnalysisBase> {
  const now = opts.now ?? new Date();
  const tz = safeTimezone(opts.timezone);
  const offset = normOffset(opts.offset);
  const env: DomainEnv = { timezone: tz, todayIso: todayIso(tz, now) };

  const weeks = weekSpecs(tz, offset, TREND_WEEKS, now);
  const domains = await activeDomains(userId, opts.isSuperAdmin);
  const all = await computeAll(userId, domains, weeks, env);
  const cur = TREND_WEEKS - 1;
  const week = weeks[cur];

  // ── ترند: امتیاز کل هر هفته با همون منطق امتیاز کل ──
  const trend: TrendPoint[] = weeks.map((w, i) => {
    const ds = domains.map((d) => all.get(d)![i].result);
    return {
      weekStart: w.weekStartIso,
      score: overallScore(ds),
      domains: Object.fromEntries(ds.map((r) => [r.domain, r.score])),
    };
  });

  // ── دامنه‌ها + مقایسه با هفته‌ی قبل ──
  // دامنه‌ای که در کل ۸ هفته هیچ داده‌ای نداشته (مثلا خواب/کارها که فعلا
  // هیچ مسیری در اپ براشون ردیف نمی‌سازه) کارت خالی دائمی می‌شد — مخفی.
  // اگه هیچ دامنه‌ای داده نداشت، همه می‌مونن تا حالت خالی UI نشون داده بشه.
  const withHistory = domains.filter((d) => all.get(d)!.some((w) => w.result.hasData));
  const shown = withHistory.length ? withHistory : domains;
  const domainResults: DomainResult[] = shown.map((d) => {
    const r = all.get(d)![cur].result;
    const prev = all.get(d)![cur - 1].result;
    const prevScore = prev.hasData ? prev.score : null;
    return {
      ...r,
      prevScore,
      delta: r.score != null && prevScore != null ? r.score - prevScore : null,
    };
  });

  // ── روزها ──
  const dScores = dayScores(domainResults);
  const days: DayCell[] = week.days.map((iso, i) => {
    const isFuture = iso > env.todayIso;
    // جزئیات خام همه‌ی دامنه‌های نمایش‌داده‌شده برای این روز (بدون کلید = بدون داده)
    const details: DayDetails = Object.assign({}, ...shown.map((d) => all.get(d)![cur].details[i]));
    return {
      date: iso,
      weekday: weekdayFa(iso),
      score: isFuture ? null : dScores[i],
      isToday: iso === env.todayIso,
      isFuture,
      details,
    };
  });
  // امتیاز روزهای هفته‌ی قبل — برای مقایسه‌ی روزبه‌روز (سایه‌ی هفته‌ی قبل در نمودار)
  const prevDays = dayScores(shown.map((d) => ({ domain: d, daily: all.get(d)![cur - 1].result.daily })));
  const scoredDays = days.filter((d) => d.score != null);
  const activeDays = week.days.filter((_, i) => domainResults.some((r) => r.daily[i] != null)).length;
  let bestDay: DayCell | null = null;
  let worstDay: DayCell | null = null;
  if (scoredDays.length >= 2) {
    bestDay = scoredDays.reduce((a, b) => (b.score! > a.score! ? b : a));
    worstDay = scoredDays.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (bestDay.date === worstDay.date) worstDay = null;
  }

  const elapsed = daysElapsedFor(tz, week.weekStartIso, now);
  const isCurrent = offset === 0;
  const score = trend[cur].score;
  const prevScore = trend[cur - 1].score;
  const grade = gradeFor(score);

  const insights = buildInsights({
    domains: domainResults,
    days,
    overallScore: score,
    prevOverallScore: prevScore,
    history: trend.slice(0, cur).map((t) => t.score),
  });

  const achievements = buildAchievements({
    domains: domains.map((d) => {
      const w = all.get(d)![cur];
      return { domain: d, hasData: w.result.hasData, daily: w.result.daily, meta: w.meta };
    }),
    days,
    score,
    prevScore,
    grade,
    activeDays,
  });

  // ── واقعیت‌های هفته → اعداد، تیتر، تیپ ──
  const factDays = (wk: number): FactDay[] =>
    weeks[wk].days.map((iso, i) => ({
      details: Object.assign({}, ...shown.map((d) => all.get(d)![wk].details[i])),
      closed: iso < env.todayIso,
    }));
  const curFacts = weekFacts(factDays(cur));
  const prevFacts = weekFacts(factDays(cur - 1));
  const prevActiveDays = weeks[cur - 1].days.filter((_, i) => shown.some((d) => all.get(d)![cur - 1].result.daily[i] != null)).length;
  const learningMeta = shown.includes("learning") && all.get("learning")![cur].result.hasData ? all.get("learning")![cur].meta : null;
  const effElapsed = isCurrent ? elapsed : 7;

  const numbers = buildNumbers({
    cur: curFacts,
    prev: prevFacts,
    activeDays,
    prevActiveDays: prevFacts.routine || prevFacts.sleep || prevFacts.tasks || prevFacts.fitness || prevFacts.nutrition || prevFacts.trading ? prevActiveDays : null,
    learning: learningMeta ? { done: learningMeta.done ?? 0, total: learningMeta.total ?? 0, activeDays: learningMeta.activeDays ?? 0 } : null,
  });
  const headline = buildHeadline({
    isCurrentWeek: isCurrent,
    daysElapsed: effElapsed,
    score,
    prevScore,
    activeDays,
    dayScores: days.map((d) => d.score),
    domains: domainResults.map((r) => ({ domain: r.domain, delta: r.delta })),
    sleepHours: { cur: curFacts.sleep?.avgHours ?? null, prev: prevFacts.sleep?.avgHours ?? null },
  });
  const consistency = consistencyFor(days.map((d) => d.score));
  const archetype = detectArchetype({
    isCurrentWeek: isCurrent,
    daysElapsed: effElapsed,
    score,
    prevScore,
    consistency,
    activeDays,
    dayScores: days.map((d) => d.score),
    dayNames: days.map((d) => d.weekday),
    domains: domainResults.map((r) => ({ domain: r.domain, score: r.score })),
  });

  const prediction = predictWeek({
    isCurrentWeek: isCurrent,
    daysElapsed: elapsed,
    currentScore: score,
    dayScores: days.map((d) => d.score),
    baseline: trend.slice(0, cur).map((t) => t.score),
  });

  return {
    weekStart: week.weekStartIso,
    weekEnd: week.days[6],
    weekLabel: weekLabelFa(week.weekStartIso),
    offset,
    isCurrentWeek: isCurrent,
    daysElapsed: isCurrent ? elapsed : 7,
    overall: {
      score,
      prevScore,
      delta: score != null && prevScore != null ? score - prevScore : null,
      grade,
      confidence: confidenceFor(activeDays, isCurrent ? elapsed : 7),
      consistency,
      activeDays,
      bestDay,
      worstDay,
    },
    domains: domainResults,
    days,
    trend,
    insights,
    achievements,
    prediction,
    headline,
    archetype,
    prevDays,
    numbers,
  };
}

/** امتیاز هر دامنه‌ی فعال در یک هفته — برای ارزیابی اهداف هفتگی در لایه‌ی API. */
export async function computeDomainScoresForWeek(
  userId: string,
  timezone: string,
  offset: number,
  isSuperAdmin: boolean,
  now: Date = new Date()
): Promise<Partial<Record<AnalysisDomain, number | null>>> {
  const tz = safeTimezone(timezone);
  const env: DomainEnv = { timezone: tz, todayIso: todayIso(tz, now) };
  const weeks = weekSpecs(tz, normOffset(offset), 1, now);
  const domains = await activeDomains(userId, isSuperAdmin);
  const all = await computeAll(userId, domains, weeks, env);
  return Object.fromEntries(domains.map((d) => [d, all.get(d)![0].result.score]));
}
