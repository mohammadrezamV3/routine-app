import { describe, it, expect } from "vitest";
import { computeCalorieTargetFromProfile, resolveCalorieTargetAge } from "@/lib/calorieTargetCompute";
import { calcAge, calcDailyTargetKcal, splitMeals } from "@/lib/calorieCalc";

const input = { sex: "male", weightKg: 80, heightCm: 180, goal: "maintain", mealsPerDay: 3, ageYears: 30 } as any;

describe("computeCalorieTargetFromProfile (pure)", () => {
  it("uses input age when no birthDate; no active plan → 1 gym day", () => {
    const r = computeCalorieTargetFromProfile(input, { birthDate: null, activeGymDays: null });
    const kcal = calcDailyTargetKcal({ sex: "male", weightKg: 80, heightCm: 180, age: 30, gymDaysPerWeek: 1, goal: "maintain", trainingPhase: undefined });
    expect(r).toEqual({
      ok: true,
      value: {
        dailyTargetKcal: kcal, goal: "maintain", mealsPerDay: 3, sex: "male",
        heightCm: 180, weightKg: 80, ageYears: 30, mealBreakdown: splitMeals(kcal, 3),
      },
    });
  });

  it("account birthDate wins over input age and ageYears is reported null", () => {
    const birthDate = new Date("1990-01-15T00:00:00.000Z");
    const r = computeCalorieTargetFromProfile(input, { birthDate, activeGymDays: ["sat", "mon", "wed", "fri"], trainingPhase: "bulk" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kcal = calcDailyTargetKcal({ sex: "male", weightKg: 80, heightCm: 180, age: calcAge(birthDate), gymDaysPerWeek: 4, goal: "maintain", trainingPhase: "bulk" });
    expect(r.value.dailyTargetKcal).toBe(kcal);
    expect(r.value.ageYears).toBeNull();
  });

  it("missing/invalid age → error", () => {
    expect(computeCalorieTargetFromProfile({ ...input, ageYears: undefined }, { birthDate: null, activeGymDays: null }).ok).toBe(false);
    expect(computeCalorieTargetFromProfile({ ...input, ageYears: 5 }, { birthDate: null, activeGymDays: null }).ok).toBe(false);
    expect(resolveCalorieTargetAge(null, { ageYears: 101 })).toBeNull();
    expect(resolveCalorieTargetAge(null, { ageYears: 10 })).toBe(10);
  });
});
