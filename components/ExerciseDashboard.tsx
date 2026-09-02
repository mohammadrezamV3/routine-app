"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, History } from "lucide-react";
import { FA_WEEKDAY, CAL_WEEK_ORDER, isoLocal, toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { WEEK_ORDER } from "@/lib/schedule";
import { ExercisePlan } from "@/lib/exerciseTypes";
import {
  fetchExerciseLogRange, sessionsThisWeekTotal, sessionsThisWeekDone,
  weekProgressPct, todayProgressPct, ExerciseLogRange,
} from "@/lib/exerciseStats";
import { DashDateSelector, DashDay } from "./DashDateSelector";
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

const now = new Date();
const todayIso = isoLocal(now);
const todayName = FA_WEEKDAY[now.getDay()];

export function ExerciseDashboard({
  plan,
  onPlanChange,
}: {
  plan: ExercisePlan;
  onPlanChange: (plan: ExercisePlan) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [dayWindow, setDayWindow] = useState(5);

  const [logs, setLogs] = useState<ExerciseLogRange>({});
  const [selectedLog, setSelectedLog] = useState<{ completed: boolean; completedItems: string[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [subbingItem, setSubbingItem] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [subTarget, setSubTarget] = useState<{ day: string; oldItem: string } | null>(null);
  const [subCandidates, setSubCandidates] = useState<string[] | null>(null);
  const [subPicking, setSubPicking] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const dashboardPrefs = useDashboardPrefs();

  const isSelectedToday = selectedIso === todayIso;

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedIso]);
  const selectedDayName = FA_WEEKDAY[selectedDate.getDay()];

  const dashDays: DashDay[] = useMemo(() => {
    const center = new Date(now);
    center.setDate(now.getDate() + weekOffset * dayWindow);
    return Array.from({ length: dayWindow }, (_, i) => {
      const d = new Date(center);
      d.setDate(center.getDate() - Math.floor(dayWindow / 2) + i);
      const iso = isoLocal(d);
      const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
      const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return { iso, weekday: order.name, dateLabel: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
    });
  }, [weekOffset, dayWindow]);

  function pickDate(iso: string) {
    setSelectedIso(iso);
    const [y, m, d] = iso.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    const diffDays = Math.round((picked.getTime() - now.getTime()) / 86400000);
    setWeekOffset(Math.round(diffDays / dayWindow));
  }

  // ۹۰ روز گذشته کافیه برای «این‌هفته»
  useEffect(() => {
    const start = new Date(now); start.setDate(start.getDate() - 90);
    fetchExerciseLogRange(plan.id, start, now).then(setLogs);
  }, [plan.id, refreshKey]);

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
  const selectedDayPlan = plan.planData.find((d) => d.day === selectedDayName);
  const todayPlanForStats = plan.planData.find((d) => d.day === todayName);

  const sessionsDone = sessionsThisWeekDone(logs, now);
  const sessionsTotal = sessionsThisWeekTotal(plan.gymDays);
  const weekPct = weekProgressPct(plan.gymDays, logs, now);
  const todayLog = logs[todayIso];
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
          days={dashDays}
          activeIso={selectedIso}
          onSelect={setSelectedIso}
          onPrevWeek={() => setWeekOffset((v) => v - 1)}
          onNextWeek={() => setWeekOffset((v) => v + 1)}
          onVisibleCountChange={setDayWindow}
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
            onClick={() => { setWeekOffset(0); setSelectedIso(todayIso); }}
          />
        </div>
      </div>

      {subError && <div className="field-error-msg" style={{ display: "block" }}>{subError}</div>}

      {/* وقتی سرور بدون کلید AI یا با خطای موقت گیت‌وی مواجه شده، بی‌صدا به
          قالب ایستا سقوط می‌کنه (route.ts) — قبلا کاربر هیچ‌راهی نداشت بفهمه
          برنامه‌ش واقعا با AI ساخته نشده. این پیام شفاف می‌کنه. */}
      {!plan.generatedByAi && (
        <div className="section-note">این برنامه با الگوی آماده ساخته شده، نه هوش مصنوعی — احتمالا موقتا سرویس AI در دسترس نبوده.</div>
      )}

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
          title={isSelectedToday ? "برنامه تمرینی" : `برنامه تمرینی ${selectedDayName}`}
          restDayLabel={isSelectedToday ? "امروز روز استراحته — چیزی برنامه‌ریزی نشده." : "این روز، روز باشگاه برنامه نیست."}
          initialCompleted={!!selectedLog?.completed}
          initialCompletedItems={selectedLog?.completedItems ?? []}
          onSubstitute={openSubstitutePicker}
          substitutingItem={subbingItem}
          onSessionEnd={() => setRefreshKey((k) => k + 1)}
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

      {!sessionActive && <ExerciseWeekGrid planData={weekPlanData} todayName={todayName} />}

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
