// منطقِ خالصِ همگام‌سازیِ اپ موبایل (بدونِ دیتابیس) — تست‌پذیر در
// __tests__/mobileSync.test.ts. بخشِ دیتابیسی در lib/mobileSyncStore.ts.
//
// ─── قاعده‌ی تعارض: Last-Write-Wins با زمانِ ویرایشِ کلاینت ───────────────
//
// هر ردیفِ همگام‌شونده یک «زمانِ ویرایشِ مؤثر» (editedAt) داره:
//   • اگه آخرین نویسنده اپ موبایل بوده → همون clientUpdatedAtِ اون تغییر
//     (ستونِ syncEditedAt).
//   • اگه آخرین نویسنده وب بوده → updatedAt (زمانِ سرور در لحظه‌ی نوشتن).
//
// چرا دو ستونِ جدا و نه «updatedAt = زمانِ کلاینت»: updatedAt همزمان
// cursorِ pull هم هست. اگه یک ویرایشِ آفلاینِ دیروز با updatedAt=دیروز
// نوشته می‌شد، هر دستگاهی که از دیروز به بعد pull کرده بود هیچ‌وقت اون رو
// نمی‌دید. پس updatedAt همیشه زمانِ سرور می‌مونه (cursor درست کار می‌کنه) و
// زمانِ منطقیِ ویرایش جدا در syncEditedAt نگه داشته می‌شه.
//
// تشخیصِ «آخرین نویسنده موبایل بوده» بدونِ دست‌زدن به هیچ روتِ وب: نوشتنِ
// موبایل updatedAt و syncWrittenAt رو با *یک* مقدارِ یکسان ست می‌کنه (Prisma
// مقدارِ صریحِ @updatedAt رو محترم می‌شمره — روی Postgres واقعی تأیید شد).
// هر نوشتنِ وبِ بعدی updatedAt رو خودکار جلو می‌بره و برابری می‌شکنه.

import {
  MOBILE_SYNC_MAX_BATCH,
  MOBILE_SYNC_SETTING_KEYS,
  type DailyEntryData,
  type MobileSyncSettingKey,
  type SleepEntryData,
  type SyncEntity,
  type TaskData,
} from "@/lib/mobileApiContract";
import { parseIsoDate } from "@/lib/validate";
import { isUserSettingKey, MAX_SETTING_VALUE_BYTES } from "@/lib/userSettingKeys";

export { MOBILE_SYNC_MAX_BATCH };

/** حدِ پایینِ زمانِ معتبر — هر چیزی قبل از این، ساعتِ خرابِ گوشی یا ورودیِ ساختگیه */
export const MIN_CLIENT_TIME = Date.UTC(2020, 0, 1);
/** حدِ بالای تاریخ‌های داده‌ای (dueDate و …) */
const MAX_DATA_TIME = Date.UTC(2100, 0, 1);

/** همپوشانیِ cursor — پوششِ نوشتن‌هایی که timestampشون قبل از شروعِ pull بوده ولی بعدش commit شدن */
export const PULL_CURSOR_OVERLAP_MS = 5_000;
/** سقفِ ردیف به‌ازای هر موجودیت در یک پاسخِ pull */
export const PULL_PAGE_LIMIT = 1000;

export const MAX_DAILY_TASK_KEYS = 500; // هم‌سقفِ /api/tasks/daily
export const MAX_DAILY_TASK_KEY_LEN = 200;
export const MAX_TASK_TITLE = 200;
export const MAX_TASK_NOTES = 2000;
export const MAX_TASK_PRIORITY = 10;

const SYNC_SETTING_KEY_SET = new Set<string>(MOBILE_SYNC_SETTING_KEYS);

export function isMobileSyncSettingKey(key: unknown): key is MobileSyncSettingKey {
  // هم باید توی لیستِ فاز ۱ باشه هم توی allowlistِ عمومیِ تنظیماتِ کاربر —
  // کلیدِ سرور-مدیریت (pushSentLog و …) هیچ‌وقت از این راه رد نمی‌شه.
  return typeof key === "string" && SYNC_SETTING_KEY_SET.has(key) && isUserSettingKey(key);
}

// ─── زمان ─────────────────────────────────────────────────────────────────

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$/;

/** فقط ISO کامل با منطقه‌ی زمانی — نه هر چیزی که `new Date` بتونه حدس بزنه */
export function parseIsoDateTime(v: unknown): Date | null {
  if (typeof v !== "string" || v.length > 40 || !ISO_DATETIME_RE.test(v)) return null;
  // V8 «2026-02-31T…» رو بی‌صدا می‌بره به ۳ مارس — بخشِ تاریخ جدا سنجیده می‌شه
  if (!parseIsoDate(v.slice(0, 10))) return null;
  const d = new Date(v);
  const t = d.getTime();
  if (Number.isNaN(t) || t < MIN_CLIENT_TIME || t >= MAX_DATA_TIME) return null;
  return d;
}

/**
 * زمانِ ویرایشِ کلاینت → زمانِ قابل‌اعتماد برای LWW. آینده clamp می‌شه به
 * «حالا»: گوشی‌ای که ساعتش جلوئه نباید بتونه با یک timestampِ سالِ بعد
 * تا ابد برنده‌ی همه‌ی تعارض‌ها بمونه.
 */
export function clampClientTimestamp(raw: unknown, now: Date): Date | null {
  const d = parseIsoDateTime(raw);
  if (!d) return null;
  return d.getTime() > now.getTime() ? new Date(now.getTime()) : d;
}

export type SyncTimestamps = { updatedAt: Date; syncEditedAt: Date | null; syncWrittenAt: Date | null };

/** زمانِ منطقیِ آخرین ویرایشِ ردیفِ سرور (توضیحِ بالای فایل) */
export function effectiveEditedAt(row: SyncTimestamps): Date {
  if (row.syncEditedAt && row.syncWrittenAt && row.syncWrittenAt.getTime() === row.updatedAt.getTime()) {
    return row.syncEditedAt;
  }
  return row.updatedAt;
}

/**
 * تصمیمِ LWW. تساوی به نفعِ سرور (stale) — قطعی و بدونِ نوسان بینِ دو دستگاه.
 * ردیفِ ناموجود همیشه apply.
 */
export function decideLww(serverRow: SyncTimestamps | null, clientAt: Date): "apply" | "stale" {
  if (!serverRow) return "apply";
  return clientAt.getTime() > effectiveEditedAt(serverRow).getTime() ? "apply" : "stale";
}

/**
 * cursorِ پاسخِ pull.
 * - هیچ موجودیتی بریده نشده → زمانِ شروعِ pull منهای همپوشانی (ردیف‌های
 *   تکراری بی‌ضررن: کلاینت با editedAt دوباره‌کاری رو تشخیص می‌ده).
 * - بریده شده → آخرین updatedAtِ برگشتی در بریده‌ترین موجودیت منهای ۱ms،
 *   تا ردیف‌های هم‌میلی‌ثانیه‌ی مرزی گم نشن؛ چون این مقدار همیشه بزرگ‌تر از
 *   since قبلیه (مگر ۱۰۰۰ ردیف در یک میلی‌ثانیه)، حلقه‌ی بی‌پایان نمی‌سازه.
 */
export function computePullCursor(serverStart: Date, truncatedLastUpdatedAt: Date[]): { cursor: Date; hasMore: boolean } {
  if (truncatedLastUpdatedAt.length === 0) {
    return { cursor: new Date(serverStart.getTime() - PULL_CURSOR_OVERLAP_MS), hasMore: false };
  }
  const min = Math.min(...truncatedLastUpdatedAt.map((d) => d.getTime()));
  return { cursor: new Date(min - 1), hasMore: true };
}

// ─── شناسه‌ها ─────────────────────────────────────────────────────────────

/**
 * id تسک از خودِ گوشی میاد (ساختِ آفلاین). فقط الگوی cuid/cuid2 — حروفِ
 * کوچکِ لاتین و رقم، با حرف شروع، ۲۰ تا ۳۲ کاراکتر. مالکیت جدا در store
 * چک می‌شه؛ این فقط جلوی ورودیِ بدشکل رو می‌گیره.
 */
export function isValidClientId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z][a-z0-9]{19,31}$/.test(id);
}

// ─── اعتبارسنجیِ داده‌ی هر موجودیت ────────────────────────────────────────

type V<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nullableDateTime(v: unknown, field: string): V<Date | null> {
  if (v === null || v === undefined) return { ok: true, value: null };
  const d = parseIsoDateTime(v);
  return d ? { ok: true, value: d } : { ok: false, error: `${field}: زمان نامعتبر است` };
}

export type ParsedDailyData = { completedItems: Record<string, boolean>; wakeUpAt: Date | null };

export function validateDailyData(data: unknown): V<ParsedDailyData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی روز نامعتبر است" };
  const tasks = data.tasks ?? {};
  if (!isPlainObject(tasks)) return { ok: false, error: "tasks باید یک شیء باشد" };
  const entries = Object.entries(tasks);
  if (entries.length > MAX_DAILY_TASK_KEYS) return { ok: false, error: `حداکثر ${MAX_DAILY_TASK_KEYS} کلید مجاز است` };
  const completedItems: Record<string, boolean> = {};
  for (const [k, v] of entries) {
    if (k.length === 0 || k.length > MAX_DAILY_TASK_KEY_LEN) return { ok: false, error: "کلیدِ تسک نامعتبر است" };
    if (typeof v !== "boolean") return { ok: false, error: "مقدارِ هر تسک باید true/false باشد" };
    completedItems[k] = v;
  }
  const wake = nullableDateTime(data.wake, "wake");
  if (!wake.ok) return wake;
  return { ok: true, value: { completedItems, wakeUpAt: wake.value } };
}

export type ParsedSleepData = {
  sleptAt: Date | null;
  wokeAt: Date | null;
  targetSleptAt: Date | null;
  targetWokeAt: Date | null;
  quality: number | null;
};

export function validateSleepData(data: unknown): V<ParsedSleepData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی خواب نامعتبر است" };
  const out: Partial<ParsedSleepData> = {};
  for (const f of ["sleptAt", "wokeAt", "targetSleptAt", "targetWokeAt"] as const) {
    const r = nullableDateTime(data[f], f);
    if (!r.ok) return r;
    out[f] = r.value;
  }
  const q = data.quality;
  if (q !== null && q !== undefined && !(Number.isInteger(q) && (q as number) >= 1 && (q as number) <= 5)) {
    return { ok: false, error: "کیفیت خواب باید عددی بین ۱ تا ۵ باشد" };
  }
  out.quality = (q as number | null | undefined) ?? null;
  return { ok: true, value: out as ParsedSleepData };
}

export type ParsedTaskData = {
  title: string;
  notes: string | null;
  dueDate: Date | null;
  priority: number;
  completedAt: Date | null;
};

export function validateTaskData(data: unknown): V<ParsedTaskData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی تسک نامعتبر است" };
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > MAX_TASK_TITLE) return { ok: false, error: `عنوان باید ۱ تا ${MAX_TASK_TITLE} کاراکتر باشد` };
  let notes: string | null = null;
  if (data.notes !== null && data.notes !== undefined) {
    if (typeof data.notes !== "string" || data.notes.length > MAX_TASK_NOTES) {
      return { ok: false, error: `یادداشت حداکثر ${MAX_TASK_NOTES} کاراکتر است` };
    }
    notes = data.notes;
  }
  const priority = data.priority ?? 0;
  if (!Number.isInteger(priority) || (priority as number) < 0 || (priority as number) > MAX_TASK_PRIORITY) {
    return { ok: false, error: "اولویت نامعتبر است" };
  }
  const dueDate = nullableDateTime(data.dueDate, "dueDate");
  if (!dueDate.ok) return dueDate;
  const completedAt = nullableDateTime(data.completedAt, "completedAt");
  if (!completedAt.ok) return completedAt;
  return { ok: true, value: { title, notes, dueDate: dueDate.value, priority: priority as number, completedAt: completedAt.value } };
}

export function validateSettingValue(data: unknown): V<unknown> {
  if (!isPlainObject(data) || !("value" in data)) return { ok: false, error: "value لازم است" };
  const value = data.value ?? null;
  // همون سقفِ /api/settings/[key]
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_SETTING_VALUE_BYTES) {
    return { ok: false, error: "حجم مقدار بیش از حد مجاز است" };
  }
  return { ok: true, value };
}

// ─── تجزیه‌ی یک تغییرِ push ───────────────────────────────────────────────

export type ParsedChange =
  | { entity: "dailyEntry"; key: string; date: Date; op: "upsert"; data: ParsedDailyData; clientAt: Date }
  | { entity: "dailyEntry"; key: string; date: Date; op: "delete"; clientAt: Date }
  | { entity: "sleepEntry"; key: string; date: Date; op: "upsert"; data: ParsedSleepData; clientAt: Date }
  | { entity: "sleepEntry"; key: string; date: Date; op: "delete"; clientAt: Date }
  | { entity: "task"; id: string; op: "upsert"; data: ParsedTaskData; clientAt: Date }
  | { entity: "task"; id: string; op: "delete"; clientAt: Date }
  | { entity: "setting"; key: MobileSyncSettingKey; op: "upsert"; value: unknown; clientAt: Date }
  | { entity: "setting"; key: MobileSyncSettingKey; op: "delete"; clientAt: Date };

export type ParseChangeResult =
  | { ok: true; change: ParsedChange }
  | { ok: false; error: string; entity: SyncEntity | null; key?: string; id?: string };

const ENTITIES = new Set<SyncEntity>(["dailyEntry", "sleepEntry", "task", "setting"]);

export function parseSyncChange(raw: unknown, now: Date): ParseChangeResult {
  if (!isPlainObject(raw)) return { ok: false, error: "تغییر نامعتبر است", entity: null };
  const entity = raw.entity as SyncEntity;
  if (!ENTITIES.has(entity)) return { ok: false, error: "نوعِ موجودیت نامعتبر است", entity: null };

  const ref =
    entity === "task"
      ? { id: typeof raw.id === "string" ? raw.id.slice(0, 64) : undefined }
      : { key: typeof raw.key === "string" ? raw.key.slice(0, 64) : undefined };
  const fail = (error: string): ParseChangeResult => ({ ok: false, error, entity, ...ref });

  const op = raw.op;
  if (op !== "upsert" && op !== "delete") return fail("op باید upsert یا delete باشد");
  const clientAt = clampClientTimestamp(raw.clientUpdatedAt, now);
  if (!clientAt) return fail("clientUpdatedAt نامعتبر است");

  if (entity === "dailyEntry" || entity === "sleepEntry") {
    const date = parseIsoDate(raw.key);
    if (!date) return fail("key باید تاریخ YYYY-MM-DD باشد");
    const key = raw.key as string;
    if (op === "delete") return { ok: true, change: { entity, key, date, op, clientAt } };
    if (entity === "dailyEntry") {
      const d = validateDailyData(raw.data);
      if (!d.ok) return fail(d.error);
      return { ok: true, change: { entity, key, date, op, data: d.value, clientAt } };
    }
    const s = validateSleepData(raw.data);
    if (!s.ok) return fail(s.error);
    return { ok: true, change: { entity, key, date, op, data: s.value, clientAt } };
  }

  if (entity === "task") {
    if (!isValidClientId(raw.id)) return fail("شناسه‌ی تسک نامعتبر است");
    const id = raw.id;
    if (op === "delete") return { ok: true, change: { entity, id, op, clientAt } };
    const t = validateTaskData(raw.data);
    if (!t.ok) return fail(t.error);
    return { ok: true, change: { entity, id, op, data: t.value, clientAt } };
  }

  // setting
  if (!isMobileSyncSettingKey(raw.key)) return fail("کلید تنظیمات نامعتبر است");
  const key = raw.key;
  if (op === "delete") return { ok: true, change: { entity, key, op, clientAt } };
  const v = validateSettingValue(raw.data);
  if (!v.ok) return fail(v.error);
  return { ok: true, change: { entity, key, op, value: v.value, clientAt } };
}

// ─── سریال‌سازیِ ردیف‌ها برای پاسخ ─────────────────────────────────────────

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
/** ستون‌های @db.Date نیم‌شبِ UTC برمی‌گردن */
export function toIsoDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const meta = (r: SyncTimestamps) => ({ editedAt: effectiveEditedAt(r).toISOString(), updatedAt: r.updatedAt.toISOString() });

export function serializeDailyEntry(r: SyncTimestamps & { date: Date; completedItems: unknown; wakeUpAt: Date | null }) {
  const tasks = isPlainObject(r.completedItems) ? (r.completedItems as Record<string, boolean>) : {};
  return { date: toIsoDateKey(r.date), tasks, wake: iso(r.wakeUpAt), ...meta(r) };
}

export function serializeSleepEntry(
  r: SyncTimestamps & { date: Date; sleptAt: Date | null; wokeAt: Date | null; targetSleptAt: Date | null; targetWokeAt: Date | null; quality: number | null }
) {
  return {
    date: toIsoDateKey(r.date),
    sleptAt: iso(r.sleptAt),
    wokeAt: iso(r.wokeAt),
    targetSleptAt: iso(r.targetSleptAt),
    targetWokeAt: iso(r.targetWokeAt),
    quality: r.quality,
    ...meta(r),
  };
}

export function serializeTask(
  r: SyncTimestamps & { id: string; title: string; notes: string | null; dueDate: Date | null; priority: number; completedAt: Date | null; createdAt: Date; deletedAt: Date | null }
) {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    dueDate: iso(r.dueDate),
    priority: r.priority,
    completedAt: iso(r.completedAt),
    createdAt: r.createdAt.toISOString(),
    deleted: !!r.deletedAt,
    ...meta(r),
  };
}

export function serializeSetting(r: SyncTimestamps & { key: string; value: unknown }) {
  return { key: r.key as MobileSyncSettingKey, value: r.value ?? null, ...meta(r) };
}

export type { DailyEntryData, SleepEntryData, TaskData };
