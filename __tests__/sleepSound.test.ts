import { describe, it, expect } from "vitest";
import {
  DEFAULT_PREFS, FADE_OUT_MS, clampVolume, fadeFactor, formatRemaining, parseSleepSoundPrefs, remainingMs,
} from "@/lib/sleepSound";

describe("صداهای خواب", () => {
  it("تنظیمات خراب به پیش‌فرض برمی‌گرده", () => {
    expect(parseSleepSoundPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parseSleepSoundPrefs("{bad")).toEqual(DEFAULT_PREFS);
    expect(parseSleepSoundPrefs("42")).toEqual(DEFAULT_PREFS);
  });
  it("تنظیمات معتبر خونده و پاکسازی می‌شه", () => {
    expect(parseSleepSoundPrefs('{"kind":"ocean","volume":0.3,"timerMin":45}')).toEqual({ kind: "ocean", volume: 0.3, timerMin: 45 });
    expect(parseSleepSoundPrefs('{"kind":"x","volume":9,"timerMin":7}')).toEqual({ kind: "rain", volume: 1, timerMin: null });
  });
  it("حجم محدود می‌شه", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume("abc")).toBe(DEFAULT_PREFS.volume);
  });
  it("باقی‌مانده تایمر", () => {
    expect(remainingMs(null, 5)).toBeNull();
    expect(remainingMs(1000, 400)).toBe(600);
    expect(remainingMs(1000, 2000)).toBe(0);
  });
  it("فید آخر دقیقه نرم و یکنواخت کم می‌شه", () => {
    expect(fadeFactor(null)).toBe(1);
    expect(fadeFactor(FADE_OUT_MS)).toBe(1);
    expect(fadeFactor(FADE_OUT_MS / 2)).toBeCloseTo(0.5);
    expect(fadeFactor(0)).toBe(0);
    expect(fadeFactor(45_000)).toBeGreaterThan(fadeFactor(15_000));
  });
  it("قالب زمان", () => {
    expect(formatRemaining(0)).toBe("0:00");
    expect(formatRemaining(61_000)).toBe("1:01");
    expect(formatRemaining(3_600_000)).toBe("1:00:00");
    expect(formatRemaining(900_000 - 1)).toBe("15:00");
  });
});
