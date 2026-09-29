import { describe, it, expect } from "vitest";
import {
  DEFAULT_TRIAL_AI_LIMITS, normalizeTrialAiLimits, TRIAL_AI_FEATURES, TRIAL_DAYS, TRIAL_MODULE_KEYS, TRIAL_MS,
} from "@/lib/trial";
import { TRIAL_MODULES } from "@/lib/trialAccess";
import { BASIC_MODULES, isBasicModule, withBasicModules } from "@/lib/modules";
import { findPlanPricing } from "@/lib/planPricing";

describe("trial constants", () => {
  it("is three days", () => {
    expect(TRIAL_DAYS).toBe(3);
    expect(TRIAL_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("covers only exercise, calorie and trade (no roadmap / AI insight)", () => {
    expect([...TRIAL_MODULE_KEYS].sort()).toEqual(["CALORIE", "EXERCISE", "TRADE"]);
    expect(TRIAL_MODULES.map(String).sort()).toEqual(["CALORIE", "EXERCISE", "TRADE"]);
  });

  it("caps exercise plan at 1 and has no roadmap/weekly caps", () => {
    expect(DEFAULT_TRIAL_AI_LIMITS.EXERCISE_PLAN_GENERATION).toBe(1);
    expect(TRIAL_AI_FEATURES).not.toContain("ROADMAP_GENERATION");
    expect(TRIAL_AI_FEATURES).not.toContain("WEEKLY_COACH_REPORT");
  });

  it("falls back to defaults for missing/invalid stored limits", () => {
    expect(normalizeTrialAiLimits(null)).toEqual(DEFAULT_TRIAL_AI_LIMITS);
    expect(normalizeTrialAiLimits({ FOOD_SCAN: -1, EXERCISE_PLAN_GENERATION: "4" })).toEqual(DEFAULT_TRIAL_AI_LIMITS);
  });

  it("accepts valid overrides including 0 (closed) and drops unknown keys", () => {
    const l = normalizeTrialAiLimits({ FOOD_SCAN: 0, EXERCISE_PLAN_GENERATION: 2, ROADMAP_GENERATION: 9 });
    expect(l.FOOD_SCAN).toBe(0);
    expect(l.EXERCISE_PLAN_GENERATION).toBe(2);
    expect("ROADMAP_GENERATION" in l).toBe(false);
  });
});

describe("basic modules are free forever", () => {
  it("never overlap with trial modules", () => {
    for (const m of TRIAL_MODULES) expect(isBasicModule(m)).toBe(false);
  });

  it("withBasicModules forces basics active and non-expiring", () => {
    const past = new Date(Date.now() - 1000);
    const rows = withBasicModules([
      { module: "ROUTINE", active: false, expiresAt: past },
      { module: "TRADE", active: true, expiresAt: past },
    ]);
    for (const m of BASIC_MODULES) {
      expect(rows.filter((r) => r.module === m)).toEqual([{ module: m, active: true, expiresAt: null }]);
    }
    expect(rows.find((r) => r.module === "TRADE")?.expiresAt).toBe(past);
  });
});

describe("trade plan price", () => {
  it("is 175,000 toman monthly with derived multi-month prices", () => {
    expect(findPlanPricing("trade")?.amounts).toEqual({ "1": 1_750_000, "3": 4_590_000, "6": 9_190_000, "12": 18_380_000 });
  });
});

describe("nomo free messages", () => {
  it("defaults to 10 and accepts only valid admin overrides", async () => {
    const { FREE_ASSISTANT_USES, normalizeNomoFreeUses } = await import("@/lib/routineAssistant");
    expect(FREE_ASSISTANT_USES).toBe(10);
    expect(normalizeNomoFreeUses(null)).toBe(10);
    expect(normalizeNomoFreeUses(-1)).toBe(10);
    expect(normalizeNomoFreeUses(2.5)).toBe(10);
    expect(normalizeNomoFreeUses(0)).toBe(0);
    expect(normalizeNomoFreeUses(25)).toBe(25);
  });
});
