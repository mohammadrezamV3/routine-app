"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

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

  // ۹۰ روزِ گذشته کافیه برای «این‌هفته»
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

      {/* وقتی جلسه‌ی تمرین فعاله، صفحه کاملاً روی خودِ برنامه‌ی تمرینی
          متمرکز می‌شه (تمام‌عرض، بدونِ کارت‌های کناری و بدونِ برنامه‌ی هفتگی
          پایینِ صفحه) — با پایانِ تمرین دوباره چیدمانِ سه‌بخشیِ عادی برمی‌گرده.
          `layout` روی این container و ExerciseTaskList باعث می‌شه این
          جابه‌جاییِ اندازه/چیدمان با یک انیمیشنِ نرم (FLIP) اتفاق بیفته، نه
          یهویی. ExerciseTaskList همیشه همون یک نمونه‌ست (نه دو تا شرطی) تا
          با تغییرِ چیدمان، state ی داخلیش (تایمر، آیتم‌های تیک‌خورده) از
          دست نره. */}
      <motion.div
        layout
        transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
        className={
          sessionActive
            ? "flex flex-col gap-4 sm:gap-6"
            : "flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_0.8fr_1fr] lg:items-stretch lg:gap-6"
        }
      >
        <motion.div layout transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}>
          <ExerciseTaskList
            planId={plan.id}
            dayPlan={selectedDayPlan}
            dateIso={selectedIso}
            editable={isSelectedToday}
            title={isSelectedToday ? "برنامه تمرینی" : `برنامه تمرینیِ ${selectedDayName}`}
            restDayLabel={isSelectedToday ? "امروز روز استراحته — چیزی برنامه‌ریزی نشده." : "این روز، روزِ باشگاهِ برنامه نیست."}
            initialCompleted={!!selectedLog?.completed}
            initialCompletedItems={selectedLog?.completedItems ?? []}
            onSubstitute={substituteItem}
            substitutingItem={subbingItem}
            onSessionEnd={() => setRefreshKey((k) => k + 1)}
            onAddProgram={() => setAddProgramOpen(true)}
            onActiveChange={setSessionActive}
            delay={0.05}
          />
        </motion.div>

        <AnimatePresence>
          {!sessionActive && (
            <>
              <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <ExerciseCatalogCard delay={0.1} />
              </motion.div>

              <motion.div
                key="side"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 sm:gap-6"
              >
                <ExerciseStatsCard sessionsDone={sessionsDone} sessionsTotal={sessionsTotal} todayPct={todayPct} weekPct={weekPct} delay={0.15} />
                <DashFriendsCard delay={0.2} module="exercise" unitLabel="جلسه" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {!sessionActive && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
            <ExerciseWeekGrid planData={weekPlanData} todayName={todayName} />
          </motion.div>
        )}
      </AnimatePresence>

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
