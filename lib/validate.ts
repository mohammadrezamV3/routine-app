// اعتبارسنجی مشترک ورودی‌ها — تا هر روت مجبور نباشه دوباره regex بنویسه.
// هدف: رد کردن زودهنگام ورودی‌های بدشکل قبل از رسیدن به دیتابیس.

import { passwordTier, passwordTierError } from "./passwordStrength";

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

// شماره موبایل ایران: 09xxxxxxxxx (۱۱ رقم، با صفر شروع)
export function isValidIranPhone(v: string): boolean {
  return /^09\d{9}$/.test(v);
}

// یوزرنیم: فقط حروف انگلیسی/عدد/آندرلاین، ۳ تا ۲۰ کاراکتر — تا هم از
// تزریق کاراکترهای عجیب جلوگیری بشه هم شبیه شناسه واقعی بمونه.
export function isValidUsername(v: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(v);
}

/**
 * سیاست رمز عبور: حداقل ۸ کاراکتر، و از نظر zxcvbn (سنجش واقعی قدرت رمز، نه
 * فقط شمارش نوع کاراکتر) حداقل در سطح «خوب» باشه.
 * برمی‌گردونه: null اگه معتبر بود، وگرنه پیام خطا برای نمایش به کاربر.
 */
export async function validatePassword(v: string, userInputs: string[] = []): Promise<string | null> {
  if (v.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (v.length > 128) return "رمز عبور خیلی طولانی است";
  return passwordTierError(await passwordTier(v, userInputs));
}

/** رشته‌های آزاد ورودی کاربر (اسم، یادداشت و ...) رو به یک طول منطقی محدود می‌کنه */
export function clampText(v: string, maxLen: number): string {
  return String(v).slice(0, maxLen);
}
