import { prisma } from "@/lib/prisma";
import {
  computeCalorieTargetFromProfile,
  resolveCalorieTargetAge,
  CALORIE_AGE_REQUIRED_ERROR,
  type ComputedCalorieTarget,
} from "@/lib/calorieTargetCompute";
import type { CalorieTargetInput } from "@/lib/calorieTargetRules";

export { validateCalorieTargetInput, validateMealsPatch } from "@/lib/calorieTargetRules";
export type { CalorieTargetInput, MealsPatch } from "@/lib/calorieTargetRules";
export { computeCalorieTargetFromProfile, resolveCalorieTargetAge } from "@/lib/calorieTargetCompute";
export type { ComputedCalorieTarget, CalorieTargetProfile } from "@/lib/calorieTargetCompute";

// محاسبه‌ی هدفِ کالری — بینِ /api/calorie/target (وب) و همگام‌سازیِ موبایل
// (lib/mobileSyncStore.ts) مشترک. هدف همیشه سمتِ سرور با فرمول حساب می‌شه —
// کلاینت فقط ورودی‌ها رو می‌فرسته، نه عددِ نهایی رو.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Mifflin-St Jeor + تقسیمِ وعده‌ها — سن از تاریخ تولدِ حساب، وگرنه از ورودی.
 *  محاسبه‌ی خالص در lib/calorieTargetCompute.ts؛ این‌جا فقط خواندنِ پروفایل. */
export async function computeCalorieTarget(userId: string, input: CalorieTargetInput): Promise<Result<ComputedCalorieTarget>> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } });
  const birthDate = user?.birthDate ?? null;
  // سنِ نامعتبر قبل از کوئریِ برنامه‌ی ورزشی رد می‌شه (مثل قبل، یه کوئری کمتر)
  if (resolveCalorieTargetAge(birthDate, input) === null) return { ok: false, error: CALORIE_AGE_REQUIRED_ERROR };

  const activePlan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true } });
  const activeGymDays = activePlan?.gymDays && Array.isArray(activePlan.gymDays) ? (activePlan.gymDays as string[]) : null;
  return computeCalorieTargetFromProfile(input, {
    birthDate,
    activeGymDays,
    trainingPhase: activePlan?.trainingPhase,
  });
}
