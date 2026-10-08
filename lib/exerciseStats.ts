// آمار داشبورد بدنسازی — «تعداد جلسات این هفته»، «پیشرفت امروز/هفتگی» و
// استریک. برخلاف lib/routineStats.ts (که guest/localStorage هم پشتیبانی
// می‌کنه)، بدنسازی یه ماژول کاملا پولی/auth-only ـه (همون‌طور که
// ExercisePanel از قبل مستقیم fetch می‌زنه)، پس این‌جا مستقیم به /api/exercise
// وصل می‌شیم، بدون لایه‌ی storage.ts.
import { startOfWeek } from "./schedule";
import { isoLocal } from "./jalali";

export type ExerciseLogEntry = { completed: boolean; completedItems: string[]; started?: boolean };
export type ExerciseLogRange = Record<string, ExerciseLogEntry>;

export async function fetchExerciseLogRange(planId: string, start: Date, end: Date): Promise<ExerciseLogRange> {
  const res = await fetch(`/api/exercise/log/range?planId=${planId}&start=${isoLocal(start)}&end=${isoLocal(end)}`);
  if (!res.ok) return {};
  const data = await res.json();
  return data.logs ?? {};
}

/**
 * روز استراحت = روزی از هفته که توی gymDays پلن نیست. این روزها «خودکار
 * انجام‌شده»ن: هیچ لاگی براشون نوشته نمی‌شه (از خود پلن مشتق می‌شن)، هیچ‌وقت
 * «وقتش گذشته» نمی‌شن و استریک رو نمی‌شکنن. بدون پلن (gymDays خالی) هیچ روزی
 * استراحت نیست — اصلا برنامه‌ای نیست که روزش استراحت باشه.
 */
export function isRestDay(gymDayNames: Iterable<string> | null | undefined, dayName: string): boolean {
  const set = gymDayNames instanceof Set ? (gymDayNames as Set<string>) : new Set(gymDayNames ?? []);
  return set.size > 0 && !set.has(dayName);
}

/**
 * وضعیت یک روز برای نمایش: روز استراحت تا امروز (نه آینده) خودکار تیک
 * می‌خوره؛ روز باشگاه فقط با «پایان تمرین» واقعی (completed) انجام‌شده‌ست.
 */
export function exerciseDayDone(
  gymDayNames: Iterable<string> | null | undefined,
  dayName: string,
  iso: string,
  todayIso: string,
  log: ExerciseLogEntry | undefined
): boolean {
  if (isRestDay(gymDayNames, dayName)) return iso <= todayIso;
  return !!log?.completed;
}

/** چند روز این هفته (شنبه تا جمعه) واقعا روز باشگاهه — طبق gymDays پلن */
export function sessionsThisWeekTotal(gymDays: string[] | null | undefined): number {
  return gymDays?.length ?? 0;
}

/** چند تا از جلسات برنامه‌ریزی‌شده‌ی این هفته واقعا «تمام‌شده» ثبت شدن */
export function sessionsThisWeekDone(logs: ExerciseLogRange, now: Date): number {
  const start = startOfWeek(now);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > now) continue;
    const iso = isoLocal(d);
    if (logs[iso]?.completed) count++;
  }
  return count;
}

/** درصد حرکات امروز که تیک خوردن، نسبت به کل حرکات برنامه‌ی امروز */
export function todayProgressPct(todayItemsCount: number, log: ExerciseLogEntry | undefined): number {
  if (todayItemsCount === 0) return 0;
  const done = log?.completedItems?.length ?? 0;
  return Math.round(Math.min(done, todayItemsCount) * 100 / todayItemsCount);
}

/** درصد جلسات این‌هفته‌ای که «تمام» شدن، نسبت به کل روزهای باشگاه برنامه */
export function weekProgressPct(gymDays: string[] | null | undefined, logs: ExerciseLogRange, now: Date): number {
  const total = sessionsThisWeekTotal(gymDays);
  if (total === 0) return 0;
  return Math.round(sessionsThisWeekDone(logs, now) * 100 / total);
}

/**
 * استریک روزهای باشگاه پشت‌سرهم‌ تمام‌شده — فقط روزهایی که واقعا توی
 * gymDays هستن شمرده می‌شن (روزهای استراحت باعث شکستن استریک نمی‌شن)،
 * دقیقا مثل streakForUser توی app/api/friends/route.ts که روزهای بدون
 * برنامه رو نادیده می‌گیره. از دیروز شروع می‌کنه؛ اگه امروز هم تمام‌شده
 * باشه، امروز رو هم اضافه می‌کنه.
 */
export function computeExerciseStreak(
  gymDayNames: string[] | null | undefined,
  gymDayNameOf: (d: Date) => string,
  logs: ExerciseLogRange,
  now: Date
): number {
  const gymSet = new Set(gymDayNames ?? []);
  if (gymSet.size === 0) return 0;
  // روزهای استراحت «جلسه» نیستن که به عدد اضافه بشن (برچسب «جلسه‌ی
  // پشت‌سرهم»)، ولی خودکار انجام‌شده‌ن، پس هیچ‌وقت استریک رو نمی‌شکنن.

  let streak = 0;
  const cursor = new Date(now);
  const todayIso = isoLocal(now);
  if (gymSet.has(gymDayNameOf(now)) && logs[todayIso]?.completed) {
    streak++;
  }
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < 120; i++) {
    if (isRestDay(gymSet, gymDayNameOf(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const iso = isoLocal(cursor);
    if (logs[iso]?.completed) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
