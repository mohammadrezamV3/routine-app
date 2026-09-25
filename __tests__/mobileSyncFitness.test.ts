import { describe, it, expect } from "vitest";
import {
  parseRoadmapProgressChange,
  parseExerciseLogKey,
  parseSyncChange,
  validateCalorieTargetData,
  validateExerciseLogData,
  validateExercisePlanData,
  validateFoodLogData,
  validatePlanDays,
  MAX_EXERCISE_LOG_ITEMS,
} from "@/lib/mobileSync";
import { catalogVersion, etagMatches } from "@/lib/mobileCatalog";
import { SYNC_ENTITY_MODULE } from "@/lib/mobileApiContract";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const TS = "2026-09-24T10:00:00.000Z";
const ID = "tz4a98xxat96iws9zmbrgj3a";

describe("exercise plan validation", () => {
  it("accepts a well-formed manual plan and defaults focus", () => {
    const r = validatePlanDays([{ day: "شنبه", items: [" اسکوات ", "پرس سینه"] }]);
    expect(r).toMatchObject({ ok: true, value: [{ day: "شنبه", focus: "برنامه‌ی شخصی", items: ["اسکوات", "پرس سینه"] }] });
  });
  it("rejects bad weekdays, duplicates, empty/oversized days", () => {
    expect(validatePlanDays([{ day: "Saturday", items: ["a"] }]).ok).toBe(false);
    expect(validatePlanDays([{ day: "شنبه", items: ["a"] }, { day: "شنبه", items: ["b"] }]).ok).toBe(false);
    expect(validatePlanDays([{ day: "شنبه", items: [] }]).ok).toBe(false);
    expect(validatePlanDays([{ day: "شنبه", items: Array(51).fill("x") }]).ok).toBe(false);
    expect(validatePlanDays([{ day: "شنبه", items: ["x".repeat(201)] }]).ok).toBe(false);
    expect(validatePlanDays([]).ok).toBe(false);
  });
  it("requires boolean isActive", () => {
    expect(validateExercisePlanData({ planData: [{ day: "شنبه", items: ["a"] }] }).ok).toBe(false);
    expect(validateExercisePlanData({ planData: [{ day: "شنبه", items: ["a"] }], isActive: true })).toMatchObject({ ok: true, value: { rulesAccepted: false } });
  });
});

describe("exercise log validation", () => {
  it("parses planId|date keys only", () => {
    expect(parseExerciseLogKey(`${ID}|2026-09-24`)).toMatchObject({ planId: ID });
    for (const bad of [`${ID}`, `${ID}|2026-13-01`, `bad|2026-09-24`, `${ID}|2026-09-24|x`, 5]) {
      expect(parseExerciseLogKey(bad)).toBeNull();
    }
  });
  it("caps items like the web route", () => {
    expect(validateExerciseLogData({ completed: true, completedItems: ["a"] }).ok).toBe(true);
    expect(validateExerciseLogData({ completed: "yes" }).ok).toBe(false);
    expect(validateExerciseLogData({ completed: true, completedItems: Array(MAX_EXERCISE_LOG_ITEMS + 1).fill("a") }).ok).toBe(false);
    expect(validateExerciseLogData({ completed: true, completedItems: [1] }).ok).toBe(false);
  });
});

describe("food log validation (parity with POST /api/calorie/log)", () => {
  const base = { date: "2026-09-24", customName: "برنج", customCalories: 200, grams: 150, mealType: "lunch" };
  it("accepts a normal entry; aiScanned only sticks with macros", () => {
    expect(validateFoodLogData({ ...base, aiScanned: true })).toMatchObject({ ok: true, value: { aiScanned: false, proteinG: null } });
    expect(validateFoodLogData({ ...base, proteinG: 5, carbsG: 40, fatG: 1, aiScanned: true })).toMatchObject({ ok: true, value: { aiScanned: true } });
  });
  it("rejects what the web rejects", () => {
    expect(validateFoodLogData({ ...base, customCalories: 0 }).ok).toBe(false);
    expect(validateFoodLogData({ ...base, grams: 0 }).ok).toBe(false);
    expect(validateFoodLogData({ ...base, grams: 10001 }).ok).toBe(false);
    expect(validateFoodLogData({ ...base, mealType: "x".repeat(21) }).ok).toBe(false);
    expect(validateFoodLogData({ ...base, proteinG: 5 }).ok).toBe(false); // نه هر سه
    expect(validateFoodLogData({ ...base, proteinG: 5, carbsG: 5, fatG: 2001 }).ok).toBe(false);
    expect(validateFoodLogData({ ...base, customName: "  " }).ok).toBe(false);
    expect(validateFoodLogData({ ...base, date: "2026-02-31" }).ok).toBe(false);
  });
  it("clamps the name to 80 chars like the web", () => {
    const r = validateFoodLogData({ ...base, customName: "ن".repeat(100) });
    expect(r.ok && r.value.customName.length).toBe(80);
  });
});

describe("calorie target validation", () => {
  it("compute uses the web POST rules", () => {
    expect(validateCalorieTargetData({ kind: "compute", goal: "lose", mealsPerDay: 3, sex: "male", heightCm: 180, weightKg: 80 }).ok).toBe(true);
    expect(validateCalorieTargetData({ kind: "compute", goal: "bulk", mealsPerDay: 3, sex: "male", heightCm: 180, weightKg: 80 }).ok).toBe(false);
    expect(validateCalorieTargetData({ kind: "compute", goal: "lose", mealsPerDay: 7, sex: "male", heightCm: 180, weightKg: 80 }).ok).toBe(false);
  });
  it("meals uses the web PATCH rules and sums kcal server-side", () => {
    const r = validateCalorieTargetData({ kind: "meals", mealBreakdown: [{ key: "b", label: "صبحانه", kcal: 600.4 }, { label: "ناهار", kcal: 900 }] });
    expect(r).toMatchObject({ ok: true, value: { kind: "meals", patch: { dailyTargetKcal: 1500, mealsPerDay: 2 } } });
    expect(validateCalorieTargetData({ kind: "meals", mealBreakdown: [{ label: "x", kcal: 100 }] }).ok).toBe(false); // < 500
    expect(validateCalorieTargetData({ kind: "meals", mealBreakdown: [] }).ok).toBe(false);
    expect(validateCalorieTargetData({ kind: "other" }).ok).toBe(false);
  });
});

describe("parseSyncChange — phase 4 entities", () => {
  it("rejects plan/target deletes (unsupported) but allows food/log deletes", () => {
    expect(parseSyncChange({ entity: "exercisePlan", id: ID, op: "delete", clientUpdatedAt: TS }, NOW).ok).toBe(false);
    expect(parseSyncChange({ entity: "calorieTarget", id: ID, op: "delete", clientUpdatedAt: TS }, NOW).ok).toBe(false);
    expect(parseSyncChange({ entity: "foodLogEntry", id: ID, op: "delete", clientUpdatedAt: TS }, NOW).ok).toBe(true);
    expect(parseSyncChange({ entity: "exerciseLog", key: `${ID}|2026-09-24`, op: "delete", clientUpdatedAt: TS }, NOW).ok).toBe(true);
  });
  it("id-entities report id, key-entities report key", () => {
    const a = parseSyncChange({ entity: "foodLogEntry", id: "BAD", op: "delete", clientUpdatedAt: TS }, NOW);
    expect(a).toMatchObject({ ok: false, entity: "foodLogEntry", id: "BAD" });
    const b = parseSyncChange({ entity: "exerciseLog", key: "nope", op: "delete", clientUpdatedAt: TS }, NOW);
    expect(b).toMatchObject({ ok: false, entity: "exerciseLog", key: "nope" });
  });
  it("every phase-4 entity maps to a gated module", () => {
    expect(SYNC_ENTITY_MODULE).toEqual({ exercisePlan: "EXERCISE", exerciseLog: "EXERCISE", foodLogEntry: "CALORIE", calorieTarget: "CALORIE", roadmapProgress: "ROADMAP" });
  });
});

describe("catalog versioning", () => {
  it("changes version when media changes", () => {
    const a = catalogVersion("h", null);
    const b = catalogVersion("h", [{ key: "x", updatedAt: "2026-01-01T00:00:00.000Z" }]);
    const c = catalogVersion("h", [{ key: "x", updatedAt: "2026-01-02T00:00:00.000Z" }]);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(catalogVersion("h", null)).toBe(a);
  });
  it("matches If-None-Match lists and weak tags", () => {
    expect(etagMatches('"abc"', '"abc"')).toBe(true);
    expect(etagMatches('W/"abc", "def"', '"abc"')).toBe(true);
    expect(etagMatches('"def"', '"abc"')).toBe(false);
    expect(etagMatches(null, '"abc"')).toBe(false);
  });
});

describe("parseRoadmapProgressChange", () => {
  const base = { entity: "roadmapProgress", id: ID, op: "upsert", clientUpdatedAt: TS };
  it("keeps only true flags on numeric step keys", () => {
    const r = parseRoadmapProgressChange({ ...base, data: { stepProgress: { "1": true, "2": false, "3": true } } }, NOW);
    expect(r).toMatchObject({ ok: true, change: { stepProgress: { "1": true, "3": true } } });
    expect(r.ok && Object.keys(r.change.stepProgress)).toEqual(["1", "3"]);
  });
  it("rejects bad ids, delete, non-numeric keys, non-booleans, too many keys", () => {
    expect(parseRoadmapProgressChange({ ...base, id: "x", data: { stepProgress: {} } }, NOW).ok).toBe(false);
    expect(parseRoadmapProgressChange({ ...base, op: "delete" }, NOW).ok).toBe(false);
    expect(parseRoadmapProgressChange({ ...base, data: { stepProgress: { a: true } } }, NOW).ok).toBe(false);
    expect(parseRoadmapProgressChange({ ...base, data: { stepProgress: { "1": "yes" } } }, NOW).ok).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [String(i), true]));
    expect(parseRoadmapProgressChange({ ...base, data: { stepProgress: many } }, NOW).ok).toBe(false);
  });
});
