"use client";

import { useEffect, useMemo, useState } from "react";
import { isoLocal } from "./jalali";
import { computeRoutineStreak } from "./routineStreak";
import { getCustomOccurrences, getDailyRange, getRemovedOccurrences } from "./storage";
import { keyMatches, useLiveRefresh } from "./liveSync";

// استریک روزهای پشت‌سرهم کامل — از HeaderStreakClock استخراج شده تا هم توی
// هدر هم توی کارت دوستان قابل استفاده باشه، بدون تکرار منطق محاسبه.
const STREAK_WINDOW = 90;

export function useMyStreak(): number | null {
  const [streak, setStreak] = useState<number | null>(null);
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);

  // دوباره‌خوانی با هر تغییرِ زنده (lib/liveSync.ts) — `version` محاسبه‌ی
  // استریک رو هم وقتی فقط تیک‌ها (نه برنامه‌ها) عوض شدن دوباره راه می‌ندازه.
  const [version, setVersion] = useState(0);
  function loadOccurrences() {
    getRemovedOccurrences().then((arr) => setRemovedOcc(new Set(arr)));
    getCustomOccurrences().then(setCustomOcc);
  }
  useEffect(loadOccurrences, []);
  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences"], (changed) => {
    const all = changed.includes("*");
    if (all || changed.some((c) => c === "customOccurrences" || c === "removedOccurrences")) loadOccurrences();
    if (all || changed.some((c) => keyMatches("daily", c))) setVersion((v) => v + 1);
  });

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  useEffect(() => {
    let alive = true;
    // امروز هم خونده می‌شه: استریک همون لحظه‌ای که آخرین برنامه‌ی امروز تیک
    // می‌خوره یکی بالا می‌ره (lib/routineStreak.ts — تعریفِ مشترک با داشبورد).
    const now = new Date();
    const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - STREAK_WINDOW);
    getDailyRange(isoLocal(rangeStart), isoLocal(now))
      .then((entries) => { if (alive) setStreak(computeRoutineStreak(now, opts, entries, STREAK_WINDOW).streak); })
      .catch(() => {});
    return () => { alive = false; };
  }, [opts, version]);

  return streak;
}
