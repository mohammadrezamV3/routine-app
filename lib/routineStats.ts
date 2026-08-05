// «چند درصد از برنامه‌ی امروز/این‌هفته انجام شده» — wrapperهای سمتِ کلاینتِ
// computeDayStats (که خودش توی lib/schedule.ts تعریف شده، بدون وابستگی به
// next-auth/react، تا API routeهای سمتِ سرور هم بتونن مستقیم صداش بزنن).
import { tasksForDate, WEEK_ORDER, computeDayStats, startOfWeek, ScheduleOpts, DayStats } from "./schedule";
import { isoLocal } from "./jalali";
import { getCustomOccurrences, getRemovedOccurrences, getDaily, getDailyRange } from "./storage";

export async function getTodayStats(): Promise<DayStats> {
  const [removed, custom, daily] = await Promise.all([
    getRemovedOccurrences(), getCustomOccurrences(), getDaily(isoLocal(new Date())),
  ]);
  const opts: ScheduleOpts = { removedOccurrences: new Set(removed), customOccurrences: custom };
  return computeDayStats(new Date(), opts, daily);
}

export type WeekDayStat = { jsDay: number; short: string; iso: string; pct: number };

export async function getWeekStats(): Promise<WeekDayStat[]> {
  const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
  const opts: ScheduleOpts = { removedOccurrences: new Set(removed), customOccurrences: custom };

  const start = startOfWeek(new Date());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const entries = await getDailyRange(isoLocal(days[0]), isoLocal(days[6]));

  return days.map((d) => {
    const iso = isoLocal(d);
    const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
    const { pct } = computeDayStats(d, opts, entries[iso]);
    return { jsDay: d.getDay(), short: order.short, iso, pct };
  });
}

// آیتم‌های «خیلی زیاد»/«زیاد» که توی «امروز» و «فردا» حداقل یک بار زمان‌بندی
// شدن — برای بخش «یادآوری‌ها». قبلاً کلِ هفته (شنبه تا جمعه) رو می‌گشت که
// خیلی دوره‌ی بلندی بود؛ یادآوری واقعاً فقط برای چیزیه که قراره زودی برسه.
export type ImportantOccurrence = { id: string; name: string; jsDay: number; time: string; importance: "veryHigh" | "high"; notify: boolean };

export async function getImportantUpcoming(days = 2): Promise<ImportantOccurrence[]> {
  const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
  const opts: ScheduleOpts = { removedOccurrences: new Set(removed), customOccurrences: custom };

  const today = new Date();
  const result: ImportantOccurrence[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    for (const t of tasksForDate(d, opts)) {
      const occ = custom.find((c) => c.id === t.id);
      if (occ?.importance === "veryHigh" || occ?.importance === "high") {
        result.push({ id: t.id, name: t.name, jsDay: d.getDay(), time: t.time, importance: occ.importance, notify: occ.notify !== false });
      }
    }
  }
  return result;
}
