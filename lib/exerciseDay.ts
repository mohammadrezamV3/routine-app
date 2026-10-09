// نام روز هفته‌ی فارسی ذخیره‌شده در پلن → نمایش به زبان جاری (سبک، بدون کاتالوگ).
import { isEn } from "./i18n";
import { FA_WEEKDAY, weekdayName } from "./jalali";

/** اسم روز هفته‌ی فارسی («شنبه») به زبان جاری؛ ناشناخته دست‌نخورده برمی‌گرده. */
export function dayNameDisplay(dayFa: string): string {
  if (!isEn()) return dayFa;
  const i = FA_WEEKDAY.indexOf(dayFa);
  return i >= 0 ? weekdayName(i) : dayFa;
}
