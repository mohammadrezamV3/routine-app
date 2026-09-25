// محاسبه‌ی خالصِ استریک — استخراج‌شده از منطق lib/useMyStreak.ts (وب) به یک
// تابع بدونِ state/فچ، تا هم قابلِ تست باشه هم مستقل از React/Dexie.
import { isoLocal } from "./jalali";
import { tasksForDate, ScheduleOpts } from "./schedule";

export type DailyLike = { tasks: Record<string, boolean> };

/**
 * `entries` باید حداقل ۹۰ روزِ قبل از امروز (تا دیروز) رو در بر بگیره —
 * کلید هر ورودی تاریخ ISO محلی (YYYY-MM-DD) است. روزهایی که هیچ برنامه‌ای
 * نداشتن (expected.length === 0) نادیده گرفته می‌شن و استریک رو نمی‌شکنن؛
 * اولین روزی که برنامه داشته و کامل نشده، استریک رو متوقف می‌کنه.
 */
export function computeStreak(entries: Record<string, DailyLike>, opts: ScheduleOpts, now: Date = new Date()): number {
  let s = 0;
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 90; i++) {
    const key = isoLocal(cursor);
    const expected = tasksForDate(new Date(cursor), opts);
    if (expected.length === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const rec = entries[key];
    if (!rec) break;
    const doneCount = expected.filter((t) => rec.tasks[t.id]).length;
    const fullDay = doneCount === expected.length;
    if (fullDay) {
      s++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return s;
}
