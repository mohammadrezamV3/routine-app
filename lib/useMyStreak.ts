"use client";

import { useEffect, useMemo, useState } from "react";
import { isoLocal } from "./jalali";
import { tasksForDate } from "./schedule";
import { getCustomOccurrences, getDailyRange, getRemovedOccurrences } from "./storage";
import { getWakeSleepTimes, isWakeOnTime, timeToMinutes, DEFAULT_WAKE } from "./wakeSleep";

// استریکِ روزهای پشت‌سرهمِ کامل — از HeaderStreakClock استخراج شده تا هم توی
// هدر هم توی کارتِ دوستان قابلِ استفاده باشه، بدون تکرارِ منطقِ محاسبه.
export function useMyStreak(): number | null {
  const [streak, setStreak] = useState<number | null>(null);
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);
  const [wakeMinutes, setWakeMinutes] = useState(timeToMinutes(DEFAULT_WAKE));

  useEffect(() => {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
    getWakeSleepTimes().then((v) => { if (v) setWakeMinutes(timeToMinutes(v.wake)); });
  }, []);

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  useEffect(() => {
    async function computeStreak() {
      const now = new Date();
      const rangeEnd = new Date(now); rangeEnd.setDate(rangeEnd.getDate() - 1);
      const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 90);
      const entries = await getDailyRange(isoLocal(rangeStart), isoLocal(rangeEnd));

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
        const wakeOK = rec.wake ? isWakeOnTime(rec.wake, wakeMinutes) : false;
        const fullDay = doneCount === expected.length && wakeOK;
        if (fullDay) {
          s++;
          cursor.setDate(cursor.getDate() - 1);
        } else break;
      }
      setStreak(s);
    }
    computeStreak();
  }, [opts, wakeMinutes]);

  return streak;
}
