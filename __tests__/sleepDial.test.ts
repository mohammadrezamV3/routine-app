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

describe("جاکردن متن وسط صفحه‌ی ساعت", () => {
  it("شمارش بلند توی عرض مجاز می‌مونه و متن کوتاه از اندازه‌ی پایه بزرگ‌تر نمی‌شه", async () => {
    const { fitFontSize, textEm } = await import("@/lib/sleepDial");
    expect(textEm("11:53:29") * fitFontSize("11:53:29", 40, 124)).toBeLessThanOrEqual(124.01);
    expect(fitFontSize("11:53:29", 40, 124)).toBeLessThan(40);
    expect(fitFontSize("85", 56, 124)).toBe(56);
    expect(fitFontSize("", 20, 124)).toBe(20);
  });
});

import { greetKey, starField } from "@/lib/sleepDial";

describe("ستاره‌ها و سلام", () => {
  it("ستاره‌ها قطعی‌ان و بیرون از متن وسط", () => {
    const a = starField(30, 7, 160, 118, 66, 62);
    const b = starField(30, 7, 160, 118, 66, 62);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(15);
    for (const s of a) {
      const dx = s.x - 160, dy = s.y - 160;
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(119);
      expect(Math.abs(dx) < 66 && Math.abs(dy) < 62).toBe(false);
    }
  });
  it("سلام ساعتی", () => {
    expect(greetKey(5)).toBe("morning");
    expect(greetKey(13)).toBe("afternoon");
    expect(greetKey(20)).toBe("evening");
    expect(greetKey(23)).toBe("night");
    expect(greetKey(2)).toBe("night");
  });
});
