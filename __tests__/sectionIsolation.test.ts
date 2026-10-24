import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, achievementVisibleIn } from "@/lib/achievements";
import { getFaqs } from "@/lib/faqContent";
import { notificationSectionWhere } from "@/lib/notificationSection";
import { orderPlansForSection } from "@/lib/planSection";

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

describe("plan ordering per section", () => {
  const all = ["basic", "exercise", "trade", "max"].map((key) => ({ key }));
  const keys = (s: "routine" | "trade" | "workout" | null) => orderPlansForSection(all, s).map((p) => p.key);

  it("apex puts single plans first and max last", () => {
    expect(keys(null)).toEqual(["basic", "exercise", "trade", "max"]);
  });

  it("every section still gets every plan (nothing hidden)", () => {
    for (const s of ["routine", "trade", "workout"] as const) {
      expect([...keys(s)].sort()).toEqual([...all.map((p) => p.key)].sort());
    }
  });

  it("puts the section's own plan first, other single plans next, max always last", () => {
    expect(keys("routine")).toEqual(["basic", "exercise", "trade", "max"]);
    expect(keys("workout")).toEqual(["exercise", "basic", "trade", "max"]);
    expect(keys("trade")).toEqual(["trade", "basic", "exercise", "max"]);
  });

  it("does not mutate the input", () => {
    const copy = all.map((p) => p.key);
    orderPlansForSection(all, "trade");
    expect(all.map((p) => p.key)).toEqual(copy);
  });
});
