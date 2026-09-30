"use client";

// دادهِ روتینِ داشبورد — عمدا از lib/storage.ts (نه /api/dashboard) می‌خونه
// تا قراردادِ persistence (مهمان → localStorage، کاربر → API) و همگام‌سازیِ
// زنده با /weekly دقیقا همون بمونه: تیکی که این‌جا زده می‌شه همون لحظه در
// برنامه‌ی هفتگی/هدر/استریک دیده می‌شه و برعکس (lib/liveSync.ts).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isoLocal } from "./jalali";
import { computeDayStats, tasksForDate, timeStartMinutes, ScheduleOpts } from "./schedule";
import { CustomOccurrence, DailyRecord, getCustomOccurrences, getDailyRange, getRemovedOccurrences, setDaily } from "./storage";
import { keyMatches, useLiveRefresh } from "./liveSync";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, WakeSleepTimes } from "./wakeSleep";
import { buildHeatmap, HeatCell } from "./dashboardCompute";
import { computeRoutineStreak } from "./routineStreak";

// ۱۳ هفته عمدا: شروعِ نقشه (شنبه‌ی ۱۲ هفته قبل) حداکثر ۹۰ روز عقب می‌ره، یعنی
// کاملا داخلِ بازه‌ی روزانه‌ای که bootstrap همراهِ صفحه می‌فرسته (امروز−۹۰..+۷)
// — پس هیچ درخواستِ جدایی برای نقشه زده نمی‌شه. ۱۸ هفته‌ی قبلی یک /range اضافه
// روی مسیرِ لود می‌ساخت.
export const HEAT_WEEKS = 13;

export type TodayTask = {
  id: string;
  name: string;
  time: string;
  startMin: number | null;
  done: boolean;
  importance?: CustomOccurrence["importance"];
  tag?: string;
  href?: string;
};

export function useDashboardRoutine() {
  const [custom, setCustom] = useState<CustomOccurrence[] | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [daily, setDailyMap] = useState<Record<string, DailyRecord>>({});
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [rangeLoaded, setRangeLoaded] = useState(false);
  // روزِ جاری — اگه صفحه از نیمه‌شب رد بشه باید «امروز» جلو بره
  const [todayIso, setTodayIso] = useState(() => isoLocal(new Date()));
  useEffect(() => {
    const t = setInterval(() => { const iso = isoLocal(new Date()); setTodayIso((p) => (p === iso ? p : iso)); }, 60_000);
    return () => clearInterval(t);
  }, []);

  const loadOcc = useCallback(() => {
    getCustomOccurrences().then(setCustom).catch(() => setCustom([]));
    getRemovedOccurrences().then((a) => setRemoved(new Set(a))).catch(() => {});
  }, []);
  const loadRange = useCallback(() => {
    const now = new Date();
    const diffToSat = (now.getDay() + 1) % 7;
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToSat - (HEAT_WEEKS - 1) * 7);
    getDailyRange(isoLocal(from), isoLocal(now))
      .then((m) => { setDailyMap(m); setRangeLoaded(true); })
      .catch(() => setRangeLoaded(true));
  }, []);
  const loadWake = useCallback(() => { getWakeSleepTimes().then(setWakeSleep).catch(() => {}); }, []);

  useEffect(() => { loadOcc(); loadWake(); }, [loadOcc, loadWake]);
  useEffect(() => { loadRange(); }, [loadRange, todayIso]);

  // تیکِ خودمون (optimistic) رو دوباره از شبکه نمی‌خونیم — فقط تغییرِ
  // تب/دستگاهِ دیگه (remote) یا کلیدهای برنامه/ساعتِ خواب.
  const pendingTicks = useRef(0);
  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences", "wakeSleepTimes"], (changed, meta) => {
    const all = changed.includes("*");
    if (all || changed.some((c) => c === "customOccurrences" || c === "removedOccurrences")) loadOcc();
    if (all || changed.includes("wakeSleepTimes")) loadWake();
    if ((all || changed.some((c) => keyMatches("daily", c))) && (meta.remote || pendingTicks.current === 0)) loadRange();
  });

  const opts: ScheduleOpts = useMemo(() => ({ removedOccurrences: removed, customOccurrences: custom ?? [] }), [removed, custom]);

  const today = useMemo(() => {
    const [y, m, d] = todayIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayIso]);

  const todayRec = daily[todayIso];
  const tasks: TodayTask[] = useMemo(() => {
    if (!custom) return [];
    return tasksForDate(today, opts).map((t) => {
      const occ = custom.find((c) => c.id === t.id);
      return {
        id: t.id,
        name: t.name,
        time: t.time,
        startMin: timeStartMinutes(t.time),
        done: !!todayRec?.tasks[t.id],
        importance: occ?.importance,
        tag: occ?.tag,
        href: occ?.roadmapId ? `/roadmaps/custom/${occ.roadmapId}` : occ?.mentorProgramId ? `/mentor-programs/${occ.mentorProgramId}` : undefined,
      };
    });
  }, [custom, opts, today, todayRec]);

  const stats = useMemo(() => computeDayStats(today, opts, todayRec), [today, opts, todayRec]);
  const heat: HeatCell[][] = useMemo(() => (custom ? buildHeatmap(today, HEAT_WEEKS, opts, daily) : []), [custom, today, opts, daily]);
  // همون تعریفِ هدر (lib/routineStreak.ts) — امروز همون لحظه‌ی کامل‌شدن حساب می‌شه
  const streak = useMemo(() => (rangeLoaded && custom ? computeRoutineStreak(today, opts, daily, 90).streak : null), [rangeLoaded, custom, today, opts, daily]);

  const toggle = useCallback(async (id: string) => {
    const cur = daily[todayIso] ?? { tasks: {}, wake: null };
    const next: DailyRecord = { ...cur, tasks: { ...cur.tasks, [id]: !cur.tasks[id] } };
    setDailyMap((m) => ({ ...m, [todayIso]: next }));
    pendingTicks.current++;
    try { await setDaily(todayIso, next); } finally { pendingTicks.current--; }
  }, [daily, todayIso]);

  return {
    ready: custom !== null,
    rangeLoaded,
    todayIso,
    tasks,
    stats,
    heat,
    streak,
    wakeSleep: wakeSleep ?? { wake: DEFAULT_WAKE, sleep: DEFAULT_SLEEP },
    hasWakeSleep: !!wakeSleep,
    toggle,
    /** برای نقشه‌ی ثباتِ سالانه — برنامه + تیک‌های ۹۰ روزِ اخیر (با تیک‌های زنده‌ی امروز) */
    opts,
    daily,
  };
}
