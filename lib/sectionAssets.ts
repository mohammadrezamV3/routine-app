// تصویرهای لوگوی هدر (نشان A رنگی بخش در موبایل، حروف ARION در دسکتاپ). مسیرها و نقطه‌ی شکست
// CSS یک جا تا هدر (components/NavDrawer.tsx) و preload سمت سرور (app/layout.tsx) دقیقا یک URL و
// یک media رو بخونن؛ کش و preload مرورگر روی URL کامله.
// نسخه‌های *-sm.webp اندازه‌ی واقعی نمایش (حداکثر 3x) رو دارن؛ PNG اصلی‌ها دست‌نخورده می‌مونن.
import type { SectionKey } from "@/lib/sections";

/** نقطه‌ی شکست موبایل/دسکتاپ هدر (components/site-header.css: max-width:700px) */
export const HEADER_MOBILE_MEDIA = "(max-width: 700px)";
export const HEADER_DESKTOP_MEDIA = "(min-width: 701px)";

/** نشان A رنگی بخش، 100x85 (موبایل) */
export function sectionIconSm(key: SectionKey): string {
  return `/images/sections/icon-${key}-sm.webp`;
}

/** حروف ARION، 264px عرض: سفید برای تم تیره، تیره برای تم روشن (دسکتاپ) */
export function sectionWordmarkSm(theme: "dark" | "light"): string {
  return theme === "light" ? "/images/sections/wordmark-light-sm.webp" : "/images/sections/wordmark-dark-sm.webp";
}

/** پیکسل شفاف 1x1 برای <img> داخل <picture> وقتی media منبع جاری جور نیست (از دانلود بی‌مورد جلوگیری می‌کنه) */
export const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
