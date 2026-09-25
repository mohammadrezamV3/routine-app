// آداپتورِ سینکِ ماژولِ ترید (features/trade — دیتابیسِ arion-trade) ↔
// /api/mobile/trade/{push,pull} (mobile/src/lib/trade-contract.ts).
//
// ناهمخوانی‌های شکلِ محلی و سرور (و تصمیم‌ها):
//   • چک‌لیست: محلی آیتم‌ها رو در جدولِ جدا (checklistItems) نگه می‌داره، سرور
//     داخلِ رکوردِ چک‌لیست (جایگزینیِ کامل). ویرایشِ یک آیتم = push کلِ چک‌لیست؛
//     updatedAtِ مؤثر = بیشینه‌ی چک‌لیست و آیتم‌هاش.
//   • معامله: اسنپ‌شاتِ چک‌لیست رو سرور خودش لحظه‌ی ساخت از checklistId +
//     checklistState می‌سازه و بعدش تغییرناپذیره. عکس‌ها همگام نمی‌شن (فقط
//     محلی می‌مونن؛ imageCount از سرور). entryReasons/exitReasons و … که UIِ
//     موبایل ندارن، از سرور نگه داشته و عینا برگردونده می‌شن (جایگزینیِ کامل).
//   • معامله‌ی متاتریدری (externalId): فیلدهای بروکری اصلا فرستاده نمی‌شن.
//   • حساب حذف نداره: «حذف» محلی (deletedAt) = archived:true.
//   • tombstoneها: رکوردِ محلی پاک می‌شه و ارجاع‌های وابسته محلی تمیز می‌شن
//     (سرور برای اون‌ها رکوردِ جدید نمی‌فرسته).
import type {
  TradeAccountRecord,
  TradeChecklistRecord,
  TradeEntryRecord,
  TradeNoteRecord,
  TradeSyncChange,
  TradeSyncPullResponse,
  TradeTagRecord,
  TradeTombstoneRecord,
} from "@/lib/trade-contract";
import { TRADE_ENTRY_BROKER_FIELDS } from "@/lib/trade-contract";
import {
  db as tradeDb,
  type TradeAccountRow,
  type TradeChecklistItemRow,
  type TradeChecklistRow,
  type TradeEntryRow,
  type TradeNoteRow,
  type TradeTagRow,
} from "@/features/trade/db";
import { newId as newTradeId } from "@/features/trade/lib/id";
import type { PendingItem, SyncAdapter } from "./adapter";
import { isValidClientId } from "./mappers";

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);
const maxIso = (...xs: string[]) => xs.reduce((a, b) => (ms(b) > ms(a) ? b : a));

function remoteWins(local: { dirty: 0 | 1; updatedAt: string } | undefined, editedAt: string): boolean {
  return !local || local.dirty !== 1 || ms(editedAt) > ms(local.updatedAt);
}

const ALL_TABLES = () => [tradeDb.accounts, tradeDb.trades, tradeDb.checklists, tradeDb.checklistItems, tradeDb.notes, tradeDb.tags];

// ─── محلی → push ───────────────────────────────────────────────────────

export function accountToChange(r: TradeAccountRow): TradeSyncChange {
  return {
    entity: "tradeAccount",
    id: r.id,
    op: "upsert",
    data: {
      name: r.name,
      broker: r.broker,
      type: r.type,
      currency: r.currency,
      initialBalance: r.initialBalance,
      leverage: r.leverage,
      color: r.color,
      note: r.note,
      goalType: r.goalType,
      goalValue: r.goalValue,
      archived: r.archived || !!r.deletedAt,
      order: r.order,
      tagIds: r.tagIds ?? [],
    },
    clientUpdatedAt: r.updatedAt,
  };
}

export function tagToChange(r: TradeTagRow): TradeSyncChange {
  if (r.deletedAt) return { entity: "tradeTag", id: r.id, op: "delete", clientUpdatedAt: r.updatedAt };
  return { entity: "tradeTag", id: r.id, op: "upsert", data: { name: r.name, color: r.color }, clientUpdatedAt: r.updatedAt };
}

export function checklistToChange(r: TradeChecklistRow, items: TradeChecklistItemRow[], clientUpdatedAt: string): TradeSyncChange {
  if (r.deletedAt) return { entity: "tradeChecklist", id: r.id, op: "delete", clientUpdatedAt };
  const live = items.filter((i) => !i.deletedAt).sort((a, b) => a.order - b.order);
  return {
    entity: "tradeChecklist",
    id: r.id,
    op: "upsert",
    data: {
      name: r.name,
      color: r.color,
      required: r.required,
      archived: r.archived,
      order: r.order,
      note: r.note,
      items: live.map((i) => ({ id: i.id, text: i.text, checked: i.checked })),
    },
    clientUpdatedAt,
  };
}

export function entryToChange(r: TradeEntryRow): TradeSyncChange {
  if (r.deletedAt) return { entity: "tradeEntry", id: r.id, op: "delete", clientUpdatedAt: r.updatedAt };
  const data: Record<string, unknown> = {
    accountId: r.accountId,
    symbol: r.symbol,
    direction: r.direction,
    timeframe: r.timeframe,
    openedAt: r.openedAt,
    closedAt: r.closedAt,
    volume: r.volume,
    volumeUnit: r.volumeUnit,
    result: r.result,
    pnl: r.pnl,
    riskFree: r.riskFree,
    status: r.status,
    entryPrice: r.entryPrice,
    exitPrice: r.exitPrice,
    stopLoss: r.stopLoss,
    takeProfit: r.takeProfit,
    commission: r.commission,
    swap: r.swap,
    riskAmount: r.riskAmount,
    setup: r.setup,
    entryReasons: r.entryReasons ?? [],
    exitReasons: r.exitReasons ?? [],
    entryReasonNote: r.entryReasonNote,
    exitReasonNote: r.exitReasonNote,
    note: r.note,
    emotionBefore: r.emotionBefore,
    emotionAfter: r.emotionAfter,
    confidence: r.confidence,
    followedPlan: r.followedPlan,
    tagIds: r.tagIds ?? [],
    // فقط موقعِ ساخت خونده می‌شه (اسنپ‌شات سمتِ سرور)؛ در ویرایش نادیده
    checklistId: r.checklistId,
    ...(r.checklistState ? { checklistState: r.checklistState } : {}),
  };
  if (r.externalId) {
    // معامله‌ی متاتریدری: فیلدهای بروکری فرستاده نمی‌شن (broker_field_locked)
    for (const f of TRADE_ENTRY_BROKER_FIELDS) delete data[f];
    delete data.checklistId;
    delete data.checklistState;
  }
  return { entity: "tradeEntry", id: r.id, op: "upsert", data: data as any, clientUpdatedAt: r.updatedAt };
}

export function noteToChange(r: TradeNoteRow): TradeSyncChange {
  if (r.deletedAt) return { entity: "tradeNote", id: r.id, op: "delete", clientUpdatedAt: r.updatedAt };
  return {
    entity: "tradeNote",
    id: r.id,
    op: "upsert",
    data: {
      title: r.title,
      content: r.content,
      color: r.color,
      pinned: r.pinned,
      accountId: r.accountId,
      entryId: r.entryId,
      tagIds: r.tagIds ?? [],
    },
    clientUpdatedAt: r.updatedAt,
  };
}

// ─── سرور → محلی ──────────────────────────────────────────────────────

export function remoteAccount(r: TradeAccountRecord): TradeAccountRow {
  return {
    id: r.id,
    name: r.name,
    broker: r.broker,
    type: r.type,
    currency: r.currency,
    initialBalance: r.initialBalance,
    leverage: r.leverage,
    color: r.color,
    note: r.note,
    goalType: r.goalType,
    goalValue: r.goalValue,
    archived: r.archived,
    archivedAt: r.archivedAt,
    order: r.order,
    tagIds: r.tagIds ?? [],
    mtConnected: r.mtConnected,
    mtLastSyncAt: r.mtLastSyncAt,
    updatedAt: r.editedAt,
    deletedAt: null,
    dirty: 0,
  };
}

export function remoteTag(r: TradeTagRecord): TradeTagRow {
  return { id: r.id, name: r.name, color: r.color, updatedAt: r.editedAt, deletedAt: null, dirty: 0 };
}

export function remoteChecklist(r: TradeChecklistRecord): { row: TradeChecklistRow; items: TradeChecklistItemRow[] } {
  return {
    row: {
      id: r.id,
      name: r.name,
      color: r.color,
      required: r.required,
      archived: r.archived,
      order: r.order,
      note: r.note,
      updatedAt: r.editedAt,
      deletedAt: null,
      dirty: 0,
    },
    items: r.items.map((i) => ({
      id: i.id,
      checklistId: r.id,
      text: i.text,
      order: i.order,
      checked: i.checked,
      updatedAt: r.editedAt,
      deletedAt: null,
      dirty: 0,
    })),
  };
}

export function remoteEntry(r: TradeEntryRecord, local?: TradeEntryRow): TradeEntryRow {
  return {
    id: r.id,
    accountId: r.accountId,
    symbol: r.symbol,
    direction: r.direction,
    timeframe: r.timeframe,
    openedAt: r.openedAt,
    closedAt: r.closedAt,
    volume: r.volume,
    volumeUnit: r.volumeUnit,
    result: r.result,
    pnl: r.pnl,
    riskFree: r.riskFree,
    status: r.status,
    entryPrice: r.entryPrice,
    exitPrice: r.exitPrice,
    stopLoss: r.stopLoss,
    takeProfit: r.takeProfit,
    commission: r.commission,
    swap: r.swap,
    riskAmount: r.riskAmount,
    rMultiple: r.rMultiple,
    sessions: r.sessions,
    setup: r.setup,
    entryReasonNote: r.entryReasonNote,
    exitReasonNote: r.exitReasonNote,
    note: r.note,
    emotionBefore: r.emotionBefore,
    emotionAfter: r.emotionAfter,
    confidence: r.confidence,
    followedPlan: r.followedPlan,
    checklistId: r.checklistId,
    checklistName: r.checklistName,
    checklistSnapshot: r.checklistSnapshot,
    checklistDone: r.checklistDone,
    checklistTotal: r.checklistTotal,
    checklistState: local?.checklistState ?? null,
    tagIds: r.tagIds ?? [],
    images: local?.images ?? [],
    imageCount: r.imageCount,
    entryReasons: r.entryReasons ?? [],
    exitReasons: r.exitReasons ?? [],
    externalId: r.externalId,
    externalSource: r.externalSource,
    // زمانِ LWWِ فیلدهای دستی (برای معامله‌ی متاتریدری syncِ EA جلوش نمی‌بره)
    updatedAt: entryLwwAt(r),
    deletedAt: null,
    dirty: 0,
  };
}

/** زمانِ LWWِ یک معامله: manualEditedAt (قدیمی‌ترها: editedAt) */
export function entryLwwAt(r: TradeEntryRecord): string {
  return r.manualEditedAt || r.editedAt;
}

/** فقط فیلدهای بروکری (+ مشتقاتِ سرور) رو از رکوردِ سرور روی ردیفِ محلی می‌نشونه */
export function mergeBrokerFields(local: TradeEntryRow, r: TradeEntryRecord): TradeEntryRow {
  const remote = remoteEntry(r, local) as any;
  const out: any = { ...local };
  for (const f of TRADE_ENTRY_BROKER_FIELDS) out[f] = remote[f];
  out.sessions = remote.sessions;
  out.rMultiple = remote.rMultiple;
  out.imageCount = remote.imageCount;
  out.externalId = remote.externalId;
  out.externalSource = remote.externalSource;
  return out as TradeEntryRow;
}

export function remoteNote(r: TradeNoteRecord): TradeNoteRow {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    color: r.color,
    pinned: r.pinned,
    accountId: r.accountId,
    entryId: r.entryId,
    tagIds: r.tagIds ?? [],
    updatedAt: r.editedAt,
    deletedAt: null,
    dirty: 0,
  };
}

// ─── اعمالِ رکورد (مشترکِ pull و نتیجه‌ی push) ────────────────────────

async function checklistLocalState(id: string): Promise<{ row?: TradeChecklistRow; items: TradeChecklistItemRow[]; updatedAt?: string; dirty: 0 | 1 }> {
  const row = await tradeDb.checklists.get(id);
  const items = await tradeDb.checklistItems.where("checklistId").equals(id).toArray();
  if (!row) return { items, dirty: items.some((i) => i.dirty === 1) ? 1 : 0 };
  const updatedAt = maxIso(row.updatedAt, ...items.map((i) => i.updatedAt));
  const dirty = row.dirty === 1 || items.some((i) => i.dirty === 1) ? 1 : 0;
  return { row, items, updatedAt, dirty };
}

async function putChecklist(r: TradeChecklistRecord): Promise<void> {
  const { row, items } = remoteChecklist(r);
  await tradeDb.checklists.put(row);
  const keep = new Set(items.map((i) => i.id));
  const old = await tradeDb.checklistItems.where("checklistId").equals(r.id).primaryKeys();
  await tradeDb.checklistItems.bulkDelete(old.filter((k) => !keep.has(k)));
  await tradeDb.checklistItems.bulkPut(items);
}

/** اعمالِ یک رکورد از سرور. `force` برای نتیجه‌ی push (همون نسخه‌ای که فرستادیم). */
export async function applyTradeRecord(kind: "account" | "tag" | "checklist" | "entry" | "note", rec: any, force = false): Promise<boolean> {
  return tradeDb.transaction("rw", ALL_TABLES(), async () => {
    switch (kind) {
      case "account": {
        const local = await tradeDb.accounts.get(rec.id);
        if (!force && !remoteWins(local, rec.editedAt)) return false;
        await tradeDb.accounts.put(remoteAccount(rec));
        return true;
      }
      case "tag": {
        const local = await tradeDb.tags.get(rec.id);
        if (!force && !remoteWins(local, rec.editedAt)) return false;
        await tradeDb.tags.put(remoteTag(rec));
        return true;
      }
      case "checklist": {
        const st = await checklistLocalState(rec.id);
        if (!force && st.row && !remoteWins({ dirty: st.dirty, updatedAt: st.updatedAt! }, rec.editedAt)) return false;
        await putChecklist(rec);
        return true;
      }
      case "entry": {
        const local = await tradeDb.trades.get(rec.id);
        if (!force && !remoteWins(local, entryLwwAt(rec))) {
          // ویرایشِ دستیِ محلی جدیدتره؛ ولی فیلدهای بروکری همیشه از سرور
          if (local && rec.externalId) await tradeDb.trades.put(mergeBrokerFields(local, rec));
          return false;
        }
        await tradeDb.trades.put(remoteEntry(rec, local));
        return true;
      }
      case "note": {
        const local = await tradeDb.notes.get(rec.id);
        if (!force && !remoteWins(local, rec.editedAt)) return false;
        await tradeDb.notes.put(remoteNote(rec));
        return true;
      }
    }
  });
}

const without = (arr: string[] | undefined, id: string) => (arr ?? []).filter((x) => x !== id);

/** tombstone: رکوردِ محلی پاک + تمیزکاریِ ارجاع‌ها (بدونِ dirty — سرور خودش همین کار رو کرده) */
export async function applyTombstone(t: TradeTombstoneRecord, force = false): Promise<boolean> {
  return tradeDb.transaction("rw", ALL_TABLES(), async () => {
    const table =
      t.entity === "tradeAccount"
        ? tradeDb.accounts
        : t.entity === "tradeTag"
          ? tradeDb.tags
          : t.entity === "tradeChecklist"
            ? tradeDb.checklists
            : t.entity === "tradeEntry"
              ? tradeDb.trades
              : tradeDb.notes;
    const local = (await (table as any).get(t.id)) as { dirty: 0 | 1; updatedAt: string } | undefined;
    if (local && !force && !remoteWins(local, t.editedAt)) return false;
    await (table as any).delete(t.id);

    switch (t.entity) {
      case "tradeTag":
        await tradeDb.accounts.filter((r) => (r.tagIds ?? []).includes(t.id)).modify((r) => void (r.tagIds = without(r.tagIds, t.id)));
        await tradeDb.trades.filter((r) => (r.tagIds ?? []).includes(t.id)).modify((r) => void (r.tagIds = without(r.tagIds, t.id)));
        await tradeDb.notes.filter((r) => (r.tagIds ?? []).includes(t.id)).modify((r) => void (r.tagIds = without(r.tagIds, t.id)));
        break;
      case "tradeChecklist":
        await tradeDb.checklistItems.where("checklistId").equals(t.id).delete();
        await tradeDb.trades.filter((r) => r.checklistId === t.id).modify({ checklistId: null });
        break;
      case "tradeAccount":
        // معاملاتش هم tombstone دارن (جدا میان)؛ یادداشت‌ها فقط ارجاعشون null
        await tradeDb.notes.where("accountId").equals(t.id).modify({ accountId: null });
        break;
      case "tradeEntry":
        await tradeDb.notes.where("entryId").equals(t.id).modify({ entryId: null });
        break;
    }
    return true;
  });
}

function isTombstone(r: any): r is TradeTombstoneRecord {
  return r && r.deleted === true && typeof r.entity === "string";
}

// ─── تعمیرِ idهای قدیمی (newIdِ قبلی ۳۳ کاراکتر بود) ───────────────────

async function fixIds(): Promise<void> {
  const [accounts, trades, checklists, items, notes, tags] = await Promise.all([
    tradeDb.accounts.toArray(),
    tradeDb.trades.toArray(),
    tradeDb.checklists.toArray(),
    tradeDb.checklistItems.toArray(),
    tradeDb.notes.toArray(),
    tradeDb.tags.toArray(),
  ]);
  const map = new Map<string, string>();
  for (const r of [...accounts, ...trades, ...checklists, ...items, ...notes, ...tags]) {
    if (!isValidClientId(r.id)) map.set(r.id, newTradeId());
  }
  if (!map.size) return;
  const m = (id: string | null) => (id && map.has(id) ? map.get(id)! : id);
  const mTags = (ids: string[] | undefined) => (ids ?? []).map((x) => m(x)!);
  const mState = (s: Record<string, boolean> | null | undefined) =>
    s ? Object.fromEntries(Object.entries(s).map(([k, v]) => [m(k)!, v])) : s ?? null;
  await tradeDb.transaction("rw", ALL_TABLES(), async () => {
    for (const t of ALL_TABLES()) await (t as any).clear();
    await tradeDb.tags.bulkPut(tags.map((r) => ({ ...r, id: m(r.id)!, dirty: map.has(r.id) ? 1 : r.dirty })));
    await tradeDb.accounts.bulkPut(accounts.map((r) => ({ ...r, id: m(r.id)!, tagIds: mTags(r.tagIds), dirty: map.has(r.id) ? 1 : r.dirty })));
    await tradeDb.checklists.bulkPut(checklists.map((r) => ({ ...r, id: m(r.id)!, dirty: map.has(r.id) ? 1 : r.dirty })));
    await tradeDb.checklistItems.bulkPut(
      items.map((r) => ({ ...r, id: m(r.id)!, checklistId: m(r.checklistId)!, dirty: map.has(r.id) || map.has(r.checklistId) ? 1 : r.dirty }))
    );
    await tradeDb.trades.bulkPut(
      trades.map((r) => ({
        ...r,
        id: m(r.id)!,
        accountId: m(r.accountId)!,
        checklistId: m(r.checklistId),
        checklistState: mState(r.checklistState),
        tagIds: mTags(r.tagIds),
        dirty: map.has(r.id) ? 1 : r.dirty,
      }))
    );
    await tradeDb.notes.bulkPut(
      notes.map((r) => ({ ...r, id: m(r.id)!, accountId: m(r.accountId), entryId: m(r.entryId), tagIds: mTags(r.tagIds), dirty: map.has(r.id) ? 1 : r.dirty }))
    );
  });
}

// ─── آداپتور ────────────────────────────────────────────────────────────

function settleSimple<T extends { id: string; updatedAt: string }>(
  table: any,
  id: string,
  pushedUpdatedAt: string,
  apply: (rec: any, local: T) => Promise<void>
) {
  return async (rec: any) => {
    await tradeDb.transaction("rw", ALL_TABLES(), async () => {
      const local = (await table.get(id)) as T | undefined;
      if (!local || local.updatedAt !== pushedUpdatedAt) return;
      if (rec && isTombstone(rec)) await applyTombstone(rec, true);
      else if (rec && rec.id === id) await apply(rec, local);
      else await table.update(id, { dirty: 0 });
    });
  };
}

export const tradeAdapter: SyncAdapter = {
  name: "trade",

  prepare: fixIds,

  async collect() {
    const items: PendingItem[] = [];
    const push = (fk: string, updatedAt: string, change: TradeSyncChange, settle: PendingItem["settle"]) =>
      items.push({ fk, updatedAt, change: change as any, module: "TRADE", settle });

    // ترتیب: برچسب‌ها → حساب‌ها → چک‌لیست‌ها → معاملات → یادداشت‌ها (ارجاع‌ها قبل از ارجاع‌دهنده‌ها)
    for (const r of await tradeDb.tags.where("dirty").equals(1).toArray()) {
      push(`tags:${r.id}`, r.updatedAt, tagToChange(r), settleSimple(tradeDb.tags, r.id, r.updatedAt, (rec) => tradeDb.tags.put(remoteTag(rec)).then(() => undefined)));
    }
    for (const r of await tradeDb.accounts.where("dirty").equals(1).toArray()) {
      push(
        `accounts:${r.id}`,
        r.updatedAt,
        accountToChange(r),
        settleSimple<TradeAccountRow>(tradeDb.accounts, r.id, r.updatedAt, async (rec, local) => {
          // «حذف»ِ محلی (deletedAt) روی سرور archived شده — نسخه‌ی سرور جایگزین می‌شه
          await tradeDb.accounts.put({ ...remoteAccount(rec), deletedAt: local.deletedAt && rec.archived ? local.deletedAt : null });
        })
      );
    }

    // چک‌لیست‌ها: dirty خودشون یا هر آیتمشون
    const dirtyChecklistIds = new Set<string>([
      ...(await tradeDb.checklists.where("dirty").equals(1).primaryKeys()),
      ...(await tradeDb.checklistItems.where("dirty").equals(1).toArray()).map((i) => i.checklistId),
    ]);
    for (const id of dirtyChecklistIds) {
      const st = await checklistLocalState(id);
      if (!st.row) {
        // آیتم‌های یتیم (چک‌لیستش نیست) — فقط تمیز
        await tradeDb.checklistItems.where("checklistId").equals(id).modify({ dirty: 0 });
        continue;
      }
      const updatedAt = st.updatedAt!;
      push(`checklists:${id}`, updatedAt, checklistToChange(st.row, st.items, updatedAt), async (rec) => {
        await tradeDb.transaction("rw", ALL_TABLES(), async () => {
          const now = await checklistLocalState(id);
          if (!now.row || now.updatedAt !== updatedAt) return;
          if (rec && isTombstone(rec)) await applyTombstone(rec as TradeTombstoneRecord, true);
          else if (rec && (rec as any).id === id) await putChecklist(rec as TradeChecklistRecord);
          else {
            await tradeDb.checklists.update(id, { dirty: 0 });
            await tradeDb.checklistItems.where("checklistId").equals(id).modify({ dirty: 0 });
          }
        });
      });
    }

    for (const r of await tradeDb.trades.where("dirty").equals(1).toArray()) {
      push(
        `trades:${r.id}`,
        r.updatedAt,
        entryToChange(r),
        settleSimple<TradeEntryRow>(tradeDb.trades, r.id, r.updatedAt, async (rec, local) => {
          await tradeDb.trades.put(remoteEntry(rec, local));
        })
      );
    }
    for (const r of await tradeDb.notes.where("dirty").equals(1).toArray()) {
      push(`notes:${r.id}`, r.updatedAt, noteToChange(r), settleSimple(tradeDb.notes, r.id, r.updatedAt, (rec) => tradeDb.notes.put(remoteNote(rec)).then(() => undefined)));
    }
    return items;
  },

  async applyPull(raw) {
    const res = raw as TradeSyncPullResponse;
    if (res.moduleLocked) return;
    for (const r of res.tags ?? []) await applyTradeRecord("tag", r);
    for (const r of res.accounts ?? []) await applyTradeRecord("account", r);
    for (const r of res.checklists ?? []) await applyTradeRecord("checklist", r);
    for (const r of res.entries ?? []) await applyTradeRecord("entry", r);
    for (const r of res.notes ?? []) await applyTradeRecord("note", r);
    for (const t of res.tombstones ?? []) await applyTombstone(t);
    // تنظیماتِ ترید (TRADE_SYNC_SETTING_KEYS) هنوز جای محلی ندارن — نادیده
  },

  async markAllDirty() {
    await tradeDb.transaction("rw", ALL_TABLES(), async () => {
      for (const t of ALL_TABLES()) await (t as any).toCollection().modify({ dirty: 1 });
    });
  },
};

export const tradeSyncTables = ALL_TABLES;
