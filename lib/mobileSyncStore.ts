import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MobileGatedModule, SyncPullResponse } from "@/lib/mobileApiContract";
import {
  PULL_BYTE_BUDGET,
  PULL_PAGE_LIMIT,
  PULL_PAGE_LIMIT_HEAVY,
  paginatePull,
  trimPage,
  type Stamped,
  decideLww,
  serializeCalorieTarget,
  serializeDailyEntry,
  serializeExerciseLog,
  serializeExercisePlan,
  serializeFoodLogEntry,
  serializeSetting,
  serializeSleepEntry,
  serializeTask,
  resolveSleepTargets,
  safeTimezone,
  syncStamp,
  type ParsedChange,
  type SyncResult as Result,
} from "@/lib/mobileSync";
import { applyFitnessOnce } from "@/lib/mobileSyncFitnessStore";
import { MOBILE_SYNC_SETTING_KEYS } from "@/lib/mobileApiContract";

// بخشِ دیتابیسیِ همگام‌سازیِ موبایل. هر کوئری با userId محدود می‌شه (ضد IDOR)
// و هر نوشتن روی ردیفِ موجود با `updatedAt` خوانده‌شده شرط‌گذاری می‌شه
// (optimistic concurrency): اگه بینِ خوندن و نوشتن، وب یا دستگاهِ دیگه‌ای
// همون ردیف رو عوض کرده باشه، updateMany صفر ردیف برمی‌گردونه و تصمیمِ LWW
// با نسخه‌ی تازه دوباره گرفته می‌شه — نه اینکه بی‌صدا روش بنویسیم.

const MAX_ATTEMPTS = 3;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** User.timezone (معتبر) — مبنای تبدیلِ "HH:mm"ِ هدف‌های خواب */
async function userTimezone(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return safeTimezone(u?.timezone);
}


// ─── Pull ────────────────────────────────────────────────────────────────

/** ماژول‌های پولی‌ای که الان دسترسی داره — route با checkModuleForUser پرش می‌کنه */
export type ModuleAccessMap = Record<MobileGatedModule, boolean>;

export async function pullChanges(
  userId: string,
  since: Date | null,
  access: ModuleAccessMap,
  byteBudget: number = PULL_BYTE_BUDGET
): Promise<SyncPullResponse> {
  // زمانِ سرور *قبل* از کوئری‌ها گرفته می‌شه — هر چیزی که حینِ کوئری نوشته
  // بشه، دفعه‌ی بعد (با همپوشانیِ PULL_CURSOR_OVERLAP_MS) دوباره دیده می‌شه.
  const serverStart = new Date();
  const updatedAt = since ? { gt: since } : undefined;
  const page = { orderBy: { updatedAt: "asc" as const }, take: PULL_PAGE_LIMIT + 1 };
  // موجودیت‌هایی که یک ردیفشون می‌تونه ~۱۰۰KB باشه سقفِ ردیفِ کوچیک‌تری دارن
  const heavyPage = { orderBy: { updatedAt: "asc" as const }, take: PULL_PAGE_LIMIT_HEAVY + 1 };
  const none = Promise.resolve(null);

  const [tz, daily, sleep, tasks, settings, plans, exLogs, foodLogs, targets] = await Promise.all([
    userTimezone(userId),
    prisma.dailyEntry.findMany({ where: { userId, updatedAt }, ...heavyPage }),
    prisma.sleepEntry.findMany({ where: { userId, updatedAt }, ...page }),
    // tombstoneها (deletedAt پر) عمدا برگردونده می‌شن
    prisma.task.findMany({ where: { userId, updatedAt }, ...page }),
    prisma.userSetting.findMany({
      where: { userId, key: { in: [...MOBILE_SYNC_SETTING_KEYS] }, updatedAt },
      ...page,
    }),
    // ماژولِ قفل → اصلا کوئری نمی‌زنیم و فیلد توی پاسخ نمیاد
    access.EXERCISE ? prisma.exercisePlan.findMany({ where: { userId, updatedAt }, ...heavyPage }) : none,
    access.EXERCISE ? prisma.exerciseLog.findMany({ where: { userId, planId: { not: null }, updatedAt }, ...heavyPage }) : none,
    access.CALORIE ? prisma.foodLogEntry.findMany({ where: { userId, updatedAt }, ...page }) : none,
    access.CALORIE ? prisma.calorieTarget.findMany({ where: { userId, updatedAt }, ...page }) : none,
  ]);

  const truncated: Date[] = [];
  const stamp = <T extends { updatedAt: Date }, R>(rows: T[], limit: number, ser: (r: T) => R): Stamped<R>[] =>
    trimPage(rows, limit, truncated).map((r) => ({ at: r.updatedAt, rec: ser(r) }));
  const groups = {
    dailyEntries: stamp(daily, PULL_PAGE_LIMIT_HEAVY, serializeDailyEntry),
    sleepEntries: stamp(sleep, PULL_PAGE_LIMIT, (r) => serializeSleepEntry(r, tz)),
    tasks: stamp(tasks, PULL_PAGE_LIMIT, serializeTask),
    settings: stamp(settings, PULL_PAGE_LIMIT, serializeSetting),
    exercisePlans: plans ? stamp(plans, PULL_PAGE_LIMIT_HEAVY, serializeExercisePlan) : [],
    exerciseLogs: exLogs ? stamp(exLogs, PULL_PAGE_LIMIT_HEAVY, serializeExerciseLog) : [],
    foodLogEntries: foodLogs ? stamp(foodLogs, PULL_PAGE_LIMIT, serializeFoodLogEntry) : [],
    calorieTargets: targets ? stamp(targets, PULL_PAGE_LIMIT, serializeCalorieTarget) : [],
  };
  // سقفِ ردیف + بودجه‌ی بایت (lib/mobileSync.ts → paginatePull)
  const { cursor, hasMore, page: out } = paginatePull(serverStart, groups, truncated, byteBudget);

  const lockedModules = (Object.keys(access) as MobileGatedModule[]).filter((m) => !access[m]);
  return {
    cursor: cursor.toISOString(),
    hasMore,
    serverTime: serverStart.toISOString(),
    dailyEntries: out.dailyEntries,
    sleepEntries: out.sleepEntries,
    tasks: out.tasks,
    settings: out.settings,
    lockedModules,
    ...(plans ? { exercisePlans: out.exercisePlans } : {}),
    ...(exLogs ? { exerciseLogs: out.exerciseLogs } : {}),
    ...(foodLogs ? { foodLogEntries: out.foodLogEntries } : {}),
    ...(targets ? { calorieTargets: out.calorieTargets } : {}),
  };
}

// ─── Push ────────────────────────────────────────────────────────────────

export async function applyChange(userId: string, change: ParsedChange): Promise<Result> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const r = await applyOnce(userId, change);
      if (r !== "retry") return r;
    } catch (err) {
      // دو push هم‌زمان که هر دو ردیفِ ناموجود رو create می‌کنن → یکی P2002
      // می‌خوره؛ دور بعد ردیف پیدا می‌شه و LWW عادی تصمیم می‌گیره.
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return { ...refOf(change), status: "rejected", code: "busy", error: "تغییر هم‌زمان — دوباره تلاش کن", serverRecord: null };
}

export function refOf(change: ParsedChange): Pick<Result, "entity" | "key" | "id"> {
  return "id" in change ? { entity: change.entity, id: change.id } : { entity: change.entity, key: change.key };
}

async function applyOnce(userId: string, change: ParsedChange): Promise<Result | "retry"> {
  const ref = refOf(change);

  if (
    change.entity === "exercisePlan" ||
    change.entity === "exerciseLog" ||
    change.entity === "foodLogEntry" ||
    change.entity === "calorieTarget"
  ) {
    return applyFitnessOnce(userId, change, ref);
  }

  if (change.entity === "dailyEntry") {
    const where = { userId_date: { userId, date: change.date } };
    const existing = await prisma.dailyEntry.findUnique({ where });
    if (decideLww(existing, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: existing ? serializeDailyEntry(existing) : null };
    }
    // delete = پاک‌کردنِ محتوای روز (ردیف می‌مونه تا به‌عنوان tombstoneِ LWW کار کنه)
    const fields =
      change.op === "upsert"
        ? { completedItems: change.data.completedItems, wakeUpAt: change.data.wakeUpAt }
        : { completedItems: {}, wakeUpAt: null };
    if (!existing) {
      // delete هم ردیف می‌سازه (tombstoneِ خالی) — وگرنه یک upsertِ قدیمی‌ترِ
      // دستگاهِ دیگه که بعدا برسه، هیچ ردیفی برای مقایسه پیدا نمی‌کرد و برنده می‌شد.
      const row = await prisma.dailyEntry.create({ data: { userId, date: change.date, ...fields, ...syncStamp(change.clientAt) } });
      return { ...ref, status: "applied", serverRecord: serializeDailyEntry(row) };
    }
    const { count } = await prisma.dailyEntry.updateMany({
      where: { id: existing.id, userId, updatedAt: existing.updatedAt },
      data: { ...fields, ...syncStamp(change.clientAt) },
    });
    if (count === 0) return "retry";
    const row = await prisma.dailyEntry.findUnique({ where });
    return { ...ref, status: "applied", serverRecord: row ? serializeDailyEntry(row) : null };
  }

  if (change.entity === "sleepEntry") {
    const where = { userId_date: { userId, date: change.date } };
    const [existing, tz] = await Promise.all([prisma.sleepEntry.findUnique({ where }), userTimezone(userId)]);
    const serializeSleep = (r: Parameters<typeof serializeSleepEntry>[0]) => serializeSleepEntry(r, tz);
    if (decideLww(existing, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: existing ? serializeSleep(existing) : null };
    }
    // هدف‌های "HH:mm" با تاریخِ همین روز و User.timezone به UTC تبدیل می‌شن
    const fields =
      change.op === "upsert"
        ? resolveSleepTargets(change.data, change.key, tz)
        : { sleptAt: null, wokeAt: null, targetSleptAt: null, targetWokeAt: null, quality: null };
    if (!existing) {
      const row = await prisma.sleepEntry.create({ data: { userId, date: change.date, ...fields, ...syncStamp(change.clientAt) } });
      return { ...ref, status: "applied", serverRecord: serializeSleep(row) };
    }
    const { count } = await prisma.sleepEntry.updateMany({
      where: { id: existing.id, userId, updatedAt: existing.updatedAt },
      data: { ...fields, ...syncStamp(change.clientAt) },
    });
    if (count === 0) return "retry";
    const row = await prisma.sleepEntry.findUnique({ where });
    return { ...ref, status: "applied", serverRecord: row ? serializeSleep(row) : null };
  }

  if (change.entity === "task") {
    // id سراسری‌ـه (کلیدِ اصلی)، پس اول مالکیت: ردیفِ کاربرِ دیگه هیچ‌وقت نه
    // خونده می‌شه نه نوشته. پیامِ خطا با «id بدشکل» یکیه تا وجودِ id لو نره.
    const existing = await prisma.task.findUnique({ where: { id: change.id } });
    if (existing && existing.userId !== userId) {
      return { ...ref, status: "rejected", code: "invalid", error: "شناسه‌ی تسک نامعتبر است", serverRecord: null };
    }
    if (decideLww(existing, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: existing ? serializeTask(existing) : null };
    }
    if (!existing) {
      // حذفِ تسکی که هیچ‌وقت به سرور نرسیده → tombstone با همین id، تا upsertِ
      // قدیمی‌ترِ همون تسک (از صفِ یک دستگاهِ دیگه) بعدا stale بشه نه زنده.
      const fields =
        change.op === "upsert"
          ? { ...change.data, deletedAt: null }
          : { title: "", notes: null, dueDate: null, priority: 0, completedAt: null, deletedAt: change.clientAt };
      const row = await prisma.task.create({
        data: { id: change.id, userId, ...fields, ...syncStamp(change.clientAt) },
      });
      return { ...ref, status: "applied", serverRecord: serializeTask(row) };
    }
    const fields = change.op === "upsert" ? { ...change.data, deletedAt: null } : { deletedAt: change.clientAt };
    const { count } = await prisma.task.updateMany({
      where: { id: existing.id, userId, updatedAt: existing.updatedAt },
      data: { ...fields, ...syncStamp(change.clientAt) },
    });
    if (count === 0) return "retry";
    const row = await prisma.task.findFirst({ where: { id: existing.id, userId } });
    return { ...ref, status: "applied", serverRecord: row ? serializeTask(row) : null };
  }

  // setting
  const where = { userId_key: { userId, key: change.key } };
  const existing = await prisma.userSetting.findUnique({ where });
  if (decideLww(existing, change.clientAt) === "stale") {
    return { ...ref, status: "stale", serverRecord: existing ? serializeSetting(existing) : null };
  }
  const value = change.op === "upsert" && change.value !== null ? (change.value as Prisma.InputJsonValue) : Prisma.JsonNull;
  if (!existing) {
    // delete → ردیف با JSON null (tombstone)
    const row = await prisma.userSetting.create({ data: { userId, key: change.key, value, ...syncStamp(change.clientAt) } });
    return { ...ref, status: "applied", serverRecord: serializeSetting(row) };
  }
  const { count } = await prisma.userSetting.updateMany({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { value, ...syncStamp(change.clientAt) },
  });
  if (count === 0) return "retry";
  const row = await prisma.userSetting.findUnique({ where });
  return { ...ref, status: "applied", serverRecord: row ? serializeSetting(row) : null };
}
