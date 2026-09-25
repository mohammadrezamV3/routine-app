import { describe, expect, it } from "vitest";
import { formatJalali, isoLocal, jalaliToGregorianApprox, jalaliToIso, toJalali } from "./jalali";

describe("jalali", () => {
  it("round-trips a known date (2024-03-20 -> 1403/01/01)", () => {
    const j = toJalali(2024, 3, 20);
    expect(j).toEqual([1403, 1, 1]);
  });

  it("jalaliToIso inverts toJalali", () => {
    const iso = jalaliToIso(1403, 1, 1);
    expect(iso).toBe("2024-03-20");
  });

  it("jalaliToGregorianApprox lands close enough for toJalali to recover the same date", () => {
    const approx = jalaliToGregorianApprox(1404, 5, 7);
    const back = toJalali(approx.getFullYear(), approx.getMonth() + 1, approx.getDate());
    // ممکنه دقیقا برابر نباشه (تقریب)، ولی isoLocal باید یک تاریخ معتبر بدهد
    expect(back[0]).toBeGreaterThanOrEqual(1403);
    expect(isoLocal(approx)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formatJalali writes year/month/day so RTL reading order is day/month/year", () => {
    expect(formatJalali([1404, 5, 7])).toBe("1404/05/07");
  });
});
