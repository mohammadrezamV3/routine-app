import { describe, expect, it } from "vitest";
import { FOOD_SEED, searchFoodSeed } from "@/lib/foodSeed";
import { CATALOG_ITEMS } from "@/lib/foodCatalog";
import { FOOD_NAME_EN, searchFoodNamesEn } from "@/lib/foodNamesEn";
import { NUMBER_LIMITS } from "@/lib/numberLimits";
import { normalizeFa } from "@/lib/mentorSearch";

describe("food catalog data", () => {
  it("is large", () => {
    expect(FOOD_SEED.length).toBeGreaterThan(1000);
  });

  it("has no duplicate names (normalized)", () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const f of FOOD_SEED) {
      const k = normalizeFa(f.name);
      if (seen.has(k)) dups.push(`${f.name} ~ ${seen.get(k)}`);
      seen.set(k, f.name);
    }
    expect(dups).toEqual([]);
  });

  it("has no catalog names clashing with legacy seed", () => {
    const names = new Set(FOOD_SEED.map((f) => f.name));
    expect(names.size).toBe(FOOD_SEED.length);
    expect(FOOD_SEED.length).toBeGreaterThanOrEqual(CATALOG_ITEMS.length);
  });

  it("uses no diacritics, hamza-alef or Persian digits", () => {
    const bad = /[ً-ٰٟأإ۰-۹٠-٩]/;
    for (const f of FOOD_SEED) expect(bad.test(f.name), f.name).toBe(false);
    for (const c of CATALOG_ITEMS) for (const a of c.aliases) expect(bad.test(a), a).toBe(false);
  });

  it("keeps values within NUMBER_LIMITS", () => {
    const { min, max } = NUMBER_LIMITS.caloriesPer100g;
    for (const f of FOOD_SEED) {
      expect(f.caloriesPer100g, f.name).toBeGreaterThanOrEqual(min);
      expect(f.caloriesPer100g, f.name).toBeLessThanOrEqual(max);
    }
  });

  it("has consistent macros (4/4/9 rule within tolerance)", () => {
    const bad: string[] = [];
    for (const c of CATALOG_ITEMS) {
      const sum = c.proteinPer100g + c.carbsPer100g + c.fatPer100g;
      expect(sum, c.name).toBeLessThanOrEqual(100.5);
      const est = 4 * c.proteinPer100g + 4 * c.carbsPer100g + 9 * c.fatPer100g;
      const tol = Math.max(30, 0.3 * c.caloriesPer100g);
      if (Math.abs(est - c.caloriesPer100g) > tol) bad.push(`${c.name}: kcal ${c.caloriesPer100g} vs macro ${est}`);
    }
    expect(bad).toEqual([]);
  });

  it("has an English name for every item", () => {
    const missing = FOOD_SEED.filter((f) => !FOOD_NAME_EN[f.name]).map((f) => f.name);
    expect(missing).toEqual([]);
  });
});

describe("food search", () => {
  const first = (q: string) => searchFoodSeed(q).map((f) => f.name);

  it("finds common queries", () => {
    for (const q of ["قورمه سبزی", "قرمه سبزی", "کباب", "زولبیا", "پسته", "پیتزا", "لاته", "وی", "کراتین", "سنگک", "فالوده", "ساندویچ", "سیب زمینی", "شیر"]) {
      expect(first(q).length, q).toBeGreaterThan(0);
    }
  });

  it("normalizes arabic letters, zwnj and digits", () => {
    expect(first("قورمه‌سبزی")).toContain("قورمه‌سبزی");
    expect(first("قورمه سبزی")).toContain("قورمه‌سبزی");
    expect(first("كباب كوبيده")).toContain("کباب کوبیده");
    expect(first("شکلات 70")[0]).toContain("70");
  });

  it("matches synonyms for legacy items", () => {
    expect(first("فرنچ فرایز")).toContain("سیب‌زمینی سرخ‌کرده");
    expect(first("فسنجون")).toContain("فسنجان");
  });

  it("ranks exact and prefix matches first", () => {
    expect(first("دوغ")[0]).toBe("دوغ");
    expect(first("پسته")[0].startsWith("پسته")).toBe(true);
  });

  it("returns at most 10 and default list for empty query", () => {
    expect(searchFoodSeed("نان").length).toBeLessThanOrEqual(10);
    expect(searchFoodSeed("").length).toBe(8);
    expect(searchFoodSeed("zzzzqqqq")).toEqual([]);
  });

  it("finds english names", () => {
    expect(searchFoodNamesEn("baklava").length).toBeGreaterThan(0);
    expect(searchFoodNamesEn("whey").length).toBeGreaterThan(0);
  });
});
