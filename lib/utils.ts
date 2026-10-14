import { clsx, type ClassValue } from "clsx";

// فقط clsx (بدون tailwind-merge: ۲۶ کیلوبایت از باندل هر صفحه بود). هیچ call-site
// به ادغام کلاس‌های متعارض تکیه نمی‌کنه، به‌جز padding پیش‌فرض DashCard که خودش
// دستی حل می‌کنه. اگه جایی نیاز به override شد، همون‌جا صریح حلش کن.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// یک برنامه با «ي»/«ك» عربی تایپ‌شده (کیبوردهای عربی/بعضی موبایل‌ها) با
// همون اسم نوشته‌شده با «ی»/«ک» فارسی از نظر چشم یکسانه ولی از نظر
// یونیکد فرق داره، پس .includes() ساده matchش نمی‌کنه. قبل از هر مقایسه‌ی
// جست‌وجو، هر دو طرف باید از این عبور کنن.
export function normalizeFa(s: string): string {
  return s
    .replace(/[يی]/g, "ی") // ي (عربی) -> ی (فارسی)
    .replace(/[كک]/g, "ک") // ك (عربی) -> ک (فارسی)
    .replace(/[‌​]/g, " ") // نیم‌فاصله/zero-width -> فاصله‌ی معمولی
    .trim()
    .toLowerCase();
}
