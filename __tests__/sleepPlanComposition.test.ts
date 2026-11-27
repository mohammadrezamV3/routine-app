import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// seed.ts is the source of truth for plan composition: sleep in routine (basic), gym and max, never in trader
const seed = readFileSync(join(__dirname, "..", "prisma", "seed.ts"), "utf8");
function modulesOf(key: string): string[] {
  const i = seed.indexOf(`key: "${key}"`);
  const m = /modules:\s*\[([\s\S]*?)\]/.exec(seed.slice(i));
  return [...m![1].matchAll(/ModuleKey\.(\w+)/g)].map((x) => x[1]);
}

describe("plan composition: sleep", () => {
  it("is in basic, exercise and max", () => {
    for (const k of ["basic", "exercise", "max"]) expect(modulesOf(k)).toContain("SLEEP");
  });
  it("is not in trade", () => {
    expect(modulesOf("trade")).not.toContain("SLEEP");
    expect(modulesOf("trade")).toContain("TRADE");
  });
  it("compare table row matches", () => {
    const src = readFileSync(join(__dirname, "..", "components", "PlanShowcase.tsx"), "utf8");
    expect(src).toContain('"Sleep tracking"), included: { basic: true, exercise: true, trade: false, max: true }');
  });
  it("migration only removes SLEEP from trade and never touches ModuleAccess", () => {
    const sql = readFileSync(join(__dirname, "..", "prisma/migrations/20261127120000_sleep_not_in_trader/migration.sql"), "utf8");
    expect(sql).not.toMatch(/ModuleAccess"\s*(SET|WHERE)|DELETE FROM "ModuleAccess"|UPDATE "ModuleAccess"/);
    expect(sql).toContain("'trade'");
  });
});
