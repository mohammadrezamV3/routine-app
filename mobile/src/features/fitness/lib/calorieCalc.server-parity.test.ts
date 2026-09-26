import { describe, expect, it } from "vitest";
import { calcDailyTargetKcal as mobileCalc, type CalorieGoal, type Sex } from "./calorieCalc";

// این فایل عمداً از import مستقیمِ lib/calorieCalc.ts ریشه استفاده نمی‌کند:
// آن فایل بیرون از rootDir پروژه‌ی موبایل است و tsc -b (typecheck/build) با
// خطای TS6307 ("not listed within the file list of project") رد می‌شود.
// به‌جاش، الگوریتمِ سرور (lib/calorieCalc.ts → calcBmr/activityMultiplier/
// goalAdjustment/calcDailyTargetKcal) اینجا به‌صورتِ یک fixture مستقل کپی
// شده تا خروجیِ نسخه‌ی موبایل با آن مقایسه شود. هر تغییری در فرمولِ سرور
// باید همین‌جا هم دستی اعمال شود وگرنه این تست شکست می‌خورد و یادآوری می‌کند.
function serverCalcBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

function serverActivityMultiplier(gymDaysPerWeek: number): number {
  if (gymDaysPerWeek <= 0) return 1.2;
  if (gymDaysPerWeek <= 2) return 1.375;
  if (gymDaysPerWeek <= 4) return 1.55;
  if (gymDaysPerWeek <= 6) return 1.725;
  return 1.9;
}

function serverGoalAdjustment(goal: CalorieGoal, trainingPhase?: string | null): number {
  if (goal === "lose") return -0.2;
  if (goal === "gain") return 0.15;
  if (trainingPhase === "bulk") return 0.1;
  if (trainingPhase === "cut") return -0.1;
  return 0;
}

const SERVER_ABSOLUTE_MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

function serverCalcDailyTargetKcal(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  gymDaysPerWeek: number;
  goal: CalorieGoal;
  trainingPhase?: string | null;
}): number {
  const bmr = serverCalcBmr(input.sex, input.weightKg, input.heightCm, input.age);
  const tdee = bmr * serverActivityMultiplier(input.gymDaysPerWeek);
  const adjusted = tdee * (1 + serverGoalAdjustment(input.goal, input.trainingPhase));
  const floor = Math.max(SERVER_ABSOLUTE_MIN_KCAL[input.sex], bmr);
  return Math.round(Math.max(floor, adjusted) / 10) * 10;
}

describe("mobile calorieCalc matches server lib/calorieCalc fixture", () => {
  it("agrees on several representative inputs, including the gym-days-derivation cases that used to diverge", () => {
    const cases: Array<{
      sex: Sex;
      weightKg: number;
      heightCm: number;
      age: number;
      gymDaysPerWeek: number;
      goal: CalorieGoal;
      trainingPhase?: string | null;
    }> = [
      { sex: "male", weightKg: 80, heightCm: 180, age: 30, gymDaysPerWeek: 3, goal: "maintain" },
      { sex: "female", weightKg: 60, heightCm: 165, age: 25, gymDaysPerWeek: 0, goal: "lose" },
      { sex: "male", weightKg: 70, heightCm: 175, age: 40, gymDaysPerWeek: 5, goal: "gain" },
      { sex: "female", weightKg: 55, heightCm: 160, age: 50, gymDaysPerWeek: 6, goal: "maintain", trainingPhase: "bulk" },
      { sex: "male", weightKg: 90, heightCm: 190, age: 22, gymDaysPerWeek: 1, goal: "maintain", trainingPhase: "cut" },
      { sex: "female", weightKg: 45, heightCm: 150, age: 60, gymDaysPerWeek: 2, goal: "lose" },
      // بدونِ برنامه‌ی فعال، سرور و موبایل هر دو باید gymDaysPerWeek=1 (نه ۳) بدن
      { sex: "male", weightKg: 85, heightCm: 178, age: 33, gymDaysPerWeek: 1, goal: "maintain" },
    ];

    for (const c of cases) {
      expect(mobileCalc(c)).toBe(serverCalcDailyTargetKcal(c));
    }
  });
});
