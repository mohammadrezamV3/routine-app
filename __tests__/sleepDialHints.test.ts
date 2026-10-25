import { describe, it, expect } from "vitest";
import { bedtimeState, cycleTileInfo, dialHint, dialHintText, type HintInput } from "@/lib/sleepDialHints";

const base: HintInput = {
  phase: "day", nowMin: 14 * 60, bedtime: "23:30", lastNightMin: 480, goalMin: 480, goalStreak: 0, debt7Min: 0,
};

describe("نکته‌ی زیر صفحه‌ی ساعت", () => {
  it("ردیاب روشن = بدون نکته", () => {
    expect(dialHint({ ...base, tracking: true })).toBeNull();
  });
  it("کمتر یا بیشتر از هدف", () => {
    expect(dialHint({ ...base, lastNightMin: 432 })).toMatchObject({ kind: "under", n: 48 });
    expect(dialHint({ ...base, lastNightMin: 540 })).toMatchObject({ kind: "over", n: 60 });
    expect(dialHint({ ...base, lastNightMin: 490 })).toMatchObject({ kind: "onGoal" });
  });
  it("استریک هدف اولویت داره", () => {
    expect(dialHint({ ...base, goalStreak: 3, lastNightMin: 400 })).toMatchObject({ kind: "streak", n: 3 });
    expect(dialHint({ ...base, goalStreak: 2, lastNightMin: 400 })).toMatchObject({ kind: "under" });
  });
  it("بدهی خواب فقط وقتی دیشب کم بوده یا ثبت نشده", () => {
    expect(dialHint({ ...base, lastNightMin: 400, debt7Min: 200 })).toMatchObject({ kind: "debt", n: 200 });
    expect(dialHint({ ...base, lastNightMin: null, debt7Min: 200 })).toMatchObject({ kind: "debt" });
    expect(dialHint({ ...base, lastNightMin: null })).toBeNull();
  });
  it("صبح بدون ثبت = یادآوری ثبت", () => {
    expect(dialHint({ ...base, phase: "morning", nowMin: 8 * 60, lastNightMin: null })).toMatchObject({ kind: "logPrompt" });
  });
  it("آماده‌شدن و گذشتن از ساعت خواب", () => {
    expect(dialHint({ ...base, phase: "winddown", nowMin: 22 * 60 + 40 })).toMatchObject({ kind: "winddown", n: 50 });
    expect(dialHint({ ...base, phase: "night", nowMin: 24 * 60 + 0 - 1, lastNightMin: null })).toMatchObject({ kind: "pastBedtime", n: 29 });
    expect(dialHint({ ...base, phase: "bedtime", nowMin: 23 * 60 + 35 })).toMatchObject({ kind: "winddown", n: 0 });
  });
  it("متن همه‌ی نوع‌ها خالی نیست", () => {
    for (const k of ["winddown", "pastBedtime", "streak", "under", "over", "onGoal", "debt", "logPrompt"] as const) {
      expect(dialHintText({ kind: k, tone: "info", n: 30 })).not.toBe("");
    }
  });
});

describe("اطلاعات باکس چرخه و هدف", () => {
  it("شب: از الان؛ روز: از ساعت خواب هدف", () => {
    const t = { wake: "07:00", sleep: "23:30" };
    expect(cycleTileInfo(23 * 60, 23 * 60 + 30, 15, 450, "night")).toMatchObject({ mode: "now", clock: "06:45", cycles: 5 });
    expect(cycleTileInfo(14 * 60, 23 * 60 + 30, 15, 450, "day")).toMatchObject({ mode: "bed", clock: "07:15", cycles: 5 });
    expect(cycleTileInfo(5 * 60, 23 * 60 + 30, 15, 450, "night", 23 * 60 + 40)).toMatchObject({ mode: "tracked", clock: "07:25", cycles: 5 });
    expect(t.sleep).toBe("23:30");
  });
  it("شمارش معکوس تا خواب", () => {
    const t = { wake: "07:00", sleep: "23:30" };
    expect(bedtimeState(21 * 60 + 20, t)).toEqual({ state: "until", min: 130 });
    expect(bedtimeState(23 * 60 + 30, t)).toMatchObject({ state: "now" });
    expect(bedtimeState(23 * 60 + 50, t)).toEqual({ state: "past", min: 20 });
    expect(bedtimeState(5 * 60, t)).toMatchObject({ state: "past" });
    expect(bedtimeState(8 * 60, t)).toEqual({ state: "none", min: 0 });
  });
});

describe("متن نکته‌ی آماده‌شدن برای خواب", () => {
  it("مدت تا خواب رو تکرار نمی‌کنه (همون شمارش وسط ساعته)", () => {
    const txt = dialHintText({ kind: "winddown", tone: "info", n: 47 });
    expect(txt).not.toMatch(/47/);
    expect(txt).not.toBe("");
  });
});
