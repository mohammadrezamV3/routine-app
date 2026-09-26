import { calcAge, calcDailyTargetKcal, splitMeals, CalorieGoal, Sex, MealBreakdownItem } from "@/lib/calorieCalc";
import type { CalorieTargetInput } from "@/lib/calorieTargetRules";

// محاسبه‌ی خالصِ هدفِ کالری (بدونِ دیتابیس) — lib/calorieTargetService.ts
// فقط پروفایل رو از دیتابیس می‌خونه و همین رو صدا می‌زنه؛ لایه‌ی آفلاین اپ
// موبایل هم با پروفایلِ کش‌شده‌ی خودش (birthDate حساب + gymDays برنامه‌ی
// فعال) همین رو صدا می‌زنه تا عددِ هدف دو جا دو جور حساب نشه.

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

/** داده‌ی پروفایلی که محاسبه لازم داره (از دیتابیس یا کشِ محلی). */
export type CalorieTargetProfile = {
  /** تاریخ تولدِ ثبت‌شده در حساب؛ اگه باشه بر ورودیِ ageYears مقدمه */
  birthDate: Date | null;
  /** روزهای باشگاهِ برنامه‌ی ورزشیِ فعال؛ null یعنی برنامه‌ی فعالی نیست */
  activeGymDays: string[] | null;
  trainingPhase?: string | null;
};

export const CALORIE_AGE_REQUIRED_ERROR = "سن لازم است (تاریخ تولدت توی حسابت ثبت نشده)";

/** سن از تاریخ تولدِ حساب، وگرنه از ورودی (۱۰ تا ۱۰۰)؛ null یعنی «سن لازمه» */
export function resolveCalorieTargetAge(birthDate: Date | null, input: Pick<CalorieTargetInput, "ageYears">): number | null {
  if (birthDate) return calcAge(birthDate);
  if (typeof input.ageYears === "number" && input.ageYears >= 10 && input.ageYears <= 100) return input.ageYears;
  return null;
}

/** Mifflin-St Jeor + تقسیمِ وعده‌ها */
export function computeCalorieTargetFromProfile(
  input: CalorieTargetInput,
  profile: CalorieTargetProfile
): Result<ComputedCalorieTarget> {
  const age = resolveCalorieTargetAge(profile.birthDate, input);
  if (age === null) return { ok: false, error: CALORIE_AGE_REQUIRED_ERROR };

  // اگه برنامه‌ی ورزشی فعالی نبود، «۳ روز باشگاه» فرض نکن — این ضریب ۱.۵۵
  // (فعالیت متوسط) رو می‌داد و هدف رو برای کسی که اصلا تمرین نمی‌کنه چند صد
  // کالری بیش‌برآورد می‌کرد. فرض واقعا محافظه‌کارانه «کم‌تحرک سبک» (۱.۳۷۵)ه.
  const gymDaysPerWeek = profile.activeGymDays ? profile.activeGymDays.length : 1;

  const dailyTargetKcal = calcDailyTargetKcal({
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    gymDaysPerWeek,
    goal: input.goal,
    trainingPhase: profile.trainingPhase,
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
      ageYears: profile.birthDate ? null : age,
      mealBreakdown: splitMeals(dailyTargetKcal, input.mealsPerDay),
    },
  };
}
