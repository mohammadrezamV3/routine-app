// تشخیص تداخل زمانی بین برنامه‌ها — پورت مستقیم از lib/conflict.ts (وب).
import { tasksForDate, timeStartMinutes, timeEndMinutes, ScheduleTask } from "./schedule";

export function rangesOverlap(aStart: number, aEnd: number | null, bStart: number, bEnd: number | null): boolean {
  const aE = aEnd === null ? aStart + 1 : aEnd;
  const bE = bEnd === null ? bStart + 1 : bEnd;
  return aStart < bE && bStart < aE;
}

export function isPastToday(jsDay: number, startMin: number | null, endMin: number | null, now: Date): boolean {
  if (jsDay !== now.getDay()) return false;
  const checkMin = endMin ?? startMin;
  if (checkMin === null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= checkMin;
}

export function findScheduleConflict(
  jsDay: number,
  startMin: number | null,
  endMin: number | null,
  now: Date,
  opts: Parameters<typeof tasksForDate>[1],
  excludeId?: string
): ScheduleTask | null {
  const d = new Date(now);
  d.setDate(now.getDate() + (jsDay - now.getDay()));
  return findConflictOnDate(d, startMin, endMin, opts, excludeId);
}

export function findConflictOnDate(
  d: Date,
  startMin: number | null,
  endMin: number | null,
  opts: Parameters<typeof tasksForDate>[1],
  excludeId?: string
): ScheduleTask | null {
  if (startMin === null) return null;
  const items = tasksForDate(d, opts);
  for (const t of items) {
    if (excludeId && t.id === excludeId) continue;
    const s = timeStartMinutes(t.time);
    if (s === null) continue;
    const e = timeEndMinutes(t.time);
    if (rangesOverlap(startMin, endMin, s, e)) return t;
  }
  return null;
}
