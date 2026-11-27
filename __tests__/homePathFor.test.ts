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

  it("workout never uses the dashboard", () => {
    expect(homePathFor("workout", { dashboard: true, exercise: true })).toBe("/exercise");
    expect(homePathFor("workout", null)).toBe("/exercise");
    expect(homePathFor("workout", { exercise: false, calorie: true })).toBe("/calorie");
    expect(homePathFor("workout", { exercise: false, calorie: false })).toBe("/account");
  });
});
