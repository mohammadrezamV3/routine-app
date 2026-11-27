import { describe, it, expect } from "vitest";
import { bmiCategory, calcBmi, healthyWeightRange, kgToHealthy, roundBmi } from "@/lib/bmi";

describe("BMI", () => {
  it("فرمول وزن تقسیم بر مجذور قد", () => {
    expect(roundBmi(calcBmi(175, 70)!)).toBe(22.9);
    expect(roundBmi(calcBmi(160, 82)!)).toBe(32);
    expect(calcBmi(0, 70)).toBeNull();
    expect(calcBmi(170, -1)).toBeNull();
    expect(calcBmi(NaN, 70)).toBeNull();
  });

  it("دسته‌بندی WHO در مرزها", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("normal");
    expect(bmiCategory(24.9)).toBe("normal");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese1");
    expect(bmiCategory(35)).toBe("obese2");
    expect(bmiCategory(40)).toBe("obese3");
  });

  it("محدوده‌ی وزن سالم برای قد 175", () => {
    expect(healthyWeightRange(175)).toEqual({ minKg: 56.7, maxKg: 76.3 });
    expect(healthyWeightRange(0)).toBeNull();
  });

  it("فاصله تا محدوده‌ی سالم", () => {
    expect(kgToHealthy(175, 70)).toBe(0);
    expect(kgToHealthy(175, 90)).toBe(-13.7);
    expect(kgToHealthy(175, 50)).toBe(6.7);
    expect(kgToHealthy(175, 0)).toBeNull();
  });
});
