import { prisma } from "@/lib/prisma";
import { calcAge, calcDailyTargetKcal, splitMeals, CalorieGoal, Sex, MealBreakdownItem } from "@/lib/calorieCalc";
import type { CalorieTargetInput } from "@/lib/calorieTargetRules";

export { validateCalorieTargetInput, validateMealsPatch } from "@/lib/calorieTargetRules";
export type { CalorieTargetInput, MealsPatch } from "@/lib/calorieTargetRules";

// محاسبه‌ی هدفِ کالری — بینِ /api/calorie/target (وب) و همگام‌سازیِ موبایل
// (lib/mobileSyncStore.ts) مشترک. هدف همیشه سمتِ سرور با فرمول حساب می‌شه —
// کلاینت فقط ورودی‌ها رو می‌فرسته، نه عددِ نهایی رو.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type ComputedCalorieTarget = {
  dailyTargetKcal: number;
  goal: CalorieGoal;
  mealsPerDay: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  ageYears: number | null;
  mealBreakdown: MealBreakdownItem[];
};

/** Mifflin-St Jeor + تقسیمِ وعده‌ها — سن از تاریخ تولدِ حساب، وگرنه از ورودی */
export async function computeCalorieTarget(userId: string, input: CalorieTargetInput): Promise<Result<ComputedCalorieTarget>> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } });
  let age: number | null = null;
  if (user?.birthDate) {
    age = calcAge(user.birthDate);
  } else if (typeof input.ageYears === "number" && input.ageYears >= 10 && input.ageYears <= 100) {
    age = input.ageYears;
  }
  if (age === null) return { ok: false, error: "سن لازم است (تاریخ تولدت توی حسابت ثبت نشده)" };

  const activePlan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true } });
  const activeGymDays = activePlan?.gymDays && Array.isArray(activePlan.gymDays) ? (activePlan.gymDays as string[]) : null;
  // اگه برنامه‌ی ورزشی فعالی نبود، «۳ روز باشگاه» فرض نکن — این ضریب ۱.۵۵
  // (فعالیت متوسط) رو می‌داد و هدف رو برای کسی که اصلا تمرین نمی‌کنه چند صد
  // کالری بیش‌برآورد می‌کرد. فرض واقعا محافظه‌کارانه «کم‌تحرک سبک» (۱.۳۷۵)ه.
  const gymDaysPerWeek = activeGymDays ? activeGymDays.length : 1;

  const dailyTargetKcal = calcDailyTargetKcal({
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    gymDaysPerWeek,
    goal: input.goal,
    trainingPhase: activePlan?.trainingPhase,
  });
  return {
    ok: true,
    value: {
      dailyTargetKcal,
      goal: input.goal,
      mealsPerDay: input.mealsPerDay,
      sex: input.sex,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      ageYears: user?.birthDate ? null : age,
      mealBreakdown: splitMeals(dailyTargetKcal, input.mealsPerDay),
    },
  };
}

