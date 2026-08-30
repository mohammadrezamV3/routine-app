import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReportSummary, WeeklyReportAiInput } from "@/lib/aiClient";
import { getUserWeekRange, WeekRange } from "./weekRange";
import { Domain, DomainMetric, DOMAINS, DOMAIN_LABELS_FA, computeAllDomainMetrics, resolveActiveModules } from "./metrics";
import { computeOverallScore, confidenceFromDaysWithData, Confidence } from "./score";
import { computeComparison, computeWins, computeProblems, computeDailyBreakdown, Comparison, DailyBreakdownDay } from "./analysis";

export const ALGORITHM_VERSION = 1;
export type ReportStatus = "COLLECTING" | "READY" | "PARTIAL" | "FAILED";

export type DomainScoreOut = { active: boolean; hasData: boolean; score: number | null; confidence: Confidence };
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
  aiRecommendations: { title: string; description: string; priority: string }[] | null;
  isFromCache: boolean;
};

async function activeModulesForUser(userId: string, isSuperAdmin: boolean): Promise<Set<ModuleKey>> {
  const moduleAccess = await prisma.moduleAccess.findMany({ where: { userId }, select: { module: true, active: true, expiresAt: true } });
  return resolveActiveModules(isSuperAdmin, moduleAccess);
}

function toDomainScoreOut(m: DomainMetric): DomainScoreOut {
  return { active: m.active, hasData: m.hasData, score: m.score, confidence: confidenceFromDaysWithData(m.daysWithData) };
}

function mapSnapshotRow(row: any): WeeklyReportData {
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
    isFromCache: true,
  };
}

/** حداقلِ داده برای اینکه صدا زدنِ AI اصلاً ارزش داشته باشه (بندِ ۸۹). */
function hasEnoughDataForAi(domains: Record<Domain, DomainMetric>): boolean {
  const totalDays = DOMAINS.reduce((sum, d) => sum + (domains[d].active ? domains[d].daysWithData : 0), 0);
  return totalDays >= 2;
}

async function computeMetricsForOffset(userId: string, timezone: string, baseOffset: number, activeModules: Set<ModuleKey>) {
  const week = getUserWeekRange(timezone, new Date(), baseOffset);
  const metrics = await computeAllDomainMetrics(userId, week, activeModules);
  return { week, metrics };
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

  if (!forceRegenerate) {
    const existing = await prisma.weeklyReportSnapshot.findUnique({
      where: { userId_weekStart_algorithmVersion: { userId, weekStart: week.weekStart, algorithmVersion: ALGORITHM_VERSION } },
    });
    if (existing) return mapSnapshotRow(existing);
  }

  const activeModules = await activeModulesForUser(userId, isSuperAdmin);
  const currentMetrics = await computeAllDomainMetrics(userId, week, activeModules);

  const [w1, w2, w3, w4] = await Promise.all([
    computeMetricsForOffset(userId, timezone, weekOffset - 1, activeModules),
    computeMetricsForOffset(userId, timezone, weekOffset - 2, activeModules),
    computeMetricsForOffset(userId, timezone, weekOffset - 3, activeModules),
    computeMetricsForOffset(userId, timezone, weekOffset - 4, activeModules),
  ]);
  const previousMetrics = w1.metrics;
  const trailing4 = [w1, w2, w3, w4].map((w) => w.metrics);

  const { score: overallScore, confidence } = computeOverallScore(currentMetrics);
  const { score: previousOverallScore } = computeOverallScore(previousMetrics);
  const comparison = computeComparison(currentMetrics, previousMetrics, trailing4);
  const wins = computeWins(currentMetrics, comparison);
  const problems = computeProblems(currentMetrics, comparison);
  const dailyBreakdown = computeDailyBreakdown(week.weekStart, currentMetrics);

  const isCurrentWeek = weekOffset === 0;
  const status: ReportStatus = isCurrentWeek ? "COLLECTING" : "READY";

  // برای هفته‌ی جاریِ بدونِ درخواستِ صریحِ refresh، نه AI صدا زده می‌شه نه
  // چیزی ذخیره — فقط محاسبه‌ی زنده برمی‌گرده (کنترلِ هزینه، بند ۸۹-۹۰).
  if (isCurrentWeek && !forceRegenerate) {
    return {
      weekStart: week.weekStartIso, weekEnd: week.weekEndIso, status, algorithmVersion: ALGORITHM_VERSION,
      overallScore, confidence,
      domainScores: Object.fromEntries(DOMAINS.map((d) => [d, toDomainScoreOut(currentMetrics[d])])) as Record<Domain, DomainScoreOut>,
      dailyBreakdown, wins, problems, comparison,
      aiModel: null, aiSummary: null, aiRecommendations: null,
      isFromCache: false,
    };
  }

  let aiModel: string | null = null;
  let aiSummary: string | null = null;
  let aiRecommendations: { title: string; description: string; priority: string }[] | null = null;

  if (hasEnoughDataForAi(currentMetrics)) {
    try {
      const aiInput: WeeklyReportAiInput = {
        weekLabel: `${week.weekStartIso} تا ${week.weekEndIso}`,
        overallScore, previousOverallScore,
        domains: DOMAINS.filter((d) => currentMetrics[d].active).map((d) => ({
          key: d, label: DOMAIN_LABELS_FA[d], score: currentMetrics[d].score, previousWeek: comparison[d].previousWeek, active: true,
        })),
        wins, problems,
      };
      const result = await generateWeeklyReportSummary(aiInput, userId);
      aiModel = "gpt-4o-mini";
      aiSummary = result.summary;
      aiRecommendations = result.recommendations;
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
      dailyBreakdown, wins, problems, comparison, aiModel, aiSummary,
      aiRecommendations: aiRecommendations ?? Prisma.JsonNull,
    },
    update: {
      status, overallScore, domainScores: { __perDomain: domainScoresOut, __confidence: confidence },
      dailyBreakdown, wins, problems, comparison, aiModel, aiSummary,
      aiRecommendations: aiRecommendations ?? Prisma.JsonNull,
    },
  });

  return mapSnapshotRow(saved);
}
