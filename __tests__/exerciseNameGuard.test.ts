import { describe, it, expect } from "vitest";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";
import { conformExercisesToCatalog, closestCatalogEntry, commonCatalogNamesFor, nameSimilarity } from "@/lib/exerciseNameGuard";

const ex = (name: string) => ({ name, muscle: "سینه", sets: 3, reps: "10", rest: "60 ثانیه", note: "" });
const names = EXERCISE_CATALOG.slice(0, 6).map((e) => e.name);

describe("exerciseNameGuard", () => {
  it("keeps catalog names unchanged", () => {
    const r = conformExercisesToCatalog(names.map(ex));
    expect(r.fellBack).toBe(false);
    expect(r.exercises.map((e: any) => e.name)).toEqual(names);
  });
  it("drops unknown names when most are known", () => {
    const r = conformExercisesToCatalog([...names.map(ex), ex("زنگوله پرتابی کوانتومی عجیب")]);
    expect(r.dropped).toBe(1);
    expect(r.exercises).toHaveLength(names.length);
  });
  it("falls back to the original list when mostly unknown", () => {
    const raw = [ex("حرکت ساختگی الف"), ex("حرکت ساختگی ب"), ex(names[0])];
    const r = conformExercisesToCatalog(raw);
    expect(r.fellBack).toBe(true);
    expect(r.exercises).toBe(raw);
  });
  it("dedupes names mapping to the same entry", () => {
    const r = conformExercisesToCatalog([ex(names[0]), ex(names[0]), ex(names[1]), ex(names[2])]);
    expect(r.exercises.map((e: any) => e.name)).toEqual(names.slice(0, 3));
  });
  it("maps a near name to the closest catalog entry", () => {
    const base = names[0];
    expect(closestCatalogEntry(base)?.name).toBe(base);
    expect(closestCatalogEntry("zzz qqq")).toBeUndefined();
    expect(nameSimilarity("اسکوات هالتر", "اسکوات هالتر")).toBe(1);
  });
  it("lists common names for muscles", () => {
    const list = commonCatalogNamesFor(["سینه", "پشت ران"]);
    expect(list.length).toBeGreaterThan(5);
    expect(new Set(list).size).toBe(list.length);
  });
});
