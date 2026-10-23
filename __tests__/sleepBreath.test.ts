import { describe, it, expect } from "vitest";
import {
  BREATH_PATTERNS, breathProgress, cycleSec, normalizeMinutes, normalizePattern, scaleAt, sessionSec, stateAt, targetScale, totalRounds,
} from "@/lib/sleepBreath";

describe("تنفس آرام", () => {
  it("طول دور هر الگو", () => {
    expect(cycleSec("478")).toBe(19);
    expect(cycleSec("box")).toBe(16);
    expect(cycleSec("calm")).toBe(10);
  });
  it("تعداد دور و طول جلسه بدون دور نیمه‌کاره", () => {
    expect(totalRounds("calm", 2)).toBe(12);
    expect(totalRounds("478", 2)).toBe(6);
    expect(sessionSec("478", 2)).toBe(114);
    expect(sessionSec("box", 10)).toBe(37 * 16);
  });
  it("فاز در هر لحظه (4-7-8)", () => {
    expect(stateAt("478", 5, 0)).toMatchObject({ kind: "inhale", left: 4, round: 1 });
    expect(stateAt("478", 5, 3.2)).toMatchObject({ kind: "inhale", left: 1 });
    expect(stateAt("478", 5, 4)).toMatchObject({ kind: "hold", left: 7 });
    expect(stateAt("478", 5, 11)).toMatchObject({ kind: "exhale", left: 8 });
    expect(stateAt("478", 5, 19)).toMatchObject({ kind: "inhale", round: 2 });
  });
  it("باکس چهار فاز دارد و مکث خالی آخر است", () => {
    expect(BREATH_PATTERNS.box.phases.map((p) => p.kind)).toEqual(["inhale", "hold", "exhale", "rest"]);
    expect(stateAt("box", 2, 13)).toMatchObject({ kind: "rest", left: 3 });
  });
  it("پایان جلسه", () => {
    const end = sessionSec("calm", 2);
    expect(stateAt("calm", 2, end - 0.1).done).toBe(false);
    expect(stateAt("calm", 2, end).done).toBe(true);
    expect(stateAt("calm", 2, end + 50).round).toBe(12);
  });
  it("ورودی نامعتبر", () => {
    expect(stateAt("calm", 2, -5).kind).toBe("inhale");
    expect(stateAt("calm", 2, NaN).kind).toBe("inhale");
    expect(normalizePattern("x")).toBe("478");
    expect(normalizeMinutes(7)).toBe(5);
    expect(normalizeMinutes(10)).toBe(10);
  });
  it("مقیاس دایره", () => {
    expect(targetScale("inhale")).toBe(1);
    expect(targetScale("hold")).toBe(1);
    expect(targetScale("exhale")).toBe(0);
    expect(targetScale("rest")).toBe(0);
    expect(scaleAt("calm", 2, 2)).toBeCloseTo(0.5);
    expect(scaleAt("calm", 2, 4)).toBeCloseTo(1);
    expect(scaleAt("calm", 2, 7)).toBeCloseTo(0.5);
    expect(scaleAt("478", 2, 8)).toBe(1);
  });
  it("پیشرفت", () => {
    expect(breathProgress("calm", 2, 0)).toBe(0);
    expect(breathProgress("calm", 2, 60)).toBeCloseTo(0.5);
    expect(breathProgress("calm", 2, 999)).toBe(1);
  });
});
