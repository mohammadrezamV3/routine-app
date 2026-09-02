"use client";

import { useEffect, useMemo, useState } from "react";
import { isoLocal } from "./jalali";
import { tasksForDate } from "./schedule";
import { getCustomOccurrences, getDailyRange, getRemovedOccurrences } from "./storage";

// استریک روزهای پشت‌سرهم کامل — از HeaderStreakClock استخراج شده تا هم توی
// هدر هم توی کارت دوستان قابل استفاده باشه، بدون تکرار منطق محاسبه.
export function useMyStreak(): number | null {
  const [streak, setStreak] = useState<number | null>(null);
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);

  useEffect(() => {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
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
        // ثبت زمان بیداری یه فیچر جدا و اختیاریه — قبلا شرط AND با
        // تکمیل برنامه بود، یعنی هر روزی که کاربر دقیقا موقع هدفش بیدار
        // نمی‌شد (که اکثر کاربرها اصلا این قابلیت رو فعال/دنبال نمی‌کنن)
        // کل استریک صفر می‌شد، با اینکه ۱۰۰٪ برنامه‌ش رو انجام داده بود —
        // یعنی استریک عملا همیشه صفر می‌موند (باگ گزارش‌شده). حالا استریک
        // فقط یعنی «همه‌ی برنامه‌های اون روز انجام شده»، مستقل از وضعیت بیداری.
        const fullDay = doneCount === expected.length;
        if (fullDay) {
          s++;
          cursor.setDate(cursor.getDate() - 1);
        } else break;
      }
      setStreak(s);
    }
    computeStreak();
  }, [opts]);

  return streak;
}
