// ردیف‌های محلیِ arion-fitness ← *همون شکلِ JSON ِ ردیفِ Prisma* که روت‌های وب
// (app/api/exercise/*، app/api/calorie/*) مستقیم برمی‌گردونن. همه‌ی ستون‌های مدل
// (prisma/schema.prisma) حاضرن تا هر فیلدی که کدِ وب می‌خونه همون‌جا باشه؛
// ستون‌هایی که اپ نداره مقدارِ پیش‌فرضِ Prisma رو می‌گیرن (syncEditedAt/…: null،
// foodItemId: null). تاریخِ @db.Date مثلِ JSONِ وب «YYYY-MM-DDT00:00:00.000Z» است.
import type { CalorieEntryRow, CalorieTargetRow, ExercisePlanRow } from "@m/features/fitness/lib/exerciseTypes";
import { foodTotals } from "@m/features/fitness/lib/foodLogMapping";
import { services } from "../services";

export const currentUserId = (): string => services().tokens.getUser()?.id ?? "";

/** "YYYY-MM-DD" ← همون سریال‌سازیِ ستونِ @db.Date در NextResponse.json */
export const dbDateJson = (day: string): string => `${day}T00:00:00.000Z`;

export function planJson(row: ExercisePlanRow) {
  return {
    id: row.id,
    userId: currentUserId(),
    level: row.level,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    goal: row.goal,
    hasPhysicalLimitation: row.hasPhysicalLimitation,
    disclaimerAcceptedAt: row.rulesAcceptedAt ?? null,
    gymDays: row.gymDays,
    trainingPhase: row.trainingPhase,
    trainingMonth: row.trainingMonth,
    equipment: row.equipment,
    generatedByAi: row.generatedByAi,
    startDate: row.startDate,
    isActive: row.isActive,
    planData: row.planData,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncEditedAt: null,
    syncWrittenAt: null,
  };
}

export function foodEntryJson(row: CalorieEntryRow) {
  const totals = foodTotals(row);
  return {
    id: row.id,
    userId: currentUserId(),
    foodItemId: null,
    customName: row.name,
    customCalories: totals.customCalories,
    date: dbDateJson(row.date),
    grams: row.grams,
    mealType: row.mealType ?? null,
    proteinG: totals.proteinG,
    carbsG: totals.carbsG,
    fatG: totals.fatG,
    aiScanned: !!row.aiScanned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    syncEditedAt: null,
    syncWrittenAt: null,
  };
}

export function calorieTargetJson(row: CalorieTargetRow) {
  return {
    id: row.id,
    userId: currentUserId(),
    dailyTargetKcal: row.dailyTargetKcal,
    goal: row.goal,
    mealsPerDay: row.mealsPerDay,
    mealBreakdown: row.mealBreakdown,
    proteinTargetG: row.proteinTargetG,
    carbsTargetG: row.carbsTargetG,
    fatTargetG: row.fatTargetG,
    sex: row.sex,
    ageYears: row.ageYears,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncEditedAt: null,
    syncWrittenAt: null,
  };
}
