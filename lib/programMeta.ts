import { tr, isEn } from "./i18n";
// دیگه هیچ درس/برنامه پیش‌فرضی وجود نداره — همه‌چیز رو خود کاربر اضافه
// می‌کنه (customOccurrences)، پس این دیکشنری فعلا خالیه. اگه در آینده
// خواستیم به آیتم‌های سفارشی هم متادیتای اضافه (مثل تاریخ پایان دوره) بدیم،
// باید مستقیم روی خود CustomOccurrence ذخیره بشه، نه اینجا.
export const PROGRAM_META: Record<string, { lesson: string; end: Date | null }> = {};

export function formatDaysLeft(days: number, faNum: (n: number | string) => string): string {
  if (days <= 0) return tr("امروز پایان می‌یابد", "Ends today");
  const weeks = Math.floor(days / 7), rem = days % 7;
  if (isEn()) {
    const w = `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
    const d = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
    return weeks > 0 ? w + (rem ? " and " + d(rem) : "") : d(days);
  }
  if (weeks > 0) return faNum(weeks) + " هفته" + (rem ? " و " + faNum(rem) + " روز" : "");
  return faNum(days) + " روز";
}
