import { describe, it, expect } from "vitest";
import { isForexOpen, isSessionOpen, sessionsAt, wallClockIn } from "@/lib/forexSessions";

// این تست‌ها روی همان چیزی تمرکز دارند که با عددِ ثابتِ UTC می‌شکند: تغییرِ
// ساعتِ تابستانی. هر تاریخ عمداً یک‌بار در تابستان و یک‌بار در زمستان انتخاب
// شده تا اگر کسی روزی این محاسبه را به عددِ هاردکدِ UTC برگرداند، تست بیفتد.

describe("wallClockIn", () => {
  it("لحظه‌ی UTC را به ساعتِ محلیِ درست تبدیل می‌کند", () => {
    // ۱۲:۰۰ UTC، ژانویه (زمستان) — لندن UTC+0
    expect(wallClockIn(new Date("2026-01-14T12:00:00Z"), "Europe/London").minutes).toBe(12 * 60);
    // ۱۲:۰۰ UTC، ژوئیه (تابستان) — لندن UTC+1
    expect(wallClockIn(new Date("2026-07-15T12:00:00Z"), "Europe/London").minutes).toBe(13 * 60);
  });

  it("نیم‌شب را ۲۴ گزارش نمی‌کند", () => {
    expect(wallClockIn(new Date("2026-07-15T00:00:00Z"), "UTC").minutes).toBe(0);
  });
});

describe("isSessionOpen — لندن با احتسابِ DST", () => {
  it("۰۹:۰۰ به وقتِ لندن در هر دو فصل باز است", () => {
    expect(isSessionOpen("LONDON", new Date("2026-01-14T09:00:00Z"))).toBe(true); // زمستان = ۰۹:۰۰ محلی
    expect(isSessionOpen("LONDON", new Date("2026-07-15T08:00:00Z"))).toBe(true); // تابستان = ۰۹:۰۰ محلی
  });

  it("۰۷:۰۰ UTC در زمستان هنوز بسته ولی در تابستان باز است", () => {
    expect(isSessionOpen("LONDON", new Date("2026-01-14T07:00:00Z"))).toBe(false); // ۰۷:۰۰ محلی
    expect(isSessionOpen("LONDON", new Date("2026-07-15T07:00:00Z"))).toBe(true);  // ۰۸:۰۰ محلی
  });
});

describe("isForexOpen", () => {
  it("شنبه بسته است", () => {
    expect(isForexOpen(new Date("2026-07-18T12:00:00Z"))).toBe(false);
  });
  it("جمعه بعد از ۱۷:۰۰ نیویورک بسته و قبلش باز است", () => {
    // ۱۷ ژوئیه ۲۰۲۶ جمعه؛ تابستانِ نیویورک = UTC-4
    expect(isForexOpen(new Date("2026-07-17T20:00:00Z"))).toBe(true);  // ۱۶:۰۰ نیویورک
    expect(isForexOpen(new Date("2026-07-17T21:30:00Z"))).toBe(false); // ۱۷:۳۰ نیویورک
  });
  it("یکشنبه بعد از ۱۷:۰۰ نیویورک دوباره باز می‌شود", () => {
    expect(isForexOpen(new Date("2026-07-19T20:00:00Z"))).toBe(false); // ۱۶:۰۰ یکشنبه
    expect(isForexOpen(new Date("2026-07-19T22:00:00Z"))).toBe(true);  // ۱۸:۰۰ یکشنبه
  });
});

describe("sessionsAt", () => {
  it("همپوشانیِ لندن و نیویورک هر دو را برمی‌گرداند", () => {
    // ۱۵ ژوئیه ۲۰۲۶ چهارشنبه، ۱۴:۰۰ UTC = ۱۵:۰۰ لندن و ۱۰:۰۰ نیویورک
    const s = sessionsAt(new Date("2026-07-15T14:00:00Z"));
    expect(s).toContain("LONDON");
    expect(s).toContain("NEWYORK");
  });
  it("آخرِ هفته هیچ جلسه‌ای باز نیست", () => {
    expect(sessionsAt(new Date("2026-07-18T12:00:00Z"))).toEqual([]);
  });
});
