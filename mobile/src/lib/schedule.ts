// منطق زمان‌بندی روزانه — پورت از lib/schedule.ts (وب)، بدون وابستگی به
// next/*. فقط customOccurrences و removedOccurrences رو پردازش می‌کنه.

import { isoLocal } from "./jalali";
import { toEnglishDigits } from "./digits";

export type ScheduleTask = {
  id: string;
  name: string;
  time: string; // نمایش فارسی، مثلا "۱۰:۳۰ – ۱۹:۳۰"
  custom?: boolean;
};

export function dayBeforeIso(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return isoLocal(d);
}

export function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

export function jsDayOfIso(iso: string): number {
  return new Date(iso + "T00:00:00").getDay();
}

export function sameWeekIso(iso: string, jsDay: number): string {
  const offsetFromSat = (jsDayOfIso(iso) + 1) % 7;
  return addDaysIso(iso, ((jsDay + 1) % 7) - offsetFromSat);
}

const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toEnDigits(s: string): string {
  return toEnglishDigits(s);
}

export function toFaDigits(s: string): string {
  return String(s).replace(/[0-9]/g, (ch) => faDigits[+ch]);
}

export function timeStartMinutes(timeStr: string): number | null {
  const en = toEnDigits(timeStr);
  const m = /(\d{1,2}):(\d{2})/.exec(en);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return null;
}

export function timeEndMinutes(timeStr: string): number | null {
  const en = toEnDigits(timeStr);
  const parts = en.split(/[–—-]/);
  if (parts.length === 2) {
    const m = /(\d{1,2}):(\d{2})/.exec(parts[1]);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  return null;
}

export function splitTimeRange(t: string): { start: string | null; full: string } {
  const parts = String(t).split(/[–—-]/);
  if (parts.length === 2 && /\d/.test(parts[0]) && /\d/.test(parts[1])) {
    return { start: parts[0].trim(), full: t };
  }
  return { start: null, full: t };
}

export function sortTasksByTime(list: ScheduleTask[]): ScheduleTask[] {
  return list
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const ta = timeStartMinutes(a.item.time);
      const tb = timeStartMinutes(b.item.time);
      if (ta === null && tb === null) return a.idx - b.idx;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb || a.idx - b.idx;
    })
    .map((w) => w.item);
}

export function tasksForDate(
  d: Date,
  opts?: { removedOccurrences?: Set<string>; customOccurrences?: { id: string; name: string; jsDay: number; time: string; startDate?: string; endDate?: string }[] }
): ScheduleTask[] {
  const day = d.getDay();
  let filtered: ScheduleTask[] = [];

  if (opts?.customOccurrences) {
    const dIso = isoLocal(d);
    opts.customOccurrences.forEach((c) => {
      if (c.jsDay === day && (!c.startDate || dIso >= c.startDate) && (!c.endDate || dIso <= c.endDate)) {
        filtered.push({ id: c.id, name: c.name, time: c.time, custom: true });
      }
    });
  }
  if (opts?.removedOccurrences) {
    filtered = filtered.filter((t) => !opts.removedOccurrences!.has(t.id + "|" + day));
  }
  return sortTasksByTime(filtered);
}

export type ScheduleOpts = { removedOccurrences: Set<string>; customOccurrences: { id: string; name: string; jsDay: number; time: string; startDate?: string; endDate?: string }[] };
export type DayStats = { completed: number; total: number; pct: number };

export function computeDayStats(
  date: Date,
  opts: ScheduleOpts,
  record: { tasks: Record<string, boolean> } | undefined
): DayStats {
  const expected = tasksForDate(date, opts);
  const total = expected.length;
  const completed = record ? expected.filter((t) => record.tasks[t.id]).length : 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, pct };
}

// شروع هفته‌ی حاوی now — شنبه (jsDay=6).
export function startOfWeek(now: Date, weekOffset = 0): Date {
  const diffToSat = (now.getDay() + 1) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - diffToSat + weekOffset * 7);
  return d;
}

export const WEEK_ORDER = [
  { name: "شنبه", short: "ش", jsDay: 6 },
  { name: "یکشنبه", short: "ی", jsDay: 0 },
  { name: "دوشنبه", short: "د", jsDay: 1 },
  { name: "سه‌شنبه", short: "س", jsDay: 2 },
  { name: "چهارشنبه", short: "چ", jsDay: 3 },
  { name: "پنجشنبه", short: "پ", jsDay: 4 },
  { name: "جمعه", short: "ج", jsDay: 5 },
];
