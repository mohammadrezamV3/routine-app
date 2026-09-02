import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isoLocal } from "@/lib/jalali";
import { daysOfWeek, WeekRange } from "./weekRange";

export type Domain = "routine" | "fitness" | "trading" | "learning" | "nutrition";
export const DOMAINS: Domain[] = ["routine", "fitness", "trading", "learning", "nutrition"];
export const DOMAIN_MODULE: Record<Domain, ModuleKey> = {
  routine: ModuleKey.ROUTINE,
  fitness: ModuleKey.EXERCISE,
  trading: ModuleKey.TRADE,
  learning: ModuleKey.ROADMAP,
  nutrition: ModuleKey.CALORIE,
};
export const DOMAIN_LABELS_FA: Record<Domain, string> = {
  routine: "روتین",
  fitness: "بدنسازی",
  trading: "ترید",
  learning: "یادگیری",
  nutrition: "تغذیه",
};

// فرق «داده نداریم» و «صفر» (بند ۵۵ اسپک) — active یعنی کاربر اصلا این
// ماژول رو داره، hasData یعنی این‌هفته واقعا چیزی ثبت کرده. score فقط
// وقتی عدد داره که hasData باشه.
export type DomainMetric = {
  active: boolean;
  hasData: boolean;
  score: number | null;
  daysWithData: number;
  dailyScores: (number | null)[]; // ۷تایی، شنبه..جمعه، هم‌ترتیب با daysOfWeek
  raw: Record<string, unknown>;
};

function round(n: number): number {
  return Math.round(n);
}

// ------------------------------------------------------------------
// Routine — از DailyEntry.completedItems (که خودش کل چک‌لیست همون روز
// رو با true/false نگه می‌داره، نه فقط موارد انجام‌شده) — نیازی به
// بازسازی کامل موتور schedule/occurrence سمت سرور نیست.
// ------------------------------------------------------------------
async function computeRoutineMetric(userId: string, week: WeekRange, active: boolean): Promise<DomainMetric> {
  const entries = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: week.weekStart, lte: week.weekEnd } },
    select: { date: true, completedItems: true },
  });
  const byDate = new Map(entries.map((e) => [isoLocal(e.date), e.completedItems as Record<string, boolean>]));

  const dailyScores: (number | null)[] = [];
  let daysWithData = 0;
  let sumPct = 0;
  for (const d of daysOfWeek(week.weekStart)) {
    const items = byDate.get(isoLocal(d));
    if (!items || Object.keys(items).length === 0) { dailyScores.push(null); continue; }
    const total = Object.keys(items).length;
    const done = Object.values(items).filter(Boolean).length;
    const pct = round((done / total) * 100);
    dailyScores.push(pct);
    daysWithData++;
    sumPct += pct;
  }

  const hasData = daysWithData > 0;
  return {
    active, hasData, daysWithData, dailyScores,
    score: hasData ? round(sumPct / daysWithData) : null,
    raw: { daysWithData },
  };
}

// ------------------------------------------------------------------
// Fitness — ExerciseLog.completed در برابر gymDays.length پلن فعال
// (اگه پلنی نبود، فقط تعداد جلسات تکمیل‌شده رو نشون می‌ده، بدون ٪).
// ------------------------------------------------------------------
async function computeFitnessMetric(userId: string, week: WeekRange, active: boolean): Promise<DomainMetric> {
  const [logs, plan] = await Promise.all([
    prisma.exerciseLog.findMany({
      where: { userId, date: { gte: week.weekStart, lte: week.weekEnd } },
      select: { date: true, completed: true },
    }),
    prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, select: { gymDays: true }, orderBy: { startDate: "desc" } }),
  ]);
  const byDate = new Map(logs.map((l) => [isoLocal(l.date), l.completed]));
  const gymDaysCount = Array.isArray(plan?.gymDays) ? (plan!.gymDays as string[]).length : null;

  const dailyScores: (number | null)[] = [];
  let daysWithData = 0;
  let completedSessions = 0;
  for (const d of daysOfWeek(week.weekStart)) {
    const completed = byDate.get(isoLocal(d));
    if (completed === undefined) { dailyScores.push(null); continue; }
    daysWithData++;
    dailyScores.push(completed ? 100 : 0);
    if (completed) completedSessions++;
  }

  const hasData = daysWithData > 0;
  const score = !hasData ? null
    : gymDaysCount && gymDaysCount > 0 ? Math.min(100, round((completedSessions / gymDaysCount) * 100))
    : completedSessions > 0 ? 100 : 0;

  return {
    active, hasData, daysWithData, dailyScores, score,
    raw: { completedSessions, expectedSessions: gymDaysCount },
  };
}

// ------------------------------------------------------------------
// Trading — نرخ برد معاملات بسته‌شده‌ی این هفته. بدون معامله‌ی بسته‌شده
// نمی‌شه عملکرد رو قضاوت کرد (نه صفر، نه امتیاز).
// ------------------------------------------------------------------
async function computeTradingMetric(userId: string, week: WeekRange, active: boolean): Promise<DomainMetric> {
  const trades = await prisma.tradeEntry.findMany({
    where: { userId, openedAt: { gte: week.weekStart, lt: new Date(week.weekEnd.getTime() + 86400000) } },
    select: { openedAt: true, status: true, pnl: true },
  });

  const byDate = new Map<string, { total: number; closed: number; wins: number }>();
  for (const d of daysOfWeek(week.weekStart)) byDate.set(isoLocal(d), { total: 0, closed: 0, wins: 0 });
  for (const t of trades) {
    const key = isoLocal(t.openedAt);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    bucket.total++;
    // «بسته‌شده» حالا با خود وضعیت معامله تعیین می‌شود، نه با پرنبودن
    // سود/زیان — چون pnl دیگر nullable نیست و صفر یک نتیجه‌ی واقعی است
    // (معامله‌ی سربه‌سر)، نه «هنوز بسته نشده».
    if (t.status === "CLOSED") {
      bucket.closed++;
      if (t.pnl > 0) bucket.wins++;
    }
  }

  const dailyScores: (number | null)[] = [];
  let daysWithData = 0;
  let totalClosed = 0, totalWins = 0, totalTrades = 0;
  for (const d of daysOfWeek(week.weekStart)) {
    const b = byDate.get(isoLocal(d))!;
    totalTrades += b.total; totalClosed += b.closed; totalWins += b.wins;
    if (b.total === 0) { dailyScores.push(null); continue; }
    daysWithData++;
    dailyScores.push(b.closed > 0 ? round((b.wins / b.closed) * 100) : null);
  }

  const hasData = totalTrades > 0;
  const score = totalClosed > 0 ? round((totalWins / totalClosed) * 100) : null;

  return {
    active, hasData, daysWithData, dailyScores, score,
    raw: { totalTrades, totalClosed, totalWins },
  };
}

// ------------------------------------------------------------------
// Learning — چون Roadmap.stations تاریخ تکمیل هر آیتم رو ذخیره نمی‌کنه
// (فقط done:boolean فعلی)، این عدد «پیشرفت کلی رودمپ‌ها»ست، نه «کار
// دقیقا همین هفته» — همین‌جا صادقانه با raw.weeklyActivity مشخص می‌شه.
// ------------------------------------------------------------------
async function computeLearningMetric(userId: string, week: WeekRange, active: boolean): Promise<DomainMetric> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    select: { stations: true, updatedAt: true },
  });

  if (roadmaps.length === 0) {
    return { active, hasData: false, daysWithData: 0, dailyScores: Array(7).fill(null), score: null, raw: {} };
  }

  let totalStations = 0, doneStations = 0;
  let weeklyActivity = false;
  const weekEndExclusive = new Date(week.weekEnd.getTime() + 86400000);
  for (const r of roadmaps) {
    const stations = Array.isArray(r.stations) ? (r.stations as { done?: boolean }[]) : [];
    totalStations += stations.length;
    doneStations += stations.filter((s) => s?.done).length;
    if (r.updatedAt >= week.weekStart && r.updatedAt < weekEndExclusive) weeklyActivity = true;
  }

  const hasData = totalStations > 0;
  const score = hasData ? round((doneStations / totalStations) * 100) : null;

  return {
    active, hasData, daysWithData: weeklyActivity ? 1 : 0, dailyScores: Array(7).fill(null), score,
    raw: { totalStations, doneStations, weeklyActivity, isOverallProgress: true },
  };
}

// ------------------------------------------------------------------
// Nutrition — از FoodLogEntry.customCalories (همیشه کالری کل همون
// ثبت رو نگه می‌داره، چه از AI چه دستی — نگاه کن به app/api/calorie/log).
// امتیاز = نیمی ثبات ثبت (چند روز از ۷ روز) + نیمی نزدیکی به هدف روزانه.
// ------------------------------------------------------------------
async function computeNutritionMetric(userId: string, week: WeekRange, active: boolean): Promise<DomainMetric> {
  const [logs, target] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: { userId, date: { gte: week.weekStart, lte: week.weekEnd } },
      select: { date: true, customCalories: true },
    }),
    prisma.calorieTarget.findFirst({
      where: { userId, effectiveFrom: { lte: week.weekEnd } },
      orderBy: { effectiveFrom: "desc" },
      select: { dailyTargetKcal: true },
    }),
  ]);

  const byDate = new Map<string, number>();
  for (const l of logs) {
    const key = isoLocal(l.date);
    byDate.set(key, (byDate.get(key) || 0) + (l.customCalories || 0));
  }

  const dailyScores: (number | null)[] = [];
  let daysWithData = 0;
  let sumKcal = 0;
  for (const d of daysOfWeek(week.weekStart)) {
    const kcal = byDate.get(isoLocal(d));
    if (kcal == null) { dailyScores.push(null); continue; }
    daysWithData++;
    sumKcal += kcal;
    if (target?.dailyTargetKcal) {
      const diffPct = Math.abs(kcal - target.dailyTargetKcal) / target.dailyTargetKcal;
      dailyScores.push(Math.max(0, round(100 - diffPct * 100)));
    } else {
      dailyScores.push(null);
    }
  }

  const hasData = daysWithData > 0;
  const consistencyScore = (daysWithData / 7) * 100;
  const avgKcal = hasData ? round(sumKcal / daysWithData) : null;
  let score: number | null = null;
  if (hasData) {
    if (target?.dailyTargetKcal && avgKcal != null) {
      const diffPct = Math.abs(avgKcal - target.dailyTargetKcal) / target.dailyTargetKcal;
      const adherenceScore = Math.max(0, 100 - diffPct * 100);
      score = round(0.5 * adherenceScore + 0.5 * consistencyScore);
    } else {
      score = round(consistencyScore);
    }
  }

  return {
    active, hasData, daysWithData, dailyScores, score,
    raw: { avgKcal, targetKcal: target?.dailyTargetKcal ?? null, loggingDays: daysWithData },
  };
}

const COMPUTE_FN: Record<Domain, typeof computeRoutineMetric> = {
  routine: computeRoutineMetric,
  fitness: computeFitnessMetric,
  trading: computeTradingMetric,
  learning: computeLearningMetric,
  nutrition: computeNutritionMetric,
};

/** ماژول‌های فعال کاربر — سوپریوزر همه‌چیز، وگرنه از ModuleAccess (منطق آینه‌ی app/api/account). */
export function resolveActiveModules(
  isSuperAdmin: boolean,
  moduleAccess: { module: ModuleKey; active: boolean; expiresAt: Date | null }[]
): Set<ModuleKey> {
  if (isSuperAdmin) return new Set(Object.values(ModuleKey));
  const now = Date.now();
  return new Set(
    moduleAccess.filter((m) => m.active && (!m.expiresAt || m.expiresAt.getTime() > now)).map((m) => m.module)
  );
}

export async function computeAllDomainMetrics(
  userId: string, week: WeekRange, activeModules: Set<ModuleKey>
): Promise<Record<Domain, DomainMetric>> {
  const results = await Promise.all(
    DOMAINS.map((d) => COMPUTE_FN[d](userId, week, activeModules.has(DOMAIN_MODULE[d])))
  );
  return Object.fromEntries(DOMAINS.map((d, i) => [d, results[i]])) as Record<Domain, DomainMetric>;
}

/** برای صفحه‌ی جزئیات یک دامنه — بدون محاسبه‌ی چهار دامنه‌ی دیگه. */
export async function computeSingleDomainMetric(
  domain: Domain, userId: string, week: WeekRange, activeModules: Set<ModuleKey>
): Promise<DomainMetric> {
  return COMPUTE_FN[domain](userId, week, activeModules.has(DOMAIN_MODULE[domain]));
}
