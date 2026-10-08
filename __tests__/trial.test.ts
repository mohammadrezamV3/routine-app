import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_TRIAL_AI_LIMITS, normalizeTrialAiLimits, TRIAL_AI_FEATURES, ROUTINE_TRIAL_DAYS, ROUTINE_TRIAL_MS, TRIAL_DAYS, TRIAL_MODULE_KEYS, TRIAL_MS,
} from "@/lib/trial";
import { TRIAL_MODULES, provisionTrialAccess } from "@/lib/trialAccess";
import { BASIC_MODULES, isBasicModule } from "@/lib/modules";
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
    expect(normalizeTrialAiLimits({ EXERCISE_PLAN_GENERATION: "4" })).toEqual(DEFAULT_TRIAL_AI_LIMITS);
  });

  it("accepts valid overrides including 0 (closed) and drops unknown keys", () => {
    expect(normalizeTrialAiLimits({ EXERCISE_PLAN_GENERATION: 0 }).EXERCISE_PLAN_GENERATION).toBe(0);
    const l = normalizeTrialAiLimits({ EXERCISE_PLAN_GENERATION: 2, ROADMAP_GENERATION: 9, FOOD_SCAN: 3 });
    expect(l.EXERCISE_PLAN_GENERATION).toBe(2);
    expect("FOOD_SCAN" in l).toBe(false);
    expect("ROADMAP_GENERATION" in l).toBe(false);
  });
});

const createMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { moduleAccess: { createMany } } }));

describe("basic modules: 14-day trial, then paid", () => {
  beforeEach(() => createMany.mockReset());

  it("never overlap with trial modules", () => {
    for (const m of TRIAL_MODULES) expect(isBasicModule(m)).toBe(false);
  });

  it("routine trial is 14 days", () => {
    expect(ROUTINE_TRIAL_DAYS).toBe(14);
    expect(ROUTINE_TRIAL_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("provisionTrialAccess gives basics now+14d and trial modules now+3d", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    await provisionTrialAccess("u1", now);
    const { data } = createMany.mock.calls[0][0];
    for (const m of BASIC_MODULES) {
      const row = data.find((r: { module: string }) => r.module === m);
      expect(row.active).toBe(true);
      expect(row.expiresAt.getTime()).toBe(now.getTime() + ROUTINE_TRIAL_MS);
    }
    for (const m of TRIAL_MODULES) {
      const row = data.find((r: { module: string }) => r.module === m);
      expect(row.expiresAt.getTime()).toBe(now.getTime() + TRIAL_MS);
    }
  });
});

describe("basic plan price", () => {
  it("is 99,000 toman monthly and purchasable", () => {
    const p = findPlanPricing("basic");
    expect(p).toBeDefined();
    expect(p?.amounts).toEqual({ "1": 990_000, "3": 2_600_000, "6": 5_200_000, "12": 10_400_000 });
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
