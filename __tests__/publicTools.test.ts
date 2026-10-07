import { describe, expect, it } from "vitest";
import { calcBmi, bmiCategory } from "../lib/bmi";
import { calcCalorieTool } from "../lib/calorieTool";
import { calcLotByPips } from "../lib/lotTool";
import { PUBLIC_TOOLS } from "../lib/tools";

describe("ابزارهای عمومی", () => {
  it("فهرست ابزارها", () => {
    expect(PUBLIC_TOOLS).toHaveLength(4);
    expect(PUBLIC_TOOLS.every((t) => t.path.startsWith("/tools/"))).toBe(true);
  });

  it("BMI و بازه وزن طبیعی", () => {
    const r = calcBmi(175, 70);
    expect(r.ok && r.bmi.toFixed(1)).toBe("22.9");
    expect(r.ok && r.category.key).toBe("normal");
    expect(r.ok && r.diffKg).toBe(0);
    expect(bmiCategory(17).key).toBe("under");
    expect(bmiCategory(25).key).toBe("over");
    expect(calcBmi(50, 70).ok).toBe(false);
  });

  it("کالری میفلین", () => {
    const r = calcCalorieTool({ sex: "male", age: 30, heightCm: 175, weightKg: 75, activity: "moderate", goal: "maintain" });
    expect(r.ok && r.bmr).toBe(1700);
    expect(r.ok && r.tdee).toBe(2630);
    const lose = calcCalorieTool({ sex: "male", age: 30, heightCm: 175, weightKg: 75, activity: "moderate", goal: "lose" });
    expect(lose.ok && lose.target).toBe(2110);
    expect(calcCalorieTool({ sex: "male", age: 5, heightCm: 175, weightKg: 75, activity: "light", goal: "lose" }).ok).toBe(false);
  });

  it("حجم لات", () => {
    const r = calcLotByPips({ symbol: "EURUSD", balance: 10000, mode: "percent", riskValue: 1, slPips: 20 });
    expect(r.ok && r.lots).toBe(0.5);
    expect(r.ok && r.approx).toBe(false);
    const tiny = calcLotByPips({ symbol: "EURUSD", balance: 100, mode: "percent", riskValue: 1, slPips: 500 });
    expect(tiny.ok && tiny.belowMin).toBe(true);
    expect(calcLotByPips({ symbol: "EURUSD", balance: 0, mode: "percent", riskValue: 1, slPips: 20 }).ok).toBe(false);
  });
});
