// نگاشتِ ردیف‌های محلی (Dexie — mobile/src/db/db.ts) ↔ شکل‌های قراردادِ سرور
// (mobile/src/lib/api-contract.ts). تفاوت‌ها:
//   • dailyEntry: completedItems/wakeUpAt ↔ tasks/wake
//   • task: priority "low|medium|high" ↔ عدد ۰..۱۰؛ dueDate "YYYY-MM-DD" ↔ ISOِ
//     نیمه‌شبِ UTC؛ deletedAt ↔ deleted (tombstone)
//   • sleepEntry: targetSleptAt/targetWokeAt محلی "HH:mm" (ساعتِ دیواری) ↔
//     ISOِ کامل روی سرور (ستونِ DateTime) — با تاریخِ همون روز و منطقه‌ی زمانیِ گوشی
//   • setting: value=null روی سرور ↔ deletedAt محلی
// در همه‌ی جهت‌ها، updatedAtِ محلی = editedAtِ سرور (زمانِ منطقیِ LWW).
import type {
  DailyEntryRecord,
  MobileSyncSettingKey,
  SettingRecord,
  SleepEntryRecord,
  SyncChange,
  TaskRecord,
} from "@/lib/api-contract";
import { MOBILE_SYNC_SETTING_KEYS } from "@/lib/api-contract";
import type { DailyEntryRow, SettingRow, SleepEntryRow, TaskPriority, TaskRow } from "@/db/db";
import type { EntityName } from "@/db/syncHooks";

// ─── کمکی‌ها ───────────────────────────────────────────────────────────

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

/** "HH:mm" روی تاریخِ date (ساعتِ محلیِ گوشی) → ISOِ UTC. ISO رو دست‌نخورده رد می‌کنه. */
export function hhmmToIso(date: string, v: string | null): string | null {
  if (!v) return null;
  const m = HHMM_RE.exec(v);
  if (!m) {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d, Number(m[1]), Number(m[2]), 0, 0).toISOString();
}

/** ISO → "HH:mm" به ساعتِ محلیِ گوشی */
export function isoToHhmm(v: string | null): string | null {
  if (!v) return null;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DD" → نیمه‌شبِ UTCِ همون روز (سرور dueDate رو DateTime نگه می‌داره) */
export function dateKeyToIso(v: string | null): string | null {
  if (!v) return null;
  if (DATE_RE.test(v)) return `${v}T00:00:00.000Z`;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function isoToDateKey(v: string | null): string | null {
  if (!v) return null;
  return DATE_RE.test(v.slice(0, 10)) ? v.slice(0, 10) : null;
}

const PRIORITY_TO_NUM: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };

export function priorityToNum(p: TaskPriority | undefined | null): number {
  return PRIORITY_TO_NUM[p ?? "medium"] ?? 1;
}

export function numToPriority(n: number): TaskPriority {
  if (n >= 2) return "high";
  if (n === 1) return "medium";
  return "low";
}

/** همون الگوی isValidClientId سرور (lib/mobileSync.ts) */
export function isValidClientId(id: string): boolean {
  return /^[a-z][a-z0-9]{19,31}$/.test(id);
}

const SETTING_KEYS = new Set<string>(MOBILE_SYNC_SETTING_KEYS);
export function isSyncedSettingKey(key: string): key is MobileSyncSettingKey {
  return SETTING_KEYS.has(key);
}

// ─── ریموت → محلی ──────────────────────────────────────────────────────

export function remoteDaily(r: DailyEntryRecord): DailyEntryRow {
  return {
    date: r.date,
    completedItems: r.tasks ?? {},
    wakeUpAt: r.wake ?? null,
    updatedAt: r.editedAt,
    deletedAt: null,
    dirty: 0,
  };
}

export function remoteSleep(r: SleepEntryRecord): SleepEntryRow {
  return {
    date: r.date,
    sleptAt: r.sleptAt ?? null,
    wokeAt: r.wokeAt ?? null,
    targetSleptAt: isoToHhmm(r.targetSleptAt),
    targetWokeAt: isoToHhmm(r.targetWokeAt),
    quality: r.quality ?? null,
    updatedAt: r.editedAt,
    deletedAt: null,
    dirty: 0,
  };
}

export function remoteTask(r: TaskRecord): TaskRow {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes ?? null,
    dueDate: isoToDateKey(r.dueDate),
    priority: numToPriority(r.priority),
    completedAt: r.completedAt ?? null,
    updatedAt: r.editedAt,
    deletedAt: r.deleted ? r.editedAt : null,
    dirty: 0,
  };
}

export function remoteSetting(r: SettingRecord): SettingRow {
  const value = r.value ?? null;
  return {
    key: r.key,
    value,
    updatedAt: r.editedAt,
    deletedAt: value === null ? r.editedAt : null,
    dirty: 0,
  };
}

// ─── محلی → تغییرِ push ────────────────────────────────────────────────

/**
 * ردیفِ dirtyِ محلی → SyncChange. null یعنی «این ردیف سینک‌شدنی نیست»
 * (مثلا کلیدِ تنظیماتی که سرور قبولش نداره) — محلی می‌مونه.
 */
export function toChange(entity: EntityName, row: any): SyncChange | null {
  const clientUpdatedAt: string = row.updatedAt;
  const deleted = !!row.deletedAt;
  switch (entity) {
    case "dailyEntries": {
      const r = row as DailyEntryRow;
      if (deleted) return { entity: "dailyEntry", key: r.date, op: "delete", clientUpdatedAt };
      return {
        entity: "dailyEntry",
        key: r.date,
        op: "upsert",
        data: { tasks: r.completedItems ?? {}, wake: r.wakeUpAt ?? null },
        clientUpdatedAt,
      };
    }
    case "sleepEntries": {
      const r = row as SleepEntryRow;
      if (deleted) return { entity: "sleepEntry", key: r.date, op: "delete", clientUpdatedAt };
      return {
        entity: "sleepEntry",
        key: r.date,
        op: "upsert",
        data: {
          sleptAt: r.sleptAt ?? null,
          wokeAt: r.wokeAt ?? null,
          targetSleptAt: hhmmToIso(r.date, r.targetSleptAt),
          targetWokeAt: hhmmToIso(r.date, r.targetWokeAt),
          quality: r.quality ?? null,
        },
        clientUpdatedAt,
      };
    }
    case "tasks": {
      const r = row as TaskRow;
      if (deleted) return { entity: "task", id: r.id, op: "delete", clientUpdatedAt };
      return {
        entity: "task",
        id: r.id,
        op: "upsert",
        data: {
          title: r.title,
          notes: r.notes ?? null,
          dueDate: dateKeyToIso(r.dueDate),
          priority: priorityToNum(r.priority),
          completedAt: r.completedAt ?? null,
        },
        clientUpdatedAt,
      };
    }
    case "settings": {
      const r = row as SettingRow;
      if (!isSyncedSettingKey(r.key)) return null;
      if (deleted || r.value === null || r.value === undefined) {
        return { entity: "setting", key: r.key, op: "delete", clientUpdatedAt };
      }
      return { entity: "setting", key: r.key, op: "upsert", data: { value: r.value }, clientUpdatedAt };
    }
  }
}

/** کلیدِ اصلیِ محلیِ یک ردیف */
export function localKey(entity: EntityName, row: any): string {
  return entity === "tasks" ? row.id : entity === "settings" ? row.key : row.date;
}
