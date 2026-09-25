import { useMemo, useState } from "react";
import { Plus, Moon, Sun } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ProgressRing from "@/components/ProgressRing";
import StreakFlame from "@/components/StreakFlame";
import OccurrenceRow from "@/components/OccurrenceRow";
import OccurrenceActionsSheet from "@/components/OccurrenceActionsSheet";
import AddOccurrenceSheet from "@/components/AddOccurrenceSheet";
import MoveOccurrenceSheet from "@/components/MoveOccurrenceSheet";
import QuickAddTaskSheet from "@/components/QuickAddTaskSheet";
import SleepLogSheet from "@/components/SleepLogSheet";
import { faNum, isoLocal, J_MONTHS, toJalali } from "@/lib/jalali";
import { tasksForDate } from "@/lib/schedule";
import { DEFAULT_SLEEP, DEFAULT_WAKE, isWakeOnTime, timeToMinutes } from "@/lib/wakeSleepLogic";
import { Occ } from "@/lib/occurrenceTypes";
import { tapHaptic } from "@/lib/haptics";
import {
  useCustomOccurrences, useRemovedOccurrences, useDaily, useStreak, useWeekStats,
  useTasks, useWakeSleepTimes, toggleDailyTask, toggleTaskDone, deleteOccurrence,
} from "@/db/repo";

const now = new Date();
const todayIso = isoLocal(now);
const jToday = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

function greeting(): string {
  const h = now.getHours();
  if (h < 5) return "شبِ بخیر";
  if (h < 12) return "صبح بخیر";
  if (h < 18) return "ظهر بخیر";
  return "عصر بخیر";
}

export default function Dashboard() {
  const customOcc = useCustomOccurrences();
  const removedOcc = useRemovedOccurrences();
  const daily = useDaily(todayIso);
  const streak = useStreak();
  const weekStats = useWeekStats();
  const tasks = useTasks();
  const wakeSleep = useWakeSleepTimes();

  const [actionsFor, setActionsFor] = useState<{ occ: Occ; name: string } | null>(null);
  const [editing, setEditing] = useState<{ occ: Occ; name: string } | null | undefined>(undefined);
  const [moving, setMoving] = useState<{ occ: Occ; name: string } | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);

  const scheduleOpts = useMemo(
    () => ({ removedOccurrences: new Set(removedOcc ?? []), customOccurrences: customOcc ?? [] }),
    [removedOcc, customOcc]
  );

  const todayOccurrences = useMemo(() => tasksForDate(now, scheduleOpts), [scheduleOpts]);
  const openTasks = (tasks ?? []).filter((t) => !t.completedAt && (!t.dueDate || t.dueDate <= todayIso));
  const todayTasks = (tasks ?? []).filter((t) => t.dueDate === todayIso);

  const occDone = todayOccurrences.filter((t) => !!daily?.tasks[t.id]).length;
  const taskDone = todayTasks.filter((t) => !!t.completedAt).length;
  const totalCount = todayOccurrences.length + todayTasks.length;
  const doneCount = occDone + taskDone;
  const pct = totalCount > 0 ? doneCount / totalCount : 0;

  const wake = wakeSleep?.wake ?? DEFAULT_WAKE;
  const sleep = wakeSleep?.sleep ?? DEFAULT_SLEEP;
  const wakeMinutes = timeToMinutes(wake);

  function occFromOccurrence(id: string, jsDay: number, time: string): Occ {
    const found = (customOcc ?? []).find((c) => c.id === id);
    return { id, jsDay, time, custom: !!found, importance: found?.importance, tag: found?.tag };
  }

  return (
    <div>
      <AppHeader title="داشبورد" />
      <main className="flex flex-col gap-4 px-4 pt-4" style={{ paddingBottom: 96 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              {greeting()} 👋
            </div>
            <div className="mono text-[12.5px]" style={{ color: "var(--muted)" }}>
              {faNum(jToday[2])} {J_MONTHS[jToday[1] - 1]} {faNum(jToday[0])}
            </div>
          </div>
          <StreakFlame streak={streak} />
        </div>

        <div
          className="flex items-center gap-4 rounded-card p-4"
          style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
        >
          <ProgressRing pct={pct} size={76}>
            <span className="font-vazir text-[15px] font-bold" style={{ color: "var(--text)" }}>
              {faNum(Math.round(pct * 100))}٪
            </span>
          </ProgressRing>
          <div className="flex-1">
            <div className="font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
              پیشرفتِ امروز
            </div>
            <div className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              {faNum(doneCount)} از {faNum(totalCount)} کار انجام شده
            </div>
          </div>
        </div>

        <button
          onClick={() => setSleepOpen(true)}
          className="flex items-center gap-3 rounded-card p-4 text-start"
          style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
        >
          <span className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: "rgba(var(--accent-rgb),.14)" }}>
            {daily?.wake ? <Sun size={20} color="var(--accent)" /> : <Moon size={20} color="var(--accent)" />}
          </span>
          <div className="flex-1">
            <div className="font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
              {daily?.wake ? "بیداری ثبت شده" : "بیداری هنوز ثبت نشده"}
            </div>
            <div className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
              {daily?.wake
                ? `${new Date(daily.wake).getHours().toString().padStart(2, "0")}:${new Date(daily.wake).getMinutes().toString().padStart(2, "0")} — ${isWakeOnTime(daily.wake, wakeMinutes) ? "به‌موقع" : "دیرتر از هدف"}`
                : `هدف: خواب ${sleep} — بیداری ${wake}`}
            </div>
          </div>
        </button>

        {weekStats && (
          <div className="rounded-card p-4" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}>
            <div className="mb-3 font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>این هفته</div>
            <div className="flex items-end justify-between gap-2" style={{ height: 56 }}>
              {weekStats.map((s) => (
                <div key={s.iso} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-full"
                    style={{ height: Math.max(6, (s.pct / 100) * 40), background: s.iso === todayIso ? "var(--accent)" : "var(--surface-line)" }}
                  />
                  <span className="font-vazir text-[10.5px]" style={{ color: "var(--muted)" }}>{s.short}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>کارهای امروز</div>
          </div>
          <div className="flex flex-col gap-2">
            {todayOccurrences.map((t) => (
              <OccurrenceRow
                key={t.id}
                item={t}
                checked={!!daily?.tasks[t.id]}
                onToggle={() => toggleDailyTask(todayIso, t.id)}
                onLongPress={() => setActionsFor({ occ: occFromOccurrence(t.id, now.getDay(), t.time), name: t.name })}
              />
            ))}
            {openTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => { void tapHaptic(); void toggleTaskDone(t.id); }}
                className="flex items-center gap-3 rounded-2xl px-3 text-start"
                style={{ minHeight: 56, background: "var(--surface-1)", border: "1px dashed var(--surface-line)" }}
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 26, height: 26, border: "2px solid var(--surface-line)", flexShrink: 0 }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-vazir text-[14px]" style={{ color: "var(--text)" }}>{t.title}</div>
                  <div className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>کارِ آزاد</div>
                </div>
              </button>
            ))}
            {!todayOccurrences.length && !openTasks.length && (
              <div className="rounded-2xl px-3 py-6 text-center font-vazir text-[13px]" style={{ background: "var(--surface-1)", color: "var(--muted)" }}>
                برای امروز کاری تعریف نشده — با دکمه‌ی + یکی اضافه کن
              </div>
            )}
          </div>
        </div>
      </main>

      <button
        onClick={() => setQuickAddOpen(true)}
        aria-label="افزودنِ سریع"
        className="fixed z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{
          width: 56, height: 56,
          insetInlineEnd: 20,
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          background: "var(--accent)", color: "var(--bg)",
        }}
      >
        <Plus size={26} />
      </button>

      <QuickAddTaskSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <SleepLogSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />

      {actionsFor && (
        <OccurrenceActionsSheet
          open={!!actionsFor}
          name={actionsFor.name}
          onClose={() => setActionsFor(null)}
          onEdit={() => { setEditing(actionsFor); setActionsFor(null); }}
          onMove={() => { setMoving(actionsFor); setActionsFor(null); }}
          onDelete={async () => {
            await deleteOccurrence(actionsFor.occ.id, actionsFor.occ.jsDay, !!actionsFor.occ.custom);
            setActionsFor(null);
          }}
        />
      )}

      {editing !== undefined && (
        <AddOccurrenceSheet
          open={!!editing}
          onClose={() => setEditing(undefined)}
          scheduleOpts={scheduleOpts}
          editing={editing}
        />
      )}

      {moving && (
        <MoveOccurrenceSheet
          open={!!moving}
          onClose={() => setMoving(null)}
          name={moving.name}
          occ={moving.occ}
          sourceIso={todayIso}
          scheduleOpts={scheduleOpts}
        />
      )}
    </div>
  );
}
