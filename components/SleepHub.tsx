"use client";

import "./sleep.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SmartLink as Link } from "@/components/SmartLink";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { ICONS } from "./NavIcons";
import { RoutineTrialBanner } from "./RoutineTrialBanner";
import { PanelSkeleton } from "./PanelSkeleton";
import { SleepDial } from "./SleepDial";
import { SleepWeek } from "./SleepWeek";
import { SleepGoalSheet } from "./SleepGoalSheet";
import { SleepLogSheet, type SleepLogSheetProps } from "./SleepLogSheet";
import { getSleepRange, saveSleep, SleepSaveError } from "@/lib/storage";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleep";
import { getSleepGoal } from "@/lib/sleepGoal";
import { getSleepLatency, setSleepLatency } from "@/lib/sleepLatency";
import { DEFAULT_LATENCY } from "@/lib/sleepCycles";
import { useLiveRefresh } from "@/lib/liveSync";
import { useFeature } from "@/lib/useFeatures";
import { isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { addDaysIso, buildSleepTimes, isFutureWake, sleepInsights, sleepMinutes, type SleepRecord } from "@/lib/sleep";
import { getTracking, stopTracking, draftFromTracking, TRACKER_EVENT, type SleepTracking } from "@/lib/sleepTracker";

// بخش خواب (/sleep) — صفحه و سیستم جدای خودش، نه داخل صفحه‌ی روتین. دو کارت
// اصلی: صفحه‌ی ساعت 24 ساعته (SleepDial: هدف، دیشب، الان، دکمه‌ی اصلی؛ زدن
// باکس هدف خواب = SleepGoalSheet، باکس چرخه‌ها = SleepCycleSheet) و هفت شب اخیر (SleepWeek). زیرشون یک ردیف چهار
// کاشی ابزار (SleepToolsPanels: صداها، تنفس، چرت، آمار) میاد و انتخاب یک شب
// در آمار همون شب رو برای ویرایش باز می‌کنه. لینک «آمار خواب» به آنالیز هفتگی
// هم می‌مونه. محاسبه‌ها خالص در lib/sleep.ts؛ persistence از lib/storage.ts.

/** چند شب به عقب خونده می‌شه (تحلیل‌ها و تقویم ماهانه) */
export const SLEEP_LOAD_DAYS = 120;

// پنجره‌ی چرخه‌های خواب فقط بعد از hover/لمس/زدن باکس چرخه‌ها روی صفحه‌ی ساعت لود می‌شه
const loadCycleSheet = () => import("./SleepCycleSheet");
const SleepCycleSheet = dynamic(loadCycleSheet, { ssr: false });
// ردیف ابزارها (صدا، تنفس، چرت، آمار) جدا از اولین رندر لود می‌شه؛ تایمر چرت اونجا mount می‌مونه
const SleepToolsPanels = dynamic(() => import("./SleepToolsPanels").then((m) => m.SleepToolsPanels), {
  ssr: false,
  loading: () => <PanelSkeleton rows={1} />,
});

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
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

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

  // ثبت یک‌ضربه‌ی دیشب با ساعت‌های هدف (کاربر بعدا از ویرایش می‌تونه دقیق‌ترش کنه)
  const quickLog = useCallback(async () => {
    if (quickBusy || !todayIso) return;
    const range = buildSleepTimes(todayIso, target.sleep, target.wake);
    if (!range || isFutureWake(range.wokeAt)) return;
    setQuickBusy(true); setQuickError(null);
    try {
      await saveSleep({
        date: todayIso, sleptAt: range.sleptAt.toISOString(), wokeAt: range.wokeAt.toISOString(),
        quality: null, note: null,
      });
      await load();
    } catch (e) {
      setQuickError(e instanceof SleepSaveError && e.status === 403
        ? tr("دوره‌ی آزمایشی «روتین من» تموم شده؛ برای ثبت خواب پلن رو تهیه کن.", "Your My Routine trial has ended; get the plan to log sleep.")
        : e instanceof Error ? e.message : tr("ذخیره نشد", "Couldn't save"));
    } finally {
      setQuickBusy(false);
    }
  }, [quickBusy, todayIso, target, load]);

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
        <h1>{tr("خواب", "Sleep")}</h1>
        {statsOn && (
          <Link href="/analysis/weekly#sleep" prefetch={false} className="slp-stats-link">
            <BarChart3 aria-hidden /> {tr("آمار خواب", "Sleep stats")}
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
          onQuickLog={quickLog}
          quickBusy={quickBusy}
          quickError={quickError}
          goalStreak={insights.goalStreak}
          debt7Min={insights.debt7Min}
        />
        {todayIso && <SleepWeek entries={entries} insights={insights} todayIso={todayIso} onPick={openDate} />}
        {todayIso && loaded && (
          <SleepToolsPanels entries={entries} insights={insights} target={target} todayIso={todayIso} latency={latency} onPick={openDate} />
        )}
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
