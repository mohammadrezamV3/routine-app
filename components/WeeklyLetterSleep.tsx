"use client";

import "./sleep.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon } from "lucide-react";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel } from "./SleepInsightsPanel";
import { PanelSkeleton } from "./PanelSkeleton";
import { WeeklyLetterChapterHead } from "./WeeklyLetterChapterHead";
import { getSleepRange } from "@/lib/storage";
import { getSleepGoal } from "@/lib/sleepGoal";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { useLiveRefresh } from "@/lib/liveSync";
import { useFeature } from "@/lib/useFeatures";
import { isoLocal } from "@/lib/jalali";
import { addDaysIso, sleepInsights, sleepMinutes, type SleepRecord } from "@/lib/sleep";

// فصل «خواب» هفته‌نامه: همون سه بخش آماری خواب (نمودار، تحلیل، تقویم) که
// قبلا در آنالیز هفتگی بود. خوندن تاریخچه‌ی خواب آزاده، پس به AI Insight بسته
// نیست و فقط فلگ sleep رو رعایت می‌کنه. پنجره‌ی داده تا آخر همون هفته (یا امروز،
// هرکدوم زودتره) می‌ره تا هفته‌ی قدیمی هم شب‌های همون دوره رو نشون بده.

const LOAD_DAYS = 120;

export function WeeklyLetterSleep({ weekStart, no }: { weekStart: string; no?: number }) {
  const on = useFeature("sleep");
  if (on !== true) return null;
  return <Inner weekStart={weekStart} no={no} />;
}

function Inner({ weekStart, no }: { weekStart: string; no?: number }) {
  const router = useRouter();
  const [entries, setEntries] = useState<SleepRecord[] | null>(null);
  const [target, setTarget] = useState({ wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP });

  const endIso = useMemo(() => {
    const today = isoLocal(new Date());
    const weekEnd = addDaysIso(weekStart, 6);
    return weekEnd < today ? weekEnd : today;
  }, [weekStart]);

  const load = useCallback(async () => {
    const [list, g] = await Promise.all([
      getSleepRange(addDaysIso(endIso, -(LOAD_DAYS - 1)), endIso).catch(() => [] as SleepRecord[]),
      getSleepGoal(),
    ]);
    setEntries(list.filter((e) => sleepMinutes(e) > 0).sort((a, b) => a.date.localeCompare(b.date)));
    setTarget(g.goal);
  }, [endIso]);

  useEffect(() => { setEntries(null); load(); }, [load]);
  useLiveRefresh(["sleep", "sleepGoal", "wakeSleepTimes"], () => { load(); });

  // لینک #sleep: بخش بعد از لود ساخته می‌شه و پرش مرورگر بهش نمی‌رسه
  useEffect(() => {
    if (entries === null || window.location.hash !== "#sleep") return;
    document.getElementById("sleep")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [entries]);

  const insights = useMemo(() => sleepInsights(entries ?? [], target, endIso), [entries, target, endIso]);
  const openNight = useCallback((iso: string) => router.push(`/sleep?date=${iso}`), [router]);

  return (
    <section id="sleep" className="wl-ch sleep-scope wl-dp-sleep" aria-label="آمار خواب">
      <WeeklyLetterChapterHead icon={Moon} title="خواب" no={no} />
      {entries === null ? (
        <PanelSkeleton rows={3} />
      ) : (
        <div className="wl-dp-sleep-grid">
          <div className="wl-dp-sleep-wide">
            <SleepTrendChart entries={entries} insights={insights} target={target} todayIso={endIso} onPick={openNight} />
          </div>
          <SleepInsightsPanel insights={insights} target={target} />
          <SleepMonthMap insights={insights} todayIso={endIso} onPick={openNight} />
        </div>
      )}
    </section>
  );
}
