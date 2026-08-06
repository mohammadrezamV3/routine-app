"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, History, ListChecks, Plus } from "lucide-react";
import { FA_WEEKDAY, CAL_WEEK_ORDER, isoLocal, toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { WEEK_ORDER } from "@/lib/schedule";
import { LEVEL_LABELS, GOAL_LABELS } from "@/lib/exercisePlans";
import { ExercisePlan, PHASE_LABELS } from "@/lib/exerciseTypes";
import {
  fetchExerciseLogRange, sessionsThisWeekTotal, sessionsThisWeekDone,
  weekProgressPct, todayProgressPct, computeExerciseStreak, ExerciseLogRange,
} from "@/lib/exerciseStats";
import { DashHeader } from "./DashHeader";
import { DashDateSelector, DashDay } from "./DashDateSelector";
import { DashFilterButton } from "./DashFilterButton";
import { DashFriendsCard } from "./DashFriendsCard";
import { ExerciseStatsCard } from "./ExerciseStatsCard";
import { ExerciseReminderCard } from "./ExerciseReminderCard";
import { ExerciseTaskList } from "./ExerciseTaskList";
import { ExerciseWeekAccordion } from "./ExerciseWeekAccordion";
import { ExerciseCatalogModal } from "./ExerciseCatalogModal";
import { AddExerciseProgramForm } from "./AddExerciseProgramForm";
import { HistoryCalendar } from "./HistoryCalendar";

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
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);

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

  // ۹۰ روزِ گذشته کافیه هم برای «این‌هفته» هم برای استریک
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
  const todayPlanForStreak = plan.planData.find((d) => d.day === todayName);

  const sessionsDone = sessionsThisWeekDone(logs, now);
  const sessionsTotal = sessionsThisWeekTotal(plan.gymDays);
  const weekPct = weekProgressPct(plan.gymDays, logs, now);
  const todayLog = logs[todayIso];
  const todayPct = todayProgressPct(todayPlanForStreak?.items.length ?? 0, todayLog);
  const streak = computeExerciseStreak(plan.gymDays, (d) => FA_WEEKDAY[d.getDay()], logs, now);
  const todayIsGymDay = (plan.gymDays ?? []).includes(todayName);
  const todayDoneFlag = !!todayLog?.completed;

  async function substituteItem(day: string, item: string) {
    setSubbingItem(item);
    setSubError(null);
    const res = await fetch("/api/exercise/plan/substitute", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, day, oldItem: item }),
    });
    const data = await res.json();
    setSubbingItem(null);
    if (res.ok) onPlanChange(data.plan);
    else setSubError(data.error || "خطا در جایگزینی");
  }

  const levelLabel = plan.level === "custom" ? "برنامه‌ی شخصی" : LEVEL_LABELS[plan.level as keyof typeof LEVEL_LABELS];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <DashHeader progress={weekPct} title="برنامه بدنسازی" subtitle="برنامه‌ی تمرینی‌ات را دنبال و پیگیری کن." progressLabel="پیشرفت هفتگی" />

      <div className="section-note" style={{ margin: 0 }}>
        سطح: {levelLabel}{plan.goal && ` — هدف: ${GOAL_LABELS[plan.goal]}`}
        {plan.trainingPhase && plan.trainingPhase !== "none" && ` — دوره: ${PHASE_LABELS[plan.trainingPhase as keyof typeof PHASE_LABELS]}`}
        {!plan.generatedByAi && plan.level !== "custom" && " — (نسخه‌ی پایه، بدون هوش مصنوعی)"}
      </div>

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
          <DashFilterButton
            label="مشاهده حرکات"
            icon={<ListChecks size={15} />}
            active={catalogOpen}
            onClick={() => setCatalogOpen(true)}
          />
        </div>
      </div>

      {subError && <div className="field-error-msg" style={{ display: "block" }}>{subError}</div>}

      <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_0.8fr_1fr] lg:items-stretch lg:gap-6">
        <ExerciseTaskList
          planId={plan.id}
          dayPlan={selectedDayPlan}
          dateIso={selectedIso}
          editable={isSelectedToday}
          title={isSelectedToday ? "برنامه تمرینی امروز" : `برنامه تمرینیِ ${selectedDayName}`}
          restDayLabel={isSelectedToday ? "امروز روز استراحته — چیزی برنامه‌ریزی نشده." : "این روز، روزِ باشگاهِ برنامه نیست."}
          initialCompleted={!!selectedLog?.completed}
          initialCompletedItems={selectedLog?.completedItems ?? []}
          onSubstitute={substituteItem}
          substitutingItem={subbingItem}
          onSessionEnd={() => setRefreshKey((k) => k + 1)}
          delay={0.05}
        />

        <ExerciseReminderCard streak={streak} todayIsGymDay={todayIsGymDay} todayDone={todayDoneFlag} delay={0.1} />

        <div className="flex flex-col gap-4 sm:gap-6">
          <DashFriendsCard delay={0.12} module="exercise" unitLabel="جلسه" />
          <ExerciseStatsCard sessionsDone={sessionsDone} sessionsTotal={sessionsTotal} todayPct={todayPct} weekPct={weekPct} delay={0.15} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddProgramOpen(true)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-dash-green transition hover:brightness-110 sm:text-[13.5px]"
        >
          <Plus size={16} />
          افزودن برنامه ورزشی جدید
        </button>
      </div>

      <ExerciseWeekAccordion planData={weekPlanData} todayName={todayName} />

      {catalogOpen && <ExerciseCatalogModal onClose={() => setCatalogOpen(false)} />}

      {historyPickerOpen && (
        <>
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
    </div>
  );
}
