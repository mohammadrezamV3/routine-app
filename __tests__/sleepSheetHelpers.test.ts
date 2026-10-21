import { describe, it, expect } from "vitest";
import {
  bedForDuration, clockMin, durationWarning, fullCyclesOf, goalSuggestions, hoursShort, shiftClock, spanMin, wakeForDuration, clampGoalSpan,
} from "@/lib/sleepSheetHelpers";

describe("پنجره‌های خواب - منطق خالص", () => {
  it("ساعت رو دور نیمه‌شب می‌چرخونه", () => {
    expect(shiftClock("23:50", 15)).toBe("00:05");
    expect(shiftClock("00:05", -15)).toBe("23:50");
    expect(shiftClock("07:00", 15)).toBe("07:15");
    expect(shiftClock("7:", 15)).toBe("7:");
    expect(clockMin("24:00")).toBeNull();
  });

  it("فاصله و ساعت‌های مبتنی بر مدت", () => {
    expect(spanMin("23:30", "07:00")).toBe(450);
    expect(spanMin("07:00", "07:00")).toBe(1440);
    expect(spanMin("", "07:00")).toBeNull();
    expect(bedForDuration("07:00", 480)).toBe("23:00");
    expect(wakeForDuration("23:00", 450)).toBe("06:30");
  });

  it("هشدار مدت", () => {
    expect(durationWarning(null)).toBe("invalid");
    expect(durationWarning(10)).toBe("invalid");
    expect(durationWarning(180)).toBe("short");
    expect(durationWarning(450)).toBeNull();
    expect(durationWarning(800)).toBe("long");
    expect(durationWarning(1300)).toBe("invalid");
  });

  it("چرخه‌ی کامل و پیشنهاد هدف", () => {
    expect(fullCyclesOf(450, 15)).toBe(4);
    expect(fullCyclesOf(30, 15)).toBe(0);
    const s = goalSuggestions("07:00", 15, 480);
    expect(s.map((o) => o.cycles)).toEqual([6, 5, 4]);
    expect(s[1].bed).toBe("23:15");
    expect(s.filter((o) => o.best).map((o) => o.cycles)).toEqual([5]);
    expect(goalSuggestions("xx", 15, 480)).toEqual([]);
  });

  it("کمکی‌ها", () => {
    expect(hoursShort(450)).toBe("7.5");
    expect(hoursShort(480)).toBe("8");
    expect(clampGoalSpan(100)).toBe(360);
    expect(clampGoalSpan(900)).toBe(600);
  });
});

import { hourTicks, stageTotals } from "@/lib/sleepSheetHelpers";
describe("محور نمودار مراحل", () => {
  it("تیک ساعت‌گرد داخل بازه", () => {
    const t = hourTicks("23:30", 450);
    // 00:00 خیلی نزدیک به شروعه و حذف می‌شه
    expect(t.map((x) => x.label)).toEqual(["02:00", "04:00"]);
    expect(t[0].at).toBeCloseTo(150 / 450, 5);
    expect(hourTicks("xx", 400)).toEqual([]);
    expect(hourTicks("23:00", 240).map((x) => x.label)).toEqual(["00:00", "01:00", "02:00"]);
  });
  it("جمع مراحل", () => {
    expect(stageTotals([{ stage: "deep", from: 0, to: 20 }, { stage: "deep", from: 40, to: 50 }, { stage: "rem", from: 20, to: 40 }])).toEqual({ deep: 30, rem: 20 });
  });
});
