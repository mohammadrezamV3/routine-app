import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import OccurrenceRow from "@/components/OccurrenceRow";
import OccurrenceActionsSheet from "@/components/OccurrenceActionsSheet";
import AddOccurrenceSheet from "@/components/AddOccurrenceSheet";
import MoveOccurrenceSheet from "@/components/MoveOccurrenceSheet";
import WeekDayStrip from "@/components/WeekDayStrip";
import JalaliMonthGrid, { DayMark } from "@/components/JalaliMonthGrid";
import DayDetailSheet from "@/components/DayDetailSheet";
import PullToRefresh from "@/components/PullToRefresh";
import { useSync } from "@/sync/SyncProvider";
import { isoLocal, jalaliMonthLength, jalaliToGregorianApprox, toJalali } from "@/lib/jalali";
import { tasksForDate, ScheduleOpts } from "@/lib/schedule";
import { DEFAULT_SLEEP, DEFAULT_WAKE } from "@/lib/wakeSleepLogic";
import { Occ } from "@/lib/occurrenceTypes";
import {
  useCustomOccurrences, useRemovedOccurrences, useDaily, useDailyRange,
  useOutingDates, useWakeSleepTimes, toggleDailyTask, deleteOccurrence,
} from "@/db/repo";

type RoutineTab = "today" | "weekly" | "calendar";

const now = new Date();
const todayIso = isoLocal(now);
const jNow = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

function occFromOccurrence(customOcc: ReturnType<typeof useCustomOccurrences>, id: string, jsDay: number, time: string): Occ {
  const found = (customOcc ?? []).find((c) => c.id === id);
  return { id, jsDay, time, custom: !!found, importance: found?.importance, tag: found?.tag };
}

export default function Routine() {
  const { loggedIn, syncNow } = useSync();
  const [tab, setTab] = useState<RoutineTab>("today");
  const customOcc = useCustomOccurrences();
  const removedOcc = useRemovedOccurrences();
  const wakeSleep = useWakeSleepTimes();
  const wake = wakeSleep?.wake ?? DEFAULT_WAKE;
  const sleep = wakeSleep?.sleep ?? DEFAULT_SLEEP;

  const scheduleOpts: ScheduleOpts = useMemo(
    () => ({ removedOccurrences: new Set(removedOcc ?? []), customOccurrences: customOcc ?? [] }),
    [removedOcc, customOcc]
  );

  const [actionsFor, setActionsFor] = useState<{ occ: Occ; name: string } | null>(null);
  const [editing, setEditing] = useState<{ occ: Occ; name: string } | null | undefined>(undefined);
  const [moving, setMoving] = useState<{ occ: Occ; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultIso, setAddDefaultIso] = useState<string | undefined>(undefined);

  const [weeklyIso, setWeeklyIso] = useState(todayIso);
  const [calYear, setCalYear] = useState(jNow[0]);
  const [calMonth, setCalMonth] = useState(jNow[1]);
  const [openDayIso, setOpenDayIso] = useState<string | null>(null);

  function openActions(id: string, jsDay: number, time: string, name: string) {
    setActionsFor({ occ: occFromOccurrence(customOcc, id, jsDay, time), name });
  }

  return (
    <div>
      <AppHeader title="روتین" />
      <PullToRefresh enabled={loggedIn} onRefresh={syncNow}>
      <main className="flex flex-col gap-4 px-4 pt-4" style={{ paddingBottom: 96 }}>
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "today", label: "امروز" },
            { value: "weekly", label: "هفتگی" },
            { value: "calendar", label: "تقویم" },
          ]}
        />

        {tab === "today" && <TodayTab scheduleOpts={scheduleOpts} onLongPress={openActions} />}
        {tab === "weekly" && (
          <WeeklyTab
            scheduleOpts={scheduleOpts}
            selectedIso={weeklyIso}
            onSelectIso={setWeeklyIso}
            onLongPress={openActions}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            scheduleOpts={scheduleOpts}
            year={calYear}
            month={calMonth}
            onNav={(y, m) => { setCalYear(y); setCalMonth(m); }}
            onSelectDay={(iso) => setOpenDayIso(iso)}
          />
        )}
      </main>
      </PullToRefresh>

      <button
        onClick={() => { setAddDefaultIso(tab === "weekly" ? weeklyIso : todayIso); setAddOpen(true); }}
        aria-label="افزودنِ برنامه"
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

      {addOpen && (
        <AddOccurrenceSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          scheduleOpts={scheduleOpts}
          defaultIso={addDefaultIso}
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
          sourceIso={tab === "weekly" ? weeklyIso : todayIso}
          scheduleOpts={scheduleOpts}
        />
      )}

      {openDayIso && (
        <DayDetailSheet
          open={!!openDayIso}
          onClose={() => setOpenDayIso(null)}
          date={new Date(openDayIso + "T00:00:00")}
          scheduleOpts={scheduleOpts}
          wake={wake}
          sleep={sleep}
        />
      )}
    </div>
  );
}

function TodayTab({
  scheduleOpts,
  onLongPress,
}: {
  scheduleOpts: ScheduleOpts;
  onLongPress: (id: string, jsDay: number, time: string, name: string) => void;
}) {
  const daily = useDaily(todayIso);
  const items = useMemo(() => tasksForDate(now, scheduleOpts), [scheduleOpts]);

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <div className="rounded-2xl px-3 py-6 text-center font-vazir text-[13px]" style={{ background: "var(--surface-1)", color: "var(--muted)" }}>
          برای امروز برنامه‌ای ثبت نشده
        </div>
      )}
      {items.map((t) => (
        <OccurrenceRow
          key={t.id}
          item={t}
          checked={!!daily?.tasks[t.id]}
          onToggle={() => toggleDailyTask(todayIso, t.id)}
          onLongPress={() => onLongPress(t.id, now.getDay(), t.time, t.name)}
        />
      ))}
    </div>
  );
}

function WeeklyTab({
  scheduleOpts,
  selectedIso,
  onSelectIso,
  onLongPress,
}: {
  scheduleOpts: ScheduleOpts;
  selectedIso: string;
  onSelectIso: (iso: string) => void;
  onLongPress: (id: string, jsDay: number, time: string, name: string) => void;
}) {
  const selectedDate = useMemo(() => new Date(selectedIso + "T00:00:00"), [selectedIso]);
  const daily = useDaily(selectedIso);
  const items = useMemo(() => tasksForDate(selectedDate, scheduleOpts), [selectedDate, scheduleOpts]);
  const isFuture = selectedIso > todayIso;

  return (
    <div className="flex flex-col gap-4">
      <WeekDayStrip selectedIso={selectedIso} onSelect={onSelectIso} />
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="rounded-2xl px-3 py-6 text-center font-vazir text-[13px]" style={{ background: "var(--surface-1)", color: "var(--muted)" }}>
            برای این روز برنامه‌ای ثبت نشده
          </div>
        )}
        {items.map((t) => (
          <OccurrenceRow
            key={t.id}
            item={t}
            checked={!!daily?.tasks[t.id]}
            disabled={isFuture}
            onToggle={() => toggleDailyTask(selectedIso, t.id)}
            onLongPress={() => onLongPress(t.id, selectedDate.getDay(), t.time, t.name)}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarTab({
  scheduleOpts,
  year,
  month,
  onNav,
  onSelectDay,
}: {
  scheduleOpts: ScheduleOpts;
  year: number;
  month: number;
  onNav: (y: number, m: number) => void;
  onSelectDay: (iso: string) => void;
}) {
  const monthLen = jalaliMonthLength(month);
  const firstIso = isoLocal(jalaliToGregorianApprox(year, month, 1));
  const lastIso = isoLocal(jalaliToGregorianApprox(year, month, monthLen));
  const entries = useDailyRange(firstIso, lastIso);
  const outingDates = useOutingDates();

  const marks: Record<string, DayMark> = {};
  if (entries) {
    for (let d = 1; d <= monthLen; d++) {
      const gd = jalaliToGregorianApprox(year, month, d);
      const iso = isoLocal(gd);
      const expected = tasksForDate(gd, scheduleOpts);
      if (expected.length === 0 || iso > todayIso) continue;
      const rec = entries[iso];
      const doneCount = rec ? expected.filter((t) => rec.tasks[t.id]).length : 0;
      marks[iso] = doneCount === expected.length ? "done" : "missed";
    }
  }

  return (
    <div className="rounded-card p-4" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}>
      <JalaliMonthGrid
        year={year}
        month={month}
        onNav={onNav}
        onSelect={onSelectDay}
        todayIso={todayIso}
        marks={marks}
        outingDates={new Set(outingDates ?? [])}
      />
      <div className="mt-3 flex items-center gap-4 font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} /> کامل</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--pnl-loss)" }} /> ناقص</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--secondary)" }} /> بیرون رفتن</span>
      </div>
    </div>
  );
}
