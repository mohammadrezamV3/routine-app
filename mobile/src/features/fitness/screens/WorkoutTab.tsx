import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Flame, Repeat, Sparkles, Trash2 } from "lucide-react";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { fitnessDb } from "../db";
import { archivePlan, getLogsForPlan, toggleTodayItem } from "../lib/repo";
import { fitnessRoutePaths } from "../routes";
import { FA_WEEKDAY, isoLocal } from "../lib/jalali";
import { stripSetSuffix } from "../lib/exerciseSets";
import { computeDayFocus } from "../lib/exerciseCatalogUtils";
import { logsByDate, sessionsThisWeekDone, sessionsThisWeekTotal, computeExerciseStreak } from "../lib/stats";
import { Card, SectionTitle, EmptyState, OnlineFeatureButton } from "../components/ui";
import SetTrackerSheet from "../components/SetTrackerSheet";
import SubstituteSheet from "../components/SubstituteSheet";
import type { ExercisePlanRow } from "../lib/exerciseTypes";

const WEEK_ORDER = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export default function WorkoutTab() {
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const now = new Date();
  const todayIso = isoLocal(now);
  const todayName = FA_WEEKDAY[now.getDay()];

  const plan = useLiveQuery(
    async () => {
      const rows = await fitnessDb.plans.filter((p) => p.isActive && !p.deletedAt).sortBy("startDate");
      return rows[rows.length - 1] as ExercisePlanRow | undefined;
    },
    [],
    undefined
  );

  const logs = useLiveQuery(
    async () => (plan ? logsByDate(await getLogsForPlan(plan.id)) : {}),
    [plan?.id, plan?.updatedAt],
    {}
  );

  const [trackerItem, setTrackerItem] = useState<string | null>(null);
  const [substitute, setSubstitute] = useState<{ dayIndex: number; itemIndex: number; item: string } | null>(null);

  const todayDay = plan?.planData.find((d) => d.day === todayName);
  const todayLog = logs[todayIso];

  const orderedDays = useMemo(() => {
    if (!plan) return [];
    return [...plan.planData].sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day));
  }, [plan]);

  // computeDayFocus حالا async است (کاتالوگِ ۸۵KB dynamic import می‌شه) —
  // نتیجه‌ی هر روز یک‌بار محاسبه و کش می‌شه؛ تا لود شدن یک نقطه‌چین نشون داده می‌شه.
  const [dayFocuses, setDayFocuses] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(orderedDays.map((d) => computeDayFocus(d.items).then((focus) => [d.day, focus] as const))).then((pairs) => {
      if (!cancelled) setDayFocuses(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedDays]);

  const weekDone = plan ? sessionsThisWeekDone(logs, now) : 0;
  const weekTotal = plan ? sessionsThisWeekTotal(plan.gymDays) : 0;
  const streak = plan ? computeExerciseStreak(plan.gymDays, logs, now) : 0;

  if (!plan) {
    return (
      <div className="px-4 pb-24 pt-6">
        <EmptyState
          title="هنوز برنامه‌ی تمرینی نداری"
          note="یک برنامه‌ی آماده بساز یا خودت روزها و حرکات رو دستی بچین — همه‌چیز آفلاین کار می‌کنه."
          action={
            <div className="mt-2 flex w-full flex-col gap-2">
              <button
                onClick={() => navigate(fitnessRoutePaths.planNew)}
                className="rounded-xl font-vazir text-[14px] font-semibold"
                style={{ minHeight: 48, background: "var(--accent)", color: "#fff" }}
              >
                ساخت برنامه
              </button>
              <OnlineFeatureButton
                label="ساخت با هوش مصنوعی"
                online={online}
                onlineAction={() => navigate(fitnessRoutePaths.planAi)}
              />
            </div>
          }
        />
      </div>
    );
  }

  const dayItems = todayDay?.items ?? [];

  return (
    <div className="flex flex-col gap-5 px-4 pb-24 pt-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              پیشرفتِ این هفته
            </p>
            <p className="font-vazir text-[18px] font-bold" style={{ color: "var(--text)" }}>
              {weekDone} از {weekTotal} جلسه
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }}>
            <Flame size={14} color="var(--accent)" />
            <span className="font-vazir text-[13px] font-bold" style={{ color: "var(--text)" }}>
              {streak} روز
            </span>
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle
          action={
            <button
              onClick={() => navigate(fitnessRoutePaths.catalog)}
              className="font-vazir text-[12px]"
              style={{ color: "var(--accent)", minHeight: 32 }}
            >
              کاتالوگ حرکات
            </button>
          }
        >
          برنامه‌ی هفتگی
        </SectionTitle>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {orderedDays.map((d) => {
            const iso = dayIsoOfThisWeek(d.day, now);
            const done = logs[iso]?.completed;
            const isToday = d.day === todayName;
            return (
              <div
                key={d.day}
                className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2.5"
                style={{
                  minWidth: 76,
                  background: isToday ? "var(--accent-dim)" : "var(--surface-1)",
                  border: `1px solid ${isToday ? "var(--accent)" : "var(--surface-line)"}`,
                }}
              >
                <span className="font-vazir text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                  {d.day}
                </span>
                <span className="font-vazir text-[10px]" style={{ color: "var(--muted)" }}>
                  {dayFocuses[d.day] ?? "…"}
                </span>
                {done && <Check size={14} color="var(--accent)" />}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle>{todayDay ? `تمرینِ امروز — ${todayDay.focus}` : "امروز روزِ استراحته"}</SectionTitle>
        {!todayDay && (
          <Card>
            <p className="text-center font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              برای «{todayName}» حرکتی در برنامه نیست.
            </p>
          </Card>
        )}
        <div className="flex flex-col gap-2">
          {dayItems.map((item, itemIndex) => {
            const baseName = stripSetSuffix(item);
            const checked = todayLog?.completedItems?.includes(baseName) ?? false;
            return (
              <div
                key={`${item}-${itemIndex}`}
                className="flex items-center gap-2 rounded-xl p-3"
                style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
              >
                <button
                  onClick={() => {
                    void tapHaptic();
                    void toggleTodayItem(plan.id, todayIso, baseName, dayItems.length);
                  }}
                  aria-label="تیک انجام‌شده"
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: 30,
                    height: 30,
                    background: checked ? "var(--accent)" : "var(--surface-2)",
                    border: checked ? "none" : "1px solid var(--surface-line)",
                  }}
                >
                  {checked && <Check size={16} color="#fff" />}
                </button>
                <button
                  onClick={() => setTrackerItem(item)}
                  className="min-w-0 flex-1 text-start font-vazir text-[13.5px]"
                  style={{ color: "var(--text)", textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}
                >
                  {item}
                </button>
                <button
                  onClick={() => setSubstitute({ dayIndex: plan.planData.indexOf(todayDay!), itemIndex, item })}
                  aria-label="جایگزینِ حرکت"
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 40, height: 40, background: "var(--surface-2)" }}
                >
                  <Repeat size={15} color="var(--muted)" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => navigate(fitnessRoutePaths.planNew)}
        className="flex items-center justify-center gap-1.5 rounded-xl font-vazir text-[13px] font-medium"
        style={{ minHeight: 46, background: "var(--surface-2)", color: "var(--text)" }}
      >
        <Sparkles size={14} />
        ساختِ برنامه‌ی جدید
      </button>
      <button
        onClick={async () => {
          await archivePlan(plan.id);
          void tapHaptic();
        }}
        className="flex items-center justify-center gap-1.5 rounded-xl font-vazir text-[13px] font-medium"
        style={{ minHeight: 46, background: "transparent", color: "var(--pnl-loss)" }}
      >
        <Trash2 size={14} />
        آرشیوِ این برنامه
      </button>

      {plan && trackerItem && (
        <SetTrackerSheet
          open={!!trackerItem}
          onClose={() => setTrackerItem(null)}
          planId={plan.id}
          date={todayIso}
          item={trackerItem}
        />
      )}
      {plan && substitute && (
        <SubstituteSheet
          open={!!substitute}
          onClose={() => setSubstitute(null)}
          planId={plan.id}
          dayIndex={substitute.dayIndex}
          itemIndex={substitute.itemIndex}
          item={substitute.item}
          otherItemsToday={dayItems.filter((_, i) => i !== substitute.itemIndex)}
        />
      )}
    </div>
  );
}

/** روزِ تقویمیِ این هفته که با اسمِ روزِ فارسیِ داده‌شده مطابقت داره (برای علامت‌گذاریِ جدولِ هفتگی). */
function dayIsoOfThisWeek(dayName: string, now: Date): string {
  const targetIdx = FA_WEEKDAY.indexOf(dayName);
  const start = new Date(now);
  const diff = (now.getDay() - targetIdx + 7) % 7;
  start.setDate(now.getDate() - diff);
  return isoLocal(start);
}
