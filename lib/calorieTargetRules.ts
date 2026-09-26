import type { CalorieGoal, Sex, MealBreakdownItem } from "@/lib/calorieCalc";
import { clampText } from "@/lib/validate";

// قواعدِ اعتبارسنجیِ هدفِ کالری — خالص (بدونِ دیتابیس)، مشترک بینِ
// /api/calorie/target و همگام‌سازیِ موبایل. محاسبه‌ی عددِ هدف در
// lib/calorieTargetService.ts است.

const VALID_GOALS: CalorieGoal[] = ["lose", "maintain", "gain"];
const VALID_SEX: Sex[] = ["male", "female"];

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type CalorieTargetInput = {
  goal: CalorieGoal;
  mealsPerDay: number;
  sex: Sex;
  ageYears?: number;
  heightCm: number;
  weightKg: number;
};

export function validateCalorieTargetInput(body: any): Result<CalorieTargetInput> {
  const { goal, mealsPerDay, sex, ageYears, heightCm, weightKg } = (body ?? {}) as Record<string, any>;
  if (!goal || !VALID_GOALS.includes(goal)) return { ok: false, error: "هدف کالری نامعتبر است" };
  if (!mealsPerDay || typeof mealsPerDay !== "number" || !Number.isInteger(mealsPerDay) || mealsPerDay < 2 || mealsPerDay > 6) {
    return { ok: false, error: "تعداد وعده باید بین ۲ تا ۶ باشد" };
  }
  if (!sex || !VALID_SEX.includes(sex)) return { ok: false, error: "جنسیت نامعتبر است" };
  if (!heightCm || typeof heightCm !== "number" || heightCm < 50 || heightCm > 260) {
    return { ok: false, error: "قد وارد شده معتبر نیست" };
  }
  if (!weightKg || typeof weightKg !== "number" || weightKg < 20 || weightKg > 400) {
    return { ok: false, error: "وزن وارد شده معتبر نیست" };
  }
  if (ageYears !== undefined && ageYears !== null && typeof ageYears !== "number") {
    return { ok: false, error: "سن نامعتبر است" };
  }
  return { ok: true, value: { goal, mealsPerDay, sex, ageYears: ageYears ?? undefined, heightCm, weightKg } };
}

export type MealsPatch = {
  mealBreakdown: MealBreakdownItem[];
  dailyTargetKcal: number;
  mealsPerDay: number;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
};

/**
 * چیدمانِ دستیِ وعده‌ها + هدفِ درشت‌مغذی‌ها. کالریِ روزانه = جمعِ وعده‌ها.
 * `keySeed` فقط برای ساختِ کلیدِ وعده‌ی بی‌کلید (قابلِ تزریق برای تست).
 */
export function validateMealsPatch(body: any, keySeed: string = Date.now().toString(36)): Result<MealsPatch> {
  const { mealBreakdown, proteinTargetG, carbsTargetG, fatTargetG } = (body ?? {}) as Record<string, any>;

  // هدف درشت‌مغذی اختیاریه؛ هر کدوم که خالی بمونه null ذخیره می‌شه.
  // سقف ۲۰۰۰ گرم صرفا یک نگهبان بی‌معنی‌نبودنه، نه توصیه‌ی تغذیه‌ای.
  function macro(v: unknown): number | null | "invalid" {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!isFinite(n) || n < 0 || n > 2000) return "invalid";
    return Math.round(n);
  }
  const protein = macro(proteinTargetG);
  const carbs = macro(carbsTargetG);
  const fat = macro(fatTargetG);
  if (protein === "invalid" || carbs === "invalid" || fat === "invalid") {
    return { ok: false, error: "هدف درشت‌مغذی نامعتبر است" };
  }

  if (!Array.isArray(mealBreakdown) || mealBreakdown.length < 1 || mealBreakdown.length > 8) {
    return { ok: false, error: "بین ۱ تا ۸ وعده مجاز است" };
  }
  const cleaned: MealBreakdownItem[] = [];
  for (const m of mealBreakdown) {
    if (!m || typeof m.label !== "string" || !m.label.trim()) return { ok: false, error: "اسم وعده نمی‌تواند خالی باشد" };
    if (typeof m.kcal !== "number" || !isFinite(m.kcal) || m.kcal < 0 || m.kcal > 10000) {
      return { ok: false, error: "مقدار کالری وعده نامعتبر است" };
    }
    const key = typeof m.key === "string" && m.key ? clampText(m.key, 40) : `meal_${cleaned.length}_${keySeed}`;
    cleaned.push({ key, label: clampText(m.label, 30), kcal: Math.round(m.kcal) });
  }
  const dailyTargetKcal = cleaned.reduce((s, m) => s + m.kcal, 0);
  if (dailyTargetKcal < 500) return { ok: false, error: "جمع کالری وعده‌ها خیلی کم است" };

  return {
    ok: true,
    value: { mealBreakdown: cleaned, dailyTargetKcal, mealsPerDay: cleaned.length, proteinTargetG: protein, carbsTargetG: carbs, fatTargetG: fat },
  };
}
