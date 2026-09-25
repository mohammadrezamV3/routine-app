import { fitnessDb } from "../db";
import { newLocalId, nowIso } from "./id";
import { isoLocal } from "./jalali";
import { getExercisePlan, type ExerciseDay, type ExerciseGoal, type ExerciseLevel } from "./exercisePlans";
import { FOOD_SEED } from "./foodSeed";
import { getCatalogFoods } from "@/sync/catalog";
import type {
  ExercisePlanRow,
  ExerciseLogRow,
  SetLogRow,
  CalorieEntryRow,
  CalorieTargetRow,
  CustomFoodRow,
  MealType,
} from "./exerciseTypes";

// همه‌ی نوشتن‌های ماژول ورزش/کالری از این‌جا رد می‌شن — یه لایه‌ی نازک روی
// Dexie که (۱) فیلدهای sync (dirty/updatedAt/deletedAt) رو همیشه درست پر
// می‌کنه و (۲) منطق دامنه (تشخیصِ «تمام‌شده»، جایگزینیِ حرکت، …) رو یک‌جا
// نگه می‌داره تا کامپوننت‌ها مستقیم با Dexie کار نکنن.

// ---------------------------------------------------------------- Plans ----

export async function createTemplatePlan(input: {
  goal: ExerciseGoal;
  level: ExerciseLevel;
  gymDays: string[];
  hasPhysicalLimitation: boolean;
  trainingMonth: number | null;
  trainingPhase: string | null;
  equipment: string | null;
  heightCm: number | null;
  weightKg: number | null;
  rulesAccepted?: boolean;
}): Promise<ExercisePlanRow> {
  const planData = getExercisePlan(input.goal, input.level, input.hasPhysicalLimitation, input.gymDays);
  return insertPlan({
    level: input.level,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    goal: input.goal,
    hasPhysicalLimitation: input.hasPhysicalLimitation,
    gymDays: input.gymDays,
    trainingPhase: input.trainingPhase,
    trainingMonth: input.trainingMonth,
    equipment: input.equipment,
    generatedByAi: false,
    planData,
    rulesAcceptedAt: input.rulesAccepted ? nowIso() : null,
  });
}

export async function createManualPlan(input: {
  goal: string | null;
  gymDays: string[];
  days: ExerciseDay[];
  rulesAccepted?: boolean;
}): Promise<ExercisePlanRow> {
  return insertPlan({
    level: "custom",
    heightCm: null,
    weightKg: null,
    goal: input.goal,
    hasPhysicalLimitation: false,
    gymDays: input.gymDays,
    trainingPhase: null,
    trainingMonth: null,
    equipment: null,
    generatedByAi: false,
    planData: input.days,
    rulesAcceptedAt: input.rulesAccepted ? nowIso() : null,
  });
}

async function insertPlan(
  partial: Omit<ExercisePlanRow, "id" | "createdAt" | "updatedAt" | "deletedAt" | "dirty" | "isActive" | "startDate">
): Promise<ExercisePlanRow> {
  const now = nowIso();
  // پلن جدید یعنی پلن‌های قبلی غیرفعال می‌شن — دقیقا مثل وب («یک پلن فعال
  // در هر لحظه»)، بدونِ پاک‌کردنِ تاریخچه‌شون.
  await fitnessDb.transaction("rw", fitnessDb.plans, async () => {
    const actives = await fitnessDb.plans.filter((p) => p.isActive).toArray();
    for (const p of actives) {
      await fitnessDb.plans.update(p.id, { isActive: false, updatedAt: now, dirty: 1 });
    }
  });
  const row: ExercisePlanRow = {
    ...partial,
    id: newLocalId(),
    startDate: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.plans.put(row);
  return row;
}

export async function getActivePlan(): Promise<ExercisePlanRow | undefined> {
  const rows = await fitnessDb.plans
    .filter((p) => p.isActive && !p.deletedAt)
    .sortBy("startDate");
  return rows[rows.length - 1];
}

export async function listPlans(): Promise<ExercisePlanRow[]> {
  const rows = await fitnessDb.plans.filter((p) => !p.deletedAt).toArray();
  return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function archivePlan(id: string): Promise<void> {
  const now = nowIso();
  await fitnessDb.plans.update(id, { isActive: false, deletedAt: now, updatedAt: now, dirty: 1 });
}

export async function substituteItem(planId: string, dayIndex: number, itemIndex: number, newItem: string): Promise<void> {
  const plan = await fitnessDb.plans.get(planId);
  if (!plan) return;
  const planData = plan.planData.map((d, di) => {
    if (di !== dayIndex) return d;
    const items = d.items.map((it, ii) => (ii === itemIndex ? newItem : it));
    return { ...d, items };
  });
  await fitnessDb.plans.update(planId, { planData, updatedAt: nowIso(), dirty: 1 });
}

// ------------------------------------------------------------ Exercise log --

export async function getLogsForPlan(planId: string): Promise<ExerciseLogRow[]> {
  return fitnessDb.exerciseLogs.where("planId").equals(planId).toArray();
}

export async function getLogForDate(planId: string, dateIso: string): Promise<ExerciseLogRow | undefined> {
  return fitnessDb.exerciseLogs.where("[planId+date]").equals([planId, dateIso]).first();
}

/** تیک‌زدن/برداشتنِ یک حرکت برای امروز — completed خودکار وقتی همه‌ی حرکاتِ روز تیک خوردن true می‌شه. */
export async function toggleTodayItem(
  planId: string,
  dateIso: string,
  itemKey: string,
  totalItemsToday: number
): Promise<void> {
  const now = nowIso();
  const existing = await getLogForDate(planId, dateIso);
  const current = new Set(existing?.completedItems ?? []);
  if (current.has(itemKey)) current.delete(itemKey);
  else current.add(itemKey);
  const completedItems = [...current];
  const completed = totalItemsToday > 0 && completedItems.length >= totalItemsToday;

  if (existing) {
    await fitnessDb.exerciseLogs.update(existing.id, { completedItems, completed, updatedAt: now, dirty: 1 });
  } else {
    const row: ExerciseLogRow = {
      id: newLocalId(),
      planId,
      date: dateIso,
      completed,
      completedItems,
      notes: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: 1,
    };
    await fitnessDb.exerciseLogs.put(row);
  }
}

export async function setSessionNotes(planId: string, dateIso: string, notes: string): Promise<void> {
  const now = nowIso();
  const existing = await getLogForDate(planId, dateIso);
  if (existing) {
    await fitnessDb.exerciseLogs.update(existing.id, { notes, updatedAt: now, dirty: 1 });
    return;
  }
  const row: ExerciseLogRow = {
    id: newLocalId(),
    planId,
    date: dateIso,
    completed: false,
    completedItems: [],
    notes,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.exerciseLogs.put(row);
}

export async function getSetLogs(planId: string, dateIso: string, itemKey: string): Promise<SetLogRow[]> {
  const rows = await fitnessDb.setLogs.where("[planId+date+itemKey]").equals([planId, dateIso, itemKey]).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => a.setIndex - b.setIndex);
}

/** ثبت/به‌روزرسانیِ یک ستِ مشخص (reps/weight یا seconds) — با upsert روی setIndex. */
export async function logSet(input: {
  planId: string;
  date: string;
  itemKey: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  seconds: number | null;
}): Promise<void> {
  const now = nowIso();
  const existing = (await getSetLogs(input.planId, input.date, input.itemKey)).find((s) => s.setIndex === input.setIndex);
  if (existing) {
    await fitnessDb.setLogs.update(existing.id, {
      reps: input.reps,
      weightKg: input.weightKg,
      seconds: input.seconds,
      updatedAt: now,
      dirty: 1,
    });
    return;
  }
  const row: SetLogRow = {
    id: newLocalId(),
    planId: input.planId,
    date: input.date,
    itemKey: input.itemKey,
    setIndex: input.setIndex,
    reps: input.reps,
    weightKg: input.weightKg,
    seconds: input.seconds,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.setLogs.put(row);
}

// -------------------------------------------------------------- Calorie ----

export async function addCalorieEntry(input: {
  name: string;
  caloriesPer100g: number;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  grams: number;
  date: string;
  mealType: MealType | null;
  aiScanned?: boolean;
}): Promise<CalorieEntryRow> {
  const now = nowIso();
  const row: CalorieEntryRow = {
    id: newLocalId(),
    name: input.name,
    caloriesPer100g: input.caloriesPer100g,
    proteinPer100g: input.proteinPer100g ?? null,
    carbsPer100g: input.carbsPer100g ?? null,
    fatPer100g: input.fatPer100g ?? null,
    grams: input.grams,
    date: input.date,
    mealType: input.mealType,
    aiScanned: input.aiScanned === true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.calorieEntries.put(row);
  return row;
}

export async function removeCalorieEntry(id: string): Promise<void> {
  const now = nowIso();
  await fitnessDb.calorieEntries.update(id, { deletedAt: now, updatedAt: now, dirty: 1 });
}

export async function entriesForDate(date: string): Promise<CalorieEntryRow[]> {
  const rows = await fitnessDb.calorieEntries.where("date").equals(date).toArray();
  return rows.filter((r) => !r.deletedAt);
}

export function kcalOf(entry: CalorieEntryRow): number {
  return Math.round((entry.caloriesPer100g * entry.grams) / 100);
}

export function macrosOf(entry: CalorieEntryRow): { protein: number; carbs: number; fat: number } {
  const factor = entry.grams / 100;
  return {
    protein: entry.proteinPer100g != null ? Math.round(entry.proteinPer100g * factor) : 0,
    carbs: entry.carbsPer100g != null ? Math.round(entry.carbsPer100g * factor) : 0,
    fat: entry.fatPer100g != null ? Math.round(entry.fatPer100g * factor) : 0,
  };
}

export async function getActiveCalorieTarget(): Promise<CalorieTargetRow | undefined> {
  const rows = await fitnessDb.calorieTargets.filter((t) => !t.deletedAt && !t.effectiveTo).toArray();
  return rows.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

export async function setCalorieTarget(
  input: Omit<CalorieTargetRow, "id" | "createdAt" | "updatedAt" | "deletedAt" | "dirty" | "effectiveFrom" | "effectiveTo">
): Promise<CalorieTargetRow> {
  const now = nowIso();
  const prev = await getActiveCalorieTarget();
  if (prev) {
    await fitnessDb.calorieTargets.update(prev.id, { effectiveTo: now, updatedAt: now, dirty: 1 });
  }
  const row: CalorieTargetRow = {
    ...input,
    id: newLocalId(),
    effectiveFrom: now,
    effectiveTo: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.calorieTargets.put(row);
  return row;
}

// ---------------------------------------------------------------- Foods ----

export async function addCustomFood(input: {
  name: string;
  caloriesPer100g: number;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
}): Promise<CustomFoodRow> {
  const now = nowIso();
  const row: CustomFoodRow = {
    id: newLocalId(),
    name: input.name,
    caloriesPer100g: input.caloriesPer100g,
    proteinPer100g: input.proteinPer100g ?? null,
    carbsPer100g: input.carbsPer100g ?? null,
    fatPer100g: input.fatPer100g ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.customFoods.put(row);
  return row;
}

export type FoodSearchResult = {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  custom: boolean;
};

/** جستجوی غذا کاملا آفلاین: کاتالوگِ دانلودشده (یا FOOD_SEEDِ باندل) + غذاهای سفارشیِ خودِ کاربر. */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const q = query.trim();
  const custom = (await fitnessDb.customFoods.filter((f) => !f.deletedAt).toArray()).map((f) => ({
    name: f.name,
    caloriesPer100g: f.caloriesPer100g,
    proteinPer100g: f.proteinPer100g,
    carbsPer100g: f.carbsPer100g,
    fatPer100g: f.fatPer100g,
    custom: true,
  }));
  // کاتالوگِ دانلودشده از سرور (اگه هست)، وگرنه seedِ داخلِ باندل
  const catalogFoods = (await getCatalogFoods()) ?? FOOD_SEED;
  const seed = catalogFoods.map((f) => ({
    name: f.name,
    caloriesPer100g: f.caloriesPer100g,
    proteinPer100g: null as number | null,
    carbsPer100g: null as number | null,
    fatPer100g: null as number | null,
    custom: false,
  }));
  const all = [...custom, ...seed];
  if (!q) return all.slice(0, 8);
  return all.filter((f) => f.name.indexOf(q) !== -1).slice(0, 20);
}

export { isoLocal };
