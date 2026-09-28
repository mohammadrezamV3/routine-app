import { describe, it, expect } from "vitest";
import { DEFAULT_TRIAL_AI_LIMITS, normalizeTrialAiLimits, TRIAL_DAYS, TRIAL_MS } from "@/lib/trial";
import { findPlanPricing } from "@/lib/planPricing";

describe("trial constants", () => {
  it("is one week", () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(TRIAL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("falls back to defaults for missing/invalid stored limits", () => {
    expect(normalizeTrialAiLimits(null)).toEqual(DEFAULT_TRIAL_AI_LIMITS);
    expect(normalizeTrialAiLimits({ FOOD_SCAN: -1, ROADMAP_GENERATION: 1.5, EXERCISE_PLAN_GENERATION: "4" }))
      .toEqual(DEFAULT_TRIAL_AI_LIMITS);
  });

  it("accepts valid overrides including 0 (closed)", () => {
    const l = normalizeTrialAiLimits({ FOOD_SCAN: 0, WEEKLY_COACH_REPORT: 5, UNKNOWN: 9 });
    expect(l.FOOD_SCAN).toBe(0);
    expect(l.WEEKLY_COACH_REPORT).toBe(5);
    expect(l.ROADMAP_GENERATION).toBe(DEFAULT_TRIAL_AI_LIMITS.ROADMAP_GENERATION);
    expect("UNKNOWN" in l).toBe(false);
  });
});

describe("trade plan price", () => {
  it("is 175,000 toman monthly", () => {
    expect(findPlanPricing("trade")?.amounts?.["1"]).toBe(1_750_000);
  });
});
