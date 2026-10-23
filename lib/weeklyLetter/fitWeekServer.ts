// بخش دیتابیس «هفته‌ی تمرین و تغذیه» (فقط برای بخش ورزش). چون آنالیز اصلی
// فقط وضعیت روزها و جمع کالری رو نگه می‌داره، این‌جا برای همین دو هفته (هفته‌ی
// جاری و قبلی) چیزهای اضافه می‌خونیم: اسم حرکت‌های تیک‌خورده، برنامه‌ی هر روز،
// ساعت شروع تمرین، نوع وعده و درشت‌مغذی‌ها، هدف درشت‌مغذی‌ها و هدف کاربر
// (کات/حجم/ثبات). وضعیت روزها با همون fitnessWeeks/nutritionWeeks آنالیز اصلی
// ساخته می‌شه تا عدد هیچ‌جا با کارت بخش‌ها اختلاف نداشته باشه.
// همه‌ی کوئری‌ها با userId محدودن. کاتالوگ حرکت‌ها سنگینه و فقط همین‌جا (سرور) لود می‌شه.
import { prisma } from "@/lib/prisma";
import { clampDisplay } from "@/lib/numberLimits";
import { findCatalogEntry } from "@/lib/exerciseCatalogUtils";
import {
  fitnessWeeks, nutritionWeeks,
  type CalorieTargetRow, type DomainEnv, type ExerciseLogRow, type ExercisePlanRow, type FoodRow, type WeekSpec,
} from "@/lib/weeklyAnalysis/domains";
import { addDaysIso, daysOfWeekIso, isoToUtcDate, localIso, localMinuteOfDay, safeTimezone, todayIso, utcIso } from "@/lib/weeklyAnalysis/week";
import type { DayCell, DayDetails } from "@/lib/weeklyAnalysis/types";
import {
  computeFitWeek, catalogMuscleToFit, plannedItemsOn, type FitDayInput, type FitFoodRow, type FitGoal, type FitMuscle,
  type FitPrevDay, type FitSessionRow, type FitWeek,
} from "./fitWeek";

const muscleOf = (name: string): FitMuscle[] => {
  const e = findCatalogEntry(name);
  const m = catalogMuscleToFit(e?.muscleKeys?.[0]);
  return m ? [m] : [];
};

function goalOf(raw: string | null | undefined): FitGoal | null {
  if (raw === "lose" || raw === "cut") return "cut";
  if (raw === "gain") return "gain";
  if (raw === "maintain") return "maintain";
  return null;
}

type Analysis = { weekStart: string; weekEnd: string; days: DayCell[]; domains: { domain: string }[] };

/**
 * بلوک fit یک هفته. null وقتی کاربر نه دامنه‌ی بدنسازی داره نه تغذیه، یا
 * هیچ داده‌ای نیست. خطای دیتابیس به caller می‌رسه (live.ts با catch خاموشش می‌کنه).
 */
export async function gatherFitWeek(
  userId: string,
  a: Analysis,
  opts: { timezone: string; now: Date },
): Promise<FitWeek | null> {
  const hasFitness = a.domains.some((d) => d.domain === "fitness");
  const hasNutrition = a.domains.some((d) => d.domain === "nutrition");
  if (!hasFitness && !hasNutrition) return null;

  const tz = safeTimezone(opts.timezone);
  const env: DomainEnv = { timezone: tz, todayIso: todayIso(tz, opts.now) };
  const prevStart = addDaysIso(a.weekStart, -7);
  const weeks: WeekSpec[] = [
    { weekStartIso: prevStart, days: daysOfWeekIso(prevStart) },
    { weekStartIso: a.weekStart, days: daysOfWeekIso(a.weekStart) },
  ];
  const start = isoToUtcDate(prevStart);
  const end = isoToUtcDate(a.weekEnd);
  const tsTo = isoToUtcDate(addDaysIso(a.weekEnd, 2));

  const [logs, plans, foods, targets] = await Promise.all([
    hasFitness
      ? prisma.exerciseLog.findMany({
          where: { userId, date: { gte: start, lte: end } },
          select: { date: true, completed: true, completedItems: true, startedAt: true },
        })
      : Promise.resolve([]),
    hasFitness
      ? prisma.exercisePlan.findMany({
          where: { userId, startDate: { lt: tsTo } },
          select: { startDate: true, updatedAt: true, isActive: true, gymDays: true, planData: true },
        })
      : Promise.resolve([]),
    hasNutrition
      ? prisma.foodLogEntry.findMany({
          where: { userId, date: { gte: start, lte: end } },
          select: {
            date: true, grams: true, customCalories: true, proteinG: true, carbsG: true, fatG: true, mealType: true,
            foodItem: { select: { caloriesPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
          },
        })
      : Promise.resolve([]),
    hasNutrition
      ? prisma.calorieTarget.findMany({
          where: { userId, effectiveFrom: { lt: tsTo } },
          orderBy: { effectiveFrom: "asc" },
          select: { effectiveFrom: true, dailyTargetKcal: true, goal: true, proteinTargetG: true, carbsTargetG: true, fatTargetG: true },
        })
      : Promise.resolve([]),
  ]);

  // ── وضعیت روزها با همون موتور آنالیز اصلی ──
  const fitRows: ExerciseLogRow[] = logs.map((l) => ({ date: l.date, completed: l.completed, completedItems: l.completedItems }));
  const planRows: ExercisePlanRow[] = plans.map((p) => ({ startDate: p.startDate, updatedAt: p.updatedAt, isActive: p.isActive, gymDays: p.gymDays }));
  const fitW = hasFitness ? fitnessWeeks({ logs: fitRows, plans: planRows }, weeks, env) : null;

  const foodRows: FoodRow[] = foods.map((f) => ({
    date: f.date,
    grams: clampDisplay(f.grams, "foodGrams"),
    customCalories: f.customCalories == null ? f.customCalories : clampDisplay(f.customCalories, "entryKcal"),
    proteinG: f.proteinG == null ? f.proteinG : clampDisplay(f.proteinG, "macroEntryG"),
    foodItem: f.foodItem ? { caloriesPer100g: f.foodItem.caloriesPer100g, proteinPer100g: f.foodItem.proteinPer100g } : null,
  }));
  const targetRows: CalorieTargetRow[] = targets.map((t) => ({ effectiveFrom: t.effectiveFrom, dailyTargetKcal: t.dailyTargetKcal }));
  const nutW = hasNutrition ? nutritionWeeks({ logs: foodRows, targets: targetRows }, weeks, env) : null;

  const curIdx = 1;
  const dayInputs: FitDayInput[] = a.days.map((d, i) => ({
    date: d.date,
    weekday: d.weekday,
    isToday: d.isToday,
    isFuture: d.isFuture,
    status: fitW?.[curIdx].details[i]?.fitness?.status,
    nutrition: nutW?.[curIdx].details[i]?.nutrition,
    sleepHours: (d.details as DayDetails).sleep?.hours ?? null,
  }));
  const prevDays: FitPrevDay[] = weeks[0].days.map((_, i) => ({
    status: fitW?.[0].details[i]?.fitness?.status,
    nutrition: nutW?.[0].details[i]?.nutrition,
  }));

  // ── جلسه‌ها (هفته‌ی جاری) ──
  const weekDates = new Set(weeks[1].days);
  const sessions: FitSessionRow[] = logs
    .filter((l) => weekDates.has(utcIso(l.date)))
    .map((l) => ({
      date: utcIso(l.date),
      completed: l.completed,
      items: Array.isArray(l.completedItems) ? (l.completedItems as unknown[]).filter((x): x is string => typeof x === "string") : [],
      startMin: l.startedAt ? localMinuteOfDay(tz, l.startedAt) : null,
    }));

  // ── برنامه‌ی هر روز (روزهای تموم‌شده و امروز) ──
  const planLite = plans.map((p) => ({
    start: localIso(tz, p.startDate),
    until: p.isActive ? null : localIso(tz, p.updatedAt),
    planData: p.planData as unknown,
  }));
  const plannedByDate: Record<string, string[]> = {};
  for (const d of a.days) {
    if (d.isFuture) continue;
    const items = plannedItemsOn(planLite, d.date);
    if (items.length) plannedByDate[d.date] = items;
  }

  // ── غذا (هفته‌ی جاری): کالری و درشت‌مغذی هر ردیف ──
  const food: FitFoodRow[] = foods
    .filter((f) => weekDates.has(utcIso(f.date)))
    .map((f) => {
      const grams = clampDisplay(f.grams, "foodGrams");
      const per = (own: number | null, perHundred: number | null | undefined, cap: "macroEntryG") =>
        own != null ? clampDisplay(own, cap) : perHundred != null ? (perHundred * grams) / 100 : null;
      const kcal = f.customCalories != null ? clampDisplay(f.customCalories, "entryKcal") : f.foodItem ? (f.foodItem.caloriesPer100g * grams) / 100 : 0;
      return {
        date: utcIso(f.date),
        mealType: f.mealType,
        kcal,
        protein: per(f.proteinG, f.foodItem?.proteinPer100g, "macroEntryG"),
        carbs: per(f.carbsG, f.foodItem?.carbsPer100g, "macroEntryG"),
        fat: per(f.fatG, f.foodItem?.fatPer100g, "macroEntryG"),
      };
    });

  // آخرین هدف معتبر تا پایان هفته؛ هدف درشت‌مغذی ممکنه فقط روی ردیف قدیمی‌تر باشه
  const latest = targets[targets.length - 1];
  const withMacro = [...targets].reverse().find((t) => t.proteinTargetG || t.carbsTargetG || t.fatTargetG);
  const goal = goalOf(latest?.goal ?? targets.map((t) => t.goal).filter(Boolean).pop());

  return computeFitWeek({
    days: dayInputs,
    prevDays,
    sessions,
    plannedByDate,
    food,
    targets: {
      goal,
      kcal: latest?.dailyTargetKcal ?? null,
      protein: withMacro?.proteinTargetG ?? null,
      carbs: withMacro?.carbsTargetG ?? null,
      fat: withMacro?.fatTargetG ?? null,
    },
    muscleOf,
    hasFitness,
    hasNutrition,
  });
}
