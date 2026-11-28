// نمایش نام غذا در کلاینت: جدول نام‌های انگلیسی هیچ‌وقت به کلاینت نمیاد؛ سرور
// برای هر غذایی که برمی‌گردونه `nameEn` رو همراهش می‌فرسته (lib/foodCatalogServer.ts).
import { isEn } from "./i18n";

/** نام غذا برای نمایش؛ در انگلیسی nameEn سرور (اگه بود)، وگرنه همون نام ذخیره‌شده. */
export function foodNameDisplay(nameFa: string, nameEn?: string | null): string {
  if (!isEn()) return nameFa;
  return nameEn || nameFa;
}
