"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, History } from "lucide-react";
import { useLiveRefresh } from "@/lib/liveSync";
import { FA_WEEKDAY, CAL_WEEK_ORDER, isoLocal } from "@/lib/jalali";
import { startOfWeek } from "@/lib/schedule";
import { ExercisePlan } from "@/lib/exerciseTypes";
import {
  fetchExerciseLogRange, sessionsThisWeekTotal, sessionsThisWeekDone,
  weekProgressPct, todayProgressPct, ExerciseLogRange,
} from "@/lib/exerciseStats";
import { DashDateSelector } from "./DashDateSelector";
import { DashFilterButton } from "./DashFilterButton";
import { DashFriendsCard } from "./DashFriendsCard";
import { ExerciseStatsCard } from "./ExerciseStatsCard";
import { ExerciseCatalogCard } from "./ExerciseCatalogCard";
import { ExerciseTaskList } from "./ExerciseTaskList";
import { ExerciseWeekGrid } from "./ExerciseWeekGrid";
import { AddExerciseProgramForm } from "./AddExerciseProgramForm";
import { HistoryCalendar } from "./HistoryCalendar";
import { ExerciseSubstitutePicker } from "./ExerciseSubstitutePicker";
import { useDashboardPrefs } from "@/lib/dashboardPrefs";
import { LockBodyScroll } from "./LockBodyScroll";
import { getSetting, setSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import {
  DEFAULT_MISSED_DAY_PREF, MissedDayPref, addDaysIso, effectiveDayName, logsNeededFrom,
  normalizeMissedDayPref, planStartIsoOf, rebasedPref, weekdayOf,
} from "@/lib/exerciseProgression";

const now = new Date();
const todayIso = isoLocal(now);

export function ExerciseDashboard({
  plan,
  onPlanChange,
}: {
  plan: ExercisePlan;
  onPlanChange: (plan: ExercisePlan) => void;
}) {
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [recenterKey, setRecenterKey] = useState(0);

  const [logs, setLogs] = useState<ExerciseLogRange>({});
  const [selectedLog, setSelectedLog] = useState<{ completed: boolean; completedItems: string[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // زنده: لاگِ تمرین از تبِ دیگه/دستگاهِ دیگه یا برگشت به تب. نوشتن‌های همین
  // تب عمدا نادیده گرفته می‌شن — ExerciseTaskList خودش optimisticه و
  // دوباره‌خوانیِ پژواکِ هر تیک وسطِ تمرین تیک‌های بعدی رو یه لحظه برمی‌گردوند.
  useLiveRefresh("exercise", () => setRefreshKey((k) => k + 1), { remoteOnly: true });

  const [subbingItem, setSubbingItem] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [subTarget, setSubTarget] = useState<{ day: string; oldItem: string } | null>(null);
  const [subCandidates, setSubCandidates] = useState<string[] | null>(null);
  const [subPicking, setSubPicking] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const dashboardPrefs = useDashboardPrefs();

  // «رد شدن»/«ماندن» برای روزِ جامانده (تنظیمات › بدنسازی). پیش‌فرض همان
  // رفتارِ قبلی (رد شدن) است.
  const [missedPref, setMissedPref] = useState<MissedDayPref>(DEFAULT_MISSED_DAY_PREF);
  const [prefKey, setPrefKey] = useState(0);
  useLiveRefresh(SETTING_KEYS.exerciseMissedDay, () => setPrefKey((k) => k + 1));
  useEffect(() => {
    let alive = true;
    getSetting<unknown>(SETTING_KEYS.exerciseMissedDay, null)
      .then((v) => { if (alive) setMissedPref(normalizeMissedDayPref(v)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [prefKey]);

  const isSelectedToday = selectedIso === todayIso;

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedIso]);
  const selectedDayName = FA_WEEKDAY[selectedDate.getDay()];

  // نوارِ روزها خودش روزِ دور (از تقویمِ تاریخچه) را باز می‌کند و وسط می‌آورد.
  function pickDate(iso: string) {
    setSelectedIso(iso);
  }

  const planStartIso = planStartIsoOf(plan.createdAt, todayIso);
  const planDays = useMemo(
    () => new Set(plan.planData.filter((d) => d.items.length > 0).map((d) => d.day)),
    [plan.planData]
  );
  // در حالتِ «ماندن» لاگ از شروعِ نشانگر لازم است (نشانگر هر ~۶۰ روز جلو
  // کشیده می‌شود، پس این بازه کوتاه می‌ماند)؛ وگرنه ۹۰ روز برای «این‌هفته» کافیه.
  const logsFrom = logsNeededFrom({ pref: missedPref, planId: plan.id, planDays, planStartIso, todayIso });
  // نشانگر را فقط بعد از رسیدنِ *همین* بازه‌ی لاگ جلو می‌کشیم (وگرنه روزهای
  // انجام‌شده «جامانده» حساب می‌شدند).
  const [logsLoadedFor, setLogsLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const key = `${plan.id}|${logsFrom}`;
    let startIso = addDaysIso(todayIso, -90);
    if (logsFrom && logsFrom < startIso) startIso = logsFrom < addDaysIso(todayIso, -399) ? addDaysIso(todayIso, -399) : logsFrom;
    const [y, m, d] = startIso.split("-").map(Number);
    fetchExerciseLogRange(plan.id, new Date(y, m - 1, d), now).then((l) => {
      if (!alive) return;
      setLogs(l);
      setLogsLoadedFor(key);
    });
    return () => { alive = false; };
  }, [plan.id, refreshKey, logsFrom]);

  const progressCtx = useMemo(
    () => ({ pref: missedPref, planId: plan.id, planDays, planStartIso, logs, todayIso }),
    [missedPref, plan.id, planDays, planStartIso, logs]
  );
  // نشانگر را جلو می‌کشیم وقتی قدیمی شده یا مالِ پلنِ قبلی‌ست.
  useEffect(() => {
    if (logsLoadedFor !== `${plan.id}|${logsFrom}`) return;
    const next = rebasedPref(progressCtx);
    if (!next) return;
    setMissedPref(next);
    setSetting(SETTING_KEYS.exerciseMissedDay, next);
  }, [progressCtx, logsLoadedFor, plan.id, logsFrom]);

  useEffect(() => {
    fetch(`/api/exercise/log?planId=${plan.id}&date=${selectedIso}`)
      .then((r) => r.json())
      .then((res) => setSelectedLog({ completed: !!res.completed, completedItems: res.completedItems ?? [] }))
      .catch(() => setSelectedLog({ completed: false, completedItems: [] }));
  }, [plan.id, selectedIso, refreshKey]);

  const weekPlanData = useMemo(
    () => [...plan.planData].sort(
      (a, b) => CAL_WEEK_ORDER.indexOf(FA_WEEKDAY.indexOf(a.day)) - CAL_WEEK_ORDER.indexOf(FA_WEEKDAY.indexOf(b.day))
    ),
    [plan.planData]
  );
  // روزِ هفته‌ای که تمرینش واقعاً امروز/روزِ انتخاب‌شده نشان داده می‌شود —
  // در «رد شدن» همان روزِ تقویم، در «ماندن» ممکن است تمرینِ جامانده باشد.
  const effectiveSelectedDay = effectiveDayName(progressCtx, selectedIso);
  const effectiveTodayDay = effectiveDayName(progressCtx, todayIso);
  const carriedFrom = effectiveSelectedDay !== selectedDayName && planDays.has(effectiveSelectedDay) ? effectiveSelectedDay : null;
  const selectedDayPlan = plan.planData.find((d) => d.day === effectiveSelectedDay);
  const todayPlanForStats = plan.planData.find((d) => d.day === effectiveTodayDay);

  const sessionsDone = sessionsThisWeekDone(logs, now);
  const sessionsTotal = sessionsThisWeekTotal(plan.gymDays);
  const weekPct = weekProgressPct(plan.gymDays, logs, now);
  const todayLog = logs[todayIso];

  // وضعیتِ هر روزِ باشگاهِ همین هفته (شنبه‌شروع) برای «برنامه هفتگی» پایین:
  // «انجام دادی» اگه همون روز تمرین «تمام» ثبت شده، «وقتش گذشته» اگه روزش
  // بی‌تمام‌شدن گذشته. امروزِ ناتمام هنوز وضعیتی نداره (تا آخرِ روز وقت هست).
  const weekDayStatus = useMemo(() => {
    const out: Record<string, "done" | "missed"> = {};
    const start = startOfWeek(now);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoLocal(d);
      if (missedPref.mode === "stay") {
        // «ماندن»: تمرینِ جامانده «وقتش گذشته» نمی‌شود، فردا دوباره می‌آید —
        // فقط «انجام دادی» روی همان تمرینی که آن روز واقعاً نشان داده شد.
        const eff = effectiveDayName(progressCtx, iso);
        if (planDays.has(eff) && logs[iso]?.completed) out[eff] = "done";
        continue;
      }
      const name = weekdayOf(iso);
      if (!plan.planData.some((p) => p.day === name)) continue;
      if (logs[iso]?.completed) out[name] = "done";
      else if (iso < todayIso) out[name] = "missed";
    }
    return out;
  }, [logs, plan.planData, missedPref.mode, progressCtx, planDays]);
  const todayPct = todayProgressPct(todayPlanForStats?.items.length ?? 0, todayLog);

  // «این تجهیزات رو ندارم» — اول سه‌تا پیشنهاد آماده می‌گیریم (بدون سویچ
  // خودکار)، بعد خود کاربر از پاپ‌آپ یکیشون رو انتخاب می‌کنه.
  async function openSubstitutePicker(day: string, item: string) {
    setSubbingItem(item);
    setSubError(null);
    const res = await fetch("/api/exercise/plan/substitute", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, day, oldItem: item }),
    });
    const data = await res.json();
    setSubbingItem(null);
    if (res.ok) { setSubTarget({ day, oldItem: item }); setSubCandidates(data.candidates); }
    else setSubError(data.error || "خطا در جایگزینی");
  }

  async function applySubstitute(newItem: string) {
    if (!subTarget) return;
    setSubPicking(true);
    const res = await fetch("/api/exercise/plan/substitute", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, day: subTarget.day, oldItem: subTarget.oldItem, newItem }),
    });
    const data = await res.json();
    setSubPicking(false);
    if (res.ok) {
      onPlanChange(data.plan);
      setSubTarget(null);
      setSubCandidates(null);
    } else {
      setSubError(data.error || "خطا در جایگزینی");
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
        <DashDateSelector
          activeIso={selectedIso}
          onSelect={setSelectedIso}
          recenterKey={recenterKey}
          className="lg:order-2"
        />

        <div className="flex flex-wrap items-center gap-2 lg:order-1 lg:shrink-0 lg:flex-nowrap">
          <DashFilterButton
            label="تاریخچه"
            icon={<History size={15} />}
            active={!isSelectedToday}
            onClick={() => setHistoryPickerOpen(true)}
          />
          <DashFilterButton
            label="امروز"
            icon={<Calendar size={15} />}
            active={isSelectedToday}
            onClick={() => { setSelectedIso(todayIso); setRecenterKey((k) => k + 1); }}
          />
        </div>
      </div>

      {subError && <div className="field-error-msg" style={{ display: "block" }}>{subError}</div>}

      {/* وقتی جلسه‌ی تمرین فعاله، صفحه کاملا روی خود برنامه‌ی تمرینی
          متمرکز می‌شه (تمام‌عرض، بدون کارت‌های کناری و بدون برنامه‌ی هفتگی
          پایین صفحه) — با پایان تمرین دوباره چیدمان سه‌بخشی عادی برمی‌گرده.
          این جابه‌جایی قبلا با `layout` (FLIP) و `AnimatePresence mode="popLayout"`
          انیمیت می‌شد: یعنی framer-motion دقیقا همون لحظه‌ی «شروع تمرین»
          مجبور بود موقعیت/اندازه‌ی همه‌ی کارت‌های گرید رو قبل و بعد اندازه
          بگیره و نیم‌ثانیه انیمیتشون کنه — همون لگ گزارش‌شده‌ی شروع تمرین و
          داغ‌شدن گوشی. حالا فقط کلاس گرید عوض می‌شه. ExerciseTaskList همچنان
          همون یک نمونه‌ست (نه دو تای شرطی) تا با تغییر چیدمان، state ی
          داخلیش (تایمر، آیتم‌های تیک‌خورده) از دست نره. */}
      <div
        className={
          sessionActive
            ? "flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_1fr] lg:items-start lg:gap-6"
            : "flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_0.8fr_1fr] lg:items-stretch lg:gap-6"
        }
      >
        <ExerciseTaskList
          planId={plan.id}
          dayPlan={selectedDayPlan}
          dateIso={selectedIso}
          editable={isSelectedToday}
          title={
            (isSelectedToday ? "برنامه تمرینی" : `برنامه تمرینی ${selectedDayName}`) +
            (carriedFrom ? ` (جامانده از ${carriedFrom})` : "")
          }
          restDayLabel={isSelectedToday ? "امروز روز استراحته — چیزی برنامه‌ریزی نشده." : "این روز، روز باشگاه برنامه نیست."}
          initialCompleted={!!selectedLog?.completed}
          initialCompletedItems={selectedLog?.completedItems ?? []}
          onSubstitute={openSubstitutePicker}
          substitutingItem={subbingItem}
          onSessionEnd={() => setRefreshKey((k) => k + 1)}
          onStarted={() => setRefreshKey((k) => k + 1)}
          onAddProgram={() => setAddProgramOpen(true)}
          onActiveChange={setSessionActive}
          delay={0.05}
        />

        {/* «مشاهده حرکات» طبق درخواست صریح کاربر، وقتی تمرین شروع می‌شه هم
            باید بمونه (نه فقط قبل از شروع) — فقط آمار/دوستان و برنامه‌ی هفتگی
            پایین صفحه‌ان که توی حالت تمرکز روی جلسه مخفی می‌شن. */}
        <div className="order-3 lg:order-2">
          <ExerciseCatalogCard delay={0.1} />
        </div>

        {!sessionActive && (
          <div className="order-2 flex flex-col gap-4 sm:gap-6 lg:order-3">
            {dashboardPrefs.showFriends && <DashFriendsCard delay={0.15} module="exercise" unitLabel="جلسه" />}
            <ExerciseStatsCard sessionsDone={sessionsDone} sessionsTotal={sessionsTotal} todayPct={todayPct} weekPct={weekPct} delay={0.2} />
          </div>
        )}
      </div>

      {!sessionActive && <ExerciseWeekGrid planData={weekPlanData} todayName={effectiveTodayDay} dayStatus={weekDayStatus} />}

      {historyPickerOpen && (
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={() => setHistoryPickerOpen(false)} />
          <div className="modal-panel dash-scope open">
            <div className="modal-head">
              <div className="modal-title">انتخاب تاریخ</div>
              <button className="nav-close" onClick={() => setHistoryPickerOpen(false)} aria-label="بستن">×</button>
            </div>
            <div className="modal-body">
              <HistoryCalendar onPick={(iso) => { pickDate(iso); setHistoryPickerOpen(false); }} />
            </div>
          </div>
        </>
      )}

      {addProgramOpen && (
        <AddExerciseProgramForm
          onClose={() => setAddProgramOpen(false)}
          onCreated={(newPlan) => { onPlanChange(newPlan); setAddProgramOpen(false); setRefreshKey((k) => k + 1); }}
        />
      )}

      {subTarget && subCandidates && (
        <ExerciseSubstitutePicker
          oldItem={subTarget.oldItem}
          candidates={subCandidates}
          picking={subPicking}
          onPick={applySubstitute}
          onClose={() => { setSubTarget(null); setSubCandidates(null); }}
        />
      )}
    </div>
  );
}
