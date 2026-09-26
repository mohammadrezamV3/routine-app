// روتینِ روزانه — آینه‌ی محلیِ app/api/tasks/daily{,/range,/keys}/route.ts روی
// جدولِ arion-mobile.dailyEntries. شکلِ پاسخ، اعتبارسنجی و پیام‌های خطا عینا
// همون روت‌های وبه (تستِ parity: localApi/handlers.parity.test.ts روی خودِ
// فایل‌های روتِ وب با prismaِ ساختگی).
//
// ردیفِ soft-deleted (deletedAt) فقط از pullِ سرور میاد: سرور «روزِ خالی»
// (بدونِ تیک و بدونِ بیداری) رو tombstone می‌فرسته (lib/mobileSync.ts)، ولی
// همون ردیف توی جدولِ وب هنوز هست و روت‌های وب {tasks:{},wake:null}
// برمی‌گردونن — پس این‌جا هم حذف‌شده‌ها «روزِ خالی» حساب می‌شن، نه ناموجود.
import { db, DailyEntryRow, nowIso } from "@m/db/db";
import { parseDateRange, parseIsoDate, readJsonBody } from "@/lib/validate";
import { json } from "../respond";
import type { LocalCtx } from "../types";

// همون سقفِ روتِ وب
const MAX_DAILY_TASK_KEYS = 500;
const DATE_ERROR = "تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)";

const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
/** Date (نیمه‌شبِ UTC، خروجیِ parseIsoDate) → کلیدِ "YYYY-MM-DD" ِ Dexie */
export function dateKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** ردیفِ محلی → { tasks, wake } با همون قاعده‌ی روتِ وب */
export function shapeDaily(row: DailyEntryRow | undefined): { tasks: Record<string, boolean>; wake: string | null } {
  if (!row || row.deletedAt) return { tasks: {}, wake: null };
  return { tasks: row.completedItems ?? {}, wake: row.wakeUpAt ?? null };
}

/** همون پاک‌سازیِ POSTِ وب: فقط کلیدهای ≤۲۰۰ کاراکتر، مقدارِ boolean، حداکثر ۵۰۰ */
export function sanitizeCompletedItems(tasks: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const src = tasks && typeof tasks === "object" ? (tasks as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(src).slice(0, MAX_DAILY_TASK_KEYS)) {
    if (typeof k === "string" && k.length <= 200) out[k.slice(0, 200)] = !!v;
  }
  return out;
}

/** `wake` ← ISOِ نرمال یا null (بدشکل ← null، مثلِ وب) */
export function normalizeWake(wake: unknown): string | null {
  if (!wake) return null;
  const d = new Date(wake as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// GET /api/tasks/daily?date=YYYY-MM-DD
export async function getDaily({ url }: LocalCtx): Promise<Response> {
  const date = parseIsoDate(url.searchParams.get("date"));
  if (!date) return json({ error: DATE_ERROR }, 400);
  return json(shapeDaily(await db.dailyEntries.get(dateKeyOf(date))));
}

// POST /api/tasks/daily  { date, tasks, wake }
export async function postDaily({ req }: LocalCtx): Promise<Response> {
  const parsed = await readJsonBody<{ date?: string; tasks?: Record<string, boolean>; wake?: string | null }>(req);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.body ?? {};
  const date = parseIsoDate(body.date);
  if (!date) return json({ error: DATE_ERROR }, 400);
  const key = dateKeyOf(date);
  await db.dailyEntries.put({
    date: key,
    completedItems: sanitizeCompletedItems(body.tasks),
    wakeUpAt: normalizeWake(body.wake),
    updatedAt: nowIso(),
    deletedAt: null,
    dirty: 1,
  });
  // وب cuidِ ردیفِ Prisma رو می‌ده؛ محلی شناسه‌ی سرور نداریم — کلیدِ طبیعیِ
  // همون روز (هیچ کلاینتی از این فیلد استفاده نمی‌کنه، فقط شکل حفظ شده)
  return json({ ok: true, id: key });
}

// GET /api/tasks/daily/range?from=…&to=…
export async function getDailyRange({ url }: LocalCtx): Promise<Response> {
  const range = parseDateRange(url.searchParams.get("from"), url.searchParams.get("to"));
  if ("error" in range) return json({ error: range.error }, 400);
  const rows = await db.dailyEntries.where("date").between(dateKeyOf(range.from), dateKeyOf(range.to), true, true).toArray();
  const entries: Record<string, { tasks: Record<string, boolean>; wake: string | null }> = {};
  for (const r of rows) entries[r.date] = shapeDaily(r);
  return json({ entries });
}

// GET /api/tasks/daily/keys
export async function getDailyKeys(): Promise<Response> {
  const keys = (await db.dailyEntries.toCollection().primaryKeys()) as string[];
  return json({ keys: [...keys].sort() });
}
