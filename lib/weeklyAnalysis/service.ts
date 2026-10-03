// لایه‌ی سرویس «آنالیز هفتگی» — تنها نقطه‌ای که همه‌چیز (محاسبه‌ی زنده +
// کش AI + اهداف + ریفلکشن) رو کنار هم می‌ذاره و DTO نهایی WeeklyAnalysis
// (قرارداد lib/weeklyAnalysis/types.ts) رو برمی‌گردونه. روت‌های API فقط
// همین تابع رو صدا می‌زنن، منطق ترکیب این‌جاست.

import { prisma } from "@/lib/prisma";
import { computeWeeklyAnalysis, computeDomainScoresForWeek } from "@/lib/weeklyAnalysis/compute";
import { rowToSummary } from "@/lib/weeklyLetter/summary";
import { getWeekRange } from "@/lib/weeklyAnalysis/week";
import { isAiAvailable } from "@/lib/weeklyAnalysis/ai";
import { AiCoach, AnalysisDomain, LetterSummary, ReflectionDto, WeeklyAnalysis, WeeklyGoalDto, WeeklyGoalStatus } from "@/lib/weeklyAnalysis/types";

const MS_PER_WEEK = 7 * 86_400_000;

/** تاریخ `@db.Date` (نیمه‌شب UTC) رو به `YYYY-MM-DD` تبدیل می‌کنه. */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapGoal(row: {
  id: string;
  weekStart: Date;
  domain: string | null;
  title: string;
  target: number | null;
  status: string;
  achievedScore: number | null;
  createdAt: Date;
}): WeeklyGoalDto {
  return {
    id: row.id,
    weekStart: toIsoDate(row.weekStart),
    domain: (row.domain as AnalysisDomain | null) ?? null,
    title: row.title,
    target: row.target,
    status: row.status as WeeklyGoalStatus,
    achievedScore: row.achievedScore,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapReflection(row: { wentWell: string; improve: string; mood: number | null; updatedAt: Date } | null): ReflectionDto {
  if (!row) return null;
  return { wentWell: row.wentWell, improve: row.improve, mood: row.mood, updatedAt: row.updatedAt.toISOString() };
}

/**
 * هر هدف ACTIVEای که هفته‌اش کاملا تموم شده (نسبت به هفته‌ی *واقعی* جاری،
 * نه offset فعلی کاربر) رو قفل می‌کنه: امتیاز دامنه‌ی همون هفته رو
 * می‌سنجه و DONE/MISSED می‌کنه. هدفی که domain یا target نداره (هدف
 * متنی صرف) خودکار قابل‌سنجش نیست — دست‌نخورده (ACTIVE) می‌مونه. هدفی که
 * هنوز داده‌ی کافی نداره (score=null) هم دست‌نخورده می‌مونه — دفعه‌ی بعد
 * دوباره امتحان می‌شه.
 */
async function resolveExpiredGoals(userId: string, timezone: string, isSuperAdmin: boolean, now: Date = new Date()): Promise<void> {
  const { weekStart: currentWeekStart } = getWeekRange(timezone, 0, now);

  const expired = await prisma.weeklyAnalysisGoal.findMany({
    where: { userId, status: "ACTIVE", weekStart: { lt: currentWeekStart } },
  });
  if (!expired.length) return;

  const updates: { id: string; status: "DONE" | "MISSED"; achievedScore: number }[] = [];
  for (const goal of expired) {
    if (goal.target == null || !goal.domain) continue;
    const offsetForWeek = Math.round((goal.weekStart.getTime() - currentWeekStart.getTime()) / MS_PER_WEEK);
    let scores: Partial<Record<AnalysisDomain, number | null>>;
    try {
      scores = await computeDomainScoresForWeek(userId, timezone, offsetForWeek, isSuperAdmin, now);
    } catch {
      continue; // خطای محاسبه نباید کل درخواست آنالیز رو بترکونه — دفعه‌ی بعد دوباره امتحان می‌شه
    }
    const score = scores[goal.domain as AnalysisDomain];
    if (score == null) continue;
    updates.push({ id: goal.id, status: score >= goal.target ? "DONE" : "MISSED", achievedScore: score });
  }
  if (!updates.length) return;

  await prisma.$transaction(
    updates.map((u) =>
      prisma.weeklyAnalysisGoal.update({
        where: { id: u.id },
        data: { status: u.status, achievedScore: u.achievedScore, resolvedAt: new Date() },
      })
    )
  );
}

/** تازه‌ترین هفته‌نامه‌ی آماده‌ی خوانده‌نشده (بنر بالای صفحه) — یک کوئری سبک روی summary. */
export async function getUnreadLetterSummary(userId: string): Promise<LetterSummary | null> {
  const row = await prisma.weeklyLetter.findFirst({
    where: { userId, status: "READY", readAt: null },
    orderBy: { weekStart: "desc" },
    select: { weekStart: true, issueNo: true, summary: true, readAt: true, createdAt: true },
  });
  if (!row) return null;
  if (row.summary) return rowToSummary(row);
  // ردیف بدون summary (نباید پیش بیاد) — از خود data
  const full = await prisma.weeklyLetter.findFirst({ where: { userId, weekStart: row.weekStart }, select: { data: true } });
  return rowToSummary(row, full?.data);
}

export type WeeklyAnalysisOptions = {
  timezone: string;
  offset: number;
  isSuperAdmin: boolean;
  /** برای تست/ساخت هفته‌نامه — پیش‌فرض الان */
  now?: Date;
  /** false = کوئری هفته‌نامه‌ی خوانده‌نشده رد می‌شه (ساخت هفته‌نامه به‌اش نیاز نداره) */
  withUnreadLetter?: boolean;
};

export async function getWeeklyAnalysis(userId: string, opts: WeeklyAnalysisOptions): Promise<WeeklyAnalysis> {
  const { timezone, offset, isSuperAdmin } = opts;
  const now = opts.now ?? new Date();

  // قفل‌کردن اهداف منقضی قبل از خوندن لیست، تا وضعیت نمایش‌داده‌شده
  // همیشه تازه باشه (نه یک ACTIVE قدیمی که هفته‌هاست تموم شده).
  await resolveExpiredGoals(userId, timezone, isSuperAdmin, now);

  const weekRange = getWeekRange(timezone, offset, now);
  const nextWeekRange = getWeekRange(timezone, offset + 1, now);

  const [base, aiRow, reflectionRow, goalRows, nextGoalRows, unreadLetter] = await Promise.all([
    computeWeeklyAnalysis(userId, { timezone, offset, isSuperAdmin, now }),
    prisma.weeklyAnalysisAi.findUnique({ where: { userId_weekStart: { userId, weekStart: weekRange.weekStart } } }),
    prisma.weeklyReflection.findUnique({ where: { userId_weekStart: { userId, weekStart: weekRange.weekStart } } }),
    prisma.weeklyAnalysisGoal.findMany({ where: { userId, weekStart: weekRange.weekStart }, orderBy: { createdAt: "asc" } }),
    prisma.weeklyAnalysisGoal.findMany({ where: { userId, weekStart: nextWeekRange.weekStart }, orderBy: { createdAt: "asc" } }),
    opts.withUnreadLetter === false ? Promise.resolve(null) : getUnreadLetterSummary(userId).catch(() => null),
  ]);

  return {
    ...base,
    ai: aiRow ? (aiRow.data as unknown as AiCoach) : null,
    aiAvailable: isAiAvailable(),
    goals: goalRows.map(mapGoal),
    nextWeekGoals: nextGoalRows.map(mapGoal),
    reflection: mapReflection(reflectionRow),
    unreadLetter,
  };
}
