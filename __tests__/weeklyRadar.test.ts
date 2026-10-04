import { describe, expect, it } from "vitest";
import {
  RADAR_C, RADAR_R, clampScore, pointsToPath, radarAngle, radarAxesWithData, radarDir, radarHasData, radarLabelPos, radarPoint, radarPoints, ringPath,
} from "@/lib/weeklyRadar";

describe("radarPoint", () => {
  it("محور اول بالا", () => {
    const p = radarPoint(0, 4, 100);
    expect(p.x).toBeCloseTo(RADAR_C, 1);
    expect(p.y).toBeCloseTo(RADAR_C - RADAR_R, 1);
  });
  it("محور دوم از چهار محور سمت راست", () => {
    const p = radarPoint(1, 4, 100);
    expect(p.x).toBeCloseTo(RADAR_C + RADAR_R, 1);
    expect(p.y).toBeCloseTo(RADAR_C, 1);
  });
  it("مقدار صفر = مرکز، 50 = نصف شعاع", () => {
    expect(radarPoint(2, 5, 0)).toEqual({ x: RADAR_C, y: RADAR_C });
    expect(radarPoint(0, 3, 50).y).toBeCloseTo(RADAR_C - RADAR_R / 2, 1);
  });
  it("مقدار خارج از بازه کلمپ می‌شه", () => {
    expect(radarPoint(0, 3, 250)).toEqual(radarPoint(0, 3, 100));
    expect(radarPoint(0, 3, -9)).toEqual(radarPoint(0, 3, 0));
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(null)).toBe(0);
  });
});

describe("زاویه و جهت", () => {
  it("زاویه‌ها یکنواخت", () => {
    expect(radarAngle(0, 6)).toBe(0);
    expect(radarAngle(3, 6)).toBeCloseTo(Math.PI, 5);
  });
  it("جهت یکه است", () => {
    for (let i = 0; i < 5; i++) { const d = radarDir(i, 5); expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 1); }
  });
  it("موقعیت برچسب بیرون از بوم نمی‌زنه", () => {
    for (let i = 0; i < 7; i++) { const p = radarLabelPos(i, 7); expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(100); expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(100); }
  });
});

describe("مسیرها", () => {
  it("null مثل صفر رسم می‌شه", () => {
    const pts = radarPoints([80, null, 40]);
    expect(pts).toHaveLength(3);
    expect(pts[1]).toEqual({ x: RADAR_C, y: RADAR_C });
  });
  it("مسیر بسته با Z", () => {
    const d = pointsToPath(radarPoints([10, 20, 30]));
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/L/g)).toHaveLength(2);
    expect(pointsToPath([])).toBe("");
  });
  it("حلقه‌ی شبکه n راس داره", () => {
    expect(ringPath(100, 5).match(/[ML]/g)).toHaveLength(5);
  });
});

describe("داده‌ی کافی", () => {
  const ax = (v: (number | null)[]) => v.map((value, i) => ({ key: `k${i}`, label: `L${i}`, value, prev: null }));
  it("حداقل سه محور با مقدار", () => {
    expect(radarHasData(ax([1, 2]))).toBe(false);
    expect(radarHasData(ax([1, 2, null]))).toBe(false);
    expect(radarHasData(ax([1, 2, 3]))).toBe(true);
  });
  it("فیلتر محورهای بدون داده", () => {
    expect(radarAxesWithData(ax([1, null, 3])).map((a) => a.key)).toEqual(["k0", "k2"]);
  });
});
