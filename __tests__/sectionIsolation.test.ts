import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, achievementVisibleIn } from "@/lib/achievements";
import { getFaqs } from "@/lib/faqContent";
import { notificationSectionWhere } from "@/lib/notificationSection";
import { planVisibleIn } from "@/lib/planSection";

describe("achievementVisibleIn", () => {
  it("apex shows every achievement", () => {
    expect(ACHIEVEMENTS.every((a) => achievementVisibleIn(a, null))).toBe(true);
  });

  it("each section only sees its own categories", () => {
    const cats = (s: "routine" | "trade" | "workout") => new Set(ACHIEVEMENTS.filter((a) => achievementVisibleIn(a, s)).map((a) => a.category));
    expect(cats("trade")).toEqual(new Set(["trade"]));
    expect(cats("workout")).toEqual(new Set(["sleep", "body"]));
    expect(cats("routine").has("trade")).toBe(false);
    expect(cats("routine").has("body")).toBe(false);
    expect(cats("routine").has("streak")).toBe(true);
  });

  it("every achievement is visible on at least one section", () => {
    for (const a of ACHIEVEMENTS) {
      expect(["routine", "trade", "workout"].some((s) => achievementVisibleIn(a, s as "routine"))).toBe(true);
    }
  });
});

describe("getFaqs(section)", () => {
  it("returns every question on the apex and fewer on a section", () => {
    const all = getFaqs();
    for (const s of ["routine", "trade", "workout"] as const) {
      const list = getFaqs(s);
      expect(list.length).toBeLessThan(all.length);
      expect(list.length).toBeGreaterThan(8);
    }
  });

  it("trade does not get the workout or calorie questions", () => {
    const trade = getFaqs("trade").map((f) => f.q);
    expect(trade.some((q) => q.includes("بدنسازی") || q.includes("کالری"))).toBe(false);
    expect(trade.some((q) => q.includes("ژورنال ترید"))).toBe(true);
  });
});

describe("notificationSectionWhere", () => {
  it("is empty when nothing is hidden", () => {
    expect(notificationSectionWhere([])).toEqual({});
  });

  it("keeps notifications without a url and excludes hidden urls", () => {
    expect(notificationSectionWhere(["/mentorship/a"])).toEqual({ OR: [{ url: null }, { url: { notIn: ["/mentorship/a"] } }] });
  });
});

describe("plan visibility per section", () => {
  it("shows only the section plan plus max", () => {
    const all = ["basic", "exercise", "trade", "max"];
    const keys = (s: "routine" | "trade" | "workout" | null) => all.filter((k) => planVisibleIn(k, s));
    expect(keys(null)).toEqual(all);
    expect(keys("routine")).toEqual(["basic", "max"]);
    expect(keys("workout")).toEqual(["exercise", "max"]);
    expect(keys("trade")).toEqual(["trade", "max"]);
  });
});
