// دیتابیس محلی آفلاین‌فرست (Dexie/IndexedDB) — معادل موبایلِ چهار موجودیتِ
// اصلیِ وب: DailyEntry، Task، SleepEntry، UserSetting (prisma/schema.prisma).
//
// هر ردیف سه فیلدِ مشترک داره که لایه‌ی سینک (mobile/src/sync، جداگانه
// توسعه داده می‌شه) بهشون نیاز داره:
//   - updatedAt: ISO — هر بارِ نوشتنِ محلی آپدیت می‌شه
//   - deletedAt: ISO|null — soft delete؛ هیچ‌وقت رکورد واقعا پاک نمی‌شه
//   - dirty: 0|1 — 1 یعنی «تغییرِ نوشته‌نشده به سرور»، سینک بعدا با
//     getDirty/markClean (در syncHooks.ts) اینا رو صفر می‌کنه.
import Dexie, { Table } from "dexie";

export interface DailyEntryRow {
  date: string; // YYYY-MM-DD — کلید اصلی، معادل @@unique([userId, date]) وب
  completedItems: Record<string, boolean>; // معادل DailyEntry.completedItems (Json)
  wakeUpAt: string | null; // ISO
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
}

export type TaskPriority = "low" | "medium" | "high";

export interface TaskRow {
  id: string; // newId()
  title: string;
  notes: string | null;
  dueDate: string | null; // YYYY-MM-DD
  priority: TaskPriority;
  completedAt: string | null; // ISO — null یعنی انجام‌نشده
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
}

export interface SleepEntryRow {
  date: string; // YYYY-MM-DD — کلید اصلی
  sleptAt: string | null; // ISO
  wokeAt: string | null; // ISO
  targetSleptAt: string | null; // "HH:mm"
  targetWokeAt: string | null; // "HH:mm"
  quality: number | null; // 1..5
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
}

export interface SettingRow {
  key: string; // کلید اصلی — معادل UserSetting.key
  value: unknown; // Json
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
}

class ArionDB extends Dexie {
  dailyEntries!: Table<DailyEntryRow, string>;
  tasks!: Table<TaskRow, string>;
  sleepEntries!: Table<SleepEntryRow, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super("arion-mobile");
    this.version(1).stores({
      dailyEntries: "date, updatedAt, dirty, deletedAt",
      tasks: "id, dueDate, updatedAt, dirty, deletedAt",
      sleepEntries: "date, updatedAt, dirty, deletedAt",
      settings: "key, updatedAt, dirty, deletedAt",
    });
  }
}

export const db = new ArionDB();

/** شناسه‌ی محلی برای رکوردهای جدید (Task و…). قالبش باید با اعتبارسنجیِ
 *  سرور (isValidClientId در lib/mobileSync.ts: `^[a-z][a-z0-9]{19,31}$`)
 *  جور باشه، چون همین id عینا push می‌شه: پیشوندِ 'm' + ۳۱ کاراکترِ hexِ
 *  کوچک (بدونِ خط‌تیره) = ۳۲ کاراکتر. */
export function newId(): string {
  let hex = "";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    hex = crypto.randomUUID().replace(/-/g, "");
  } else {
    while (hex.length < 32) hex += Math.floor(Math.random() * 16).toString(16);
  }
  return "m" + hex.toLowerCase().slice(0, 31);
}

export function nowIso(): string {
  return new Date().toISOString();
}
