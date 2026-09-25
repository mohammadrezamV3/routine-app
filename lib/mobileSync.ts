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
  TASK_PRIORITY_DEFAULT,
  EXERCISE_LOG_NOTES_MAX,
  EXERCISE_PLAN_LEVELS,
  EXERCISE_TRAINING_PHASES,
  type ExercisePlanLevel,
  type ExerciseTrainingPhase,
  type DailyEntryData,
  type DailyEntryRecord,
  type SleepEntryRecord,
  type MobileSyncSettingKey,
  type SleepEntryData,
  type SyncChangeResult,
  type SyncEntity,
  type TaskData,
} from "@/lib/mobileApiContract";
import { parseIsoDate, clampText } from "@/lib/validate";
import { FA_WEEKDAY } from "@/lib/jalali";
import {
  validateCalorieTargetInput,
  validateMealsPatch,
  type CalorieTargetInput,
  type MealsPatch,
} from "@/lib/calorieTargetRules";
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
/**
 * سقفِ ردیف برای موجودیت‌هایی که یک ردیفشون می‌تونه ~۱۰۰KB باشه (روزِ روتین با
 * ۵۰۰ کلید، لاگِ تمرین با ۵۰۰ حرکت، برنامه‌ی ۷×۵۰ حرکتی) — با ۱۰۰۰ ردیف، خودِ
 * خوندن از دیتابیس صدها مگابایت حافظه می‌گرفت، قبل از اینکه بودجه‌ی بایت برسه.
 */
export const PULL_PAGE_LIMIT_HEAVY = 200;
/** سقفِ تقریبیِ حجمِ JSONِ رکوردهای یک پاسخِ pull (کنارِ سقفِ ردیف) */
export const PULL_BYTE_BUDGET = 4 * 1024 * 1024;

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

/** یک رکوردِ سریال‌شده + زمانِ صفحه‌بندی‌اش (updatedAt، یا زمانِ مؤثر برای چک‌لیست) */
export type Stamped<T> = { at: Date; rec: T };

/**
 * بودجه‌ی بایت: رکوردها به ترتیبِ زمان جمع می‌شن؛ اولین رکوردی که جمع رو از
 * بودجه رد کنه (زمانش T) مرزِ صفحه‌ست. cursor = T−1ms یعنی همه‌ی رکوردهای
 * قبل از T (که جمعشون ≤ بودجه‌ست) می‌رن و T به بعد صفحه‌ی بعد میاد. اگه خودِ
 * اولین میلی‌ثانیه به‌تنهایی از بودجه بزرگ‌تر باشه، همه‌ی ردیف‌های همون
 * میلی‌ثانیه با هم می‌رن (cursor = T) — وگرنه cursor جلو نمی‌رفت و کلاینت
 * تا ابد همون صفحه‌ی خالی رو می‌گرفت. null = همه جا شد.
 */
export function byteBudgetCursor(items: { at: Date; size: number }[], budget: number): Date | null {
  const sorted = [...items].sort((a, b) => a.at.getTime() - b.at.getTime());
  let total = 0;
  for (const it of sorted) {
    total += it.size;
    if (total <= budget) continue;
    const t = it.at.getTime();
    return sorted[0].at.getTime() < t ? new Date(t - 1) : new Date(t);
  }
  return null;
}

/**
 * صفحه‌ی نهاییِ pull: اول مرزِ «سقفِ ردیف» (computePullCursor)، بعد مرزِ
 * «بودجه‌ی بایت» روی رکوردهای باقی‌مونده. هر کدوم بریده بشه hasMore=true و
 * فقط رکوردهای تا cursor برمی‌گردن؛ کلاینت با همون cursor ادامه می‌ده.
 */
export function paginatePull<G extends Record<string, Stamped<unknown>[]>>(
  serverStart: Date,
  groups: G,
  truncated: Date[],
  budget: number = PULL_BYTE_BUDGET
): { cursor: Date; hasMore: boolean; page: { [K in keyof G]: G[K][number]["rec"][] } } {
  let { cursor, hasMore } = computePullCursor(serverStart, truncated);
  const upTo = (limit: Date) => (rows: Stamped<unknown>[]) => rows.filter((r) => r.at.getTime() <= limit.getTime());
  let current: Record<string, Stamped<unknown>[]> = { ...groups };
  if (hasMore) current = Object.fromEntries(Object.entries(current).map(([k, rows]) => [k, upTo(cursor)(rows)]));

  const sizes = Object.values(current).flatMap((rows) => rows.map((r) => ({ at: r.at, size: Buffer.byteLength(JSON.stringify(r.rec)) })));
  const cut = byteBudgetCursor(sizes, budget);
  if (cut) {
    cursor = cut;
    hasMore = true;
    current = Object.fromEntries(Object.entries(current).map(([k, rows]) => [k, upTo(cut)(rows)]));
  }
  const page = Object.fromEntries(Object.entries(current).map(([k, rows]) => [k, rows.map((r) => r.rec)]));
  return { cursor, hasMore, page: page as { [K in keyof G]: G[K][number]["rec"][] } };
}

/** سقفِ ردیف: limit+1 خونده شده؛ اضافه بریده و زمانِ آخرین ردیفِ نگه‌داشته ثبت می‌شه */
export function trimPage<T extends { updatedAt: Date }>(rows: T[], limit: number, truncated: Date[]): T[] {
  if (rows.length <= limit) return rows;
  const kept = rows.slice(0, limit);
  truncated.push(kept[kept.length - 1].updatedAt);
  return kept;
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

// ─── منطقه‌ی زمانیِ کاربر (User.timezone) ────────────────────────────────

export const DEFAULT_USER_TIMEZONE = "Asia/Tehran"; // پیش‌فرضِ ستونِ User.timezone
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** IANAِ معتبر یا پیش‌فرض — مقدارِ خراب در دیتابیس نباید sync رو بشکنه */
export function safeTimezone(tz: unknown): string {
  if (typeof tz !== "string" || !tz) return DEFAULT_USER_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_USER_TIMEZONE;
  }
}

/** افستِ tz در لحظه‌ی t (میلی‌ثانیه، محلی منهای UTC) */
function tzOffsetMs(t: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(t));
  const g = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(t / 1000) * 1000;
}

/**
 * ساعتِ دیواریِ "HH:mm" روی روزِ dateKey در منطقه‌ی tz → لحظه‌ی UTC.
 * دو پاس: افستِ لحظه‌ی حدسی با افستِ لحظه‌ی واقعی در روزِ تغییرِ ساعت فرق داره.
 */
export function zonedHhmmToUtc(dateKey: string, hhmm: string, tz: string): Date | null {
  const m = HHMM_RE.exec(hhmm);
  const day = parseIsoDate(dateKey);
  if (!m || !day) return null;
  const wall = day.getTime() + (Number(m[1]) * 60 + Number(m[2])) * 60_000;
  let t = wall - tzOffsetMs(wall, tz);
  t = wall - tzOffsetMs(t, tz);
  return new Date(t);
}

/** لحظه‌ی UTC → "HH:mm" به ساعتِ tz */
export function utcToZonedHhmm(d: Date | null, tz: string): string | null {
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  return `${g("hour")}:${g("minute")}`;
}

/** هدفِ خواب: لحظه‌ی کامل، یا "HH:mm" که store با تاریخِ روز و User.timezone حلش می‌کنه */
export type SleepTargetInput = Date | { hhmm: string } | null;

export type ParsedSleepData = {
  sleptAt: Date | null;
  wokeAt: Date | null;
  targetSleptAt: SleepTargetInput;
  targetWokeAt: SleepTargetInput;
  quality: number | null;
};

/** تبدیلِ هدف‌های "HH:mm" به UTC با منطقه‌ی زمانیِ کاربر */
export function resolveSleepTargets(data: ParsedSleepData, dateKey: string, tz: string) {
  const resolve = (v: SleepTargetInput): Date | null => (v === null || v instanceof Date ? v : zonedHhmmToUtc(dateKey, v.hhmm, tz));
  return { ...data, targetSleptAt: resolve(data.targetSleptAt), targetWokeAt: resolve(data.targetWokeAt) };
}

export function validateSleepData(data: unknown): V<ParsedSleepData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی خواب نامعتبر است" };
  const out: Partial<ParsedSleepData> = {};
  for (const f of ["sleptAt", "wokeAt"] as const) {
    const r = nullableDateTime(data[f], f);
    if (!r.ok) return r;
    out[f] = r.value;
  }
  for (const f of ["targetSleptAt", "targetWokeAt"] as const) {
    const v = data[f];
    if (typeof v === "string" && HHMM_RE.test(v)) {
      out[f] = { hhmm: v };
      continue;
    }
    const r = nullableDateTime(v, f);
    if (!r.ok) return { ok: false, error: `${f}: "HH:mm" یا زمانِ ISO لازم است` };
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

/**
 * dueDate روزِ تقویمیه نه لحظه: "YYYY-MM-DD" (یا برای سازگاری ISOِ کامل، که
 * فقط روزِ UTCش نگه داشته می‌شه) → نیمه‌شبِ UTCِ همون روز.
 */
export function parseDueDate(v: unknown): V<Date | null> {
  if (v === null || v === undefined) return { ok: true, value: null };
  const day = parseIsoDate(v);
  if (day) return { ok: true, value: day };
  const d = parseIsoDateTime(v);
  if (!d) return { ok: false, error: "dueDate باید YYYY-MM-DD باشد" };
  return { ok: true, value: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) };
}

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
  // نگاشت: TASK_PRIORITY در قرارداد (0 low، 1 medium، 2 high)؛ نبودش = medium
  const priority = data.priority ?? TASK_PRIORITY_DEFAULT;
  if (!Number.isInteger(priority) || (priority as number) < 0 || (priority as number) > MAX_TASK_PRIORITY) {
    return { ok: false, error: "اولویت نامعتبر است" };
  }
  const dueDate = parseDueDate(data.dueDate);
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

// ─── فاز ۴: بدنسازی و کالری ───────────────────────────────────────────────
// سقف‌ها همون روت‌های وب‌ان (/api/exercise/*، /api/calorie/*)؛ جایی که وب
// اصلا سقف نداشت (برنامه‌ی دستی) یک سقفِ معقول گذاشته شده.

export const MAX_EXERCISE_LOG_ITEMS = 500; // هم‌سقفِ /api/exercise/log
export const MAX_EXERCISE_ITEM_LEN = 200;
export const MAX_PLAN_DAYS = 7;
export const MAX_PLAN_ITEMS_PER_DAY = 50;
export const MAX_PLAN_FOCUS_LEN = 100;
export const MAX_FOOD_NAME_LEN = 80; // clampTextِ /api/calorie/log
export const MAX_FOOD_GRAMS = 10000;
export const MAX_FOOD_KCAL = 100000;
export const MAX_MACRO_G = 2000;
export const MAX_MEAL_TYPE_LEN = 20;

export type ParsedExerciseDay = { day: string; focus: string; items: string[] };

export function validatePlanDays(v: unknown): V<ParsedExerciseDay[]> {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PLAN_DAYS) {
    return { ok: false, error: `برنامه باید ۱ تا ${MAX_PLAN_DAYS} روز داشته باشد` };
  }
  const seen = new Set<string>();
  const out: ParsedExerciseDay[] = [];
  for (const d of v) {
    if (!isPlainObject(d) || typeof d.day !== "string" || !FA_WEEKDAY.includes(d.day)) return { ok: false, error: "روز نامعتبر در برنامه" };
    if (seen.has(d.day)) return { ok: false, error: `روز «${d.day}» بیش از یک بار آمده` };
    seen.add(d.day);
    if (!Array.isArray(d.items) || d.items.length === 0 || d.items.length > MAX_PLAN_ITEMS_PER_DAY) {
      return { ok: false, error: `هر روز ۱ تا ${MAX_PLAN_ITEMS_PER_DAY} حرکت` };
    }
    const items: string[] = [];
    for (const it of d.items) {
      if (typeof it !== "string" || !it.trim() || it.length > MAX_EXERCISE_ITEM_LEN) return { ok: false, error: "نام حرکت نامعتبر است" };
      items.push(it.trim());
    }
    if (d.focus !== undefined && d.focus !== null && (typeof d.focus !== "string" || d.focus.length > MAX_PLAN_FOCUS_LEN)) {
      return { ok: false, error: "تمرکزِ روز نامعتبر است" };
    }
    out.push({ day: d.day, focus: (typeof d.focus === "string" && d.focus.trim()) || "برنامه‌ی شخصی", items });
  }
  return { ok: true, value: out };
}

/**
 * متادیتای اختیاریِ برنامه (ExercisePlanMeta در قرارداد). فقط فیلدهای فرستاده‌شده
 * در خروجی هستن — undefined یعنی «دست نزن» (ویرایش) یا «پیش‌فرض» (ساخت).
 * سقف‌ها آینه‌ی lib/exercisePlanGeneration.ts (POST /api/exercise/plan).
 */
export type ParsedExercisePlanMeta = {
  level?: ExercisePlanLevel;
  goal?: string | null;
  equipment?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  trainingMonth?: number | null;
  trainingPhase?: ExerciseTrainingPhase;
  hasPhysicalLimitation?: boolean;
  gymDays?: string[];
};

export const MAX_PLAN_GOAL_LEN = 200;
export const MAX_PLAN_EQUIPMENT_LEN = 500;

export function validateExercisePlanMeta(data: Record<string, unknown>): V<ParsedExercisePlanMeta> {
  const out: ParsedExercisePlanMeta = {};
  if (data.level !== undefined) {
    if (!(EXERCISE_PLAN_LEVELS as readonly unknown[]).includes(data.level)) return { ok: false, error: "سطح نامعتبر است" };
    out.level = data.level as ExercisePlanLevel;
  }
  if (data.trainingPhase !== undefined) {
    if (!(EXERCISE_TRAINING_PHASES as readonly unknown[]).includes(data.trainingPhase)) return { ok: false, error: "فازِ تمرین نامعتبر است" };
    out.trainingPhase = data.trainingPhase as ExerciseTrainingPhase;
  }
  for (const [f, max, label] of [
    ["goal", MAX_PLAN_GOAL_LEN, "هدف تمرین"],
    ["equipment", MAX_PLAN_EQUIPMENT_LEN, "تجهیزات"],
  ] as const) {
    const v = data[f];
    if (v === undefined) continue;
    if (v === null) {
      out[f] = null;
      continue;
    }
    if (typeof v !== "string" || v.trim().length > max) return { ok: false, error: `${label} نامعتبر است` };
    out[f] = v.trim() || null;
  }
  for (const [f, min, max, int, label] of [
    ["heightCm", 50, 260, true, "قد"],
    ["weightKg", 20, 400, false, "وزن"],
    ["trainingMonth", 1, 600, true, "ماه تمرین"],
  ] as const) {
    const v = data[f];
    if (v === undefined) continue;
    if (v === null) {
      out[f] = null;
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) {
      return { ok: false, error: `${label} معتبر نیست` };
    }
    out[f] = v;
  }
  if (data.hasPhysicalLimitation !== undefined) {
    if (typeof data.hasPhysicalLimitation !== "boolean") return { ok: false, error: "hasPhysicalLimitation باید true/false باشد" };
    out.hasPhysicalLimitation = data.hasPhysicalLimitation;
  }
  if (data.gymDays !== undefined) {
    const g = data.gymDays;
    if (!Array.isArray(g) || g.length === 0 || g.length > 7 || !g.every((d) => typeof d === "string" && FA_WEEKDAY.includes(d))) {
      return { ok: false, error: "روزهای باشگاه نامعتبر است" };
    }
    out.gymDays = [...new Set(g as string[])];
  }
  return { ok: true, value: out };
}

export type ParsedExercisePlanData = { planData: ParsedExerciseDay[]; isActive: boolean; rulesAccepted: boolean; meta: ParsedExercisePlanMeta };

export function validateExercisePlanData(data: unknown): V<ParsedExercisePlanData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی برنامه نامعتبر است" };
  const days = validatePlanDays(data.planData);
  if (!days.ok) return days;
  if (typeof data.isActive !== "boolean") return { ok: false, error: "isActive باید true/false باشد" };
  const meta = validateExercisePlanMeta(data);
  if (!meta.ok) return meta;
  return { ok: true, value: { planData: days.value, isActive: data.isActive, rulesAccepted: data.rulesAccepted === true, meta: meta.value } };
}

/** notes: undefined = دست نزن، null = پاک کن */
export type ParsedExerciseLogData = { completed: boolean; completedItems: string[]; notes?: string | null };

export function validateExerciseLogData(data: unknown): V<ParsedExerciseLogData> {
  if (!isPlainObject(data) || typeof data.completed !== "boolean") return { ok: false, error: "completed باید true/false باشد" };
  const items = data.completedItems ?? [];
  if (!Array.isArray(items) || items.length > MAX_EXERCISE_LOG_ITEMS) {
    return { ok: false, error: `حداکثر ${MAX_EXERCISE_LOG_ITEMS} حرکت` };
  }
  for (const it of items) {
    if (typeof it !== "string" || it.length > MAX_EXERCISE_ITEM_LEN) return { ok: false, error: "نام حرکت نامعتبر است" };
  }
  let notes: string | null | undefined;
  if (data.notes === null) notes = null;
  else if (data.notes !== undefined) {
    if (typeof data.notes !== "string" || data.notes.trim().length > EXERCISE_LOG_NOTES_MAX) {
      return { ok: false, error: `یادداشت حداکثر ${EXERCISE_LOG_NOTES_MAX} کاراکتر است` };
    }
    notes = data.notes.trim() || null;
  }
  return { ok: true, value: { completed: data.completed, completedItems: items as string[], ...(notes !== undefined ? { notes } : {}) } };
}

/** کلیدِ لاگِ تمرین: `${planId}|YYYY-MM-DD` */
export function parseExerciseLogKey(key: unknown): { planId: string; date: Date; key: string } | null {
  if (typeof key !== "string" || key.length > 64) return null;
  const [planId, day, extra] = key.split("|");
  if (extra !== undefined || !isValidClientId(planId)) return null;
  const date = parseIsoDate(day);
  return date ? { planId, date, key } : null;
}

export type ParsedFoodLogData = {
  date: Date;
  customName: string;
  customCalories: number;
  grams: number;
  mealType: string | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  aiScanned: boolean;
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function validateFoodLogData(data: unknown): V<ParsedFoodLogData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی غذا نامعتبر است" };
  const date = parseIsoDate(data.date);
  if (!date) return { ok: false, error: "تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)" };
  const name = typeof data.customName === "string" ? data.customName.trim() : "";
  if (!name) return { ok: false, error: "اسم غذا لازم است" };
  // وب هم customCalories=0 رو «ناقص» حساب می‌کنه
  if (!finite(data.customCalories) || data.customCalories <= 0 || data.customCalories > MAX_FOOD_KCAL) {
    return { ok: false, error: "کالری نامعتبر است" };
  }
  if (!finite(data.grams) || data.grams <= 0 || data.grams > MAX_FOOD_GRAMS) return { ok: false, error: "مقدار (گرم) نامعتبر است" };
  let mealType: string | null = null;
  if (data.mealType !== undefined && data.mealType !== null && data.mealType !== "") {
    if (typeof data.mealType !== "string" || data.mealType.length > MAX_MEAL_TYPE_LEN) return { ok: false, error: "نوع وعده نامعتبر است" };
    mealType = data.mealType;
  }
  // درشت‌مغذی‌ها: یا هر سه (عدد ۰ تا ۲۰۰۰) یا هیچ‌کدوم — همون قاعده‌ی وب
  const macros = [data.proteinG, data.carbsG, data.fatG];
  const present = macros.filter((m) => m !== undefined && m !== null);
  if (present.length !== 0 && present.length !== 3) return { ok: false, error: "درشت‌مغذی‌ها باید هر سه با هم باشند" };
  if (present.length === 3 && !macros.every((m) => finite(m) && m >= 0 && m <= MAX_MACRO_G)) {
    return { ok: false, error: "مقادیر درشت‌مغذی نامعتبره" };
  }
  const hasMacros = present.length === 3;
  return {
    ok: true,
    value: {
      date,
      customName: clampText(name, MAX_FOOD_NAME_LEN),
      customCalories: data.customCalories,
      grams: data.grams,
      mealType,
      proteinG: hasMacros ? (data.proteinG as number) : null,
      carbsG: hasMacros ? (data.carbsG as number) : null,
      fatG: hasMacros ? (data.fatG as number) : null,
      // مثل وب: aiScanned فقط وقتی معنی داره که درشت‌مغذی‌ها اومده باشن
      aiScanned: hasMacros && data.aiScanned === true,
    },
  };
}

export type ParsedCalorieTargetData = { kind: "compute"; input: CalorieTargetInput } | { kind: "meals"; patch: MealsPatch };

export function validateCalorieTargetData(data: unknown): V<ParsedCalorieTargetData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی هدف کالری نامعتبر است" };
  if (data.kind === "compute") {
    const r = validateCalorieTargetInput(data);
    return r.ok ? { ok: true, value: { kind: "compute", input: r.value } } : r;
  }
  if (data.kind === "meals") {
    const r = validateMealsPatch(data);
    return r.ok ? { ok: true, value: { kind: "meals", patch: r.value } } : r;
  }
  return { ok: false, error: "kind باید compute یا meals باشد" };
}

// ─── رودمپ: پیشرفت ────────────────────────────────────────────────────────

export const MAX_ROADMAP_PROGRESS_KEYS = 50;

export type ParsedRoadmapProgressChange = {
  entity: "roadmapProgress";
  id: string;
  op: "upsert";
  stepProgress: Record<string, true>;
  clientAt: Date;
};

/**
 * جدا از parseSyncChange چون ذخیره‌اش در lib/mobileRoadmap.ts است (نه
 * mobileSyncStore). اینجا فقط شکل؛ حذفِ کلیدهای مرحله‌ی ناموجود بعدا با
 * sanitizeStepProgress روی خودِ مراحلِ رودمپ انجام می‌شه.
 */
export function parseRoadmapProgressChange(
  raw: unknown,
  now: Date
): { ok: true; change: ParsedRoadmapProgressChange } | { ok: false; error: string; entity: "roadmapProgress"; id?: string } {
  const r = isPlainObject(raw) ? raw : {};
  const id = typeof r.id === "string" ? r.id.slice(0, 64) : undefined;
  const fail = (error: string) => ({ ok: false as const, error, entity: "roadmapProgress" as const, id });
  if (!isValidClientId(r.id)) return fail("شناسه‌ی رودمپ نامعتبر است");
  if (r.op !== "upsert") return fail("فقط upsert پشتیبانی می‌شود");
  const clientAt = clampClientTimestamp(r.clientUpdatedAt, now);
  if (!clientAt) return fail("clientUpdatedAt نامعتبر است");
  const sp = isPlainObject(r.data) ? r.data.stepProgress : undefined;
  if (!isPlainObject(sp)) return fail("stepProgress باید یک شیء باشد");
  const entries = Object.entries(sp);
  if (entries.length > MAX_ROADMAP_PROGRESS_KEYS) return fail("تعداد مرحله‌ها بیش از حد است");
  const stepProgress: Record<string, true> = {};
  for (const [k, v] of entries) {
    if (!/^\d{1,3}$/.test(k) || typeof v !== "boolean") return fail("stepProgress نامعتبر است");
    if (v) stepProgress[k] = true;
  }
  return { ok: true, change: { entity: "roadmapProgress", id: r.id as string, op: "upsert", stepProgress, clientAt } };
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
  | { entity: "setting"; key: MobileSyncSettingKey; op: "delete"; clientAt: Date }
  | { entity: "exercisePlan"; id: string; op: "upsert"; data: ParsedExercisePlanData; clientAt: Date }
  | { entity: "exerciseLog"; key: string; planId: string; date: Date; op: "upsert"; data: ParsedExerciseLogData; clientAt: Date }
  | { entity: "exerciseLog"; key: string; planId: string; date: Date; op: "delete"; clientAt: Date }
  | { entity: "foodLogEntry"; id: string; op: "upsert"; data: ParsedFoodLogData; clientAt: Date }
  | { entity: "foodLogEntry"; id: string; op: "delete"; clientAt: Date }
  | { entity: "calorieTarget"; id: string; op: "upsert"; data: ParsedCalorieTargetData; clientAt: Date };

export type ParseChangeResult =
  | { ok: true; change: ParsedChange }
  | { ok: false; error: string; entity: SyncEntity | null; key?: string; id?: string };

const ENTITIES = new Set<SyncEntity>([
  "dailyEntry",
  "sleepEntry",
  "task",
  "setting",
  "exercisePlan",
  "exerciseLog",
  "foodLogEntry",
  "calorieTarget",
]);
/** موجودیت‌هایی که با id (نه key) شناخته می‌شن */
const ID_ENTITIES = new Set<SyncEntity>(["task", "exercisePlan", "foodLogEntry", "calorieTarget"]);

export function parseSyncChange(raw: unknown, now: Date): ParseChangeResult {
  if (!isPlainObject(raw)) return { ok: false, error: "تغییر نامعتبر است", entity: null };
  const entity = raw.entity as SyncEntity;
  if (!ENTITIES.has(entity)) return { ok: false, error: "نوعِ موجودیت نامعتبر است", entity: null };

  const ref =
    ID_ENTITIES.has(entity)
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

  if (entity === "exercisePlan") {
    if (!isValidClientId(raw.id)) return fail("شناسه‌ی برنامه نامعتبر است");
    // حذفِ برنامه در وب هم وجود نداره — غیرفعال‌کردن با isActive=false
    if (op === "delete") return fail("حذفِ برنامه پشتیبانی نمی‌شود — غیرفعالش کن");
    const d = validateExercisePlanData(raw.data);
    if (!d.ok) return fail(d.error);
    return { ok: true, change: { entity, id: raw.id, op, data: d.value, clientAt } };
  }

  if (entity === "exerciseLog") {
    const k = parseExerciseLogKey(raw.key);
    if (!k) return fail("key باید planId|YYYY-MM-DD باشد");
    if (op === "delete") return { ok: true, change: { entity, ...k, op, clientAt } };
    const d = validateExerciseLogData(raw.data);
    if (!d.ok) return fail(d.error);
    return { ok: true, change: { entity, ...k, op, data: d.value, clientAt } };
  }

  if (entity === "foodLogEntry") {
    if (!isValidClientId(raw.id)) return fail("شناسه‌ی ثبتِ غذا نامعتبر است");
    if (op === "delete") return { ok: true, change: { entity, id: raw.id, op, clientAt } };
    const d = validateFoodLogData(raw.data);
    if (!d.ok) return fail(d.error);
    return { ok: true, change: { entity, id: raw.id, op, data: d.value, clientAt } };
  }

  if (entity === "calorieTarget") {
    if (!isValidClientId(raw.id)) return fail("شناسه‌ی هدف کالری نامعتبر است");
    if (op === "delete") return fail("حذفِ هدف کالری پشتیبانی نمی‌شود");
    const d = validateCalorieTargetData(raw.data);
    if (!d.ok) return fail(d.error);
    return { ok: true, change: { entity, id: raw.id, op, data: d.value, clientAt } };
  }

  // roadmapProgress جدا در parseRoadmapProgressChange تجزیه می‌شه (push route)
  if (entity !== "setting") return fail("نوعِ موجودیت نامعتبر است");

  // setting
  if (!isMobileSyncSettingKey(raw.key)) return fail("کلید تنظیمات نامعتبر است");
  const key = raw.key;
  if (op === "delete") return { ok: true, change: { entity, key, op, clientAt } };
  const v = validateSettingValue(raw.data);
  if (!v.ok) return fail(v.error);
  return { ok: true, change: { entity, key, op, value: v.value, clientAt } };
}

// ─── نوشتن ─────────────────────────────────────────────────────────────────

/** updatedAt و syncWrittenAt دقیقا یک مقدار — نشانه‌ی «آخرین نویسنده موبایل بوده» */
export function syncStamp(clientAt: Date) {
  const writeAt = new Date();
  return { updatedAt: writeAt, syncWrittenAt: writeAt, syncEditedAt: clientAt };
}

/** نتیجه‌ی یک تغییر، بدونِ index (route اضافه‌ش می‌کنه) */
export type SyncResult = Omit<SyncChangeResult, "index">;

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

export function serializeDailyEntry(r: SyncTimestamps & { date: Date; completedItems: unknown; wakeUpAt: Date | null }): DailyEntryRecord {
  const tasks = isPlainObject(r.completedItems) ? (r.completedItems as Record<string, boolean>) : {};
  // روزِ خالی = tombstoneِ delete (یا روزی که هیچ‌وقت چیزی نداشت) — کلاینت پاکش می‌کنه
  const deleted = Object.keys(tasks).length === 0 && !r.wakeUpAt;
  return { date: toIsoDateKey(r.date), tasks, wake: iso(r.wakeUpAt), deleted, ...meta(r) };
}

export function serializeSleepEntry(
  r: SyncTimestamps & { date: Date; sleptAt: Date | null; wokeAt: Date | null; targetSleptAt: Date | null; targetWokeAt: Date | null; quality: number | null },
  timezone: string = DEFAULT_USER_TIMEZONE
): SleepEntryRecord {
  const tz = safeTimezone(timezone);
  return {
    date: toIsoDateKey(r.date),
    sleptAt: iso(r.sleptAt),
    wokeAt: iso(r.wokeAt),
    targetSleptAt: iso(r.targetSleptAt),
    targetWokeAt: iso(r.targetWokeAt),
    targetSleptAtHhmm: utcToZonedHhmm(r.targetSleptAt, tz),
    targetWokeAtHhmm: utcToZonedHhmm(r.targetWokeAt, tz),
    timezone: tz,
    quality: r.quality,
    deleted: !r.sleptAt && !r.wokeAt && !r.targetSleptAt && !r.targetWokeAt && r.quality === null,
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
    dueDate: r.dueDate ? toIsoDateKey(r.dueDate) : null,
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

const stringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function serializeExercisePlan(
  r: SyncTimestamps & {
    id: string; level: string; goal: string | null; heightCm: number | null; weightKg: number | null;
    hasPhysicalLimitation: boolean; gymDays: unknown; trainingPhase: string | null; trainingMonth: number | null;
    equipment: string | null; generatedByAi: boolean; startDate: Date; isActive: boolean; planData: unknown; createdAt: Date;
  }
) {
  return {
    id: r.id,
    level: r.level,
    goal: r.goal,
    heightCm: r.heightCm,
    weightKg: r.weightKg,
    hasPhysicalLimitation: r.hasPhysicalLimitation,
    gymDays: stringArray(r.gymDays),
    trainingPhase: r.trainingPhase,
    trainingMonth: r.trainingMonth,
    equipment: r.equipment,
    generatedByAi: r.generatedByAi,
    startDate: r.startDate.toISOString(),
    isActive: r.isActive,
    planData: (Array.isArray(r.planData) ? r.planData : []) as ParsedExerciseDay[],
    createdAt: r.createdAt.toISOString(),
    ...meta(r),
  };
}

export function serializeExerciseLog(
  r: SyncTimestamps & { planId: string | null; date: Date; completed: boolean; completedItems: unknown; notes: string | null }
) {
  const date = toIsoDateKey(r.date);
  const planId = r.planId ?? "";
  return { key: `${planId}|${date}`, planId, date, completed: r.completed, completedItems: stringArray(r.completedItems), notes: r.notes, ...meta(r) };
}

export function serializeFoodLogEntry(
  r: SyncTimestamps & {
    id: string; date: Date; customName: string | null; customCalories: number | null; grams: number; mealType: string | null;
    proteinG: number | null; carbsG: number | null; fatG: number | null; aiScanned: boolean; createdAt: Date; deletedAt: Date | null;
  }
) {
  return {
    id: r.id,
    date: toIsoDateKey(r.date),
    customName: r.customName,
    customCalories: r.customCalories,
    grams: r.grams,
    mealType: r.mealType,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    aiScanned: r.aiScanned,
    createdAt: r.createdAt.toISOString(),
    deleted: !!r.deletedAt,
    ...meta(r),
  };
}

export function serializeCalorieTarget(
  r: SyncTimestamps & {
    id: string; dailyTargetKcal: number; goal: string | null; mealsPerDay: number | null; mealBreakdown: unknown;
    proteinTargetG: number | null; carbsTargetG: number | null; fatTargetG: number | null; sex: string | null;
    ageYears: number | null; heightCm: number | null; weightKg: number | null; effectiveFrom: Date; effectiveTo: Date | null;
  }
) {
  return {
    id: r.id,
    dailyTargetKcal: r.dailyTargetKcal,
    goal: r.goal,
    mealsPerDay: r.mealsPerDay,
    mealBreakdown: Array.isArray(r.mealBreakdown) ? (r.mealBreakdown as { key: string; label: string; kcal: number }[]) : null,
    proteinTargetG: r.proteinTargetG,
    carbsTargetG: r.carbsTargetG,
    fatTargetG: r.fatTargetG,
    sex: r.sex,
    ageYears: r.ageYears,
    heightCm: r.heightCm,
    weightKg: r.weightKg,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: iso(r.effectiveTo),
    ...meta(r),
  };
}

export type { DailyEntryData, SleepEntryData, TaskData };
