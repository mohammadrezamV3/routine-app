"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isoLocal } from "./jalali";
import { tasksForDate } from "./schedule";
import { getCustomOccurrences, getDaily, getDailyRange, getRemovedOccurrences } from "./storage";
import { keyMatches, useLiveRefresh } from "./liveSync";

export type MyStreak = {
  /** روزهای پشت‌سرهمِ کامل تا دیروز + امروز اگه کامل شده (هم‌قاعده‌ی streakFromHeatmap ِ داشبورد) */
  streak: number | null;
  /** همه‌ی برنامه‌های امروز تیک خورده؟ (امروزِ بی‌برنامه = false) */
  todayDone: boolean;
  todayIso: string;
  /**
   * آخرین محاسبه از چی راه افتاد: «init» بارِ اول، «local» تیکِ همین تب، «remote»
   * تب/دستگاهِ دیگه یا برگشت به تب. جشنِ استریک فقط روی «local» — کاربری که
   * روی گوشی کامل کرده و بعد به تبِ دسکتاپ برمی‌گرده نباید وسطِ کار غافلگیر بشه.
   */
  cause: "init" | "local" | "remote";
};

// استریک روزهای پشت‌سرهم کامل — از HeaderStreakClock استخراج شده تا هم توی
// هدر هم توی کارت دوستان قابل استفاده باشه، بدون تکرار منطق محاسبه.
export function useMyStreak(): MyStreak {
  const [state, setState] = useState<MyStreak>({ streak: null, todayDone: false, todayIso: "", cause: "init" });
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);

  // دوباره‌خوانی با هر تغییرِ زنده (lib/liveSync.ts) — `version` محاسبه‌ی
  // استریک رو هم وقتی فقط تیک‌ها (نه برنامه‌ها) عوض شدن دوباره راه می‌ندازه.
  const [version, setVersion] = useState(0);
  const causeRef = useRef<MyStreak["cause"]>("init");
  function loadOccurrences() {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
  }
  useEffect(loadOccurrences, []);
  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences"], (changed, meta) => {
    const all = changed.includes("*");
    causeRef.current = meta.remote ? "remote" : "local";
    if (all || changed.some((c) => c === "customOccurrences" || c === "removedOccurrences")) loadOccurrences();
    if (all || changed.some((c) => keyMatches("daily", c))) setVersion((v) => v + 1);
  });

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  useEffect(() => {
    let alive = true;
    async function computeStreak() {
      const cause = causeRef.current;
      const now = new Date();
      const todayIso = isoLocal(now);
      const rangeEnd = new Date(now); rangeEnd.setDate(rangeEnd.getDate() - 1);
      const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 90);
      // امروز جدا: getDaily تیکِ optimistic ِ همین لحظه (قبل از جوابِ سرور) رو می‌بینه
      const [entries, todayRec] = await Promise.all([
        getDailyRange(isoLocal(rangeStart), isoLocal(rangeEnd)),
        getDaily(todayIso),
      ]);

      const todayExpected = tasksForDate(now, opts);
      const todayDone = todayExpected.length > 0 && todayExpected.every((t) => todayRec?.tasks[t.id]);

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
      // مثلِ دوالینگو: امروز همون لحظه‌ای که کامل شد به استریک اضافه می‌شه (نه فردا)
      if (todayDone) s++;
      if (alive) setState({ streak: s, todayDone, todayIso, cause });
    }
    computeStreak();
    return () => { alive = false; };
  }, [opts, version]);

  return state;
}
