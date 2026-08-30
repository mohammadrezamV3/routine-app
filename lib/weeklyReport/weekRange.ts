import { startOfWeek } from "@/lib/schedule";
import { isoLocal } from "@/lib/jalali";

// تنها منبعِ محاسبه‌ی «هفته» توی کلِ فیچرِ گزارشِ هفتگی — بقیه‌ی فایل‌ها
// همیشه از همین استفاده می‌کنن، نه اینکه خودشون startOfWeek بزنن.
//
// چرا نمی‌شه مستقیم startOfWeek(new Date()) زد: سرور معمولاً UTC اجراست،
// پس نزدیکِ نیمه‌شب، «امروزِ سرور» می‌تونه یک روز با «امروزِ کاربر» فرق کنه
// و هفته اشتباه محاسبه بشه. اول تاریخِ روزِ جاری رو با Intl به وقتِ محلیِ
// کاربر می‌گیریم، بعد یک Date با همون سال/ماه/روز (نه ساعت) می‌سازیم —
// چون روزِ هفته فقط به تاریخِ تقویمی بستگی داره، نه به ساعت.
function userLocalToday(timezone: string, refDate: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(refDate);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

export type WeekRange = { weekStart: Date; weekEnd: Date; weekStartIso: string; weekEndIso: string };

/**
 * بازه‌ی هفته (شنبه تا جمعه) به‌وقتِ محلیِ کاربر. weekOffset=0 یعنی هفته‌ی
 * جاری، -1 یعنی هفته‌ی قبل، و... . weekStart/weekEnd هردو ساعتِ ۰۰:۰۰
 * محلی‌ان (برای مقایسه با ستون‌های @db.Date).
 */
export function getUserWeekRange(timezone: string, refDate: Date = new Date(), weekOffset = 0): WeekRange {
  const localToday = userLocalToday(timezone, refDate);
  const weekStart = startOfWeek(localToday, weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { weekStart, weekEnd, weekStartIso: isoLocal(weekStart), weekEndIso: isoLocal(weekEnd) };
}

/** آرایه‌ی ۷ تاریخِ شنبه..جمعه‌ی همون هفته، برای Daily Breakdown. */
export function daysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

/** آیا این weekOffset به هفته‌ی جاری یا آینده اشاره می‌کنه — انتخابِ هفته‌ی آینده مجاز نیست. */
export function isFutureWeek(timezone: string, weekStart: Date): boolean {
  const { weekStart: currentWeekStart } = getUserWeekRange(timezone);
  return weekStart.getTime() > currentWeekStart.getTime();
}
