// تصویرهای لوگوی بخش‌ها (هدر + پنجره‌ی SectionSwitcher). مسیرها یک جا تا هدر، پنجره و گرم‌کردن کش
// دقیقا یک URL رو بخونن (کش مرورگر روی URL کامله؛ next/image با /_next/image یک URL دیگه می‌ساخت
// و اولین بار هم از بهینه‌ساز رد می‌شد).
import { SECTION_KEYS, SECTION_META } from "@/lib/sections";

export const SECTION_WORDMARK_DARK = "/images/sections/wordmark-dark.png";
export const SECTION_WORDMARK_LIGHT = "/images/sections/wordmark-light.webp";

let warmed: HTMLImageElement[] | null = null;

/**
 * سه نشان بخش و هر دو نسخه‌ی حروف ARION رو از قبل می‌گیره و دیکد می‌کنه تا اولین باز شدن پنجره‌ی بخش‌ها
 * هر سه ردیف رو هم‌زمان (بدون ظاهر شدن دیرهنگام لوگوها) رنگ کنه. بی‌خطر و ایدمپوتنته؛ فقط سمت کلاینت.
 * ارجاع‌ها نگه داشته می‌شن تا دانلود/دیکد وسط راه رها نشه.
 */
export function warmSectionAssets(): void {
  if (warmed || typeof window === "undefined" || typeof Image === "undefined") return;
  warmed = [];
  const urls = [...SECTION_KEYS.map((k) => SECTION_META[k].icon), SECTION_WORDMARK_DARK, SECTION_WORDMARK_LIGHT];
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    warmed.push(img);
    try { img.decode?.().catch(() => {}); } catch { /* مرورگر قدیمی */ }
  }
}
