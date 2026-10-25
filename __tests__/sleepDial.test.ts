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

describe("جای ماه، خورشید، قوس هدف و عقربه روی صفحه‌ی ساعت", () => {
  const C = 160, R = 111;
  const at = (min: number) => pointAt(C, R, minuteToAngle(min));

  it("هدف 01:30 تا 09:30 (از نیمه‌شب رد می‌شه): ماه کمی راست بالا، خورشید پایین راست", () => {
    const bed = hhmmToMin("01:30")!, wake = hhmmToMin("09:30")!;
    expect(minuteToAngle(bed)).toBe(22.5);
    expect(minuteToAngle(wake)).toBe(142.5);
    const moon = at(bed), sun = at(wake);
    // ماه: بالای مرکز و راست محور عمودی
    expect(moon.y).toBeLessThan(C);
    expect(moon.x).toBeGreaterThan(C);
    expect(moon.x - C).toBeCloseTo(R * Math.sin((22.5 * Math.PI) / 180), 2);
    // خورشید: پایین مرکز و راست محور عمودی (بین 06 و 12)
    expect(sun.y).toBeGreaterThan(C);
    expect(sun.x).toBeGreaterThan(C);
    // قوس 8 ساعته: کوچک (large-arc = 0) و ساعتگرد، از ماه شروع و به خورشید ختم می‌شه
    expect(spanMinutes(bed, wake)).toBe(480);
    const d = arcPath(C, R, bed, wake);
    expect(d).toContain(" 0 0 1 ");
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number);
    expect(nums[0]).toBeCloseTo(moon.x, 1);
    expect(nums[1]).toBeCloseTo(moon.y, 1);
    expect(nums[nums.length - 2]).toBeCloseTo(sun.x, 1);
    expect(nums[nums.length - 1]).toBeCloseTo(sun.y, 1);
  });

  it("هدف 23:00 تا 07:00 (قبل از نیمه‌شب شروع می‌شه): ماه چپ بالا، خورشید راست و کمی بالای افق", () => {
    const bed = hhmmToMin("23:00")!, wake = hhmmToMin("07:00")!;
    expect(minuteToAngle(bed)).toBe(345);
    expect(minuteToAngle(wake)).toBe(105);
    const moon = at(bed), sun = at(wake);
    expect(moon.x).toBeLessThan(C);
    expect(moon.y).toBeLessThan(C);
    expect(sun.x).toBeGreaterThan(C);
    expect(sun.y).toBeGreaterThan(C); // 105 درجه یعنی کمی پایین‌تر از ساعت 3 روی صفحه
    expect(spanMinutes(bed, wake)).toBe(480);
    expect(arcPath(C, R, bed, wake)).toContain(" 0 0 1 ");
    // قوس از بالای صفحه (نیمه‌شب) رد می‌شه: نیمه‌شب 60 دقیقه بعد از شروع قوسه، نه بعد از پایانش
    expect(spanMinutes(bed, 0)).toBe(60);
    expect(spanMinutes(bed, 0)).toBeLessThan(spanMinutes(bed, wake));
    const top = at(0);
    expect(top.x).toBeCloseTo(C, 1);
    expect(top.y).toBeCloseTo(C - R, 1);
  });

  it("عقربه‌ی الان: 00:44 نزدیک بالا (کمی راست)، 21:22 چپ بالا، 12:00 پایین", () => {
    expect(minuteToAngle(44)).toBe(11);
    expect(at(44).x).toBeGreaterThan(C);
    expect(at(44).y).toBeLessThan(C - R * 0.9);
    expect(at(21 * 60 + 22).x).toBeLessThan(C);
    expect(at(21 * 60 + 22).y).toBeLessThan(C);
    const noon = at(720);
    expect(noon.x).toBeCloseTo(C, 1);
    expect(noon.y).toBeCloseTo(C + R, 1);
  });

  it("مرز چرخه‌ها همیشه داخل قوس هدف می‌افتن (حتی از نیمه‌شب رد بشه)", async () => {
    const { cycleBoundaries } = await import("@/lib/sleepCycles");
    for (const [bed, wake] of [["01:30", "09:30"], ["23:00", "07:00"]] as const) {
      const b = hhmmToMin(bed)!, w = hhmmToMin(wake)!;
      const total = spanMinutes(b, w);
      const pts = cycleBoundaries(b, w, 15);
      expect(pts.length).toBeGreaterThan(3);
      for (const m of pts) expect(spanMinutes(b, m)).toBeLessThan(total);
    }
  });
});
