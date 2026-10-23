import { describe, it, expect } from "vitest";
import {
  formatCountdown, napEndsAt, napIsEnded, napProgress, napRemainingSec, napWakeClock, normalizeNapLatency, normalizeNapMinutes, parseNapTimer,
} from "@/lib/sleepNap";

describe("چرت", () => {
  const t0 = new Date(2026, 0, 10, 13, 50, 0).getTime();
  it("لحظه‌ی بیدارشدن شامل زمان به خواب رفتن", () => {
    expect(napEndsAt(t0, 20, 10) - t0).toBe(30 * 60000);
    expect(napEndsAt(t0, 90, 15) - t0).toBe(105 * 60000);
    expect(napEndsAt(t0, 20, -5) - t0).toBe(20 * 60000);
  });
  it("ساعت بیدارشدن", () => {
    expect(napWakeClock(t0, 20, 10)).toBe("14:20");
    expect(napWakeClock(new Date(2026, 0, 10, 23, 50).getTime(), 20, 10)).toBe("00:20");
  });
  it("ثانیه‌ی باقی‌مانده رو به بالا گرد می‌شود", () => {
    expect(napRemainingSec(t0 + 1500, t0)).toBe(2);
    expect(napRemainingSec(t0, t0 + 5000)).toBe(0);
  });
  it("پیشرفت و پایان", () => {
    const t = { startedAt: t0, endsAt: t0 + 1000 };
    expect(napProgress(t, t0)).toBe(0);
    expect(napProgress(t, t0 + 500)).toBe(0.5);
    expect(napProgress(t, t0 + 9999)).toBe(1);
    expect(napIsEnded(t, t0 + 999)).toBe(false);
    expect(napIsEnded(t, t0 + 1000)).toBe(true);
  });
  it("قالب شمارش معکوس", () => {
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(3725)).toBe("1:02:05");
  });
  it("تجزیه‌ی مقدار ذخیره‌شده", () => {
    expect(parseNapTimer(JSON.stringify({ startedAt: 1, endsAt: 2000, minutes: 20 }))).toEqual({ startedAt: 1, endsAt: 2000, minutes: 20 });
    expect(parseNapTimer(null)).toBeNull();
    expect(parseNapTimer("{bad")).toBeNull();
    expect(parseNapTimer(JSON.stringify({ startedAt: 5, endsAt: 5, minutes: 1 }))).toBeNull();
    expect(parseNapTimer(JSON.stringify({ startedAt: 0, endsAt: 1e13, minutes: 1 }))).toBeNull();
    expect(parseNapTimer(JSON.stringify({ startedAt: "a", endsAt: 5, minutes: 1 }))).toBeNull();
  });
  it("نرمال‌سازی", () => {
    expect(normalizeNapMinutes(0)).toBe(1);
    expect(normalizeNapMinutes(9999)).toBe(240);
    expect(normalizeNapMinutes("x")).toBe(20);
    expect(normalizeNapLatency(99)).toBe(60);
    expect(normalizeNapLatency(null)).toBe(0);
  });
});
