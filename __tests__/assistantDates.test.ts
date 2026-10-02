import { describe, it, expect } from "vitest";
import { extractDateMentions, reconcileOpDates, resolveJalaliDayMonth, parseDateInput } from "@/lib/routineAssistant";

// امروز = جمعه 10 مهر 1405 (2026-10-02). باگ گزارش‌شده: «30 مهر» به 8 آبان
// (2026-10-30) می‌رفت، چون مدل مهر رو با اکتبر یکی می‌گرفت.
const TODAY = "2026-10-02";

describe("تاریخ‌های پیام کاربر (سمت سرور)", () => {
  it("«30 مهر» و «۳۰ مهر» = 2026-10-22، نه 30 اکتبر", () => {
    expect(extractDateMentions("30 مهر برنامه اضافه کن", TODAY)[0].iso).toBe("2026-10-22");
    expect(extractDateMentions("۳۰ مهر کلاس دارم", TODAY)[0].iso).toBe("2026-10-22");
  });

  it("«1 آبان»، «اول آبان»", () => {
    expect(extractDateMentions("1 آبان", TODAY)[0].iso).toBe("2026-10-23");
    expect(extractDateMentions("اول آبان", TODAY)[0].iso).toBe("2026-10-23");
  });

  it("فردا، پس‌فردا، شنبه‌ی بعد", () => {
    expect(extractDateMentions("فردا", TODAY)[0].iso).toBe("2026-10-03");
    expect(extractDateMentions("پس‌فردا", TODAY)[0].iso).toBe("2026-10-04");
    expect(extractDateMentions("پس فردا", TODAY)[0].iso).toBe("2026-10-04");
    const sat = extractDateMentions("شنبه بعد", TODAY)[0].iso!;
    expect(new Date(sat + "T00:00:00").getDay()).toBe(6);
    expect(sat > TODAY).toBe(true);
  });

  it("«31 مهر» وجود نداره (مهر 30 روزه‌ست)", () => {
    expect(extractDateMentions("31 مهر", TODAY)[0].iso).toBeNull();
  });

  it("مرز ماه و سال: 31 شهریور و فروردین سال بعد", () => {
    expect(resolveJalaliDayMonth(31, 6, 1405, TODAY)).toBe("2026-09-22");
    // در اسفند 1405، «5 فروردین» یعنی فروردین 1406
    expect(resolveJalaliDayMonth(5, 1, null, "2027-03-10")).toBe("2027-03-25");
  });

  it("روز هفته‌ی تنها (تکرار هفتگی) تاریخ حساب نمی‌شه", () => {
    expect(extractDateMentions("شنبه‌ها ورزش", TODAY)).toEqual([]);
  });

  it("عبارت فارسی که مدل عینا کپی کرده دقیق تبدیل می‌شه", () => {
    expect(parseDateInput("30 مهر", TODAY)).toBe("2026-10-22");
  });
});

describe("reconcileOpDates — تاریخ اشتباه مدل با گفته‌ی کاربر عوض می‌شه", () => {
  it("2026-10-30 (خطای کلاسیک) → 2026-10-22", () => {
    const mentions = extractDateMentions("30 مهر جلسه اضافه کن", TODAY);
    const { ops, corrected } = reconcileOpDates([{ op: "add", name: "جلسه", date: "2026-10-30" }] as any, mentions, TODAY);
    expect(corrected).toBe(1);
    expect((ops[0] as any).date).toBe("2026-10-22");
  });

  it("تاریخ درست دست نمی‌خوره", () => {
    const mentions = extractDateMentions("30 مهر جلسه اضافه کن", TODAY);
    const { ops, corrected } = reconcileOpDates([{ op: "add", name: "جلسه", date: "2026-10-22" }] as any, mentions, TODAY);
    expect(corrected).toBe(0);
    expect((ops[0] as any).date).toBe("2026-10-22");
  });
});
