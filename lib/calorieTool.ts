// ماشین‌حساب عمومی کالری (صفحه‌ی /tools/calorie-calculator) — منطق خالص.
// فرمول BMR: Mifflin-St Jeor. TDEE = BMR × ضریب فعالیت. تنظیم هدف و کف ایمنی
// هم‌قاعده با calcDailyTargetKcal در lib/calorieCalc.ts (کم‌کردن 20 درصد برای
// کاهش وزن، افزودن 15 درصد برای افزایش وزن).

import type { CalorieGoal, Sex } from "./calorieCalc";

export type ActivityKey = "sedentary" | "light" | "moderate" | "active" | "athlete";

export const ACTIVITY_LEVELS: { key: ActivityKey; label: string; factor: number }[] = [
  { key: "sedentary", label: "کم‌تحرک (کار پشت میز، تقریبا بدون ورزش)", factor: 1.2 },
  { key: "light", label: "فعالیت سبک (1 تا 2 روز ورزش در هفته)", factor: 1.375 },
  { key: "moderate", label: "فعالیت متوسط (3 تا 4 روز ورزش در هفته)", factor: 1.55 },
  { key: "active", label: "فعالیت زیاد (5 تا 6 روز ورزش در هفته)", factor: 1.725 },
  { key: "athlete", label: "خیلی زیاد (تمرین سنگین روزانه یا کار بدنی سخت)", factor: 1.9 },
];

const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };
const GOAL_ADJ: Record<CalorieGoal, number> = { lose: -0.2, maintain: 0, gain: 0.15 };

export type CalorieToolInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityKey;
  goal: CalorieGoal;
};

export type CalorieToolResult =
  | {
      ok: true;
      bmr: number;
      tdee: number;
      target: number;
      /** true وقتی کف ایمنی کالری اعمال شده و هدف از حد دلخواه بالاتر رفته */
      floored: boolean;
      proteinG: number;
      fatG: number;
      carbsG: number;
    }
  | { ok: false; error: string };

const fin = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const round10 = (n: number) => Math.round(n / 10) * 10;

export function calcBmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calcCalorieTool(inp: CalorieToolInput): CalorieToolResult {
  if (!fin(inp.age) || inp.age < 15 || inp.age > 90) return { ok: false, error: "سن را بین 15 تا 90 سال وارد کن" };
  if (!fin(inp.heightCm) || inp.heightCm < 100 || inp.heightCm > 250) return { ok: false, error: "قد را بین 100 تا 250 سانتی‌متر وارد کن" };
  if (!fin(inp.weightKg) || inp.weightKg < 30 || inp.weightKg > 300) return { ok: false, error: "وزن را بین 30 تا 300 کیلوگرم وارد کن" };
  const level = ACTIVITY_LEVELS.find((a) => a.key === inp.activity);
  if (!level) return { ok: false, error: "سطح فعالیت را انتخاب کن" };

  const bmr = calcBmrMifflin(inp.sex, inp.weightKg, inp.heightCm, inp.age);
  const tdee = bmr * level.factor;
  const wanted = tdee * (1 + GOAL_ADJ[inp.goal]);
  const floor = Math.max(MIN_KCAL[inp.sex], bmr);
  const floored = wanted < floor;
  const target = round10(Math.max(floor, wanted));

  // پروتئین بر اساس وزن (کاهش وزن بیشتر)، چربی 25 درصد کالری، باقی کربوهیدرات
  const proteinG = Math.round(inp.weightKg * (inp.goal === "lose" ? 2 : 1.6));
  const fatG = Math.round((target * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((target - proteinG * 4 - fatG * 9) / 4));
  return { ok: true, bmr: round10(bmr), tdee: round10(tdee), target, floored, proteinG, fatG, carbsG };
}
