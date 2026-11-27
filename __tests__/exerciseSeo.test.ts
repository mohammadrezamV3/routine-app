import { describe, it, expect } from "vitest";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";
import {
  allExerciseSeo, exerciseBySlug, exerciseSlug, muscleHubs, relatedExercises, EXERCISE_SEO_PATHS,
  RESERVED_EXERCISE_SLUGS, MERGED_HUBS, POPULAR_EXERCISE_NAMES, exercisesForMuscle,
} from "@/lib/exerciseSeo";

describe("exerciseSeo", () => {
  const all = allExerciseSeo();

  it("every catalog entry is reachable by a unique ASCII kebab slug", () => {
    const names = new Set(EXERCISE_CATALOG.map((e) => e.name));
    expect(all.length).toBe(names.size);
    const slugs = new Set(all.map((i) => i.slug));
    expect(slugs.size).toBe(all.length);
    for (const it of all) {
      expect(it.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(exerciseBySlug(it.slug)?.entry.name).toBe(it.entry.name);
      expect(exerciseSlug(it.entry)).toBe(it.slug);
    }
  });

  it("does not collide with reserved words", () => {
    for (const r of RESERVED_EXERCISE_SLUGS) expect(exerciseBySlug(r)).toBeUndefined();
  });

  it("is stable across calls", () => {
    expect(allExerciseSeo().map((i) => i.slug)).toEqual(all.map((i) => i.slug));
  });

  it("builds a hub per muscle with exercises and paths cover everything", () => {
    const hubs = muscleHubs();
    expect(hubs.length).toBeGreaterThan(5);
    for (const h of hubs) expect(exercisesForMuscle(h.key).primary.length).toBe(h.primaryCount);
    const paths = EXERCISE_SEO_PATHS();
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.length).toBe(1 + hubs.length + all.length);
  });

  it("has merged legs and arms hubs with deduped exercises", () => {
    const hubs = muscleHubs();
    for (const k of ["legs", "arms"] as const) {
      expect(hubs.some((h) => h.slug === k)).toBe(true);
      const { primary } = exercisesForMuscle(k);
      expect(new Set(primary.map((i) => i.slug)).size).toBe(primary.length);
      for (const i of primary) expect(MERGED_HUBS[k]).toContain(i.entry.muscleKeys[0]);
      expect(EXERCISE_SEO_PATHS()).toContain(`/exercises/muscle/${k}`);
    }
  });

  it("related exercises exclude self and share muscle or pattern", () => {
    const e = all[0].entry;
    const rel = relatedExercises(e, 6);
    expect(rel.length).toBeGreaterThan(0);
    for (const r of rel) {
      expect(r.entry.name).not.toBe(e.name);
      expect(r.entry.muscleKeys[0] === e.muscleKeys[0] || r.entry.pattern === e.pattern).toBe(true);
    }
  });

  it("popular names exist in catalog", () => {
    const names = new Set(all.map((i) => i.entry.name));
    expect(POPULAR_EXERCISE_NAMES.filter((n) => names.has(n)).length).toBeGreaterThan(5);
  });
});
