import { describe, expect, it } from "vitest";
import { moonIllumination, moonLitPath, moonName, moonPhase } from "@/lib/moonPhase";
import { skyStars } from "@/lib/sleepDial";

describe("moonPhase", () => {
  it("ماه نو مرجع نزدیک 0", () => {
    const p = moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)));
    expect(Math.min(p, 1 - p)).toBeLessThan(0.01);
  });
  it("ماه کامل 2000-01-21 نزدیک 0.5", () => {
    const p = moonPhase(new Date(Date.UTC(2000, 0, 21, 4, 40)));
    expect(Math.abs(p - 0.5)).toBeLessThan(0.03);
    expect(moonName(p)).toBe("full");
  });
  it("همیشه در بازه‌ی 0 تا 1", () => {
    for (let i = 0; i < 400; i++) {
      const p = moonPhase(new Date(1990, 0, 1 + i * 37));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
  it("روشنایی و مسیر", () => {
    expect(moonIllumination(0)).toBeCloseTo(0);
    expect(moonIllumination(0.5)).toBeCloseTo(1);
    expect(moonIllumination(0.25)).toBeCloseTo(0.5);
    expect(moonLitPath(0.25, 12, 12, 9)).toContain("A0 9");
    expect(moonLitPath(0.5, 12, 12, 9)).toMatch(/^M12 3A9 9 0 0 1 12 21A9 9 0 0 1 12 3Z$/);
    expect(moonLitPath(0.75, 12, 12, 9)).toContain("0 0 0 12 21");
  });
});

describe("skyStars", () => {
  it("قطعی و در بازه", () => {
    const a = skyStars(34, 7), b = skyStars(34, 7);
    expect(a).toEqual(b);
    expect(a).toHaveLength(34);
    expect(a.every((s) => s.top >= 0 && s.top <= 96 && s.left >= 0 && s.left <= 98)).toBe(true);
  });
});
