import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveModules } from "@/lib/mobileAuth";
import { PULL_BYTE_BUDGET, PULL_PAGE_LIMIT, decideLww, paginatePull, trimPage, type Stamped } from "@/lib/mobileSync";
import {
  TRADE_SYNC_SETTING_KEYS,
  type TradeDeletableEntity,
  type TradeSyncChangeResult,
  type TradeSyncPullResponse,
  type TradeSyncRejectCode,
  type TradeSyncServerRecord,
} from "@/lib/mobileTradeContract";
import {
  buildChecklistSnapshot,
  checklistEditedAt,
  decideAgainstTombstone,
  nextArchivedAt,
  prepareEntryWrite,
  serializeTombstone,
  serializeTradeAccount,
  serializeTradeChecklist,
  serializeTradeEntry,
  serializeTradeNote,
  serializeTradeSetting,
  serializeTradeTag,
  tradeEntryManualEditedAt,
  type ParsedTradeChange,
} from "@/lib/mobileTradeSync";
import { MAX_ACCOUNTS, MAX_CHECKLISTS, MAX_TAGS } from "@/lib/tradeTypes";

// بخشِ دیتابیسیِ همگام‌سازیِ ترید. قواعد همون lib/mobileSyncStore.ts:
//   • هر کوئری با userId محدود می‌شه (ضد IDOR)؛ id سراسریه، پس ردیفِ کاربرِ
//     دیگه با همون پیامِ «شناسه نامعتبر» رد می‌شه که id بدشکل — وجودش لو نمی‌ره.
//   • هر نوشتن روی ردیفِ موجود با updatedAtِ خوانده‌شده شرط‌گذاری می‌شه
//     (optimistic concurrency) و در صورتِ تغییرِ هم‌زمان، LWW دوباره تصمیم می‌گیره.
//   • ماژولِ TRADE سمتِ سرور چک می‌شه (همون منطقِ requireModule، روی کاربرِ
//     توکنِ موبایل) — گیتِ کلاینت قابلِ دور زدنه.

const MAX_ATTEMPTS = 3;
const MAX_NOTES = 300; // هم‌سقفِ /api/trade/notes

const ACCOUNT_INCLUDE = {
  tags: { select: { id: true } },
  mtLink: { select: { tokenHash: true, revokedAt: true, lastSyncAt: true } },
} as const;
const ENTRY_INCLUDE = { tags: { select: { id: true } }, _count: { select: { images: true } } } as const;
const NOTE_INCLUDE = { tags: { select: { id: true } } } as const;
const CHECKLIST_INCLUDE = { items: true } as const;

type Result = Omit<TradeSyncChangeResult, "index">;

/** نوشتنِ هم‌زمان بینِ خوندن و نوشتن تشخیص داده شد — دورِ بعدِ applyTradeChange */
class RetrySignal extends Error {}

function isPrismaCode(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

function syncStamp(clientAt: Date) {
  // updatedAt و syncWrittenAt دقیقا یک مقدار — نشانه‌ی «آخرین نویسنده موبایل بوده»
  const writeAt = new Date();
  return { updatedAt: writeAt, syncWrittenAt: writeAt, syncEditedAt: clientAt };
}

// ─── دسترسی ──────────────────────────────────────────────────────────────

/** همون تصمیمِ requireModule(TRADE): سوپریوزر، یا ModuleAccessِ فعال و منقضی‌نشده */
export async function hasTradeModule(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isSuperAdmin: true } });
  if (!user) return false;
  return (await getActiveModules(user)).includes("TRADE");
}

// ─── Pull ────────────────────────────────────────────────────────────────

export async function pullTradeChanges(userId: string, since: Date | null, byteBudget: number = PULL_BYTE_BUDGET): Promise<TradeSyncPullResponse> {
  const serverStart = new Date();
  const empty = { accounts: [], tags: [], checklists: [], entries: [], notes: [], settings: [], tombstones: [] };
  if (!(await hasTradeModule(userId))) {
    // cursor جلو نمی‌ره: بعد از تمدید، از همون نقطه ادامه می‌ده و چیزی گم نمی‌شه
    return { cursor: since ? since.toISOString() : null, hasMore: false, serverTime: serverStart.toISOString(), moduleLocked: true, ...empty };
  }

  const updatedAt = since ? { gt: since } : undefined;
  const page = { orderBy: { updatedAt: "asc" as const }, take: PULL_PAGE_LIMIT + 1 };

  const [accounts, tags, entries, notes, settings, tombstones, checklists] = await Promise.all([
    prisma.tradeAccount.findMany({ where: { userId, updatedAt }, include: ACCOUNT_INCLUDE, ...page }),
    prisma.tradeTag.findMany({ where: { userId, updatedAt }, ...page }),
    prisma.tradeEntry.findMany({ where: { userId, updatedAt }, include: ENTRY_INCLUDE, ...page }),
    prisma.tradeNote.findMany({ where: { userId, updatedAt }, include: NOTE_INCLUDE, ...page }),
    prisma.userSetting.findMany({ where: { userId, key: { in: [...TRADE_SYNC_SETTING_KEYS] }, updatedAt }, ...page }),
    prisma.tradeSyncTombstone.findMany({ where: { userId, updatedAt }, ...page }),
    pullChecklistPage(userId, since),
  ]);

  const truncated: Date[] = [];
  const stamp = <T extends { updatedAt: Date }, R>(rows: T[], ser: (r: T) => R): Stamped<R>[] =>
    trimPage(rows, PULL_PAGE_LIMIT, truncated).map((r) => ({ at: r.updatedAt, rec: ser(r) }));
  if (checklists.truncatedAt) truncated.push(checklists.truncatedAt);
  const groups = {
    accounts: stamp(accounts, serializeTradeAccount),
    tags: stamp(tags, serializeTradeTag),
    // زمانِ صفحه‌بندیِ چک‌لیست = زمانِ مؤثر (خودش یا دیرترین آیتمش) — تیکِ وب فقط آیتم رو عوض می‌کنه
    checklists: checklists.rows.map((r) => ({ at: checklistPageAt(r), rec: serializeTradeChecklist(r) })),
    entries: stamp(entries, serializeTradeEntry),
    notes: stamp(notes, serializeTradeNote),
    settings: stamp(settings, serializeTradeSetting),
    tombstones: stamp(tombstones, serializeTombstone),
  };
  // سقفِ ردیف + بودجه‌ی بایت (lib/mobileSync.ts → paginatePull)
  const { cursor, hasMore, page: out } = paginatePull(serverStart, groups, truncated, byteBudget);

  return {
    cursor: cursor.toISOString(),
    hasMore,
    serverTime: serverStart.toISOString(),
    moduleLocked: false,
    ...out,
  };
}

/** زمانِ صفحه‌بندیِ چک‌لیست: max(updatedAtِ خودش، updatedAtِ آیتم‌هاش) */
function checklistPageAt(r: { updatedAt: Date; items: { updatedAt: Date }[] }): Date {
  return new Date(Math.max(r.updatedAt.getTime(), ...r.items.map((i) => i.updatedAt.getTime())));
}

/**
 * چک‌لیست‌های تغییرکرده، صفحه‌بندی‌شده با زمانِ مؤثر. شرطِ OR روی آیتم‌ها با
 * orderBy/takeِ دیتابیس جور درنمیاد، پس اول یک کوئریِ سبک (فقط id و زمان‌ها)،
 * مرتب‌سازی و بریدن در حافظه، بعد ردیفِ کاملِ همون صفحه. قبلا سقفِ ثابتِ ۵۰۰
 * بدونِ hasMore بود و مازادش بی‌صدا هیچ‌وقت همگام نمی‌شد.
 */
async function pullChecklistPage(userId: string, since: Date | null) {
  const light = await prisma.tradeChecklist.findMany({
    where: { userId, ...(since ? { OR: [{ updatedAt: { gt: since } }, { items: { some: { updatedAt: { gt: since } } } }] } : {}) },
    select: { id: true, updatedAt: true, items: { select: { updatedAt: true } } },
  });
  const ordered = light
    .map((r) => ({ id: r.id, at: checklistPageAt(r) }))
    .filter((r) => !since || r.at.getTime() > since.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const kept = ordered.slice(0, PULL_PAGE_LIMIT);
  const truncatedAt = ordered.length > PULL_PAGE_LIMIT ? kept[kept.length - 1].at : null;
  const rows = kept.length
    ? await prisma.tradeChecklist.findMany({ where: { userId, id: { in: kept.map((k) => k.id) } }, include: CHECKLIST_INCLUDE })
    : [];
  return { rows, truncatedAt };
}

// ─── Push ────────────────────────────────────────────────────────────────

function refOf(change: ParsedTradeChange): Pick<Result, "entity" | "id" | "key"> {
  return change.entity === "tradeSetting" ? { entity: change.entity, key: change.key } : { entity: change.entity, id: change.id };
}

function reject(change: ParsedTradeChange, code: TradeSyncRejectCode, error: string): Result {
  return { ...refOf(change), status: "rejected", code, error, serverRecord: null };
}

export async function applyTradeChange(userId: string, change: ParsedTradeChange): Promise<Result> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const r = await applyOnce(userId, change);
      if (r !== "retry") return r;
    } catch (err) {
      // P2002: دو ساختِ هم‌زمان با یک id / نامِ برچسب؛ P2025: شرطِ updatedAt
      // دیگه برقرار نبود. هر دو → دورِ بعد با ردیفِ تازه.
      if (!(err instanceof RetrySignal) && !isPrismaCode(err, "P2002") && !isPrismaCode(err, "P2025")) throw err;
    }
  }
  return reject(change, "busy", "تغییر هم‌زمان — دوباره تلاش کن");
}

async function tombstoneOf(userId: string, entity: string, entityId: string) {
  return prisma.tradeSyncTombstone.findUnique({ where: { userId_entity_entityId: { userId, entity, entityId } } });
}

/** tombstoneِ حذفِ موبایل: زمانِ منطقی = clientUpdatedAt (trigger همون لحظه زمانِ سرور نوشته بود) */
function writeTombstone(tx: Prisma.TransactionClient, userId: string, entity: string, entityId: string, clientAt: Date) {
  const now = new Date();
  return tx.tradeSyncTombstone.upsert({
    where: { userId_entity_entityId: { userId, entity, entityId } },
    create: { userId, entity, entityId, deletedAt: clientAt, updatedAt: now },
    update: { deletedAt: clientAt, updatedAt: now },
  });
}

async function ownedTagIds(userId: string, ids: string[]): Promise<{ id: string }[]> {
  if (!ids.length) return [];
  return prisma.tradeTag.findMany({ where: { id: { in: ids }, userId }, select: { id: true } });
}

async function applyOnce(userId: string, change: ParsedTradeChange): Promise<Result | "retry"> {
  if (change.entity === "tradeSetting") return applySetting(userId, change);

  const ref = refOf(change);
  const loaded = await loadRow(change.entity, change.id);
  if (loaded && loaded.userId !== userId) return reject(change, "invalid", "شناسه نامعتبر است");
  const existing = loaded;

  // ─── حذف ───
  if (change.op === "delete") {
    const entity = change.entity as TradeDeletableEntity;
    if (!existing) {
      // حذفِ رکوردی که سرور نداره (هرگز نرسیده یا قبلا حذف شده) → tombstone،
      // تا upsertِ قدیمی‌ترِ یک دستگاهِ دیگه بعدا زنده‌ش نکنه.
      const tomb = await tombstoneOf(userId, entity, change.id);
      if (tomb && decideAgainstTombstone(tomb, change.clientAt) === "stale") {
        return { ...ref, status: "stale", serverRecord: serializeTombstone(tomb) };
      }
      const row = await writeTombstone(prisma, userId, entity, change.id, change.clientAt);
      return { ...ref, status: "applied", serverRecord: serializeTombstone(row) };
    }
    if (clientBeats(existing, change.clientAt) === "stale") return { ...ref, status: "stale", serverRecord: await serverRecordOf(entity, change.id) };
    const row = await prisma.$transaction(async (tx) => {
      const { count } = await deleteGuarded(tx, entity, existing);
      if (count === 0) throw new RetrySignal();
      return writeTombstone(tx, userId, entity, change.id, change.clientAt);
    });
    return { ...ref, status: "applied", serverRecord: serializeTombstone(row) };
  }

  // ─── upsert ───
  if (existing) {
    // معامله‌ی متاتریدری: فقط فیلدهای دستی عوض می‌شن، پس LWW هم فقط با زمانِ
    // آخرین ویرایشِ دستی — syncهای EA بعد از ویرایشِ آفلاین برنده نمی‌شن.
    const beats =
      change.entity === "tradeEntry" && (existing as EntryRow).externalId
        ? change.clientAt.getTime() > tradeEntryManualEditedAt(existing as EntryRow).getTime()
          ? "apply"
          : "stale"
        : clientBeats(existing, change.clientAt);
    if (beats === "stale") {
      return { ...ref, status: "stale", serverRecord: await serverRecordOf(change.entity, change.id) };
    }
  } else {
    const tomb = await tombstoneOf(userId, change.entity, change.id);
    if (tomb && decideAgainstTombstone(tomb, change.clientAt) === "stale") {
      return { ...ref, status: "stale", serverRecord: serializeTombstone(tomb) };
    }
  }

  switch (change.entity) {
    case "tradeAccount":
      return upsertAccount(userId, change, existing as AccountRow | null);
    case "tradeTag":
      return upsertTag(userId, change, existing as TagRow | null);
    case "tradeChecklist":
      return upsertChecklist(userId, change, existing as ChecklistRow | null);
    case "tradeEntry":
      return upsertEntry(userId, change, existing as EntryRow | null);
    case "tradeNote":
      return upsertNote(userId, change, existing as NoteRow | null);
  }
}

// ─── بارگذاری/حذفِ عمومی ─────────────────────────────────────────────────

type AccountRow = NonNullable<Awaited<ReturnType<typeof loadAccount>>>;
type TagRow = NonNullable<Awaited<ReturnType<typeof loadTag>>>;
type ChecklistRow = NonNullable<Awaited<ReturnType<typeof loadChecklist>>>;
type EntryRow = NonNullable<Awaited<ReturnType<typeof loadEntry>>>;
type NoteRow = NonNullable<Awaited<ReturnType<typeof loadNote>>>;
type AnyRow = AccountRow | TagRow | ChecklistRow | EntryRow | NoteRow;

const loadAccount = (id: string) => prisma.tradeAccount.findUnique({ where: { id }, include: ACCOUNT_INCLUDE });
const loadTag = (id: string) => prisma.tradeTag.findUnique({ where: { id } });
const loadChecklist = (id: string) => prisma.tradeChecklist.findUnique({ where: { id }, include: CHECKLIST_INCLUDE });
const loadEntry = (id: string) => prisma.tradeEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
const loadNote = (id: string) => prisma.tradeNote.findUnique({ where: { id }, include: NOTE_INCLUDE });

function loadRow(entity: Exclude<ParsedTradeChange["entity"], "tradeSetting">, id: string): Promise<AnyRow | null> {
  switch (entity) {
    case "tradeAccount":
      return loadAccount(id);
    case "tradeTag":
      return loadTag(id);
    case "tradeChecklist":
      return loadChecklist(id);
    case "tradeEntry":
      return loadEntry(id);
    case "tradeNote":
      return loadNote(id);
  }
}

function clientBeats(row: AnyRow, clientAt: Date): "apply" | "stale" {
  if ("items" in row) return clientAt.getTime() > checklistEditedAt(row).getTime() ? "apply" : "stale";
  return decideLww(row, clientAt);
}

async function serverRecordOf(entity: Exclude<ParsedTradeChange["entity"], "tradeSetting">, id: string): Promise<TradeSyncServerRecord | null> {
  switch (entity) {
    case "tradeAccount": {
      const r = await loadAccount(id);
      return r && serializeTradeAccount(r);
    }
    case "tradeTag": {
      const r = await loadTag(id);
      return r && serializeTradeTag(r);
    }
    case "tradeChecklist": {
      const r = await loadChecklist(id);
      return r && serializeTradeChecklist(r);
    }
    case "tradeEntry": {
      const r = await loadEntry(id);
      return r && serializeTradeEntry(r);
    }
    case "tradeNote": {
      const r = await loadNote(id);
      return r && serializeTradeNote(r);
    }
  }
}

function deleteGuarded(tx: Prisma.TransactionClient, entity: TradeDeletableEntity, row: AnyRow) {
  // tombstone رو trigger هم می‌نویسه؛ writeTombstoneِ بعدی زمانش رو به clientUpdatedAt برمی‌گردونه
  const where = { id: row.id, userId: row.userId, updatedAt: row.updatedAt };
  switch (entity) {
    case "tradeTag":
      return tx.tradeTag.deleteMany({ where });
    case "tradeChecklist":
      return tx.tradeChecklist.deleteMany({ where });
    case "tradeEntry":
      return tx.tradeEntry.deleteMany({ where });
    case "tradeNote":
      return tx.tradeNote.deleteMany({ where });
  }
}

/** ساختِ ردیفی با idِ قبلا حذف‌شده (LWW برنده شد) → tombstoneِ کهنه پاک می‌شه */
function clearTombstone(tx: Prisma.TransactionClient, userId: string, entity: string, entityId: string) {
  return tx.tradeSyncTombstone.deleteMany({ where: { userId, entity, entityId } });
}

// ─── حساب ────────────────────────────────────────────────────────────────

async function upsertAccount(
  userId: string,
  change: Extract<ParsedTradeChange, { entity: "tradeAccount"; op: "upsert" }>,
  existing: AccountRow | null
): Promise<Result | "retry"> {
  const ref = refOf(change);
  const { tagIds, archived, order, ...fields } = change.data;
  const becomesActive = !archived && (!existing || existing.archived);
  const active = await prisma.tradeAccount.count({ where: { userId, archived: false } });
  if (becomesActive && active >= MAX_ACCOUNTS) return reject(change, "conflict", `حداکثر ${MAX_ACCOUNTS} حساب فعال می‌توانی داشته باشی`);
  const tags = await ownedTagIds(userId, tagIds);
  const stamp = syncStamp(change.clientAt);
  const data = { ...fields, archived, archivedAt: nextArchivedAt(existing, archived, change.clientAt), ...stamp };

  if (!existing) {
    const row = await prisma.$transaction(async (tx) => {
      await clearTombstone(tx, userId, "tradeAccount", change.id);
      return tx.tradeAccount.create({
        data: { id: change.id, userId, ...data, order: order ?? active, tags: { connect: tags } },
        include: ACCOUNT_INCLUDE,
      });
    });
    return { ...ref, status: "applied", serverRecord: serializeTradeAccount(row) };
  }
  const row = await prisma.tradeAccount.update({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...data, order: order ?? existing.order, tags: { set: tags } },
    include: ACCOUNT_INCLUDE,
  });
  return { ...ref, status: "applied", serverRecord: serializeTradeAccount(row) };
}

// ─── برچسب ───────────────────────────────────────────────────────────────

async function upsertTag(
  userId: string,
  change: Extract<ParsedTradeChange, { entity: "tradeTag"; op: "upsert" }>,
  existing: TagRow | null
): Promise<Result | "retry"> {
  const ref = refOf(change);
  const duplicate = await prisma.tradeTag.findFirst({ where: { userId, name: change.data.name, NOT: { id: change.id } }, select: { id: true } });
  if (duplicate) return reject(change, "conflict", "برچسبی با این نام از قبل هست");
  const stamp = syncStamp(change.clientAt);
  if (!existing) {
    if ((await prisma.tradeTag.count({ where: { userId } })) >= MAX_TAGS) return reject(change, "conflict", `حداکثر ${MAX_TAGS} برچسب مجاز است`);
    const row = await prisma.$transaction(async (tx) => {
      await clearTombstone(tx, userId, "tradeTag", change.id);
      return tx.tradeTag.create({ data: { id: change.id, userId, ...change.data, ...stamp } });
    });
    return { ...ref, status: "applied", serverRecord: serializeTradeTag(row) };
  }
  const row = await prisma.tradeTag.update({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...change.data, ...stamp },
  });
  return { ...ref, status: "applied", serverRecord: serializeTradeTag(row) };
}

// ─── چک‌لیست ─────────────────────────────────────────────────────────────

async function upsertChecklist(
  userId: string,
  change: Extract<ParsedTradeChange, { entity: "tradeChecklist"; op: "upsert" }>,
  existing: ChecklistRow | null
): Promise<Result | "retry"> {
  const ref = refOf(change);
  const { items, order, ...fields } = change.data;

  // idِ آیتم هم کلیدِ اصلیِ سراسریه: آیتمی که الان مالِ چک‌لیستِ دیگه‌ایه
  // (از جمله چک‌لیستِ یک کاربرِ دیگه) هیچ‌وقت جابه‌جا/بازنویسی نمی‌شه.
  const foreign = await prisma.tradeChecklistItem.count({ where: { id: { in: items.map((i) => i.id) }, NOT: { checklistId: change.id } } });
  if (foreign > 0) return reject(change, "invalid", "شناسه‌ی موردِ چک‌لیست نامعتبر است");

  const becomesActive = !fields.archived && (!existing || existing.archived);
  const active = await prisma.tradeChecklist.count({ where: { userId, archived: false } });
  if (becomesActive && active >= MAX_CHECKLISTS) return reject(change, "conflict", `حداکثر ${MAX_CHECKLISTS} چک‌لیست مجاز است`);

  const stamp = syncStamp(change.clientAt);
  // آیتم‌ها با همون updatedAtِ چک‌لیست نوشته می‌شن (checklistEditedAt)
  const itemRows = items.map((i) => ({ id: i.id, text: i.text, order: i.order, checked: i.checked, updatedAt: stamp.updatedAt }));

  if (!existing) {
    const row = await prisma.$transaction(async (tx) => {
      await clearTombstone(tx, userId, "tradeChecklist", change.id);
      return tx.tradeChecklist.create({
        data: { id: change.id, userId, ...fields, order: order ?? active, ...stamp, items: { create: itemRows } },
        include: CHECKLIST_INCLUDE,
      });
    });
    return { ...ref, status: "applied", serverRecord: serializeTradeChecklist(row) };
  }

  const seenItemsAt = Math.max(0, ...existing.items.map((i) => i.updatedAt.getTime()));
  const row = await prisma.$transaction(async (tx) => {
    // شرطِ هم‌زمانی هم روی خودِ چک‌لیست (P2025) هم روی تیک‌های وب که فقط آیتم رو عوض می‌کنن
    await tx.tradeChecklist.update({
      where: { id: existing.id, userId, updatedAt: existing.updatedAt },
      data: { ...fields, order: order ?? existing.order, ...stamp },
    });
    const current = await tx.tradeChecklistItem.aggregate({ where: { checklistId: existing.id }, _max: { updatedAt: true } });
    if ((current._max.updatedAt?.getTime() ?? 0) !== seenItemsAt) throw new RetrySignal();
    await tx.tradeChecklistItem.deleteMany({ where: { checklistId: existing.id } });
    await tx.tradeChecklistItem.createMany({ data: itemRows.map((i) => ({ ...i, checklistId: existing.id })) });
    return tx.tradeChecklist.findUniqueOrThrow({ where: { id: existing.id }, include: CHECKLIST_INCLUDE });
  });
  return { ...ref, status: "applied", serverRecord: serializeTradeChecklist(row) };
}

// ─── معامله ──────────────────────────────────────────────────────────────

async function upsertEntry(
  userId: string,
  change: Extract<ParsedTradeChange, { entity: "tradeEntry"; op: "upsert" }>,
  existing: EntryRow | null
): Promise<Result | "retry"> {
  const ref = refOf(change);
  const prepared = prepareEntryWrite(existing, change.raw);
  if (!prepared.ok) return reject(change, prepared.code ?? "invalid", prepared.error);
  const { data, tagIds, checklistId, checklistState } = prepared.value;

  // حساب باید مالِ همین کاربر باشه (برای معامله‌ی متاتریدری accountId اصلا
  // در data نیست — فیلدِ بروکریه و عوض نمی‌شه)
  if (data.accountId !== undefined) {
    const account = await prisma.tradeAccount.findFirst({ where: { id: data.accountId, userId }, select: { id: true } });
    if (!account) return reject(change, "not_found", "حساب پیدا نشد");
  }
  const tags = await ownedTagIds(userId, tagIds);
  const stamp = syncStamp(change.clientAt);

  if (!existing) {
    // اسنپ‌شاتِ چک‌لیست فقط همین‌جا، یک‌بار، از چک‌لیستِ ذخیره‌شده‌ی خودِ کاربر
    const checklist = checklistId
      ? await prisma.tradeChecklist.findFirst({
          where: { id: checklistId, userId },
          select: { id: true, name: true, items: { select: { id: true, text: true, order: true } } },
        })
      : null;
    const snap = buildChecklistSnapshot(checklist, checklistState);
    const row = await prisma.$transaction(async (tx) => {
      await clearTombstone(tx, userId, "tradeEntry", change.id);
      return tx.tradeEntry.create({
        data: {
          ...(data as Prisma.TradeEntryUncheckedCreateInput),
          id: change.id,
          userId,
          externalId: null,
          externalSource: null,
          checklistId: snap.checklistId,
          checklistName: snap.checklistName,
          checklistDone: snap.checklistDone,
          checklistTotal: snap.checklistTotal,
          checklistSnapshot: snap.snapshot ? (snap.snapshot as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          ...stamp,
          tags: { connect: tags },
        },
        include: ENTRY_INCLUDE,
      });
    });
    return { ...ref, status: "applied", serverRecord: serializeTradeEntry(row) };
  }

  // ویرایش: فیلدهای چک‌لیست (ارجاع + اسنپ‌شات) عمدا در data نیستن — اسنپ‌شات
  // لحظه‌ی ثبت تغییرناپذیره. syncLocked هم دست نمی‌خوره: موبایل فیلدِ بروکری
  // رو عوض نمی‌کنه، پس EA باید همچنان بتونه قیمت/سودِ معامله‌ی باز رو به‌روز کنه.
  const row = await prisma.tradeEntry.update({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...(data as Prisma.TradeEntryUncheckedUpdateInput), ...stamp, tags: { set: tags } },
    include: ENTRY_INCLUDE,
  });
  return { ...ref, status: "applied", serverRecord: serializeTradeEntry(row) };
}

// ─── یادداشت ─────────────────────────────────────────────────────────────

async function upsertNote(
  userId: string,
  change: Extract<ParsedTradeChange, { entity: "tradeNote"; op: "upsert" }>,
  existing: NoteRow | null
): Promise<Result | "retry"> {
  const ref = refOf(change);
  const { tagIds, accountId: rawAccountId, entryId: rawEntryId, ...fields } = change.data;
  // مثلِ /api/trade/notes: ارجاعِ ناموجود/غیرخودی بی‌صدا null می‌شه (یادداشت
  // مستقل از حساب/معامله ارزش داره و نباید به‌خاطرِ purgeِ حساب گم بشه)
  const [account, entry, tags] = await Promise.all([
    rawAccountId ? prisma.tradeAccount.findFirst({ where: { id: rawAccountId, userId }, select: { id: true } }) : null,
    rawEntryId ? prisma.tradeEntry.findFirst({ where: { id: rawEntryId, userId }, select: { id: true } }) : null,
    ownedTagIds(userId, tagIds),
  ]);
  const data = { ...fields, accountId: account?.id ?? null, entryId: entry?.id ?? null, ...syncStamp(change.clientAt) };

  if (!existing) {
    if ((await prisma.tradeNote.count({ where: { userId } })) >= MAX_NOTES) return reject(change, "conflict", `حداکثر ${MAX_NOTES} یادداشت مجاز است`);
    const row = await prisma.$transaction(async (tx) => {
      await clearTombstone(tx, userId, "tradeNote", change.id);
      return tx.tradeNote.create({ data: { id: change.id, userId, ...data, tags: { connect: tags } }, include: NOTE_INCLUDE });
    });
    return { ...ref, status: "applied", serverRecord: serializeTradeNote(row) };
  }
  const row = await prisma.tradeNote.update({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { ...data, tags: { set: tags } },
    include: NOTE_INCLUDE,
  });
  return { ...ref, status: "applied", serverRecord: serializeTradeNote(row) };
}

// ─── تنظیماتِ ترید ───────────────────────────────────────────────────────

async function applySetting(userId: string, change: Extract<ParsedTradeChange, { entity: "tradeSetting" }>): Promise<Result | "retry"> {
  const ref = refOf(change);
  const where = { userId_key: { userId, key: change.key } };
  const existing = await prisma.userSetting.findUnique({ where });
  if (decideLww(existing, change.clientAt) === "stale") {
    return { ...ref, status: "stale", serverRecord: existing ? serializeTradeSetting(existing) : null };
  }
  const value = change.op === "upsert" && change.value !== null ? (change.value as Prisma.InputJsonValue) : Prisma.JsonNull;
  if (!existing) {
    const row = await prisma.userSetting.create({ data: { userId, key: change.key, value, ...syncStamp(change.clientAt) } });
    return { ...ref, status: "applied", serverRecord: serializeTradeSetting(row) };
  }
  const { count } = await prisma.userSetting.updateMany({
    where: { id: existing.id, userId, updatedAt: existing.updatedAt },
    data: { value, ...syncStamp(change.clientAt) },
  });
  if (count === 0) return "retry";
  const row = await prisma.userSetting.findUnique({ where });
  return { ...ref, status: "applied", serverRecord: row ? serializeTradeSetting(row) : null };
}
