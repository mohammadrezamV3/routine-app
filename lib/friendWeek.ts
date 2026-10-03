// نوار 7 روز اخیر دوستان — منطق خالص (فقط نمایش پروفایل؛ هیچ رتبه‌بندی‌ای
// در بخش دوستان وجود نداره).

import { addDaysIso } from "./schedule";

/** درصد 7 روز اخیر، قدیمی → امروز؛ null یعنی آن روز برنامه‌ای نداشت */
export type WeekPcts = (number | null)[];

export const WEEK_DAYS = 7;

/** تعداد روزهای 100٪ در هفته */
export function fullDays(week: WeekPcts | null | undefined): number {
  return (week ?? []).filter((v) => v === 100).length;
}

/** تاریخ ISO هفت روز اخیر (قدیمی → امروز) برای برچسب روزها */
export function weekIsos(todayIso: string): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) => addDaysIso(todayIso, i - (WEEK_DAYS - 1)));
}
