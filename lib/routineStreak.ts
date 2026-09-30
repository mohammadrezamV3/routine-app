// استریکِ روتین — تنها تعریفِ «روزهای کاملِ پشتِ‌سرهم» در کلِ اپ. هدر
// (useMyStreak)، کارت‌ها و نقشه‌ی داشبورد، آمارِ دوستان و صفحه‌ی /streak همه
// از همین تابع استفاده می‌کنن تا هیچ‌جا عددِ متفاوتی دیده نشه.
//
// قانون: زنجیره‌ی روزهای کامل از دیروز به عقب (روزِ بی‌برنامه رد می‌شه، نه
// شکست) + امروز *همون لحظه* که همه‌ی برنامه‌هاش تیک خورد. امروزِ ناقص
// استریک رو نمی‌شکنه (روز هنوز تموم نشده) — فقط حسابش نمی‌کنه.

import { isoLocal } from "./jalali";
import { tasksForDate, type ScheduleOpts } from "./schedule";

export type DailyTicks = Record<string, { tasks: Record<string, boolean> } | undefined>;

export type RoutineStreakResult = {
  streak: number;
  /** امروز کامل شده و در استریک حساب شده */
  todayCounted: boolean;
  /** شمارش تا ته پنجره رسید — استریکِ واقعی ممکنه بلندتر باشه */
  hitEdge: boolean;
};

export function dayComplete(d: Date, opts: ScheduleOpts, daily: DailyTicks): boolean | null {
  const expected = tasksForDate(d, opts);
  if (!expected.length) return null;
  const rec = daily[isoLocal(d)];
  if (!rec) return false;
  return expected.every((t) => rec.tasks[t.id]);
}

export function computeRoutineStreak(today: Date, opts: ScheduleOpts, daily: DailyTicks, windowDays = 120): RoutineStreakResult {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayCounted = dayComplete(base, opts, daily) === true;
  let streak = todayCounted ? 1 : 0;
  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const c = dayComplete(d, opts, daily);
    if (c === null) continue;
    if (!c) return { streak, todayCounted, hitEdge: false };
    streak++;
  }
  return { streak, todayCounted, hitEdge: true };
}
