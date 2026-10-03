"use client";

import "./sleep.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { ICONS } from "./NavDrawer";
import { RoutineTrialBanner } from "./RoutineTrialBanner";
import { SleepDial } from "./SleepDial";
import { SleepWeek } from "./SleepWeek";
import { SleepGoalSheet } from "./SleepGoalSheet";
import { SleepLogSheet, type SleepLogSheetProps } from "./SleepLogSheet";
import { getSleepRange } from "@/lib/storage";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { getSleepGoal } from "@/lib/sleepGoal";
import { getSleepLatency, setSleepLatency } from "@/lib/sleepLatency";
import { DEFAULT_LATENCY } from "@/lib/sleepCycles";
import { useLiveRefresh } from "@/lib/liveSync";
import { useFeature } from "@/lib/useFeatures";
import { isoLocal } from "@/lib/jalali";
import { addDaysIso, sleepInsights, sleepMinutes, type SleepRecord } from "@/lib/sleep";
import { getTracking, stopTracking, draftFromTracking, TRACKER_EVENT, type SleepTracking } from "@/lib/sleepTracker";

// بخش خواب (/sleep) — صفحه و سیستم جدای خودش، نه داخل صفحه‌ی روتین. طبق
// درخواست صریح ساده و خلوته و فقط دو بخش داره: صفحه‌ی ساعت 24 ساعته (SleepDial:
// هدف، دیشب، الان، دکمه‌ی اصلی؛ زدن ساعت‌های هدف = SleepGoalSheet) و هفت شب
// اخیر (SleepWeek). نمودار، تقویم امتیاز و تحلیل‌ها در آنالیز هفتگی‌ان
// (WeeklyAnalysisSleep در /analysis/weekly) و این‌جا فقط لینک «آمار خواب» هست.
// محاسبه‌ها خالص در lib/sleep.ts؛ persistence از lib/storage.ts.

/** چند شب به عقب خونده می‌شه (تحلیل‌ها و تقویم ماهانه) */
export const SLEEP_LOAD_DAYS = 120;

// پنجره‌ی چرخه‌های خواب فقط بعد از زدن چیپ روی صفحه‌ی ساعت لود می‌شه
const loadCycleSheet = () => import("./SleepCycleSheet");
const SleepCycleSheet = dynamic(loadCycleSheet, { ssr: false });

type SheetState = { initial: SleepLogSheetProps["initial"]; existing: boolean; fromTracker?: boolean } | null;

export function SleepHub() {
  const [todayIso, setTodayIso] = useState("");
  const [entries, setEntries] = useState<SleepRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState({ wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP });
  const [goalCustom, setGoalCustom] = useState(false);
  const [tracking, setTracking] = useState<SleepTracking | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [cyclesOpen, setCyclesOpen] = useState(false);
  const [latency, setLatency] = useState<number>(DEFAULT_LATENCY);

  // امروز با گذشتن نیمه‌شب (صفحه‌ی باز) عوض می‌شه
  useEffect(() => {
    setTodayIso(isoLocal(new Date()));
    const t = setInterval(() => setTodayIso((p) => { const n = isoLocal(new Date()); return n === p ? p : n; }), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const [list, g, lat] = await Promise.all([
      getSleepRange(addDaysIso(today, -(SLEEP_LOAD_DAYS - 1)), today).catch(() => [] as SleepRecord[]),
      getSleepGoal(),
      getSleepLatency(),
    ]);
    setLatency(lat);
    setEntries(list.filter((e) => sleepMinutes(e) > 0).sort((a, b) => a.date.localeCompare(b.date)));
    setTarget(g.goal);
    setGoalCustom(g.custom);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(["sleep", "sleepGoal", "sleepLatency", "wakeSleepTimes"], () => { load(); });

  useEffect(() => {
    const sync = () => setTracking(getTracking());
    sync();
    window.addEventListener(TRACKER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(TRACKER_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const changeLatency = useCallback((min: number) => {
    setLatency(min);
    setSleepLatency(min).catch(() => {});
  }, []);
  const openCycles = useCallback(() => setCyclesOpen(true), []);
  const closeCycles = useCallback(() => setCyclesOpen(false), []);
  const preloadCycles = useCallback(() => { loadCycleSheet(); }, []);

  const insights = useMemo(() => sleepInsights(entries, target, todayIso || isoLocal(new Date())), [entries, target, todayIso]);
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

  // لینک از آنالیز هفتگی (/sleep?date=YYYY-MM-DD) همون شب رو برای ویرایش باز می‌کنه
  useEffect(() => {
    if (!loaded) return;
    const d = new URLSearchParams(window.location.search).get("date");
    if (!todayIso || !d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > todayIso) return;
    openDate(d);
    const url = new URL(window.location.href);
    url.searchParams.delete("date");
    window.history.replaceState(window.history.state, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, !!todayIso]);

  const statsOn = useFeature("weeklyAnalysis") === true;
  const lastNight = byDate.get(todayIso) ?? null;
  const lastScore = lastNight ? insights.scores.find((s) => s.date === lastNight.date)?.score ?? null : null;

  return (
    <section className="sleep-scope slp-page">
      <div className="trade-head-row" style={{ justifyContent: "flex-start" }}>
        <span className="page-title-icon">{ICONS.sleep}</span>
        <h1>خواب</h1>
        {statsOn && (
          <Link href="/analysis/weekly#sleep" prefetch={false} className="slp-stats-link">
            <BarChart3 aria-hidden /> آمار خواب
          </Link>
        )}
      </div>
      <RoutineTrialBanner />

      <div className="slp-hub">
        <SleepDial
          loaded={loaded}
          target={target}
          lastNight={lastNight}
          lastScore={lastScore}
          tracking={tracking}
          onLog={() => openDate(todayIso || isoLocal(new Date()))}
          onWakeUp={wakeUp}
          onEditGoal={() => setGoalOpen(true)}
          latency={latency}
          onOpenCycles={openCycles}
          onPreloadCycles={preloadCycles}
        />
        {todayIso && <SleepWeek entries={entries} insights={insights} todayIso={todayIso} onPick={openDate} />}
      </div>

      {cyclesOpen && (
        <SleepCycleSheet
          open
          onClose={closeCycles}
          target={target}
          goalMin={insights.goalMin}
          latency={latency}
          onLatencyChange={changeLatency}
          lastNight={lastNight}
        />
      )}

      <SleepGoalSheet
        open={goalOpen}
        goal={target}
        custom={goalCustom}
        goalMin={insights.goalMin}
        onClose={() => setGoalOpen(false)}
        onSaved={load}
      />

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
