// بدنسازی — آینه‌ی محلیِ app/api/exercise/{plan,plan/manual,plan/substitute,
// log,log/range,media}/route.ts روی arion-fitness (+ arion-catalog برای عکس‌ها).
// شکلِ پاسخ، اعتبارسنجی و پیام‌های خطا عینا همون روت‌های وبه (تستِ parity:
// localApi/handlers.fitness.parity.test.ts روی خودِ فایل‌های روتِ وب). گیتِ
// EXERCISE قبل از این هندلرها در guards.ts اعمال می‌شه (همون requireModule).
//
// مستقیم روی fitnessDb (نه features/fitness/lib/repo). کلِ این ماژول تنبل بار می‌شه
// (router.ts ← lazyHandler) و کتابخونه‌های سنگینِ وب (کاتالوگِ حرکات، اعتبارسنجِ
// سینک) داخلش هم با import پویا — تا چانکِ شروعِ اپ سبک بمونه.
//
// عمدا *نه* مثلِ وب: سقفِ نرخِ GET ِ plan (۱۰ در روز، کلیدِ exercise-plan-generate)
// و substitute (۲۰ در ساعت) — این‌ها جلوی هزینه‌ی سرور رو می‌گیرن، و این‌جا نه
// سروری هست نه AI. ساختِ برنامه با AI (POST /api/exercise/plan) آنلاینه (router.ts).
import { fitnessDb } from "@m/features/fitness/db";
import { newLocalId, nowIso } from "@m/features/fitness/lib/id";
import type { ExerciseLogRow, ExercisePlanRow } from "@m/features/fitness/lib/exerciseTypes";
import { FA_WEEKDAY } from "@/lib/jalali";
import type { ExerciseDay } from "@/lib/exercisePlans";
import { parseDateRange, parseIsoDate, readJsonBody } from "@/lib/validate";
import { json } from "../respond";
import type { LocalCtx } from "../types";
import { dateKeyOf } from "./routine";
import { planJson } from "./fitnessShapes";
import { activePlanRow } from "./exercise";
import { services } from "../services";

// ─── plan ──────────────────────────────────────────────────────────────

// GET /api/exercise/plan → { plan | null }
export async function getExercisePlan(): Promise<Response> {
  const plan = await activePlanRow();
  return json({ plan: plan ? planJson(plan) : null });
}

// POST /api/exercise/plan/manual { planData, rulesAccepted }
export async function postManualPlan({ req }: LocalCtx): Promise<Response> {
  const body = await req.json();
  const { planData, rulesAccepted } = body as { planData: ExerciseDay[]; rulesAccepted: boolean };

  if (!rulesAccepted) return json({ error: "قبول‌کردن قوانین الزامی است" }, 400);
  if (!Array.isArray(planData) || planData.length === 0) return json({ error: "حداقل یک روز تمرینی لازم است" }, 400);

  const cleanDays: ExerciseDay[] = [];
  const seenDays = new Set<string>();
  for (const d of planData) {
    if (!d || typeof d.day !== "string" || !FA_WEEKDAY.includes(d.day)) return json({ error: "روز نامعتبر در برنامه" }, 400);
    if (seenDays.has(d.day)) return json({ error: `روز «${d.day}» بیش از یک بار انتخاب شده` }, 400);
    seenDays.add(d.day);
    const items = Array.isArray(d.items) ? d.items.map((i) => String(i).trim()).filter(Boolean) : [];
    if (items.length === 0) return json({ error: `برای روز «${d.day}» حداقل یک حرکت لازم است` }, 400);
    cleanDays.push({ day: d.day, focus: String(d.focus || "").trim() || "برنامه‌ی شخصی", items });
  }

  // اپ نباید چیزی رو محلی قبول کنه که push ِ سرور رد می‌کنه (سقفِ حرکت در روز/طولِ
  // نام/تمرکز — validatePlanDays ِ سینک؛ وب این سقف‌ها رو نداره، فقط در ورودیِ غیرعادی فرق می‌کنه)
  const { validatePlanDays } = await import("@/lib/mobileSync");
  const capped = validatePlanDays(cleanDays);
  if (!capped.ok) return json({ error: capped.error }, 400);

  const now = nowIso();
  const row: ExercisePlanRow = {
    id: newLocalId(),
    level: "custom",
    heightCm: null,
    weightKg: null,
    goal: null,
    hasPhysicalLimitation: false,
    gymDays: cleanDays.map((d) => d.day),
    trainingPhase: "none",
    trainingMonth: null,
    equipment: null,
    generatedByAi: false,
    startDate: now,
    isActive: true,
    planData: cleanDays,
    createdAt: now,
    rulesAcceptedAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  // «همیشه یک برنامه‌ی فعال» — قبلی‌ها غیرفعال (بدونِ پاک‌شدنِ تاریخچه)، مثلِ updateMany ِ وب
  await fitnessDb.transaction("rw", fitnessDb.plans, async () => {
    await fitnessDb.plans.filter((p) => p.isActive).modify({ isActive: false, updatedAt: now, dirty: 1 });
    await fitnessDb.plans.put(row);
  });
  return json({ ok: true, plan: planJson(row) });
}

// PATCH /api/exercise/plan/substitute { planId, day, oldItem, newItem? }
export async function patchSubstitute({ req }: LocalCtx): Promise<Response> {
  const body = await req.json();
  const { planId, day, oldItem, newItem } = body as { planId: string; day: string; oldItem: string; newItem?: string };
  if (!planId || !day || !oldItem) return json({ error: "اطلاعات ناقص است" }, 400);

  const plan = await fitnessDb.plans.get(planId);
  if (!plan) return json({ error: "برنامه پیدا نشد" }, 404);

  const days = plan.planData;
  const dayEntry = Array.isArray(days) ? days.find((d) => d.day === day) : null;
  if (!dayEntry || !dayEntry.items.includes(oldItem)) return json({ error: "این حرکت توی برنامه پیدا نشد" }, 404);

  if (!newItem) {
    const [{ getCatalogSubstitutes }, { stripSetSuffix }] = await Promise.all([import("@/lib/exerciseCatalogUtils"), import("@/lib/exerciseSets")]);
    const otherItemNames = dayEntry.items.filter((it) => it !== oldItem).map((it) => stripSetSuffix(it));
    const candidates = getCatalogSubstitutes(oldItem, 3, otherItemNames);
    if (candidates.length === 0) {
      return json({ error: "معادل مشخصی برای این حرکت پیدا نکردیم — با مربی باشگاه هماهنگ کن" }, 422);
    }
    return json({ ok: true, candidates });
  }

  const nextDays = days.map((d) => (d.day === day ? { ...d, items: d.items.map((it) => (it === oldItem ? newItem : it)) } : d));
  const updated: ExercisePlanRow = { ...plan, planData: nextDays, updatedAt: nowIso(), dirty: 1 };
  await fitnessDb.plans.put(updated);
  return json({ ok: true, plan: planJson(updated) });
}

// ─── log ───────────────────────────────────────────────────────────────

const LOG_PARAMS_ERROR = "planId و تاریخ معتبر (YYYY-MM-DD) الزامی است";

function logRowFor(planId: string, day: string): Promise<ExerciseLogRow | undefined> {
  return fitnessDb.exerciseLogs.where("[planId+date]").equals([planId, day]).first();
}

/**
 * ردیفِ حذف‌شده (tombstone) همون «جلسه‌ی خالی» ِ وبه: سرور ردیف رو با
 * completed=false و completedItems=[] نگه می‌داره، پس وب هم همین رو برمی‌گردونه.
 */
function logJson(row: ExerciseLogRow | undefined): { completed: boolean; completedItems: string[] } {
  if (!row || row.deletedAt) return { completed: false, completedItems: [] };
  return { completed: !!row.completed, completedItems: row.completedItems ?? [] };
}

// GET /api/exercise/log?planId=…&date=YYYY-MM-DD
export async function getExerciseLog({ url }: LocalCtx): Promise<Response> {
  const planId = url.searchParams.get("planId");
  const date = parseIsoDate(url.searchParams.get("date"));
  if (!planId || !date) return json({ error: LOG_PARAMS_ERROR }, 400);
  return json(logJson(await logRowFor(planId, dateKeyOf(date))));
}

// POST /api/exercise/log { planId, date, completed, completedItems? }
export async function postExerciseLog({ req }: LocalCtx): Promise<Response> {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const { planId, completed, completedItems } = parsed.body as { planId: string; completed: boolean; completedItems?: string[] };
  const date = parseIsoDate(parsed.body?.date);
  if (!planId || typeof planId !== "string" || !date) return json({ error: LOG_PARAMS_ERROR }, 400);

  // همون سقفِ وب (۵۰۰ مورد، ۲۰۰ کاراکتر)؛ undefined یعنی «دست نزن»
  const items = Array.isArray(completedItems)
    ? completedItems.filter((x) => typeof x === "string").slice(0, 500).map((x: string) => x.slice(0, 200))
    : undefined;

  const day = dateKeyOf(date);
  const now = nowIso();
  await fitnessDb.transaction("rw", fitnessDb.exerciseLogs, async () => {
    const existing = await logRowFor(planId, day);
    if (existing) {
      // tombstone دوباره زنده می‌شه با completedItemsِ خالیِ سرور (نه آیتم‌های قبل از حذف)
      const prevItems = existing.deletedAt ? [] : existing.completedItems ?? [];
      await fitnessDb.exerciseLogs.put({
        ...existing,
        completed: !!completed,
        completedItems: items ?? prevItems,
        updatedAt: now,
        deletedAt: null,
        dirty: 1,
      });
      return;
    }
    await fitnessDb.exerciseLogs.put({
      id: newLocalId(),
      planId,
      date: day,
      completed: !!completed,
      completedItems: items ?? [],
      notes: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: 1,
    });
  });
  return json({ ok: true });
}

// GET /api/exercise/log/range?planId=…&start=…&end=…
export async function getExerciseLogRange({ url }: LocalCtx): Promise<Response> {
  const planId = url.searchParams.get("planId");
  if (!planId) return json({ error: "planId الزامی است" }, 400);
  const range = parseDateRange(url.searchParams.get("start"), url.searchParams.get("end"));
  if ("error" in range) return json({ error: range.error }, 400);
  const from = dateKeyOf(range.from);
  const to = dateKeyOf(range.to);
  const rows = await fitnessDb.exerciseLogs.where("planId").equals(planId).filter((r) => r.date >= from && r.date <= to).toArray();
  const logs: Record<string, { completed: boolean; completedItems: string[] }> = {};
  for (const r of rows) logs[r.date] = logJson(r);
  return json({ logs });
}

// ─── media (کاتالوگِ «مشاهده حرکات») ─────────────────────────────────────

// GET /api/exercise/media            → { keys }      (فهرستِ کلیدها)
// GET /api/exercise/media?name=…     → { dataUrl }   (همون یک عکس، تنبل)
// منبع: arion-catalog (GET /api/mobile/catalog — فهرستِ عکس‌ها فقط وقتی EXERCISE
// باز باشه میاد) + کشِ عکس‌ها. تا کاتالوگ یک‌بار دانلود نشده ← همون CACHED ِ وب.
export async function getExerciseMedia({ url, req }: LocalCtx): Promise<Response> {
  const { catalogDb, getExerciseMedia: mediaFor } = await import("@m/sync/catalog");
  const meta = await catalogDb.meta.get("catalog").catch(() => undefined);
  if (!meta?.exerciseMedia) {
    const { cachedFallback } = await import("../dispatch");
    return cachedFallback(url, req);
  }
  const name = url.searchParams.get("name");
  if (!name) return json({ keys: meta.exerciseMedia.map((m) => m.key) });
  const s = services();
  return json({ dataUrl: await mediaFor(s.syncEnabled ? s.api : null, name) });
}
