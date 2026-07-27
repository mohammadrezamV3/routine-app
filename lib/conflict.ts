import { tasksForDate, timeStartMinutes, timeEndMinutes, ScheduleTask } from "./schedule";

export function rangesOverlap(aStart: number, aEnd: number | null, bStart: number, bEnd: number | null): boolean {
  const aE = aEnd === null ? aStart + 1 : aEnd;
  const bE = bEnd === null ? bStart + 1 : bEnd;
  return aStart < bE && bStart < aE;
}

/**
 * می‌گردد ببیند آیا بازه [startMin,endMin) در روز jsDay با یکی از تسک‌های
 * موجود آن روز (به‌جز excludeId، برای حالت ویرایش) تداخل دارد یا نه.
 */
export function findScheduleConflict(
  jsDay: number,
  startMin: number | null,
  endMin: number | null,
  now: Date,
  opts: Parameters<typeof tasksForDate>[1],
  excludeId?: string
): ScheduleTask | null {
  if (startMin === null) return null;
  const d = new Date(now);
  d.setDate(now.getDate() + (jsDay - now.getDay()));
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
