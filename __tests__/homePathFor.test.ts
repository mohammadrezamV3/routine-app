import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/useFeatures", () => ({ refreshFeatures: async () => null }));
vi.mock("../lib/useFeatures", () => ({ refreshFeatures: async () => null }));

import { homePathFor } from "@/lib/homePath";

describe("homePathFor", () => {
  it("routine and trade go to the dashboard, falling back when it is off", () => {
    expect(homePathFor("routine", { dashboard: true })).toBe("/dashboard");
    expect(homePathFor("trade", null)).toBe("/dashboard");
    expect(homePathFor("routine", { dashboard: false, routine: true })).toBe("/weekly");
    expect(homePathFor("routine", { dashboard: false, routine: false })).toBe("/account");
  });

  it("workout uses the dashboard, falling back when it is off", () => {
    expect(homePathFor("workout", { dashboard: true, exercise: true })).toBe("/dashboard");
    expect(homePathFor("workout", null)).toBe("/dashboard");
    expect(homePathFor("workout", { dashboard: false, exercise: true })).toBe("/exercise");
    expect(homePathFor("workout", { dashboard: false, exercise: false, calorie: true })).toBe("/calorie");
    expect(homePathFor("workout", { dashboard: false, exercise: false, calorie: false })).toBe("/account");
  });
});

import { sectionAreas, type DashArea } from "@/lib/dashboardSection";
describe("workout dashboard areas", () => {
  it("lays out ex, cal, sleep and mentor without a space card", () => {
    const a = sectionAreas(new Set<DashArea>(["ex", "cal", "sleep", "mentor"]), "workout");
    expect(a.sm).toBe('"ex" "cal" "sleep" "mentor"');
    expect(a.lg).not.toContain("space");
  });
});
