import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";
import { isoLocal } from "./jalali";
import { ScheduleOpts } from "./schedule";

function iso(daysAgo: number, from: Date): string {
  const d = new Date(from);
  d.setDate(d.getDate() - daysAgo);
  return isoLocal(d);
}

describe("computeStreak", () => {
  const now = new Date("2024-03-28T09:00:00"); // پنجشنبه

  it("counts consecutive fully-completed days ending yesterday", () => {
    const opts: ScheduleOpts = {
      removedOccurrences: new Set(),
      // یک برنامه که هر روزِ هفته تکرار می‌شه
      customOccurrences: [0, 1, 2, 3, 4, 5, 6].map((jsDay) => ({ id: "daily", name: "روزانه", jsDay, time: "۱۰:۰۰" })),
    };
    const entries: Record<string, { tasks: Record<string, boolean> }> = {
      [iso(1, now)]: { tasks: { daily: true } },
      [iso(2, now)]: { tasks: { daily: true } },
      [iso(3, now)]: { tasks: { daily: false } }, // اینجا استریک باید بشکنه
      [iso(4, now)]: { tasks: { daily: true } },
    };
    expect(computeStreak(entries, opts, now)).toBe(2);
  });

  it("skips days with nothing scheduled without breaking the streak", () => {
    const opts: ScheduleOpts = {
      removedOccurrences: new Set(),
      // فقط پنجشنبه‌ها (jsDay=4) برنامه داره
      customOccurrences: [{ id: "thu", name: "پنجشنبه", jsDay: 4, time: "۱۰:۰۰" }],
    };
    const entries: Record<string, { tasks: Record<string, boolean> }> = {};
    // آخرین پنجشنبه‌ی قبل از امروز رو کامل می‌کنیم
    const cursor = new Date(now);
    cursor.setDate(cursor.getDate() - 1);
    while (cursor.getDay() !== 4) cursor.setDate(cursor.getDate() - 1);
    entries[isoLocal(cursor)] = { tasks: { thu: true } };
    expect(computeStreak(entries, opts, now)).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 when yesterday had scheduled items but no record at all", () => {
    const opts: ScheduleOpts = {
      removedOccurrences: new Set(),
      customOccurrences: [0, 1, 2, 3, 4, 5, 6].map((jsDay) => ({ id: "daily", name: "روزانه", jsDay, time: "۱۰:۰۰" })),
    };
    expect(computeStreak({}, opts, now)).toBe(0);
  });
});
