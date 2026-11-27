import { describe, expect, it } from "vitest";
import { FOOD_SEED } from "@/lib/foodSeed";
import {
  allFoodSeo,
  burnMinutes,
  foodBySlug,
  foodCategories,
  FOOD_SEO_PATHS,
  portionTable,
  similarFoods,
} from "@/lib/foodSeo";

describe("foodSeo", () => {
  it("covers every seed food with unique ASCII slugs", () => {
    const all = allFoodSeo();
    expect(all.length).toBe(FOOD_SEED.length);
    const slugs = all.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(allFoodSeo().map((f) => f.slug)).toEqual(slugs);
    expect(foodBySlug(slugs[0])?.slug).toBe(slugs[0]);
  });

  it("puts each food in exactly one category", () => {
    const cats = foodCategories();
    const seen = cats.flatMap((c) => c.items.map((i) => i.slug));
    expect(seen.length).toBe(allFoodSeo().length);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("builds portions, burn times and similar foods", () => {
    expect(portionTable(130).map((p) => p.kcal)).toEqual([65, 130, 195, 260, 325]);
    const b = burnMinutes(260);
    expect(b.running).toBeLessThan(b.cycling);
    expect(b.cycling).toBeLessThan(b.walking);
    expect(b.walking).toBeGreaterThan(50);
    expect(burnMinutes(0).walking).toBe(0);
    const f = allFoodSeo()[0];
    const sim = similarFoods(f, 4);
    expect(sim.length).toBe(4);
    expect(sim.every((s) => s.category === f.category && s.slug !== f.slug)).toBe(true);
  });

  it("lists sitemap paths", () => {
    const p = FOOD_SEO_PATHS();
    expect(p[0]).toBe("/food-calories");
    expect(p.length).toBe(allFoodSeo().length + 1);
  });
});
