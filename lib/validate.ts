// اعتبارسنجی مشترک ورودی‌ها — تا هر روت مجبور نباشه دوباره regex بنویسه.
// هدف: رد کردن زودهنگام ورودی‌های بدشکل قبل از رسیدن به دیتابیس.

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
 * سیاست رمز عبور: حداقل ۸ کاراکتر، حداقل یک حرف و یک عدد.
 * برمی‌گردونه: null اگه معتبر بود، وگرنه پیام خطا برای نمایش به کاربر.
 */
export function validatePassword(v: string): string | null {
  if (v.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (v.length > 128) return "رمز عبور خیلی طولانی است";
  if (!/[a-zA-Z]/.test(v) || !/[0-9]/.test(v)) return "رمز عبور باید حداقل شامل یک حرف و یک عدد باشد";
  return null;
}

/** رشته‌های آزاد ورودی کاربر (اسم، یادداشت و ...) رو به یک طول منطقی محدود می‌کنه */
export function clampText(v: string, maxLen: number): string {
  return String(v).slice(0, maxLen);
}
