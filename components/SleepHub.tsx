"use client";

import "./sleep.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashHeader } from "./DashHeader";
import { RoutineSectionTabs } from "./RoutineSectionTabs";
import { RoutineTrialBanner } from "./RoutineTrialBanner";
import { SleepHero } from "./SleepHero";
import { SleepLogSheet, type SleepLogSheetProps } from "./SleepLogSheet";
import { SleepTrendChart } from "./SleepTrendChart";
import { SleepMonthMap } from "./SleepMonthMap";
import { SleepInsightsPanel } from "./SleepInsightsPanel";
import { SleepCycleCalc } from "./SleepCycleCalc";
import { SleepHistoryList } from "./SleepHistoryList";
import { getSleepRange } from "@/lib/storage";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes } from "@/lib/wakeSleep";
import { useLiveRefresh } from "@/lib/liveSync";
import { isoLocal } from "@/lib/jalali";
import { addDaysIso, sleepInsights, sleepMinutes, type SleepRecord } from "@/lib/sleep";
import { getTracking, stopTracking, draftFromTracking, TRACKER_EVENT, type SleepTracking } from "@/lib/sleepTracker";

// بخش خواب «روتین من» (/weekly/sleep). این فایل فقط داده رو می‌خونه و بخش‌ها رو
// کنار هم می‌چینه؛ هر بخش کامپوننت خودشه:
//   SleepHero (وضعیت لحظه‌ای + ردیاب زنده) · SleepLogSheet (ثبت/ویرایش) ·
//   SleepTrendChart (نمودار) · SleepMonthMap (تقویم امتیاز) ·
//   SleepInsightsPanel (تحلیل‌ها) · SleepCycleCalc (چرخه‌ها) · SleepHistoryList.
// همه‌ی محاسبه‌ها خالص در lib/sleep.ts (sleepInsights)؛ persistence از
// lib/storage.ts با همون قرارداد مهمان/کاربر.

/** چند شب به عقب خونده می‌شه (تحلیل‌ها و تقویم ماهانه) */
export const SLEEP_LOAD_DAYS = 120;

type SheetState = { initial: SleepLogSheetProps["initial"]; existing: boolean; fromTracker?: boolean } | null;

export function SleepHub() {
  const [todayIso, setTodayIso] = useState(() => isoLocal(new Date()));
  const [entries, setEntries] = useState<SleepRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState({ wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP });
  const [tracking, setTracking] = useState<SleepTracking | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);

  // امروز با گذشتن نیمه‌شب (صفحه‌ی باز) عوض می‌شه
  useEffect(() => {
    const t = setInterval(() => setTodayIso((p) => { const n = isoLocal(new Date()); return n === p ? p : n; }), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const [list, ws] = await Promise.all([
      getSleepRange(addDaysIso(today, -(SLEEP_LOAD_DAYS - 1)), today).catch(() => [] as SleepRecord[]),
      getWakeSleepTimes().catch(() => null),
    ]);
    setEntries(list.filter((e) => sleepMinutes(e) > 0).sort((a, b) => a.date.localeCompare(b.date)));
    setTarget({ wake: ws?.wake || DEFAULT_WAKE, sleep: ws?.sleep || DEFAULT_SLEEP });
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(["sleep", "wakeSleepTimes"], () => { load(); });

  useEffect(() => {
    const sync = () => setTracking(getTracking());
    sync();
    window.addEventListener(TRACKER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(TRACKER_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const insights = useMemo(() => sleepInsights(entries, target, todayIso), [entries, target, todayIso]);
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);

  const openDate = useCallback((dateIso: string) => {
    const rec = byDate.get(dateIso);
    setSheet(rec ? { initial: rec, existing: true } : { initial: { date: dateIso }, existing: false });
  }, [byDate]);

  // «بیدار شدم»: پیش‌نویس از ردیاب؛ ردیابی فقط بعد از ذخیره‌ی موفق پاک می‌شه
  const wakeUp = useCallback(() => {
    if (!tracking) return;
    const draft = draftFromTracking(tracking);
    if (!draft) { stopTracking(); return; }
    const existing = byDate.get(draft.date);
    setSheet({ initial: { ...(existing ?? {}), ...draft }, existing: !!existing, fromTracker: true });
  }, [tracking, byDate]);

  const lastNight = byDate.get(todayIso) ?? null;
  const lastScore = lastNight ? insights.scores.find((s) => s.date === lastNight.date)?.score ?? null : null;

  return (
    <section className="dash-breakout dash-scope sleep-scope pb-6 text-dash-text">
      <div className="flex flex-col gap-4 sm:gap-6">
        <DashHeader
          title="روتین من"
          subtitle="خواب، انرژی و ریتم بدنت"
          progress={insights.avgScore ?? 0}
          progressLabel="امتیاز خواب"
        />
        <RoutineSectionTabs className="slp-section-tabs" />
        <RoutineTrialBanner />
      </div>

      <div className="slp-hub">
        <div className="slp-col">
          <SleepHero
            loaded={loaded}
            target={target}
            insights={insights}
            lastNight={lastNight}
            lastScore={lastScore}
            tracking={tracking}
            onLog={() => openDate(todayIso)}
            onWakeUp={wakeUp}
          />
          <SleepTrendChart entries={entries} insights={insights} target={target} todayIso={todayIso} onPick={openDate} />
          <SleepInsightsPanel insights={insights} target={target} />
        </div>
        <div className="slp-col">
          <SleepMonthMap insights={insights} todayIso={todayIso} onPick={openDate} />
          <SleepCycleCalc target={target} />
          <SleepHistoryList entries={entries} insights={insights} onEdit={(rec) => setSheet({ initial: rec, existing: true })} />
        </div>
      </div>

      <SleepLogSheet
        open={!!sheet}
        initial={sheet?.initial ?? null}
        existing={!!sheet?.existing}
        target={target}
        onClose={() => setSheet(null)}
        onChanged={() => {
          // شبی که از ردیاب ساخته شده بود ذخیره شد → ردیابی تمومه
          if (sheet?.fromTracker) stopTracking();
          setSheet(null);
          load();
        }}
      />
    </section>
  );
}
