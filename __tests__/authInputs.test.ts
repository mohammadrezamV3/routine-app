import { describe, expect, it } from "vitest";
import {
  digitsOnly, isValidPersianName, toEnglishDigits,
} from "@/lib/validate";

describe("toEnglishDigits / digitsOnly", () => {
  it("ارقام فارسی را لاتین می‌کند", () => {
    expect(toEnglishDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("ارقام عربیِ شرقی را هم می‌گیرد (بعضی کیبوردها این‌ها را می‌فرستند)", () => {
    expect(toEnglishDigits("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("ترکیبِ فارسی و لاتین را درست می‌کند", () => {
    expect(toEnglishDigits("۰۹12۳۴")).toBe("091234");
  });

  it("حروف را دست نمی‌زند", () => {
    expect(toEnglishDigits("سلام ۱۲۳")).toBe("سلام 123");
  });

  it("digitsOnly هرچیزِ غیررقم را می‌اندازد", () => {
    expect(digitsOnly("۰۹۱۲-۳۴۵ ۶۷۸۹")).toBe("09123456789");
    expect(digitsOnly("+۹۸ ۹۱۲")).toBe("98912");
    expect(digitsOnly("")).toBe("");
  });

  it("شماره‌ی فارسی بعد از تبدیل، معتبر شناخته می‌شود", () => {
    // همان باگی که کاربر می‌دید: شماره‌ی درست، پیامِ «نامعتبر»
    const typed = "۰۹۱۲۳۴۵۶۷۸۹";
    expect(/^09\d{9}$/.test(typed)).toBe(false);
    expect(/^09\d{9}$/.test(digitsOnly(typed))).toBe(true);
  });
});

describe("isValidPersianName", () => {
  it("نامِ فارسی را می‌پذیرد", () => {
    for (const n of ["محمد", "علی‌رضا", "زهرا", "امیر حسین", "مهدیه"]) {
      expect(isValidPersianName(n), n).toBe(true);
    }
  });

  it("لاتین، رقم و نشانه را رد می‌کند", () => {
    for (const n of ["Mohammad", "محمد1", "محمد!", "ali", "محمد-رضا", "١٢٣"]) {
      expect(isValidPersianName(n), n).toBe(false);
    }
  });

  it("خالی را رد می‌کند", () => {
    expect(isValidPersianName("")).toBe(false);
    expect(isValidPersianName("   ")).toBe(false);
  });
});

describe("اعراب در نام", () => {
  it("تشدید و فتحه نوشتارِ درستِ فارسی‌اند و نباید رد شوند", () => {
    for (const n of ["محمّد", "مُحَمَّد", "رضایي", "مَهدی"]) {
      expect(isValidPersianName(n), n).toBe(true);
    }
  });

});
