import { CAL_WEEK_ORDER, FA_WEEKDAY, isoLocal } from "./jalali";
import type { ExerciseLogRow } from "./exerciseTypes";

// نسخه‌ی آفلاینِ lib/exerciseStats.ts (وب) — به‌جای fetch از /api/exercise،
// مستقیم روی آرایه‌ی لاگ‌های محلی (از Dexie) حساب می‌کنه. منطق عینا همون
// وبه: استریک فقط روزهای gymDays رو می‌شمره (روز استراحت باعث شکستن
// استریک نمی‌شه).

export function gymDayNameOf(d: Date): string {
  return FA_WEEKDAY[d.getDay()];
}

export function startOfWeek(now: Date): Date {
  // هفته‌ی ایرانی از شنبه شروع می‌شه (CAL_WEEK_ORDER[0] === 6 یعنی getDay()===6)
  const d = new Date(now);
  const idx = CAL_WEEK_ORDER.indexOf(d.getDay());
  d.setDate(d.getDate() - idx);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function logsByDate(logs: ExerciseLogRow[]): Record<string, ExerciseLogRow> {
  const map: Record<string, ExerciseLogRow> = {};
  for (const l of logs) {
    if (l.deletedAt) continue;
    map[l.date] = l;
  }
  return map;
}

export function sessionsThisWeekTotal(gymDays: string[] | null | undefined): number {
  return gymDays?.length ?? 0;
}

export function sessionsThisWeekDone(logs: Record<string, ExerciseLogRow>, now: Date): number {
  const start = startOfWeek(now);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > now) continue;
    if (logs[isoLocal(d)]?.completed) count++;
  }
  return count;
}

export function todayProgressPct(todayItemsCount: number, log: ExerciseLogRow | undefined): number {
  if (todayItemsCount === 0) return 0;
  const done = log?.completedItems?.length ?? 0;
  return Math.round((Math.min(done, todayItemsCount) * 100) / todayItemsCount);
}

export function weekProgressPct(gymDays: string[] | null | undefined, logs: Record<string, ExerciseLogRow>, now: Date): number {
  const total = sessionsThisWeekTotal(gymDays);
  if (total === 0) return 0;
  return Math.round((sessionsThisWeekDone(logs, now) * 100) / total);
}

export function computeExerciseStreak(
  gymDayNames: string[] | null | undefined,
  logs: Record<string, ExerciseLogRow>,
  now: Date
): number {
  const gymSet = new Set(gymDayNames ?? []);
  if (gymSet.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(now);
  const todayIso = isoLocal(now);
  if (gymSet.has(gymDayNameOf(now)) && logs[todayIso]?.completed) {
    streak++;
  }
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < 120; i++) {
    if (!gymSet.has(gymDayNameOf(cursor))) {
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

/** استریکِ روزهایی که کاربر حداقل یک ثبتِ کالری داشته (برای کارتِ استریکِ کالری). */
export function computeCalorieStreak(loggedDatesIso: Set<string>, now: Date): number {
  let streak = 0;
  const cursor = new Date(now);
  if (loggedDatesIso.has(isoLocal(now))) streak++;
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const iso = isoLocal(cursor);
    if (loggedDatesIso.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
