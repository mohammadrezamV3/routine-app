import { normalizeFa } from "@/lib/utils";

// عکسِ حرکاتِ ورزشی — قواعدِ مشترکِ سرور و کلاینت.
//
// چرا این‌جا و نه داخلِ روت: هم روتِ ادمین (نوشتن) و هم روتِ کاربر
// (خواندن) و هم فرمِ ادمین (اعتبارسنجیِ قبل از ارسال) به همین سقف‌ها و
// همین کلیدِ نرمال‌شده نیاز دارند؛ یک نسخه‌ی واحد یعنی هیچ‌وقت سقفِ
// کلاینت و سرور از هم جدا نمی‌افتند.

/** مثلِ آواتار/بنر: data URL داخلِ ستونِ String، بدونِ استوریجِ فایلی. */
export const MAX_MEDIA_DATA_URL_LENGTH = 700_000;

/** اندازه‌ی نهایی‌ای که کلاینت قبل از ارسال عکس را به آن می‌رساند. */
export const MEDIA_MAX_EDGE = 720;

/** فرمت‌هایی که مرورگر بدونِ دردسر نشان می‌دهد (svg عمداً نیست — اسکریپت‌پذیر است). */
const ALLOWED_PREFIXES = ["data:image/jpeg;", "data:image/png;", "data:image/webp;"];

/** کلیدِ اتصالِ عکس به کاتالوگ: نامِ نرمال‌شده، نه نامِ خام. */
export function mediaKey(name: string): string {
  return normalizeFa(name);
}

export type MediaCheck = { ok: true } | { ok: false; error: string; status: number };

export function checkMediaDataUrl(dataUrl: unknown): MediaCheck {
  if (typeof dataUrl !== "string" || !ALLOWED_PREFIXES.some((p) => dataUrl.startsWith(p))) {
    return { ok: false, error: "فقط عکس JPG، PNG یا WebP قابل قبول است", status: 400 };
  }
  if (dataUrl.length > MAX_MEDIA_DATA_URL_LENGTH) {
    return { ok: false, error: "حجم عکس زیاد است — کمی کوچک‌ترش کن", status: 413 };
  }
  return { ok: true };
}
