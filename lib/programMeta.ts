// دیگه هیچ درس/برنامه پیش‌فرضی وجود نداره — همه‌چیز رو خود کاربر اضافه
// می‌کنه (customOccurrences)، پس این دیکشنری فعلاً خالیه. اگه در آینده
// خواستیم به آیتم‌های سفارشی هم متادیتای اضافه (مثل تاریخ پایان دوره) بدیم،
// باید مستقیم روی خودِ CustomOccurrence ذخیره بشه، نه اینجا.
export const PROGRAM_META: Record<string, { lesson: string; end: Date | null }> = {};

export function formatDaysLeft(days: number, faNum: (n: number | string) => string): string {
  if (days <= 0) return "امروز پایان می‌یابد";
  const weeks = Math.floor(days / 7), rem = days % 7;
  if (weeks > 0) return faNum(weeks) + " هفته" + (rem ? " و " + faNum(rem) + " روز" : "");
  return faNum(days) + " روز";
}
