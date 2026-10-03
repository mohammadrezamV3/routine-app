import { describe, it, expect } from "vitest";
import { arcPath, hhmmToMin, minuteToAngle, pointAt, spanMinutes } from "@/lib/sleepDial";

describe("صفحه‌ی ساعت خواب", () => {
  it("نیمه‌شب بالا، 6 صبح راست، ظهر پایین", () => {
    expect(minuteToAngle(0)).toBe(0);
    expect(minuteToAngle(360)).toBe(90);
    expect(minuteToAngle(720)).toBe(180);
    expect(minuteToAngle(-60)).toBe(345);
    const p = pointAt(100, 50, 90);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(100);
  });

  it("قوس از 23:30 تا 07:00 از نیمه‌شب رد می‌شه", () => {
    expect(spanMinutes(1410, 420)).toBe(450);
    const d = arcPath(140, 100, 1410, 420);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain(" 0 0 1 "); // کمتر از 12 ساعت → large-arc = 0
    expect(arcPath(140, 100, 60, 60)).toBe("");
    expect(arcPath(140, 100, 0, 800)).toContain(" 0 1 1 ");
  });

  it("ساعت متنی", () => {
    expect(hhmmToMin("23:30")).toBe(1410);
    expect(hhmmToMin("7:05")).toBe(425);
    expect(hhmmToMin("25:00")).toBeNull();
    expect(hhmmToMin("")).toBeNull();
  });
});
