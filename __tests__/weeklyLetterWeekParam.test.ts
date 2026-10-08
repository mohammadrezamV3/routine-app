import { describe, expect, it } from "vitest";
import { isRealIsoDate, offsetOfLegacyParam, offsetOfWeekParam, resolveWeekOffset } from "@/lib/weeklyLetter/weekParam";
import { offsetOfWeek, dayRows } from "@/components/WeeklyLetterUtils";

// 2026-10-07 (چهارشنبه) 12:00 UTC؛ شنبه‌ی هفته‌ی جاری = 2026-10-03
const now = new Date(Date.UTC(2026, 9, 7, 12, 0, 0));

describe("offsetOfWeekParam", () => {
  it("هفته‌ی جاری 0", () => expect(offsetOfWeekParam("Asia/Tehran", "2026-10-03", now)).toBe(0));
  it("هفته‌ی قبل -1", () => expect(offsetOfWeekParam("Asia/Tehran", "2026-09-26", now)).toBe(-1));
  it("وسط هفته به همون هفته گرد می‌شه", () => expect(offsetOfWeekParam("Asia/Tehran", "2026-09-30", now)).toBe(-1));
  it("آینده نامعتبر", () => expect(offsetOfWeekParam("Asia/Tehran", "2026-10-10", now)).toBeNull());
  it("بیش از 52 هفته نامعتبر", () => expect(offsetOfWeekParam("Asia/Tehran", "2025-09-01", now)).toBeNull());
  it("52 هفته مجاز", () => expect(offsetOfWeekParam("Asia/Tehran", "2025-10-04", now)).toBe(-52));
  it("تاریخ غیرواقعی", () => expect(offsetOfWeekParam("Asia/Tehran", "2026-02-31", now)).toBeNull());
  it("منطقه‌ی زمانی: نیمه‌شب شنبه به وقت تهران هنوز جمعه UTCه", () => {
    const sat0030Tehran = new Date(Date.UTC(2026, 9, 9, 21, 0, 0)); // جمعه 21:00 UTC = شنبه 00:30 تهران
    expect(offsetOfWeekParam("Asia/Tehran", "2026-10-10", sat0030Tehran)).toBe(0);
    expect(offsetOfWeekParam("UTC", "2026-10-10", sat0030Tehran)).toBeNull();
  });
});

describe("offsetOfLegacyParam / resolveWeekOffset", () => {
  it("offset معتبر", () => expect(offsetOfLegacyParam("-3")).toBe(-3));
  it("offset نامعتبر", () => { expect(offsetOfLegacyParam("1")).toBeNull(); expect(offsetOfLegacyParam("x")).toBeNull(); expect(offsetOfLegacyParam("-53")).toBeNull(); });
  it("week مقدم بر offset", () => expect(resolveWeekOffset("Asia/Tehran", { week: "2026-09-26", offset: "-5" }, now)).toEqual({ offset: -1, invalid: false }));
  it("بدون پارامتر = جاری", () => expect(resolveWeekOffset("Asia/Tehran", {}, now)).toEqual({ offset: 0, invalid: false }));
  it("week نامعتبر = جاری با invalid", () => expect(resolveWeekOffset("Asia/Tehran", { week: "bad" }, now)).toEqual({ offset: 0, invalid: true }));
  it("isRealIsoDate", () => { expect(isRealIsoDate("2026-09-26")).toBe(true); expect(isRealIsoDate("2026-13-01")).toBe(false); });
});

describe("offsetOfWeek با timezone", () => {
  it("هم‌قاعده‌ی سرور", () => expect(offsetOfWeek("2026-09-26", now, "Asia/Tehran")).toBe(-1));
});

describe("متن تمرین", () => {
  const d = { fitness: { status: "missed" as const } } as never;
  it("روز گذشته بدون امروز", () => expect(dayRows(d)[0].text).toBe("تمرین انجام نشد"));
  it("خود امروز", () => expect(dayRows(d, true)[0].text).toBe("تمرین امروز انجام نشد"));
});
