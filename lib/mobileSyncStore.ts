import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SyncChangeResult, SyncPullResponse } from "@/lib/mobileApiContract";
import {
  PULL_PAGE_LIMIT,
  computePullCursor,
  decideLww,
  serializeDailyEntry,
  serializeSetting,
  serializeSleepEntry,
  serializeTask,
  type ParsedChange,
} from "@/lib/mobileSync";
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

function syncStamp(clientAt: Date) {
  // updatedAt و syncWrittenAt دقیقا یک مقدار — نشانه‌ی «آخرین نویسنده موبایل بوده»
  const writeAt = new Date();
  return { updatedAt: writeAt, syncWrittenAt: writeAt, syncEditedAt: clientAt };
}

type Result = Omit<SyncChangeResult, "index">;

// ─── Pull ────────────────────────────────────────────────────────────────

export async function pullChanges(userId: string, since: Date | null): Promise<SyncPullResponse> {
  // زمانِ سرور *قبل* از کوئری‌ها گرفته می‌شه — هر چیزی که حینِ کوئری نوشته
  // بشه، دفعه‌ی بعد (با همپوشانیِ PULL_CURSOR_OVERLAP_MS) دوباره دیده می‌شه.
  const serverStart = new Date();
  const updatedAt = since ? { gt: since } : undefined;
  const page = { orderBy: { updatedAt: "asc" as const }, take: PULL_PAGE_LIMIT + 1 };

  const [daily, sleep, tasks, settings] = await Promise.all([
    prisma.dailyEntry.findMany({ where: { userId, updatedAt }, ...page }),
    prisma.sleepEntry.findMany({ where: { userId, updatedAt }, ...page }),
    // tombstoneها (deletedAt پر) عمدا برگردونده می‌شن
    prisma.task.findMany({ where: { userId, updatedAt }, ...page }),
    prisma.userSetting.findMany({
      where: { userId, key: { in: [...MOBILE_SYNC_SETTING_KEYS] }, updatedAt },
      ...page,
    }),
  ]);

  const truncated: Date[] = [];
  const trim = <T extends { updatedAt: Date }>(rows: T[]): T[] => {
    if (rows.length <= PULL_PAGE_LIMIT) return rows;
    const kept = rows.slice(0, PULL_PAGE_LIMIT);
    truncated.push(kept[kept.length - 1].updatedAt);
    return kept;
  };
  const d = trim(daily);
  const s = trim(sleep);
  const t = trim(tasks);
  const st = trim(settings);
  const { cursor, hasMore } = computePullCursor(serverStart, truncated);

  // اگه یک موجودیت بریده شد، ردیف‌های بقیه که updatedAtشون از cursor جلوتره
  // هم دوباره توی صفحه‌ی بعد میان — تکراری و بی‌ضرر، ولی حذفشون حجم رو کم می‌کنه.
  const keep = <T extends { updatedAt: Date }>(rows: T[]) => (hasMore ? rows.filter((r) => r.updatedAt <= cursor) : rows);

  return {
    cursor: cursor.toISOString(),
    hasMore,
    serverTime: serverStart.toISOString(),
    dailyEntries: keep(d).map(serializeDailyEntry),
    sleepEntries: keep(s).map(serializeSleepEntry),
    tasks: keep(t).map(serializeTask),
    settings: keep(st).map(serializeSetting),
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
  return { ...refOf(change), status: "rejected", error: "تغییر هم‌زمان — دوباره تلاش کن", serverRecord: null };
}

function refOf(change: ParsedChange): Pick<Result, "entity" | "key" | "id"> {
  return change.entity === "task" ? { entity: "task", id: change.id } : { entity: change.entity, key: change.key };
}

async function applyOnce(userId: string, change: ParsedChange): Promise<Result | "retry"> {
  const ref = refOf(change);

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
      if (change.op === "delete") return { ...ref, status: "applied", serverRecord: null };
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
    const existing = await prisma.sleepEntry.findUnique({ where });
    if (decideLww(existing, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: existing ? serializeSleepEntry(existing) : null };
    }
    const fields =
      change.op === "upsert"
        ? change.data
        : { sleptAt: null, wokeAt: null, targetSleptAt: null, targetWokeAt: null, quality: null };
    if (!existing) {
      if (change.op === "delete") return { ...ref, status: "applied", serverRecord: null };
      const row = await prisma.sleepEntry.create({ data: { userId, date: change.date, ...fields, ...syncStamp(change.clientAt) } });
      return { ...ref, status: "applied", serverRecord: serializeSleepEntry(row) };
    }
    const { count } = await prisma.sleepEntry.updateMany({
      where: { id: existing.id, userId, updatedAt: existing.updatedAt },
      data: { ...fields, ...syncStamp(change.clientAt) },
    });
    if (count === 0) return "retry";
    const row = await prisma.sleepEntry.findUnique({ where });
    return { ...ref, status: "applied", serverRecord: row ? serializeSleepEntry(row) : null };
  }

  if (change.entity === "task") {
    // id سراسری‌ـه (کلیدِ اصلی)، پس اول مالکیت: ردیفِ کاربرِ دیگه هیچ‌وقت نه
    // خونده می‌شه نه نوشته. پیامِ خطا با «id بدشکل» یکیه تا وجودِ id لو نره.
    const existing = await prisma.task.findUnique({ where: { id: change.id } });
    if (existing && existing.userId !== userId) {
      return { ...ref, status: "rejected", error: "شناسه‌ی تسک نامعتبر است", serverRecord: null };
    }
    if (decideLww(existing, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: existing ? serializeTask(existing) : null };
    }
    if (!existing) {
      // حذفِ تسکی که هیچ‌وقت به سرور نرسیده — چیزی برای نوشتن نیست
      if (change.op === "delete") return { ...ref, status: "applied", serverRecord: null };
      const row = await prisma.task.create({
        data: { id: change.id, userId, ...change.data, deletedAt: null, ...syncStamp(change.clientAt) },
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
    if (change.op === "delete") return { ...ref, status: "applied", serverRecord: null };
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
