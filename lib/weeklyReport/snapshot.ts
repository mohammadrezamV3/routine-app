import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReportSummaryV2, WeeklyReportAiInputV2, WeeklyReportAiInsight, WeeklyRecommendation } from "@/lib/aiClient";
import { getUserWeekRange } from "./weekRange";
import { Domain, DomainMetric, DOMAINS, DOMAIN_LABELS_FA, computeAllDomainMetrics, resolveActiveModules } from "./metrics";
import { computeOverallScore, confidenceFromDaysWithData, Confidence } from "./score";
import { computeComparison, computeWins, computeProblems, computeDailyBreakdown, Comparison, DailyBreakdownDay } from "./analysis";
import { computeTrailingWeeks, TrailingWeek } from "./trailing";
import { detectTrends, detectStreaks, detectOutliers, detectCorrelations, patternsSummaryForAi, Trend, StreakInfo, Outlier, Correlation } from "./patterns";
import { computeBaselines, computePrediction, Baseline, Prediction } from "./baseline";

export const ALGORITHM_VERSION = 1;
export type ReportStatus = "COLLECTING" | "READY" | "PARTIAL" | "FAILED";

export type DomainScoreOut = { active: boolean; hasData: boolean; score: number | null; confidence: Confidence };
export type PatternsOut = { trends: Trend[]; streaks: StreakInfo[]; outliers: Outlier[]; correlations: Correlation[] };
export type WeeklyReportData = {
  weekStart: string;
  weekEnd: string;
  status: ReportStatus;
  algorithmVersion: number;
  overallScore: number | null;
  confidence: Confidence;
  domainScores: Record<Domain, DomainScoreOut>;
  dailyBreakdown: DailyBreakdownDay[];
  wins: string[];
  problems: string[];
  comparison: Comparison;
  aiModel: string | null;
  aiSummary: string | null;
  aiRecommendations: WeeklyRecommendation[] | null;
  patterns: PatternsOut | null;
  aiInsights: WeeklyReportAiInsight[] | null;
  baselines: Baseline[];
  prediction: Prediction;
  isFromCache: boolean;
};

async function activeModulesForUser(userId: string, isSuperAdmin: boolean): Promise<Set<ModuleKey>> {
  const moduleAccess = await prisma.moduleAccess.findMany({ where: { userId }, select: { module: true, active: true, expiresAt: true } });
  return resolveActiveModules(isSuperAdmin, moduleAccess);
}

function toDomainScoreOut(m: DomainMetric): DomainScoreOut {
  return { active: m.active, hasData: m.hasData, score: m.score, confidence: confidenceFromDaysWithData(m.daysWithData) };
}

function mapSnapshotRow(row: any, baselines: Baseline[]): WeeklyReportData {
  return {
    weekStart: row.weekStart.toISOString().slice(0, 10),
    weekEnd: row.weekEnd.toISOString().slice(0, 10),
    status: row.status,
    algorithmVersion: row.algorithmVersion,
    overallScore: row.overallScore,
    confidence: (row.domainScores?.__confidence as Confidence) || "low",
    domainScores: row.domainScores?.__perDomain ?? row.domainScores,
    dailyBreakdown: row.dailyBreakdown,
    wins: row.wins,
    problems: row.problems,
    comparison: row.comparison,
    aiModel: row.aiModel,
    aiSummary: row.aiSummary,
    aiRecommendations: row.aiRecommendations,
    patterns: row.patterns ?? null,
    aiInsights: row.aiInsights ?? null,
    baselines,
    prediction: row.prediction ?? null,
    isFromCache: true,
  };
}

/** حداقلِ داده برای اینکه صدا زدنِ AI اصلاً ارزش داشته باشه (بندِ ۸۹). */
function hasEnoughDataForAi(domains: Record<Domain, DomainMetric>): boolean {
  const totalDays = DOMAINS.reduce((sum, d) => sum + (domains[d].active ? domains[d].daysWithData : 0), 0);
  return totalDays >= 2;
}

/**
 * Feedback Loop (بندِ ۳۷) — گلِ‌های پذیرفته‌شده‌ای که followUpWeekStart‌شون
 * برابرِ همین هفته‌ست رو بر اساسِ امتیازِ فعلیِ همون دامنه COMPLETED/MISSED
 * می‌کنه. تصمیم ساده و شفافه: اگه امتیازِ فعلی از امتیازِ لحظه‌ی Accept
 * بهتر یا مساوی بود، COMPLETED؛ وگرنه MISSED.
 */
async function resolvePendingGoals(userId: string, weekStartIso: string, weekStart: Date, currentMetrics: Record<Domain, DomainMetric>) {
  const pending = await prisma.weeklyGoal.findMany({ where: { userId, followUpWeekStart: weekStart, status: "ACCEPTED" } });
  for (const goal of pending) {
    const domain = goal.domain as Domain | null;
    const currentScore = domain && DOMAINS.includes(domain) ? currentMetrics[domain].score : null;
    if (currentScore == null) continue;
    const status = goal.followUpScoreBefore == null || currentScore >= goal.followUpScoreBefore ? "COMPLETED" : "MISSED";
    await prisma.weeklyGoal.update({ where: { id: goal.id }, data: { status, followUpScoreAfter: currentScore, resolvedAt: new Date() } });
  }
}

/**
 * تنها نقطه‌ی ورودیِ تولید/خواندنِ گزارشِ هفتگی — idempotent: اگه ردیفی
 * برای همین (userId, weekStart, algorithmVersion) از قبل هست، همون
 * برگردونده می‌شه (مگه forceRegenerate). برای هفته‌ی جاری (weekOffset=0)
 * بدونِ ردیفِ موجود، محاسبه زنده انجام می‌شه ولی ذخیره/AI صدا زده نمی‌شه —
 * فقط refresh صریح (forceRegenerate) گزارشِ هفته‌ی جاری رو snapshot می‌کنه.
 */
export async function getOrGenerateWeeklyReport(
  userId: string, timezone: string, isSuperAdmin: boolean, weekOffset: number, forceRegenerate = false
): Promise<WeeklyReportData> {
  const week = getUserWeekRange(timezone, new Date(), weekOffset);
  const activeModules = await activeModulesForUser(userId, isSuperAdmin);

  if (!forceRegenerate) {
    const existing = await prisma.weeklyReportSnapshot.findUnique({
      where: { userId_weekStart_algorithmVersion: { userId, weekStart: week.weekStart, algorithmVersion: ALGORITHM_VERSION } },
    });
    if (existing) {
      // Baselineها cache نمی‌شن (سبک‌ان، و می‌تونن بینِ ریجنریت‌ها به‌روزتر باشن) —
      // فقط برای این‌جوریِ نمایش دوباره محاسبه می‌شن، AI/Snapshot دست نمی‌خوره.
      const trailing8 = await computeTrailingWeeks(userId, timezone, weekOffset - 1, 8, activeModules);
      return mapSnapshotRow(existing, computeBaselines(trailing8));
    }
  }

  const currentMetrics = await computeAllDomainMetrics(userId, week, activeModules);
  const currentDaily = computeDailyBreakdown(week.weekStart, currentMetrics);

  const trailing8: TrailingWeek[] = await computeTrailingWeeks(userId, timezone, weekOffset - 1, 8, activeModules);
  const trailing4 = trailing8.slice(0, 4);
  const previousMetrics = trailing4[0].metrics;

  const { score: overallScore, confidence } = computeOverallScore(currentMetrics);
  const { score: previousOverallScore } = computeOverallScore(previousMetrics);
  const comparison = computeComparison(currentMetrics, previousMetrics, trailing4.map((w) => w.metrics));
  const wins = computeWins(currentMetrics, comparison);
  const problems = computeProblems(currentMetrics, comparison);

  const activeDomains = DOMAINS.filter((d) => currentMetrics[d].active);
  const trends = detectTrends(currentMetrics, trailing8);
  const streaks = await detectStreaks(userId, activeDomains);
  const outliers = detectOutliers(currentDaily, trailing8);
  const allDaysForCorrelation = trailing8.flatMap((w) => w.daily).concat(currentDaily);
  const correlations = detectCorrelations(activeDomains, allDaysForCorrelation);
  const patterns: PatternsOut = { trends, streaks, outliers, correlations };

  const baselines = computeBaselines(trailing8);
  const prediction = weekOffset === 0 ? computePrediction(currentMetrics, baselines, trends) : null;

  const isCurrentWeek = weekOffset === 0;
  const status: ReportStatus = isCurrentWeek ? "COLLECTING" : "READY";

  // برای هفته‌ی جاریِ بدونِ درخواستِ صریحِ refresh، نه AI صدا زده می‌شه نه
  // چیزی ذخیره — فقط محاسبه‌ی زنده (شاملِ patterns/baseline/prediction، چون
  // اون‌ها هزینه‌ی AI ندارن) برمی‌گرده (کنترلِ هزینه، بند ۸۹-۹۰).
  if (isCurrentWeek && !forceRegenerate) {
    return {
      weekStart: week.weekStartIso, weekEnd: week.weekEndIso, status, algorithmVersion: ALGORITHM_VERSION,
      overallScore, confidence,
      domainScores: Object.fromEntries(DOMAINS.map((d) => [d, toDomainScoreOut(currentMetrics[d])])) as Record<Domain, DomainScoreOut>,
      dailyBreakdown: currentDaily, wins, problems, comparison,
      aiModel: null, aiSummary: null, aiRecommendations: null,
      patterns, aiInsights: null, baselines, prediction,
      isFromCache: false,
    };
  }

  await resolvePendingGoals(userId, week.weekStartIso, week.weekStart, currentMetrics);

  let aiModel: string | null = null;
  let aiSummary: string | null = null;
  let aiRecommendations: WeeklyRecommendation[] | null = null;
  let aiInsights: WeeklyReportAiInsight[] | null = null;

  if (hasEnoughDataForAi(currentMetrics)) {
    try {
      const aiInput: WeeklyReportAiInputV2 = {
        weekLabel: `${week.weekStartIso} تا ${week.weekEndIso}`,
        overallScore, previousOverallScore,
        domains: activeDomains.map((d) => ({
          key: d, label: DOMAIN_LABELS_FA[d], score: currentMetrics[d].score, previousWeek: comparison[d].previousWeek, active: true,
        })),
        wins, problems,
        patterns: patternsSummaryForAi(trends, streaks, outliers, correlations),
      };
      const result = await generateWeeklyReportSummaryV2(aiInput, userId);
      aiModel = "gpt-4o-mini";
      aiSummary = result.summary;
      aiRecommendations = result.recommendations;
      aiInsights = result.insights;
    } catch {
      // بندِ ۶۶ — شکستِ AI نباید کلِ گزارش رو خراب کنه؛ فقط بخشِ AI خالی می‌مونه.
    }
  }

  const domainScoresOut = Object.fromEntries(DOMAINS.map((d) => [d, toDomainScoreOut(currentMetrics[d])])) as Record<Domain, DomainScoreOut>;

  const saved = await prisma.weeklyReportSnapshot.upsert({
    where: { userId_weekStart_algorithmVersion: { userId, weekStart: week.weekStart, algorithmVersion: ALGORITHM_VERSION } },
    create: {
      userId, weekStart: week.weekStart, weekEnd: week.weekEnd, status, algorithmVersion: ALGORITHM_VERSION,
      overallScore, domainScores: { __perDomain: domainScoresOut, __confidence: confidence },
      dailyBreakdown: currentDaily, wins, problems, comparison, aiModel, aiSummary,
      aiRecommendations: aiRecommendations ?? Prisma.JsonNull,
      patterns: patterns as unknown as Prisma.InputJsonValue,
      aiInsights: (aiInsights as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      prediction: (prediction as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
    update: {
      status, overallScore, domainScores: { __perDomain: domainScoresOut, __confidence: confidence },
      dailyBreakdown: currentDaily, wins, problems, comparison, aiModel, aiSummary,
      aiRecommendations: aiRecommendations ?? Prisma.JsonNull,
      patterns: patterns as unknown as Prisma.InputJsonValue,
      aiInsights: (aiInsights as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      prediction: (prediction as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  return mapSnapshotRow(saved, baselines);
}
