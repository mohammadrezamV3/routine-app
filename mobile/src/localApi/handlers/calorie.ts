// کالری — آینه‌ی محلیِ app/api/calorie/{foods,log,log/range,target}/route.ts روی
// arion-fitness. شکلِ پاسخ (ردیفِ Prisma — handlers/fitnessShapes.ts)، اعتبارسنجی و
// پیام‌های خطا عینا همون روت‌های وبه (تستِ parity روی خودِ فایل‌های روتِ وب).
// گیتِ CALORIE قبل از هندلرها در guards.ts (همون requireModule)؛ foods مثلِ وب عمومیه.
//
//   • ثبتِ غذا: وب «کلِ همین مقدار» می‌گیره/برمی‌گردونه، ردیفِ محلی «به‌ازای ۱۰۰ گرم»
//     — تبدیل با features/fitness/lib/foodLogMapping.ts (مشترک با آداپتورِ سینک).
//   • هدف: عدد با همون محاسبه‌ی خالصِ سرور (lib/calorieTargetCompute.ts) — سن از
//     birthDate ِ /api/account ِ کش‌شده، روزهای باشگاه/فازِ تمرین از برنامه‌ی فعالِ
//     محلی. بعد از push، سرور دوباره حساب می‌کنه و pull همون عدد رو برمی‌گردونه.
import { fitnessDb } from "@m/features/fitness/db";
import { newLocalId, nowIso } from "@m/features/fitness/lib/id";
import type { CalorieEntryRow, CalorieTargetRow } from "@m/features/fitness/lib/exerciseTypes";
import { per100FromTotals } from "@m/features/fitness/lib/foodLogMapping";
import { clampQuery, clampText, parseDateRange, parseIsoDate, readJsonBody } from "@/lib/validate";
import { validateCalorieTargetInput, validateMealsPatch } from "@/lib/calorieTargetRules";
import { computeCalorieTargetFromProfile } from "@/lib/calorieTargetCompute";
import { cachedAccount } from "../accountState";
import { json } from "../respond";
import { services } from "../services";
import type { LocalCtx } from "../types";
import { dateKeyOf } from "./routine";
import { activePlanRow } from "./exercise";
import { calorieTargetJson, foodEntryJson } from "./fitnessShapes";

const DATE_ERROR = "تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)";
// همون سقفِ روتِ range ِ وب
const MAX_RANGE_ROWS = 2000;
/** = MAX_FOOD_KCAL ِ lib/mobileSync.ts (سقفِ push؛ تستِ parity برابریشون رو چک می‌کنه) —
 *  کپی تا کلِ اعتبارسنجِ سینک توی چانکِ شروع نیاد */
export const LOCAL_MAX_FOOD_KCAL = 100000;

// GET /api/calorie/foods?q=… — فهرستِ ثابت (seedِ وب)، بدونِ لاگین مثلِ وب
export async function getFoods({ url }: LocalCtx): Promise<Response> {
  const { searchFoodSeed } = await import("@/lib/foodSeed");
  return json({ results: searchFoodSeed(clampQuery(url.searchParams.get("q"), 60)) });
}

// ─── log ───────────────────────────────────────────────────────────────

const byCreatedAt = (a: CalorieEntryRow, b: CalorieEntryRow) => a.createdAt.localeCompare(b.createdAt);

// GET /api/calorie/log?date=YYYY-MM-DD
export async function getCalorieLog({ url }: LocalCtx): Promise<Response> {
  const date = parseIsoDate(url.searchParams.get("date"));
  if (!date) return json({ error: DATE_ERROR }, 400);
  const rows = await fitnessDb.calorieEntries.where("date").equals(dateKeyOf(date)).filter((r) => !r.deletedAt).toArray();
  return json({ entries: rows.sort(byCreatedAt).map(foodEntryJson) });
}

// POST /api/calorie/log { date, customName, customCalories, grams, mealType?, proteinG?, carbsG?, fatG?, aiScanned? }
export async function postCalorieLog({ req }: LocalCtx): Promise<Response> {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const { customName, customCalories, grams, mealType, proteinG, carbsG, fatG, aiScanned } = parsed.body as {
    customName: string; customCalories: number; grams: number; mealType?: string;
    proteinG?: number; carbsG?: number; fatG?: number; aiScanned?: boolean;
  };

  const date = parseIsoDate(parsed.body?.date);
  if (!date) return json({ error: DATE_ERROR }, 400);
  if (!customName || typeof customName !== "string" || !customCalories || !grams) return json({ error: "اطلاعات ناقص است" }, 400);
  if (typeof customCalories !== "number" || typeof grams !== "number" || customCalories < 0 || grams <= 0 || grams > 10000) {
    return json({ error: "عدد وارد شده معتبر نیست" }, 400);
  }
  if (mealType && (typeof mealType !== "string" || mealType.length > 20)) return json({ error: "نوع وعده نامعتبر است" }, 400);
  const hasMacros = proteinG !== undefined || carbsG !== undefined || fatG !== undefined;
  const macrosValid = [proteinG, carbsG, fatG].every((v) => typeof v === "number" && v >= 0 && v <= 2000);
  if (hasMacros && !macrosValid) return json({ error: "مقادیر درشت‌مغذی نامعتبره" }, 400);
  // سقف‌های push ِ سرور (validateFoodLogData) که وب نداره — فقط ورودیِ غیرعادی
  if (!customName.trim()) return json({ error: "اطلاعات ناقص است" }, 400);
  if (!Number.isFinite(customCalories) || customCalories > LOCAL_MAX_FOOD_KCAL) return json({ error: "عدد وارد شده معتبر نیست" }, 400);

  const macros = hasMacros && macrosValid;
  const now = nowIso();
  const row: CalorieEntryRow = {
    id: newLocalId(),
    name: clampText(customName, 80),
    ...per100FromTotals({
      customCalories,
      proteinG: macros ? proteinG! : null,
      carbsG: macros ? carbsG! : null,
      fatG: macros ? fatG! : null,
      grams,
    }),
    grams,
    date: dateKeyOf(date),
    mealType: mealType || null,
    aiScanned: macros ? !!aiScanned : false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  await fitnessDb.calorieEntries.put(row);
  return json({ ok: true, entry: foodEntryJson(row) });
}

// DELETE /api/calorie/log?id=… — soft-delete (tombstoneِ سینک)، مثلِ وب
export async function deleteCalorieLog({ url }: LocalCtx): Promise<Response> {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id is required" }, 400);
  const now = nowIso();
  await fitnessDb.transaction("rw", fitnessDb.calorieEntries, async () => {
    const row = await fitnessDb.calorieEntries.get(id);
    if (row && !row.deletedAt) await fitnessDb.calorieEntries.put({ ...row, deletedAt: now, updatedAt: now, dirty: 1 });
  });
  return json({ ok: true });
}

// GET /api/calorie/log/range?from=…&to=… — تاریخچه (جدیدترین روز اول)
export async function getCalorieLogRange({ url }: LocalCtx): Promise<Response> {
  const range = parseDateRange(url.searchParams.get("from"), url.searchParams.get("to"));
  if ("error" in range) return json({ error: range.error }, 400);
  const rows = await fitnessDb.calorieEntries
    .where("date")
    .between(dateKeyOf(range.from), dateKeyOf(range.to), true, true)
    .filter((r) => !r.deletedAt)
    .toArray();
  rows.sort((a, b) => b.date.localeCompare(a.date) || byCreatedAt(a, b));
  return json({ entries: rows.slice(0, MAX_RANGE_ROWS).map(foodEntryJson) });
}

// ─── target ────────────────────────────────────────────────────────────

/** هدفِ فعلی = بازِ جدیدترین effectiveFrom (همون findFirst ِ وب) */
async function openTargets(): Promise<CalorieTargetRow[]> {
  const rows = await fitnessDb.calorieTargets.filter((t) => !t.deletedAt && !t.effectiveTo).toArray();
  return rows.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

/** birthDate ِ حساب از /api/account ِ کش‌شده؛ undefined = هنوز نمی‌دونیم */
function cachedBirthDate(): Date | null | undefined {
  const user = cachedAccount(services().tokens.getUser()?.id)?.user;
  if (!user) return undefined;
  const d = user.birthDate ? new Date(user.birthDate as string) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

// GET /api/calorie/target → { target, needsAge }
export async function getCalorieTarget(): Promise<Response> {
  const [target] = await openTargets();
  // حسابِ کش‌نشده ← سن رو بپرس (سرور اگه تاریخ تولد داشته باشه ageYears رو نادیده می‌گیره)
  return json({ target: target ? calorieTargetJson(target) : null, needsAge: !cachedBirthDate() });
}

// POST /api/calorie/target { goal, mealsPerDay, sex, ageYears?, heightCm, weightKg }
export async function postCalorieTarget({ req }: LocalCtx): Promise<Response> {
  const body = await req.json().catch(() => null);
  const input = validateCalorieTargetInput(body);
  if (!input.ok) return json({ error: input.error }, 400);
  const plan = await activePlanRow();
  const computed = computeCalorieTargetFromProfile(input.value, {
    birthDate: cachedBirthDate() ?? null,
    activeGymDays: plan && Array.isArray(plan.gymDays) ? plan.gymDays : null,
    trainingPhase: plan?.trainingPhase,
  });
  if (!computed.ok) return json({ error: computed.error }, 400);

  const now = nowIso();
  const row: CalorieTargetRow = {
    id: newLocalId(),
    ...computed.value,
    proteinTargetG: null,
    carbsTargetG: null,
    fatTargetG: null,
    effectiveFrom: now,
    effectiveTo: null,
    synced: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  };
  // هدفِ قبلی بسته می‌شه (push نمی‌شه — سرور موقعِ compute خودش می‌بنده)
  await fitnessDb.transaction("rw", fitnessDb.calorieTargets, async () => {
    for (const t of await openTargets()) await fitnessDb.calorieTargets.put({ ...t, effectiveTo: now, updatedAt: now, dirty: 1 });
    await fitnessDb.calorieTargets.put(row);
  });
  return json({ ok: true, target: calorieTargetJson(row) });
}

// PATCH /api/calorie/target { mealBreakdown, proteinTargetG?, carbsTargetG?, fatTargetG? }
export async function patchCalorieTarget({ req }: LocalCtx): Promise<Response> {
  const body = await req.json().catch(() => null);
  const patch = validateMealsPatch(body);
  if (!patch.ok) return json({ error: patch.error }, 400);
  const [existing] = await openTargets();
  if (!existing) return json({ error: "اول باید هدف کالری‌ات را بسازی" }, 400);
  const target: CalorieTargetRow = {
    ...existing,
    ...patch.value,
    // هدفی که سرور هنوز نمی‌شناسه اول compute می‌ره؛ این چیدمان بعدش حفظ می‌شه (fitnessAdapter)
    ...(existing.synced ? {} : { mealsEdited: true }),
    updatedAt: nowIso(),
    dirty: 1,
  };
  await fitnessDb.calorieTargets.put(target);
  return json({ ok: true, target: calorieTargetJson(target) });
}
