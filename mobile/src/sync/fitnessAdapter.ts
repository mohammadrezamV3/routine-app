// آداپتورِ سینکِ ماژولِ ورزش/کالری (features/fitness — دیتابیسِ arion-fitness) ↔
// موجودیت‌های فاز ۴ِ سرور: exercisePlan، exerciseLog، foodLogEntry، calorieTarget.
//
// ناهمخوانی‌های شکلِ محلی و سرور (و تصمیم‌ها):
//   • plans: سرور فقط «برنامه‌ی دستی» (level=custom + rulesAccepted) از گوشی
//     می‌سازه و بعدش فقط planData/isActive رو عوض می‌کنه؛ حذف نداره. پس
//     «حذف/آرشیو»ی محلی = push با isActive=false و deletedAt فقط محلی می‌مونه.
//     برنامه‌ی «قالبِ آماده»ی محلی روی سرور custom ثبت می‌شه؛ متادیتای محلیش
//     (level/goal/قد/وزن/…) موقعِ برگشتِ رکورد نگه داشته می‌شه.
//   • exerciseLogs: کلیدِ سرور `${planId}|${date}`؛ id فقط محلیه. notes هم مثلِ
//     بقیه‌ی فیلدها سینک می‌شه (قبلا فقط محلی می‌موند).
//   • setLogs و customFoods: موجودیتِ سروری ندارن (وب هم ذخیره‌شون نمی‌کنه) — فقط محلی.
//   • calorieEntries ↔ foodLogEntry: محلی «به‌ازای ۱۰۰ گرم» نگه می‌داره، سرور
//     «کلِ همین مقدار» (customCalories/proteinG/…) — تبدیل با grams، در
//     features/fitness/lib/foodLogMapping.ts (مشترک با هندلرِ محلیِ /api/calorie/log).
//     mealType عینا (snack1/snack2/meal_… ِ چیدمانِ وعده‌های وب) — نرمال نمی‌شه.
//   • calorieTargets: سرور عدد رو خودش حساب می‌کنه. هدفِ جدید → kind=compute
//     (id تازه)، ویرایشِ هدفِ فعلیِ شناخته‌شده → kind=meals؛ بستنِ هدفِ قبلی رو
//     سرور خودش انجام می‌ده (push نمی‌شه). synced=true یعنی سرور این id رو داره.
//     ویرایشِ وعده‌ها روی هدفی که هنوز compute نشده (mealsEdited) بعد از compute
//     حفظ می‌شه و دور بعد kind=meals می‌ره.
//   • applyPull تعدادِ ردیف‌هایی که *واقعا* عوض شدن رو برمی‌گردونه (remountِ صفحه —
//     SyncEngine.onRemoteApplied)؛ برگشتِ همون چیزی که خودمون push کردیم حساب نمی‌شه.
import type {
  CalorieTargetRecord,
  ExerciseLogRecord,
  ExercisePlanLevel,
  ExercisePlanRecord,
  ExerciseTrainingPhase,
  FoodLogEntryRecord,
  SyncChange,
  SyncServerRecord,
} from "@m/lib/api-contract";
import { EXERCISE_LOG_NOTES_MAX, EXERCISE_TRAINING_PHASES } from "@m/lib/api-contract";
import { fitnessDb } from "@m/features/fitness/db";
import { newLocalId } from "@m/features/fitness/lib/id";
import { foodTotals, per100FromTotals } from "@m/features/fitness/lib/foodLogMapping";
import { sameRow } from "@m/db/syncHooks";
import type {
  CalorieEntryRow,
  CalorieTargetRow,
  ExerciseLogRow,
  ExercisePlanRow,
} from "@m/features/fitness/lib/exerciseTypes";
import type { PendingItem, SyncAdapter } from "./adapter";
import { isValidClientId } from "./mappers";

type Table = typeof fitnessDb.plans | typeof fitnessDb.exerciseLogs | typeof fitnessDb.calorieEntries | typeof fitnessDb.calorieTargets;

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/** LWW برای pull: ریموت برنده‌ست اگه محلی نباشه، dirty نباشه، یا editedAt جدیدتر باشه */
function remoteWins(local: { dirty: 0 | 1; updatedAt: string } | undefined, editedAt: string): boolean {
  return !local || local.dirty !== 1 || ms(editedAt) > ms(local.updatedAt);
}

/** ردیفِ ریموتِ نگاشت‌شده رو می‌نویسه، مگر اینکه با ردیفِ تمیزِ محلی یکی باشه (برگشتِ push ِ خودمون) */
async function putIfChanged<T extends { dirty: 0 | 1 }>(table: Table, local: T | undefined, next: T): Promise<boolean> {
  if (local && local.dirty !== 1 && sameRow(local, next)) return false;
  await (table as any).put(next);
  return true;
}

/** نتیجه‌ی push رو اتمیک اعمال می‌کنه — فقط اگه ردیف از لحظه‌ی snapshot عوض نشده */
async function settleRow<T extends { id: string; updatedAt: string }>(
  table: Table,
  id: string,
  pushedUpdatedAt: string,
  next: (local: T) => T | null
): Promise<boolean> {
  return fitnessDb.transaction("rw", table, async () => {
    const local = (await (table as any).get(id)) as T | undefined;
    if (!local || local.updatedAt !== pushedUpdatedAt) return false;
    const row = next(local);
    if (row) await (table as any).put({ ...row, dirty: 0 });
    else await (table as any).update(id, { dirty: 0 });
    return true;
  });
}

// ─── mapping: محلی → push ──────────────────────────────────────────────

/** `trainingPhase`ِ محلی رشته‌ی آزاده؛ فقط مقادیرِ معتبرِ سرور رو پاس بده، وگرنه "none" */
function normalizeTrainingPhase(v: string | null): ExerciseTrainingPhase {
  return (EXERCISE_TRAINING_PHASES as readonly string[]).includes(v ?? "") ? (v as ExerciseTrainingPhase) : "none";
}

export function planToChange(row: ExercisePlanRow): SyncChange {
  return {
    entity: "exercisePlan",
    id: row.id,
    op: "upsert",
    data: {
      planData: row.planData.map((d) => ({ day: d.day, focus: d.focus, items: d.items })),
      isActive: row.isActive && !row.deletedAt,
      rulesAccepted: !!row.rulesAcceptedAt,
      // متادیتای برنامه (قبلا فقط محلی می‌موند، حالا با سرور سینک می‌شه —
      // نمایشِ درست در پنلِ وب/AI Insight به این وابسته‌ست)
      level: row.level as ExercisePlanLevel,
      goal: row.goal,
      equipment: row.equipment,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      trainingMonth: row.trainingMonth,
      trainingPhase: normalizeTrainingPhase(row.trainingPhase),
      hasPhysicalLimitation: row.hasPhysicalLimitation,
      gymDays: row.gymDays ?? row.planData.map((d) => d.day),
    },
    clientUpdatedAt: row.updatedAt,
  };
}

export function exerciseLogKey(row: Pick<ExerciseLogRow, "planId" | "date">): string | null {
  return row.planId ? `${row.planId}|${row.date}` : null;
}

export function exerciseLogToChange(row: ExerciseLogRow): SyncChange | null {
  const key = exerciseLogKey(row);
  if (!key || !isValidClientId(row.planId!)) return null;
  if (row.deletedAt) return { entity: "exerciseLog", key, op: "delete", clientUpdatedAt: row.updatedAt };
  return {
    entity: "exerciseLog",
    key,
    op: "upsert",
    data: {
      completed: row.completed,
      completedItems: row.completedItems ?? [],
      // یادداشتِ جلسه — قبلا فقط محلی می‌موند، حالا با سرور سینک می‌شه.
      // null/"" یعنی صراحتا پاک‌شده (سرور با undefined فرق می‌ذاره، پس هیچ‌وقت
      // undefined نفرست این‌جا — همیشه مقدارِ واقعیِ محلی رو، truncate‌شده).
      notes: row.notes == null ? row.notes : row.notes.slice(0, EXERCISE_LOG_NOTES_MAX),
    },
    clientUpdatedAt: row.updatedAt,
  };
}

export function calorieEntryToChange(row: CalorieEntryRow): SyncChange | null {
  if (row.deletedAt) return { entity: "foodLogEntry", id: row.id, op: "delete", clientUpdatedAt: row.updatedAt };
  const totals = foodTotals(row);
  const kcal = totals.customCalories;
  if (!(kcal > 0) || !(row.grams > 0)) return null; // سرور کالری/گرمِ صفر رو ناقص می‌دونه
  const hasMacros = totals.proteinG !== null;
  return {
    entity: "foodLogEntry",
    id: row.id,
    op: "upsert",
    data: {
      date: row.date,
      customName: (row.name || "غذا").slice(0, 80),
      customCalories: kcal,
      grams: row.grams,
      mealType: row.mealType ?? null,
      ...(hasMacros ? { proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG } : {}),
      aiScanned: hasMacros && row.aiScanned,
    },
    clientUpdatedAt: row.updatedAt,
  };
}

/** null = این ردیف push نمی‌شه (هدفِ بسته‌شده، یا اطلاعاتِ لازم برای compute ناقصه) */
export function calorieTargetToChange(row: CalorieTargetRow): SyncChange | null {
  if (row.deletedAt || row.effectiveTo) return null;
  if (row.synced) {
    if (!row.mealBreakdown?.length) return null;
    return {
      entity: "calorieTarget",
      id: row.id,
      op: "upsert",
      data: {
        kind: "meals",
        mealBreakdown: row.mealBreakdown,
        proteinTargetG: row.proteinTargetG,
        carbsTargetG: row.carbsTargetG,
        fatTargetG: row.fatTargetG,
      },
      clientUpdatedAt: row.updatedAt,
    };
  }
  if (!row.goal || !row.sex || !row.heightCm || !row.weightKg) return null;
  const mealsPerDay = Math.min(6, Math.max(2, Math.round(row.mealsPerDay ?? 3)));
  return {
    entity: "calorieTarget",
    id: row.id,
    op: "upsert",
    data: {
      kind: "compute",
      goal: row.goal,
      mealsPerDay,
      sex: row.sex,
      ...(row.ageYears ? { ageYears: row.ageYears } : {}),
      heightCm: row.heightCm,
      weightKg: row.weightKg,
    },
    clientUpdatedAt: row.updatedAt,
  };
}

// ─── mapping: سرور → محلی ─────────────────────────────────────────────

export function remotePlan(r: ExercisePlanRecord, local?: ExercisePlanRow): ExercisePlanRow {
  // برنامه‌ی قالبیِ محلی روی سرور «custom» ثبت می‌شه — متادیتای محلی رو نگه دار
  const keepMeta = !!local && r.level === "custom" && local.level !== "custom";
  return {
    id: r.id,
    level: (keepMeta ? local!.level : r.level) as ExercisePlanRow["level"],
    heightCm: keepMeta ? local!.heightCm : r.heightCm,
    weightKg: keepMeta ? local!.weightKg : r.weightKg,
    goal: keepMeta ? local!.goal : r.goal,
    hasPhysicalLimitation: keepMeta ? local!.hasPhysicalLimitation : r.hasPhysicalLimitation,
    gymDays: r.gymDays,
    trainingPhase: keepMeta ? local!.trainingPhase : r.trainingPhase,
    trainingMonth: keepMeta ? local!.trainingMonth : r.trainingMonth,
    equipment: keepMeta ? local!.equipment : r.equipment,
    generatedByAi: r.generatedByAi,
    startDate: r.startDate,
    isActive: r.isActive,
    planData: r.planData,
    createdAt: r.createdAt,
    // هر برنامه‌ای که سرور داره، قوانینش پذیرفته شده (شرطِ ساختش)
    rulesAcceptedAt: local?.rulesAcceptedAt ?? r.createdAt,
    updatedAt: r.editedAt,
    // آرشیوِ محلی (سرور حذف نداره) — اگه روی سرور دوباره فعال شد، از آرشیو درمیاد
    deletedAt: r.isActive ? null : (local?.deletedAt ?? null),
    dirty: 0,
  };
}

export function remoteExerciseLog(r: ExerciseLogRecord, local?: ExerciseLogRow): ExerciseLogRow {
  return {
    id: local?.id ?? newLocalId(),
    planId: r.planId || null,
    date: r.date,
    completed: r.completed,
    completedItems: r.completedItems ?? [],
    // یادداشت حالا با سرور سینک می‌شه (قبلا همیشه فقط محلی می‌موند).
    // این تابع صداش می‌زنیم فقط وقتی remoteWins (ریموت برنده‌ست)، پس مقدارِ
    // سرور رو معتبر بدون — نه fallback به local.notes.
    notes: r.notes ?? null,
    createdAt: local?.createdAt ?? r.editedAt,
    updatedAt: r.editedAt,
    deletedAt: null,
    dirty: 0,
  };
}

export function remoteFoodLog(r: FoodLogEntryRecord, local?: CalorieEntryRow): CalorieEntryRow {
  return {
    id: r.id,
    name: r.customName ?? local?.name ?? "غذا",
    ...per100FromTotals(r),
    grams: r.grams,
    date: r.date,
    // عینا — وب وعده‌ها رو با کلیدِ چیدمانِ هدف (snack1، snack2، …) گروه می‌کنه
    mealType: r.mealType ?? null,
    aiScanned: r.aiScanned,
    createdAt: r.createdAt,
    updatedAt: r.editedAt,
    deletedAt: r.deleted ? r.editedAt : null,
    dirty: 0,
  };
}

export function remoteCalorieTarget(r: CalorieTargetRecord, local?: CalorieTargetRow): CalorieTargetRow {
  return {
    id: r.id,
    dailyTargetKcal: r.dailyTargetKcal,
    goal: (r.goal as CalorieTargetRow["goal"]) ?? null,
    mealsPerDay: r.mealsPerDay,
    mealBreakdown: r.mealBreakdown,
    proteinTargetG: r.proteinTargetG,
    carbsTargetG: r.carbsTargetG,
    fatTargetG: r.fatTargetG,
    sex: (r.sex as CalorieTargetRow["sex"]) ?? null,
    ageYears: r.ageYears,
    heightCm: r.heightCm,
    weightKg: r.weightKg,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    synced: true,
    createdAt: local?.createdAt ?? r.effectiveFrom,
    updatedAt: r.editedAt,
    deletedAt: null,
    dirty: 0,
  };
}

// ─── اعمالِ رکوردهای pull ─────────────────────────────────────────────

export async function applyRemotePlan(r: ExercisePlanRecord, opts: { force?: boolean } = {}): Promise<boolean> {
  return fitnessDb.transaction("rw", fitnessDb.plans, async () => {
    const local = await fitnessDb.plans.get(r.id);
    if (!opts.force && !remoteWins(local, r.editedAt)) return false;
    return putIfChanged(fitnessDb.plans, local, remotePlan(r, local));
  });
}

export async function applyRemoteExerciseLog(r: ExerciseLogRecord): Promise<boolean> {
  if (!r.planId) return false;
  return fitnessDb.transaction("rw", fitnessDb.exerciseLogs, async () => {
    const local = await fitnessDb.exerciseLogs.where("[planId+date]").equals([r.planId, r.date]).first();
    if (!remoteWins(local, r.editedAt)) return false;
    return putIfChanged(fitnessDb.exerciseLogs, local, remoteExerciseLog(r, local));
  });
}

export async function applyRemoteFoodLog(r: FoodLogEntryRecord): Promise<boolean> {
  return fitnessDb.transaction("rw", fitnessDb.calorieEntries, async () => {
    const local = await fitnessDb.calorieEntries.get(r.id);
    if (!remoteWins(local, r.editedAt)) return false;
    return putIfChanged(fitnessDb.calorieEntries, local, remoteFoodLog(r, local));
  });
}

export async function applyRemoteCalorieTarget(r: CalorieTargetRecord): Promise<boolean> {
  return fitnessDb.transaction("rw", fitnessDb.calorieTargets, async () => {
    const local = await fitnessDb.calorieTargets.get(r.id);
    if (!remoteWins(local, r.editedAt)) return false;
    return putIfChanged(fitnessDb.calorieTargets, local, remoteCalorieTarget(r, local));
  });
}

/**
 * نتیجه‌ی موفقِ compute: سرور حالا این id رو داره (synced). اگه ردیف بعد از snapshot
 * ویرایش شده یا قبلش وعده‌هاش دستی چیده شده بود (mealsEdited — PATCHِ محلی روی هدفِ
 * هنوز-compute‌نشده)، چیدمانِ محلی می‌مونه و dirty با زمانِ تازه‌تر از editedAtِ سرور،
 * تا push ِ بعدی kind=meals بره (وگرنه splitMeals ِ سرور جاش می‌نشست) — true ← «repush»:
 * موتور همین sync یک دورِ دیگه می‌زنه.
 */
async function settleComputedTarget(id: string, pushedUpdatedAt: string, r: CalorieTargetRecord): Promise<boolean> {
  return fitnessDb.transaction("rw", fitnessDb.calorieTargets, async () => {
    const local = await fitnessDb.calorieTargets.get(id);
    if (!local) return false;
    const edited = local.updatedAt !== pushedUpdatedAt;
    if (!edited && !local.mealsEdited) {
      await fitnessDb.calorieTargets.put({ ...remoteCalorieTarget(r, local), dirty: 0 });
      return false;
    }
    if (local.effectiveTo || local.deletedAt) {
      // بعدش هدفِ جدیدتری ساخته شد — این یکی فقط «شناخته‌شده» می‌شه (push نمی‌شه)
      await fitnessDb.calorieTargets.update(id, { synced: true, mealsEdited: undefined });
      return false;
    }
    const bumped = new Date(Math.max(Date.now(), ms(r.editedAt) + 1, ms(local.updatedAt))).toISOString();
    await fitnessDb.calorieTargets.put({
      ...remoteCalorieTarget(r, local),
      dailyTargetKcal: local.dailyTargetKcal,
      mealsPerDay: local.mealsPerDay,
      mealBreakdown: local.mealBreakdown,
      proteinTargetG: local.proteinTargetG,
      carbsTargetG: local.carbsTargetG,
      fatTargetG: local.fatTargetG,
      mealsEdited: undefined,
      updatedAt: bumped,
      dirty: 1,
    });
    return true;
  });
}

// ─── تعمیرِ idهای قدیمی ────────────────────────────────────────────────

/** نسخه‌ی قبلیِ newLocalId (۳۳ کاراکتر) با الگوی سرور جور نبود → id تازه + به‌روزرسانیِ ارجاع‌ها */
async function fixIds(): Promise<void> {
  const badPlans = (await fitnessDb.plans.toArray()).filter((p) => !isValidClientId(p.id));
  const badEntries = (await fitnessDb.calorieEntries.toArray()).filter((e) => !isValidClientId(e.id));
  const badTargets = (await fitnessDb.calorieTargets.toArray()).filter((t) => !isValidClientId(t.id));
  if (!badPlans.length && !badEntries.length && !badTargets.length) return;
  await fitnessDb.transaction("rw", [fitnessDb.plans, fitnessDb.exerciseLogs, fitnessDb.setLogs, fitnessDb.calorieEntries, fitnessDb.calorieTargets], async () => {
    for (const p of badPlans) {
      const id = newLocalId();
      await fitnessDb.plans.put({ ...p, id, dirty: 1 });
      await fitnessDb.plans.delete(p.id);
      await fitnessDb.exerciseLogs.where("planId").equals(p.id).modify({ planId: id, dirty: 1 });
      await fitnessDb.setLogs.where("planId").equals(p.id).modify({ planId: id });
    }
    for (const e of badEntries) {
      await fitnessDb.calorieEntries.put({ ...e, id: newLocalId(), dirty: 1 });
      await fitnessDb.calorieEntries.delete(e.id);
    }
    for (const t of badTargets) {
      await fitnessDb.calorieTargets.put({ ...t, id: newLocalId(), synced: false, dirty: 1 });
      await fitnessDb.calorieTargets.delete(t.id);
    }
  });
}

// ─── آداپتور ────────────────────────────────────────────────────────────

export const fitnessAdapter: SyncAdapter = {
  name: "fitness",

  prepare: fixIds,

  async collect() {
    const items: PendingItem[] = [];

    // ترتیب مهمه: برنامه‌ها قبل از لاگ‌ها (سرور لاگِ برنامه‌ی ناموجود رو رد می‌کنه)
    for (const row of await fitnessDb.plans.where("dirty").equals(1).toArray()) {
      const updatedAt = row.updatedAt;
      items.push({
        fk: `plans:${row.id}`,
        updatedAt,
        change: planToChange(row),
        module: "EXERCISE",
        settle: async (rec) => {
          await settleRow<ExercisePlanRow>(fitnessDb.plans, row.id, updatedAt, (local) =>
            rec && (rec as ExercisePlanRecord).id === row.id ? remotePlan(rec as ExercisePlanRecord, local) : null
          );
        },
      });
    }

    for (const row of await fitnessDb.exerciseLogs.where("dirty").equals(1).toArray()) {
      const change = exerciseLogToChange(row);
      if (!change) continue;
      const updatedAt = row.updatedAt;
      items.push({
        fk: `exerciseLogs:${row.id}`,
        updatedAt,
        change,
        module: "EXERCISE",
        settle: async (rec) => {
          await settleRow<ExerciseLogRow>(fitnessDb.exerciseLogs, row.id, updatedAt, (local) => {
            const r = rec as ExerciseLogRecord | null;
            if (!r || r.planId !== local.planId || r.date !== local.date) return null;
            return { ...remoteExerciseLog(r, local), deletedAt: local.deletedAt && !r.completedItems.length ? local.deletedAt : null };
          });
        },
      });
    }

    for (const row of await fitnessDb.calorieEntries.where("dirty").equals(1).toArray()) {
      const change = calorieEntryToChange(row);
      if (!change) continue;
      const updatedAt = row.updatedAt;
      items.push({
        fk: `calorieEntries:${row.id}`,
        updatedAt,
        change,
        module: "CALORIE",
        settle: async (rec) => {
          await settleRow<CalorieEntryRow>(fitnessDb.calorieEntries, row.id, updatedAt, (local) => {
            const r = rec as FoodLogEntryRecord | null;
            if (!r || r.id !== row.id) return null;
            // نامِ محلی (snapshot) رو نگه دار — سرور ممکنه کوتاهش کرده باشه
            return { ...remoteFoodLog(r, local), name: local.name || r.customName || "غذا" };
          });
        },
      });
    }

    for (const row of await fitnessDb.calorieTargets.where("dirty").equals(1).toArray()) {
      const change = calorieTargetToChange(row);
      if (!change) {
        // هدفِ بسته‌شده/حذف‌شده push نمی‌شه (سرور خودش هدفِ قبلی رو می‌بنده) — فقط تمیز کن.
        // هدفِ بازِ ناقص (بدونِ قد/وزن/…) dirty می‌مونه تا کاربر کاملش کنه.
        if (row.effectiveTo || row.deletedAt) await fitnessDb.calorieTargets.update(row.id, { dirty: 0 });
        continue;
      }
      const updatedAt = row.updatedAt;
      items.push({
        fk: `calorieTargets:${row.id}`,
        updatedAt,
        change,
        module: "CALORIE",
        settle: async (rec) => {
          const r = rec as CalorieTargetRecord | null;
          if (r && r.id !== row.id) {
            // compute → stale: سرور هدفِ فعلیِ جدیدتری داره. اون رو بگیر و هدفِ محلیِ
            // ما رو (که روی سرور ساخته نشد) کنار بذار.
            await applyRemoteCalorieTarget(r);
            await settleRow<CalorieTargetRow>(fitnessDb.calorieTargets, row.id, updatedAt, (local) => ({
              ...local,
              effectiveTo: local.effectiveTo ?? r.effectiveFrom,
              deletedAt: new Date().toISOString(),
            }));
            return;
          }
          // calorieTargetToChange: synced=false ← kind=compute
          if (r && !row.synced) return (await settleComputedTarget(row.id, updatedAt, r)) ? "repush" : undefined;
          await settleRow<CalorieTargetRow>(fitnessDb.calorieTargets, row.id, updatedAt, (local) =>
            r ? remoteCalorieTarget(r, local) : null
          );
        },
      });
    }
    return items;
  },

  async applyPull(res) {
    // موجودیتِ ماژولِ قفل اصلا توی پاسخ نیست (undefined) — چیزی پاک نمی‌شه
    let applied = 0;
    const count = (ok: boolean) => void (ok && applied++);
    for (const r of res.exercisePlans ?? []) count(await applyRemotePlan(r));
    for (const r of res.exerciseLogs ?? []) count(await applyRemoteExerciseLog(r));
    for (const r of res.foodLogEntries ?? []) count(await applyRemoteFoodLog(r));
    for (const r of res.calorieTargets ?? []) count(await applyRemoteCalorieTarget(r));
    return applied;
  },

  async markAllDirty() {
    await fitnessDb.transaction(
      "rw",
      [fitnessDb.plans, fitnessDb.exerciseLogs, fitnessDb.calorieEntries, fitnessDb.calorieTargets],
      async () => {
        await fitnessDb.plans.toCollection().modify({ dirty: 1 });
        await fitnessDb.exerciseLogs.toCollection().modify({ dirty: 1 });
        await fitnessDb.calorieEntries.toCollection().modify({ dirty: 1 });
        // شاید حسابِ دیگه‌ای باشه — «سرور این id رو داره» دیگه معتبر نیست؛
        // هدفِ باز دوباره compute می‌شه (همون حساب: تساوی ← stale و بی‌ضرر)
        await fitnessDb.calorieTargets.toCollection().modify({ dirty: 1, synced: false });
      }
    );
  },
};

/** همه‌ی جدول‌هایی که نوشتنِ محلیشون باید سینکِ debounced رو راه بندازه */
export const fitnessSyncTables = [fitnessDb.plans, fitnessDb.exerciseLogs, fitnessDb.calorieEntries, fitnessDb.calorieTargets];

export type { SyncServerRecord };
