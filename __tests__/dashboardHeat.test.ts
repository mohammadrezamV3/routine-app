import { describe, it, expect } from "vitest";
import { heatMonthMarks, heatRowWeekdays, heatLabelledRows, labelCols } from "@/lib/dashboardHeat";
import { buildHeatmap, jalaliOfIso } from "@/lib/dashboardCompute";
import { J_MONTHS, J_MONTHS_EN } from "@/lib/jalali";

const nameFa = (i: number) => J_MONTHS[i] ?? "";
const nameEn = (i: number) => J_MONTHS_EN[i] ?? "";
const build = (y: number, m: number, d: number) => buildHeatmap(new Date(y, m - 1, d), 13, { customOccurrences: [] } as any, {});

describe("heatRowWeekdays", () => {
  it("ردیف اول شنبه است و ترتیب شنبه تا جمعه", () => {
    expect(heatRowWeekdays(build(2026, 10, 16))).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(heatRowWeekdays(build(2026, 3, 1))).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
  it("ردیف‌های دارای برچسب: شنبه، دوشنبه، چهارشنبه، جمعه", () => {
    const wd = heatRowWeekdays(build(2026, 10, 16));
    expect(heatLabelledRows().map((r) => wd[r])).toEqual([6, 1, 3, 5]);
  });
});

describe("heatMonthMarks", () => {
  it("هر ماه بالای اولین ستونی که روز اول توشه، بدون تکرار و بدون هم‌پوشانی", () => {
    for (const [y, m, d] of [[2026, 10, 16], [2026, 3, 20], [2027, 1, 3], [2026, 12, 31], [2026, 4, 1]]) {
      for (const nameOf of [nameFa, nameEn]) {
        const heat = build(y, m, d);
        const marks = heatMonthMarks(heat, nameOf);
        const months = marks.map((x) => x.month);
        expect(new Set(months).size).toBe(months.length);
        marks.forEach((mk, i) => {
          expect(mk.col).toBeGreaterThanOrEqual(0);
          expect(mk.col + mk.span).toBeLessThanOrEqual(13);
          if (i) expect(mk.col).toBeGreaterThanOrEqual(marks[i - 1].col + marks[i - 1].span);
          expect(mk.label).toBe(nameOf(mk.month));
        });
        // هر برچسب غیر از ماه ناقص اول یا برچسب چسبیده به انتها، دقیقا بالای ستونی با روز اول اون ماهه
        for (const mk of marks) {
          const dayOne = heat.findIndex((col) => col.some((c) => jalaliOfIso(c.iso)[2] === 1 && jalaliOfIso(c.iso)[1] - 1 === mk.month));
          if (dayOne >= 0 && mk.col + mk.span < 13 && dayOne + labelCols(mk.label) <= 13) expect(mk.col).toBe(dayOne);
        }
      }
    }
  });

  it("ماه ناقص اول فقط وقتی جا هست اسم می‌گیره", () => {
    // روز اول ماه در ستون 1: ستون صفر جا ندارد
    const heat = build(2026, 10, 16);
    const marks = heatMonthMarks(heat, nameFa);
    const first = marks[0];
    const firstDayOneCol = heat.findIndex((col) => col.some((c) => jalaliOfIso(c.iso)[2] === 1));
    if (firstDayOneCol > 0 && first.col === 0) expect(firstDayOneCol).toBeGreaterThanOrEqual(first.span);
  });

  it("نمونه‌ی مشخص: امروز 2026-10-16 (24 مهر 1405)", () => {
    const marks = heatMonthMarks(build(2026, 10, 16), nameFa);
    const names = marks.map((m) => m.label);
    // 13 هفته از اواسط تیر تا اواسط مهر: مرداد، شهریور، مهر
    expect(names).toContain("مهر");
    expect(names).toContain("شهریور");
    expect(names).toContain("مرداد");
  });

  it("ورودی خالی", () => {
    expect(heatMonthMarks([], nameFa)).toEqual([]);
  });
});
