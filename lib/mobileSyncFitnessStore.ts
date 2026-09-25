import { prisma } from "@/lib/prisma";
import type { SyncRejectCode } from "@/lib/mobileApiContract";
import { computeCalorieTarget } from "@/lib/calorieTargetService";
import {
  decideLww,
  effectiveEditedAt,
  serializeCalorieTarget,
  serializeExerciseLog,
  serializeExercisePlan,
  serializeFoodLogEntry,
  syncStamp,
  type ParsedChange,
  type SyncResult,
} from "@/lib/mobileSync";

// بخشِ دیتابیسیِ همگام‌سازیِ بدنسازی/کالری (فاز ۴). همون قراردادهای
// lib/mobileSyncStore.ts: هر کوئری با userId، هر نوشتن روی ردیفِ موجود با
// شرطِ updatedAtِ خوانده‌شده (retry اگه وسطش عوض شد)، و id سراسری‌ای که مالِ
// کاربرِ دیگه‌ست هیچ‌وقت نه خونده می‌شه نه نوشته.
//
// گیتِ ماژول (EXERCISE/CALORIE) این‌جا نیست — push route قبل از رسیدن به این
// فایل چکش می‌کنه (module_locked).

type FitnessChange = Extract<ParsedChange, { entity: "exercisePlan" | "exerciseLog" | "foodLogEntry" | "calorieTarget" }>;
type Ref = Pick<SyncResult, "entity" | "key" | "id">;

const rejected = (ref: Ref, error: string, code: SyncRejectCode = "invalid"): SyncResult => ({ ...ref, status: "rejected", code, error, serverRecord: null });

/** تاریخِ UTCِ یک لحظه به‌شکلِ ستونِ @db.Date */
function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function applyFitnessOnce(userId: string, change: FitnessChange, ref: Ref): Promise<SyncResult | "retry"> {
  switch (change.entity) {
    case "exercisePlan":
      return applyExercisePlan(userId, change, ref);
    case "exerciseLog":
      return applyExerciseLog(userId, change, ref);
    case "foodLogEntry":
      return applyFoodLog(userId, change, ref);
    case "calorieTarget":
      return applyCalorieTarget(userId, change, ref);
  }
}

// ─── ExercisePlan ────────────────────────────────────────────────────────

/** «همیشه فقط یک برنامه‌ی فعال» — همون قاعده‌ی /api/exercise/plan */
async function deactivateOtherPlans(userId: string, keepId: string) {
  await prisma.exercisePlan.updateMany({ where: { userId, isActive: true, id: { not: keepId } }, data: { isActive: false } });
}

async function applyExercisePlan(
  userId: string,
  change: Extract<FitnessChange, { entity: "exercisePlan" }>,
  ref: Ref
): Promise<SyncResult | "retry"> {
  const existing = await prisma.exercisePlan.findUnique({ where: { id: change.id } });
  if (existing && existing.userId !== userId) return rejected(ref, "شناسه‌ی برنامه نامعتبر است");
  if (decideLww(existing, change.clientAt) === "stale") {
    return { ...ref, status: "stale", serverRecord: existing ? serializeExercisePlan(existing) : null };
  }

  const { planData, isActive, rulesAccepted, meta } = change.data;
  // gymDays: اگه فرستاده نشده، از خودِ روزهای برنامه — همون کاری که /api/exercise/plan/manual می‌کنه
  const gymDays = meta.gymDays ?? planData.map((d) => d.day);
  // فقط فیلدهای فرستاده‌شده (ویرایش: بقیه دست نمی‌خورن)
  const { gymDays: _g, ...metaFields } = meta;

  if (!existing) {
    // برنامه‌ی دستی یا قالبیِ آفلاین (برنامه‌ی AI از endpointِ AI)، و مثل وب
    // بدونِ پذیرفتنِ قوانین/سلبِ مسئولیت نه. generatedByAi همیشه false.
    if (!rulesAccepted) return rejected(ref, "قبول‌کردن قوانین الزامی است");
    const row = await prisma.exercisePlan.create({
      data: {
        id: change.id,
        userId,
        level: "custom",
        goal: null,
        hasPhysicalLimitation: false,
        trainingPhase: "none",
        ...metaFields,
        disclaimerAcceptedAt: new Date(),
        gymDays: gymDays as any,
        generatedByAi: false,
        isActive,
        planData: planData as any,
        ...syncStamp(change.clientAt),
      },
    });
    if (isActive) await deactivateOtherPlans(userId, row.id);
    return { ...ref, status: "applied", serverRecord: serializeExercisePlan(row) };
  }

  const { count } = await prisma.exercisePlan.updateMany({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...metaFields, planData: planData as any, gymDays: gymDays as any, isActive, ...syncStamp(change.clientAt) },
  });
  if (count === 0) return "retry";
  if (isActive) await deactivateOtherPlans(userId, existing.id);
  const row = await prisma.exercisePlan.findFirst({ where: { id: existing.id, userId } });
  return { ...ref, status: "applied", serverRecord: row ? serializeExercisePlan(row) : null };
}

// ─── ExerciseLog ─────────────────────────────────────────────────────────

async function applyExerciseLog(
  userId: string,
  change: Extract<FitnessChange, { entity: "exerciseLog" }>,
  ref: Ref
): Promise<SyncResult | "retry"> {
  // لاگ فقط روی برنامه‌ی *خودِ* کاربر (وب این رو چک نمی‌کرد؛ این‌جا سخت‌گیرتریم)
  const plan = await prisma.exercisePlan.findFirst({ where: { id: change.planId, userId }, select: { id: true } });
  if (!plan) return rejected(ref, "برنامه پیدا نشد", "not_found");

  const where = { userId_planId_date: { userId, planId: change.planId, date: change.date } };
  const existing = await prisma.exerciseLog.findUnique({ where });
  if (decideLww(existing, change.clientAt) === "stale") {
    return { ...ref, status: "stale", serverRecord: existing ? serializeExerciseLog(existing) : null };
  }
  // delete = پاک‌کردنِ جلسه؛ ردیف (حتی اگه نبود) به‌عنوان tombstone می‌مونه
  const fields = change.op === "upsert" ? change.data : { completed: false, completedItems: [] as string[], notes: null };

  if (!existing) {
    const row = await prisma.exerciseLog.create({
      data: { userId, planId: change.planId, date: change.date, ...fields, ...syncStamp(change.clientAt) },
    });
    return { ...ref, status: "applied", serverRecord: serializeExerciseLog(row) };
  }
  const { count } = await prisma.exerciseLog.updateMany({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...fields, ...syncStamp(change.clientAt) },
  });
  if (count === 0) return "retry";
  const row = await prisma.exerciseLog.findUnique({ where });
  return { ...ref, status: "applied", serverRecord: row ? serializeExerciseLog(row) : null };
}

// ─── FoodLogEntry ────────────────────────────────────────────────────────

async function applyFoodLog(
  userId: string,
  change: Extract<FitnessChange, { entity: "foodLogEntry" }>,
  ref: Ref
): Promise<SyncResult | "retry"> {
  const existing = await prisma.foodLogEntry.findUnique({ where: { id: change.id } });
  if (existing && existing.userId !== userId) return rejected(ref, "شناسه‌ی ثبتِ غذا نامعتبر است");
  if (decideLww(existing, change.clientAt) === "stale") {
    return { ...ref, status: "stale", serverRecord: existing ? serializeFoodLogEntry(existing) : null };
  }

  if (!existing) {
    const data =
      change.op === "upsert"
        ? { ...change.data, deletedAt: null }
        : // tombstoneِ ثبتی که سرور هیچ‌وقت ندیده — فیلدهای اجباری با مقدارِ خنثی؛
          // همه‌ی خواندنی‌ها deletedAt: null فیلتر می‌کنن، پس هیچ‌جا دیده نمی‌شه.
          { date: utcDay(change.clientAt), grams: 0, deletedAt: change.clientAt };
    const row = await prisma.foodLogEntry.create({ data: { id: change.id, userId, ...data, ...syncStamp(change.clientAt) } });
    return { ...ref, status: "applied", serverRecord: serializeFoodLogEntry(row) };
  }
  const fields = change.op === "upsert" ? { ...change.data, deletedAt: null } : { deletedAt: change.clientAt };
  const { count } = await prisma.foodLogEntry.updateMany({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...fields, ...syncStamp(change.clientAt) },
  });
  if (count === 0) return "retry";
  const row = await prisma.foodLogEntry.findFirst({ where: { id: existing.id, userId } });
  return { ...ref, status: "applied", serverRecord: row ? serializeFoodLogEntry(row) : null };
}

// ─── CalorieTarget ───────────────────────────────────────────────────────

async function applyCalorieTarget(
  userId: string,
  change: Extract<FitnessChange, { entity: "calorieTarget" }>,
  ref: Ref
): Promise<SyncResult | "retry"> {
  const existing = await prisma.calorieTarget.findUnique({ where: { id: change.id } });
  if (existing && existing.userId !== userId) return rejected(ref, "شناسه‌ی هدف کالری نامعتبر است");

  if (change.data.kind === "compute") {
    if (existing) {
      // retry همون تغییر (تساوی) → stale؛ «دوباره حساب کن» روی id قدیمی → نه
      if (decideLww(existing, change.clientAt) === "stale") {
        return { ...ref, status: "stale", serverRecord: serializeCalorieTarget(existing) };
      }
      return rejected(ref, "برای هدفِ جدید id جدید بفرست");
    }

    // LWW روی «هدفِ فعلی»: اگه هدفِ بازِ سرور بعد از این ویرایش ساخته/عوض
    // شده، این هدفِ قدیمی‌تر نباید جاش بشینه.
    const open = await prisma.calorieTarget.findMany({ where: { userId, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
    const newer = open.find((t) => effectiveEditedAt(t).getTime() >= change.clientAt.getTime());
    if (newer) return { ...ref, status: "stale", serverRecord: serializeCalorieTarget(newer) };

    const computed = await computeCalorieTarget(userId, change.data.input);
    if (!computed.ok) return rejected(ref, computed.error);
    const { mealBreakdown, ...fields } = computed.value;

    const [, row] = await prisma.$transaction([
      // هدفِ قبلی بسته می‌شه، هدفِ جدید از حالا — مثل POST /api/calorie/target
      prisma.calorieTarget.updateMany({
        where: { userId, effectiveTo: null, id: { in: open.map((t) => t.id) } },
        data: { effectiveTo: new Date() },
      }),
      prisma.calorieTarget.create({
        data: { id: change.id, userId, ...fields, mealBreakdown: mealBreakdown as any, ...syncStamp(change.clientAt) },
      }),
    ]);
    return { ...ref, status: "applied", serverRecord: serializeCalorieTarget(row) };
  }

  // meals: فقط روی هدفِ *فعلیِ* موجود — مثل PATCH /api/calorie/target
  if (!existing) return rejected(ref, "اول باید هدف کالری‌ات را بسازی", "not_found");
  if (decideLww(existing, change.clientAt) === "stale") {
    return { ...ref, status: "stale", serverRecord: serializeCalorieTarget(existing) };
  }
  if (existing.effectiveTo) return rejected(ref, "این هدف دیگر فعال نیست", "conflict");
  const { mealBreakdown, ...patch } = change.data.patch;
  const { count } = await prisma.calorieTarget.updateMany({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt, effectiveTo: null },
    data: { ...patch, mealBreakdown: mealBreakdown as any, ...syncStamp(change.clientAt) },
  });
  if (count === 0) return "retry";
  const row = await prisma.calorieTarget.findFirst({ where: { id: existing.id, userId } });
  return { ...ref, status: "applied", serverRecord: row ? serializeCalorieTarget(row) : null };
}
