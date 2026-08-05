import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// همون کمک‌تابعِ استانداردِ shadcn/ui — ادغام کلاس‌های Tailwind با اولویتِ
// درست (آخری برنده می‌شه)، فقط برای کامپوننت‌های داشبورد (app/dashboard) استفاده می‌شه.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// یک برنامه با «ي»/«ك» عربی تایپ‌شده (کیبوردهای عربی/بعضی موبایل‌ها) با
// همون اسمِ نوشته‌شده با «ی»/«ک» فارسی از نظرِ چشم یکسانه ولی از نظرِ
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
