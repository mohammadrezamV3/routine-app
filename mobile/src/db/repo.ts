// لایه‌ی رپازیتوری روی Dexie — معادلِ آفلاینِ lib/storage.ts + lib/wakeSleep.ts
// (وب)، به‌علاوه‌ی CRUD برای Task/SleepEntry. همه‌ی نوشتن‌ها updatedAt تازه +
// dirty=1 می‌ذارن تا لایه‌ی سینک بعدا بفهمه چی رو باید push کنه. هوک‌های
// useLiveQuery در انتهای فایل، برای این‌که هر صفحه‌ای که از یکی استفاده
// می‌کنه با نوشتنِ صفحه‌ی دیگه فورا rerender بشه (طبق قرارداد state مشترک
// در CLAUDE.md).
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId, nowIso, DailyEntryRow, TaskRow, SleepEntryRow } from "./db";
import { isoLocal } from "../lib/jalali";
import { CustomOccurrence } from "../lib/occurrenceTypes";
import { tasksForDate, computeDayStats, startOfWeek, WEEK_ORDER, ScheduleOpts, DayStats } from "../lib/schedule";
import { computeStreak } from "../lib/streak";
import { WakeSleepTimes } from "../lib/wakeSleepLogic";

// ───────────────────────────── settings (key→value) ─────────────────────────────

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  if (!row || row.deletedAt) return fallback;
  return (row.value as T) ?? fallback;
}

async function setSetting<T>(key: string, value: T): Promise<void> {
  const existing = await db.settings.get(key);
  await db.settings.put({
    key,
    value,
    updatedAt: nowIso(),
    deletedAt: null,
    dirty: 1,
  });
  void existing;
}

export async function getCustomOccurrences(): Promise<CustomOccurrence[]> {
  return getSetting<CustomOccurrence[]>("customOccurrences", []);
}
export async function setCustomOccurrences(arr: CustomOccurrence[]): Promise<void> {
  return setSetting("customOccurrences", arr);
}

export async function getRemovedOccurrences(): Promise<string[]> {
  return getSetting<string[]>("removedOccurrences", []);
}
export async function setRemovedOccurrences(arr: string[]): Promise<void> {
  return setSetting("removedOccurrences", arr);
}

export async function getOutingDates(): Promise<string[]> {
  return getSetting<string[]>("outingDates", []);
}
export async function toggleOutingDate(iso: string): Promise<string[]> {
  const current = await getOutingDates();
  const next = current.includes(iso) ? current.filter((d) => d !== iso) : [...current, iso];
  await setSetting("outingDates", next);
  return next;
}

export async function getWakeSleepTimes(): Promise<WakeSleepTimes | null> {
  return getSetting<WakeSleepTimes | null>("wakeSleepTimes", null);
}
export async function setWakeSleepTimes(v: WakeSleepTimes): Promise<void> {
  return setSetting("wakeSleepTimes", v);
}

/**
 * حذفِ یک occurrence — پورت از منطقِ حذفِ EditOccurrenceForm/ProgramCard وب:
 * اگر خودِ کاربر اضافه‌ش کرده (custom) از customOccurrences فیلتر می‌شه؛
 * وگرنه (که در این نسخه‌ی موبایل همیشه custom است، چون هیچ occurrence
 * پیش‌فرضی سخت‌کد نشده) به removedOccurrences اضافه می‌شه. هر دو مسیر نگه
 * داشته شده تا اگر بعدا occurrenceهای پیش‌فرض اضافه شدن، رفتار یکی بمونه.
 */
export async function deleteOccurrence(occId: string, jsDay: number, isCustom: boolean): Promise<void> {
  if (isCustom) {
    const custom = await getCustomOccurrences();
    await setCustomOccurrences(custom.filter((c) => c.id !== occId));
  } else {
    const removed = await getRemovedOccurrences();
    await setRemovedOccurrences([...removed, occId + "|" + jsDay]);
  }
}

async function scheduleOpts(): Promise<ScheduleOpts> {
  const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
  return { removedOccurrences: new Set(removed), customOccurrences: custom };
}

// ───────────────────────────── daily entries (روتین روزانه) ─────────────────────────────

export type DailyRecord = { tasks: Record<string, boolean>; wake: string | null };

const EMPTY_DAILY: DailyRecord = { tasks: {}, wake: null };

function rowToDaily(row: DailyEntryRow | undefined): DailyRecord {
  if (!row || row.deletedAt) return { ...EMPTY_DAILY };
  return { tasks: row.completedItems ?? {}, wake: row.wakeUpAt ?? null };
}

export async function getDaily(dateKey: string): Promise<DailyRecord> {
  return rowToDaily(await db.dailyEntries.get(dateKey));
}

export async function setDaily(dateKey: string, data: DailyRecord): Promise<void> {
  await db.dailyEntries.put({
    date: dateKey,
    completedItems: data.tasks,
    wakeUpAt: data.wake,
    updatedAt: nowIso(),
    deletedAt: null,
    dirty: 1,
  });
}

/** فقط وضعیتِ یک آیتم رو toggle می‌کنه — بدونِ این‌که بقیه‌ی روز رو بخونی/بنویسی. */
export async function toggleDailyTask(dateKey: string, taskId: string): Promise<DailyRecord> {
  const cur = await getDaily(dateKey);
  const next: DailyRecord = { ...cur, tasks: { ...cur.tasks, [taskId]: !cur.tasks[taskId] } };
  await setDaily(dateKey, next);
  return next;
}

export async function registerWakeNow(dateKey: string): Promise<DailyRecord> {
  const cur = await getDaily(dateKey);
  const next: DailyRecord = { ...cur, wake: new Date().toISOString() };
  await setDaily(dateKey, next);
  return next;
}

export async function getDailyRange(fromIso: string, toIso: string): Promise<Record<string, DailyRecord>> {
  const rows = await db.dailyEntries.where("date").between(fromIso, toIso, true, true).toArray();
  const out: Record<string, DailyRecord> = {};
  for (const row of rows) out[row.date] = rowToDaily(row);
  return out;
}

export async function listDailyKeys(): Promise<Set<string>> {
  const rows = await db.dailyEntries.filter((r) => !r.deletedAt).toArray();
  return new Set(rows.map((r) => r.date));
}

// ───────────────────────────── آمار مشتق‌شده (routineStats.ts وب) ─────────────────────────────

export async function getTodayStats(): Promise<DayStats> {
  const opts = await scheduleOpts();
  const today = new Date();
  const daily = await getDaily(isoLocal(today));
  return computeDayStats(today, opts, daily);
}

export type WeekDayStat = { jsDay: number; short: string; iso: string; pct: number };

export async function getWeekStats(): Promise<WeekDayStat[]> {
  const opts = await scheduleOpts();
  const start = startOfWeek(new Date());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  const entries = await getDailyRange(isoLocal(days[0]), isoLocal(days[6]));
  return days.map((d) => {
    const iso = isoLocal(d);
    const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
    const { pct } = computeDayStats(d, opts, entries[iso]);
    return { jsDay: d.getDay(), short: order.short, iso, pct };
  });
}

export type ImportantOccurrence = { id: string; name: string; jsDay: number; time: string; importance: "veryHigh" | "high"; notify: boolean };

export async function getImportantUpcoming(days = 2): Promise<ImportantOccurrence[]> {
  const opts = await scheduleOpts();
  const custom = opts.customOccurrences as CustomOccurrence[];
  const today = new Date();
  const result: ImportantOccurrence[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    for (const t of tasksForDate(d, opts)) {
      const occ = custom.find((c) => c.id === t.id);
      if (occ?.importance === "veryHigh" || occ?.importance === "high") {
        result.push({ id: t.id, name: t.name, jsDay: d.getDay(), time: t.time, importance: occ.importance, notify: occ.notify !== false });
      }
    }
  }
  return result;
}

export async function getStreak(): Promise<number> {
  const opts = await scheduleOpts();
  const now = new Date();
  const rangeEnd = new Date(now); rangeEnd.setDate(rangeEnd.getDate() - 1);
  const rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 90);
  const entries = await getDailyRange(isoLocal(rangeStart), isoLocal(rangeEnd));
  return computeStreak(entries, opts, now);
}

// ───────────────────────────── تسک‌های آزاد (Task model) ─────────────────────────────

export type TaskInput = {
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  priority?: TaskRow["priority"];
};

export async function listTasks(): Promise<TaskRow[]> {
  const rows = await db.tasks.filter((r) => !r.deletedAt).toArray();
  return rows.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
}

export async function addTask(input: TaskInput): Promise<TaskRow> {
  const row: TaskRow = {
    id: newId(),
    title: input.title,
    notes: input.notes ?? null,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? "medium",
    completedAt: null,
    updatedAt: nowIso(),
    deletedAt: null,
    dirty: 1,
  };
  await db.tasks.put(row);
  return row;
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: nowIso(), dirty: 1 });
}

export async function toggleTaskDone(id: string): Promise<void> {
  const row = await db.tasks.get(id);
  if (!row) return;
  await db.tasks.update(id, { completedAt: row.completedAt ? null : nowIso(), updatedAt: nowIso(), dirty: 1 });
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.update(id, { deletedAt: nowIso(), updatedAt: nowIso(), dirty: 1 });
}

// ───────────────────────────── خواب (SleepEntry model) ─────────────────────────────

export type SleepInput = Partial<Pick<SleepEntryRow, "sleptAt" | "wokeAt" | "targetSleptAt" | "targetWokeAt" | "quality">>;

export async function getSleepEntry(date: string): Promise<SleepEntryRow | null> {
  const row = await db.sleepEntries.get(date);
  return row && !row.deletedAt ? row : null;
}

/** بازه‌ی خواب — برای تاریخچه‌ی خواب (مثلا ۱۴ روزِ اخیر)، تازه‌ترین اول. */
export async function getSleepRange(fromIso: string, toIso: string): Promise<SleepEntryRow[]> {
  const rows = await db.sleepEntries.where("date").between(fromIso, toIso, true, true).toArray();
  return rows.filter((r) => !r.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
}

export async function setSleepEntry(date: string, patch: SleepInput): Promise<void> {
  const existing = await db.sleepEntries.get(date);
  await db.sleepEntries.put({
    date,
    sleptAt: patch.sleptAt ?? existing?.sleptAt ?? null,
    wokeAt: patch.wokeAt ?? existing?.wokeAt ?? null,
    targetSleptAt: patch.targetSleptAt ?? existing?.targetSleptAt ?? null,
    targetWokeAt: patch.targetWokeAt ?? existing?.targetWokeAt ?? null,
    quality: patch.quality ?? existing?.quality ?? null,
    updatedAt: nowIso(),
    deletedAt: null,
    dirty: 1,
  });
}

// ───────────────────────────── React hooks (useLiveQuery) ─────────────────────────────
// همه‌ی هوک‌ها مستقیم از repo میخونن، پس نوشتنِ هر صفحه (حتی BottomSheet یک
// تبِ دیگه) فورا در بقیه‌ی صفحات باز می‌شه — بدونِ context/state جدا.

export function useDaily(dateKey: string): DailyRecord | undefined {
  return useLiveQuery(() => getDaily(dateKey), [dateKey]);
}

export function useDailyRange(fromIso: string, toIso: string): Record<string, DailyRecord> | undefined {
  return useLiveQuery(() => getDailyRange(fromIso, toIso), [fromIso, toIso]);
}

export function useCustomOccurrences(): CustomOccurrence[] | undefined {
  return useLiveQuery(() => getCustomOccurrences(), []);
}

export function useRemovedOccurrences(): string[] | undefined {
  return useLiveQuery(() => getRemovedOccurrences(), []);
}

export function useOutingDates(): string[] | undefined {
  return useLiveQuery(() => getOutingDates(), []);
}

export function useWakeSleepTimes(): WakeSleepTimes | null | undefined {
  return useLiveQuery(() => getWakeSleepTimes(), []);
}

export function useTodayStats(): DayStats | undefined {
  return useLiveQuery(() => getTodayStats(), []);
}

export function useWeekStats(): WeekDayStat[] | undefined {
  return useLiveQuery(() => getWeekStats(), []);
}

export function useImportantUpcoming(days = 2): ImportantOccurrence[] | undefined {
  return useLiveQuery(() => getImportantUpcoming(days), [days]);
}

export function useStreak(): number | undefined {
  return useLiveQuery(() => getStreak(), []);
}

export function useTasks(): TaskRow[] | undefined {
  return useLiveQuery(() => listTasks(), []);
}

export function useSleepEntry(date: string): SleepEntryRow | null | undefined {
  return useLiveQuery(() => getSleepEntry(date), [date]);
}

export function useSleepRange(fromIso: string, toIso: string): SleepEntryRow[] | undefined {
  return useLiveQuery(() => getSleepRange(fromIso, toIso), [fromIso, toIso]);
}
