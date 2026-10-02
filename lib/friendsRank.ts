// رتبه‌بندی دوستان — منطق خالص (بدون دیتابیس/DOM) تا هم کارت دوستان، هم
// صفحه‌ی /friends و هم تست‌ها از یک تعریف استفاده کنن.
//
// دو معیار:
//  - «امروز»: درصد برنامه‌های امروز (pct).
//  - «این هفته»: میانگین درصد 7 روز اخیر (امروز هم جزوشه)؛ روزی که اصلا
//    برنامه نداشته (null) در میانگین حساب نمی‌شه، نه به‌عنوان صفر.
// برابری: استریک بیشتر جلوتره، بعد اسم (الفبایی، پایدار). رتبه‌ی مساوی
// برای امتیاز و استریک برابر (1، 1، 3).

import { addDaysIso } from "./schedule";

export type RankMode = "today" | "week";

/** درصد 7 روز اخیر، قدیمی → امروز؛ null یعنی آن روز برنامه‌ای نداشت */
export type WeekPcts = (number | null)[];

export const WEEK_DAYS = 7;

export type Rankable = {
  id: string;
  name: string;
  pct: number;
  streak: number;
  total?: number;
  week?: WeekPcts | null;
};

export type Ranked<T> = T & { rank: number; score: number };

/** میانگین روزهای دارای برنامه؛ هفته‌ی کاملا بی‌برنامه = 0 */
export function weekScore(week: WeekPcts | null | undefined): number {
  if (!week || !week.length) return 0;
  const days = week.filter((v): v is number => typeof v === "number");
  if (!days.length) return 0;
  return Math.round(days.reduce((s, v) => s + clampPct(v), 0) / days.length);
}

/** تعداد روزهای 100٪ در هفته */
export function fullDays(week: WeekPcts | null | undefined): number {
  return (week ?? []).filter((v) => v === 100).length;
}

/** امروز همه‌ی برنامه‌ها تیک خورده (روز بی‌برنامه کامل حساب نمی‌شه) */
export function isTodayComplete(f: { pct: number; total?: number }): boolean {
  return f.pct >= 100 && (f.total ?? 1) > 0;
}

export function scoreOf(f: Rankable, mode: RankMode): number {
  return mode === "week" ? weekScore(f.week) : clampPct(f.pct);
}

export function rankFriends<T extends Rankable>(list: readonly T[], mode: RankMode): Ranked<T>[] {
  const scored = list.map((f) => ({ ...f, score: scoreOf(f, mode), rank: 0 }));
  scored.sort((a, b) => b.score - a.score || b.streak - a.streak || a.name.localeCompare(b.name, "fa") || a.id.localeCompare(b.id));
  let prev: { score: number; streak: number } | null = null;
  scored.forEach((f, i) => {
    f.rank = prev && prev.score === f.score && prev.streak === f.streak ? scored[i - 1].rank : i + 1;
    prev = f;
  });
  return scored;
}

/** تاریخ ISO هفت روز اخیر (قدیمی → امروز) برای برچسب روزها */
export function weekIsos(todayIso: string): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) => addDaysIso(todayIso, i - (WEEK_DAYS - 1)));
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v || 0)));
}
