"use client";

import "./sleep.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon } from "lucide-react";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel } from "./SleepInsightsPanel";
import { PanelSkeleton } from "./PanelSkeleton";
import { getSleepRange } from "@/lib/storage";
import { getSleepGoal } from "@/lib/sleepGoal";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { useLiveRefresh } from "@/lib/liveSync";
import { useFeature } from "@/lib/useFeatures";
import { isoLocal } from "@/lib/jalali";
import { addDaysIso, sleepInsights, sleepMinutes, type SleepRecord } from "@/lib/sleep";

// آمار خواب در آنالیز هفتگی (درخواست صریح: صفحه‌ی /sleep خلوت بمونه و
// بخش‌های آماری این‌جا باشن): نمودار شب‌های اخیر، تقویم امتیاز و تحلیل‌ها.
// همون کامپوننت‌ها و همون محاسبه‌ی خالص lib/sleep.ts؛ داده از lib/storage
// (قرارداد مهمان/کاربر). خوندن تاریخچه‌ی خواب آزاده، پس این بخش به ماژول
// AI Insight بسته نیست؛ فقط فلگ «sleep» رو رعایت می‌کنه. زدن روی هر شب
// همون شب رو در /sleep برای ویرایش باز می‌کنه.

const LOAD_DAYS = 120;

export function WeeklyAnalysisSleep() {
  const on = useFeature("sleep");
  if (on !== true) return null;
  return <WeeklyAnalysisSleepInner />;
}

function WeeklyAnalysisSleepInner() {
  const router = useRouter();
  const [todayIso] = useState(() => isoLocal(new Date()));
  const [entries, setEntries] = useState<SleepRecord[] | null>(null);
  const [target, setTarget] = useState({ wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP });

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const [list, g] = await Promise.all([
      getSleepRange(addDaysIso(today, -(LOAD_DAYS - 1)), today).catch(() => [] as SleepRecord[]),
      getSleepGoal(),
    ]);
    setEntries(list.filter((e) => sleepMinutes(e) > 0).sort((a, b) => a.date.localeCompare(b.date)));
    setTarget(g.goal);
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(["sleep", "sleepGoal", "wakeSleepTimes"], () => { load(); });

  // لینک «آمار و تحلیل خواب» از /sleep با #sleep میاد؛ بخش بعد از لود ساخته
  // می‌شه، پس پرش خودکار مرورگر بهش نمی‌رسه
  useEffect(() => {
    if (entries === null || window.location.hash !== "#sleep") return;
    document.getElementById("sleep")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [entries]);

  const insights = useMemo(() => sleepInsights(entries ?? [], target, todayIso), [entries, target, todayIso]);
  const openNight = useCallback((iso: string) => router.push(`/sleep?date=${iso}`), [router]);

  return (
    <section id="sleep" className="sleep-scope wa-sleep" aria-label="آمار خواب">
      <h2 className="wa-sleep-title"><Moon aria-hidden /> خواب</h2>
      {entries === null ? (
        <PanelSkeleton rows={3} />
      ) : (
        <div className="wa-sleep-grid">
          <div className="wa-sleep-wide">
            <SleepTrendChart entries={entries} insights={insights} target={target} todayIso={todayIso} onPick={openNight} />
          </div>
          <SleepInsightsPanel insights={insights} target={target} />
          <SleepMonthMap insights={insights} todayIso={todayIso} onPick={openNight} />
        </div>
      )}
    </section>
  );
}
