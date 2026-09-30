"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isoLocal } from "./jalali";
import { computeRoutineStreak } from "./routineStreak";
import { getCustomOccurrences, getDaily, getDailyRange, getRemovedOccurrences } from "./storage";
import { keyMatches, useLiveRefresh } from "./liveSync";

export type MyStreak = {
  /** روزهای پشت‌سرهمِ کامل (lib/routineStreak.ts — امروز همون لحظه‌ی کامل‌شدن حساب می‌شه) */
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
const STREAK_WINDOW = 90;

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
    const cause = causeRef.current;
    // امروز هم خونده می‌شه: استریک همون لحظه‌ای که آخرین برنامه‌ی امروز تیک
    // می‌خوره یکی بالا می‌ره (lib/routineStreak.ts — تعریفِ مشترک با داشبورد).
    // امروز جدا هم با getDaily خونده می‌شه تا تیکِ optimistic ِ همین لحظه (قبل
    // از جوابِ سرور) دیده بشه — همون تیکی که جشنِ استریک رو راه می‌ندازه.
    const now = new Date();
    const todayIso = isoLocal(now);
    const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - STREAK_WINDOW);
    Promise.all([getDailyRange(isoLocal(rangeStart), todayIso), getDaily(todayIso)])
      .then(([entries, todayRec]) => {
        if (!alive) return;
        const r = computeRoutineStreak(now, opts, { ...entries, [todayIso]: todayRec }, STREAK_WINDOW);
        setState({ streak: r.streak, todayDone: r.todayCounted, todayIso, cause });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [opts, version]);

  return state;
}
