import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { TradeEntryRecord, TradeSyncChange } from "@m/lib/trade-contract";
import { db as tradeDb, type TradeEntryRow } from "@m/features/trade/db";
import { newId } from "@m/features/trade/lib/id";
import { applyTombstone, applyTradeRecord, entryToChange, remoteEntry } from "./tradeAdapter";
import { SyncEngine } from "./syncEngine";
import { tradeChannel } from "./channels";
import { wipeAllLocalData } from "./localData";
import { Call, json, loggedInClient } from "./testUtils";

const T0 = "2026-09-20T10:00:00.000Z";
const T1 = "2026-09-21T10:00:00.000Z";
const T2 = "2026-09-22T10:00:00.000Z";

const ACC = "macc0000000000000000000001";
const TAG = "mtag0000000000000000000001";

function entryRecord(p: Partial<TradeEntryRecord> & { id: string }): TradeEntryRecord {
  return {
    accountId: ACC,
    symbol: "EURUSD",
    direction: "BUY",
    timeframe: "1h",
    openedAt: T0,
    closedAt: T0,
    volume: 1,
    volumeUnit: "LOT",
    result: "PROFIT",
    pnl: 50,
    riskFree: false,
    status: "CLOSED",
    entryPrice: 1.1,
    exitPrice: 1.2,
    stopLoss: null,
    takeProfit: null,
    commission: null,
    swap: null,
    riskAmount: null,
    rMultiple: null,
    sessions: ["LONDON"],
    setup: null,
    entryReasons: ["STRATEGY"],
    exitReasons: [],
    entryReasonNote: null,
    exitReasonNote: null,
    note: "سرور",
    emotionBefore: null,
    emotionAfter: null,
    confidence: null,
    followedPlan: null,
    checklistId: null,
    checklistName: null,
    checklistDone: null,
    checklistTotal: null,
    checklistSnapshot: null,
    tagIds: [TAG],
    imageCount: 0,
    externalId: null,
    manualEditedAt: T1,
    externalSource: null,
    createdAt: T0,
    editedAt: T1,
    updatedAt: T1,
    ...p,
  };
}

const localEntry = (p: Partial<TradeEntryRow> & { id: string }): TradeEntryRow => ({
  ...remoteEntry(entryRecord({ id: p.id })),
  ...p,
});

beforeEach(async () => {
  await wipeAllLocalData();
});

describe("trade mapping", () => {
  it("newId با الگوی سرور جوره", () => {
    expect(newId()).toMatch(/^[a-z][a-z0-9]{19,31}$/);
  });

  it("معامله‌ی متاتریدری: فیلدهای بروکری فرستاده نمی‌شن؛ دلایل/برچسب‌ها حفظ می‌شن", () => {
    const row = localEntry({ id: "mtr00000000000000000000001", externalId: "123", note: "یادداشتِ من", dirty: 1 });
    const ch = entryToChange(row) as Extract<TradeSyncChange, { entity: "tradeEntry"; op: "upsert" }>;
    expect(ch.data).not.toHaveProperty("symbol");
    expect(ch.data).not.toHaveProperty("pnl");
    expect(ch.data).not.toHaveProperty("accountId");
    expect(ch.data).toMatchObject({ note: "یادداشتِ من", entryReasons: ["STRATEGY"], tagIds: [TAG] });
  });

  it("معامله‌ی دستی: checklistId + checklistState برای ساخت فرستاده می‌شن", () => {
    const row = localEntry({ id: "mtr00000000000000000000002", checklistId: "mcl000000000000000000000001", checklistState: { a: true } });
    expect(entryToChange(row)).toMatchObject({ data: { checklistId: "mcl000000000000000000000001", checklistState: { a: true }, symbol: "EURUSD" } });
  });

  it("pull ِ معامله‌ی متاتریدری با ویرایشِ دستیِ محلیِ جدیدتر: فیلدهای دستی محلی، بروکری از سرور", async () => {
    const id = "mtr00000000000000000000003";
    await tradeDb.trades.put(localEntry({ id, externalId: "9", note: "محلی", pnl: 10, updatedAt: T2, dirty: 1, images: [{ id: "i", dataUrl: "data:,", caption: null, order: 0 }] }));
    await applyTradeRecord("entry", entryRecord({ id, externalId: "9", pnl: 99, manualEditedAt: T1, editedAt: "2026-09-23T00:00:00.000Z" }));
    const row = await tradeDb.trades.get(id);
    expect(row).toMatchObject({ note: "محلی", pnl: 99, dirty: 1, updatedAt: T2 });
    expect(row?.images).toHaveLength(1);
  });

  it("tombstone ِ برچسب/حساب/معامله ارجاع‌ها رو محلی تمیز می‌کنه", async () => {
    const entryId = "mtr00000000000000000000004";
    await tradeDb.tags.put({ id: TAG, name: "t", color: "#fff", updatedAt: T0, deletedAt: null, dirty: 0 });
    await tradeDb.trades.put(localEntry({ id: entryId, tagIds: [TAG], dirty: 0, updatedAt: T0 }));
    await tradeDb.notes.put({ id: "mnote000000000000000000001", title: "n", content: "", color: "#fff", pinned: false, accountId: ACC, entryId, tagIds: [TAG], updatedAt: T0, deletedAt: null, dirty: 0 });

    await applyTombstone({ entity: "tradeTag", id: TAG, deleted: true, editedAt: T1, updatedAt: T1 });
    expect(await tradeDb.tags.get(TAG)).toBeUndefined();
    expect((await tradeDb.trades.get(entryId))?.tagIds).toEqual([]);
    expect((await tradeDb.notes.get("mnote000000000000000000001"))?.tagIds).toEqual([]);

    await applyTombstone({ entity: "tradeEntry", id: entryId, deleted: true, editedAt: T1, updatedAt: T1 });
    await applyTombstone({ entity: "tradeAccount", id: ACC, deleted: true, editedAt: T1, updatedAt: T1 });
    expect(await tradeDb.trades.get(entryId)).toBeUndefined();
    expect(await tradeDb.notes.get("mnote000000000000000000001")).toMatchObject({ entryId: null, accountId: null });
  });

  it("tombstone روی ردیفِ dirty و جدیدتر اعمال نمی‌شه", async () => {
    await tradeDb.tags.put({ id: TAG, name: "t", color: "#fff", updatedAt: T2, deletedAt: null, dirty: 1 });
    expect(await applyTombstone({ entity: "tradeTag", id: TAG, deleted: true, editedAt: T1, updatedAt: T1 })).toBe(false);
    expect(await tradeDb.tags.get(TAG)).toBeDefined();
  });
});

describe("trade channel", () => {
  it("ترتیبِ push (برچسب → حساب → چک‌لیست → معامله → یادداشت)، چک‌لیست با آیتم‌ها، حذفِ حساب = archived", async () => {
    const pushes: TradeSyncChange[][] = [];
    const ctx = await loggedInClient((c: Call) => {
      if (c.path === "/api/mobile/trade/push") {
        pushes.push(c.body.changes);
        return json(200, {
          serverTime: T1,
          moduleLocked: false,
          results: c.body.changes.map((ch: any, index: number) => ({ index, entity: ch.entity, id: ch.id, status: "applied", serverRecord: null })),
        });
      }
      return json(200, { cursor: T1, hasMore: false, serverTime: T1, moduleLocked: false, accounts: [], tags: [], checklists: [], entries: [], notes: [], settings: [], tombstones: [] });
    });
    const engine = new SyncEngine(ctx.api, ctx.kv, [tradeChannel]);
    await engine.init();
    const CL = "mcl0000000000000000000001";
    await tradeDb.notes.put({ id: "mnote000000000000000000002", title: "n", content: "", color: "#fff", pinned: false, accountId: null, entryId: null, tagIds: [], updatedAt: T1, deletedAt: null, dirty: 1 });
    await tradeDb.trades.put(localEntry({ id: "mtr00000000000000000000005", dirty: 1 }));
    await tradeDb.checklists.put({ id: CL, name: "c", color: "#fff", required: false, archived: false, order: 0, note: null, updatedAt: T0, deletedAt: null, dirty: 0 });
    await tradeDb.checklistItems.bulkPut([
      { id: "mit00000000000000000000001", checklistId: CL, text: "یک", order: 0, checked: false, updatedAt: T0, deletedAt: null, dirty: 0 },
      { id: "mit00000000000000000000002", checklistId: CL, text: "دو", order: 1, checked: true, updatedAt: T1, deletedAt: null, dirty: 1 },
    ]);
    await tradeDb.accounts.put({ ...(await import("./tradeAdapter")).remoteAccount({ id: ACC, name: "a", broker: null, type: "REAL", currency: "USD", initialBalance: 100, leverage: null, color: "#fff", note: null, goalType: "PERCENT", goalValue: 10, archived: false, archivedAt: null, order: 0, tagIds: [], mtConnected: false, mtLastSyncAt: null, createdAt: T0, editedAt: T0, updatedAt: T0 }), deletedAt: T1, updatedAt: T1, dirty: 1 });
    await tradeDb.tags.put({ id: TAG, name: "t", color: "#fff", updatedAt: T1, deletedAt: null, dirty: 1 });

    await engine.sync();
    expect(engine.getState().error).toBeNull();
    const order = pushes.flat().map((c) => c.entity);
    expect(order).toEqual(["tradeTag", "tradeAccount", "tradeChecklist", "tradeEntry", "tradeNote"]);
    const cl = pushes.flat().find((c) => c.entity === "tradeChecklist") as any;
    expect(cl.clientUpdatedAt).toBe(T1); // بیشینه‌ی چک‌لیست و آیتم‌ها
    expect(cl.data.items).toEqual([
      { id: "mit00000000000000000000001", text: "یک", checked: false },
      { id: "mit00000000000000000000002", text: "دو", checked: true },
    ]);
    expect((pushes.flat().find((c) => c.entity === "tradeAccount") as any).data.archived).toBe(true);
    expect(await tradeDb.checklistItems.where("dirty").equals(1).count()).toBe(0);
  });

  it("moduleLocked: قفلِ TRADE گزارش می‌شه و push نمی‌شه", async () => {
    let pushed = 0;
    const ctx = await loggedInClient((c: Call) => {
      if (c.path === "/api/mobile/trade/push") {
        pushed++;
        return json(200, { serverTime: T1, moduleLocked: true, results: c.body.changes.map((ch: any, index: number) => ({ index, entity: ch.entity, status: "rejected", code: "module_locked", serverRecord: null })) });
      }
      return json(200, { cursor: null, hasMore: false, serverTime: T1, moduleLocked: true, accounts: [], tags: [], checklists: [], entries: [], notes: [], settings: [], tombstones: [] });
    });
    const engine = new SyncEngine(ctx.api, ctx.kv, [tradeChannel]);
    await engine.init();
    await tradeDb.tags.put({ id: TAG, name: "t", color: "#fff", updatedAt: T1, deletedAt: null, dirty: 1 });
    await engine.sync();
    expect(engine.getState().lockedModules).toEqual(["TRADE"]);
    expect(engine.getState().rejectedCount).toBe(0);
    await engine.sync();
    expect(pushed).toBe(1);
    expect((await tradeDb.tags.get(TAG))?.dirty).toBe(1);
  });
});

describe("تعمیرِ idهای قدیمی", () => {
  it("حسابِ با idِ ۳۳ کاراکتری id تازه می‌گیره و ارجاعِ معاملات/یادداشت‌ها هم عوض می‌شه", async () => {
    const OLD = "m" + "a".repeat(32);
    const { tradeAdapter } = await import("./tradeAdapter");
    await tradeDb.accounts.put({ ...(await import("./tradeAdapter")).remoteAccount({ id: OLD, name: "a", broker: null, type: "REAL", currency: "USD", initialBalance: 1, leverage: null, color: "#fff", note: null, goalType: "PERCENT", goalValue: 1, archived: false, archivedAt: null, order: 0, tagIds: [], mtConnected: false, mtLastSyncAt: null, createdAt: T0, editedAt: T0, updatedAt: T0 }) });
    await tradeDb.trades.put(localEntry({ id: "mtr00000000000000000000009", accountId: OLD, dirty: 0 }));
    await tradeDb.notes.put({ id: "mnote000000000000000000009", title: "n", content: "", color: "#fff", pinned: false, accountId: OLD, entryId: null, tagIds: [], updatedAt: T0, deletedAt: null, dirty: 0 });
    await tradeAdapter.prepare!();
    const accs = await tradeDb.accounts.toArray();
    expect(accs).toHaveLength(1);
    expect(accs[0].id).toMatch(/^[a-z][a-z0-9]{19,31}$/);
    expect(accs[0].dirty).toBe(1);
    expect((await tradeDb.trades.get("mtr00000000000000000000009"))?.accountId).toBe(accs[0].id);
    expect((await tradeDb.notes.get("mnote000000000000000000009"))?.accountId).toBe(accs[0].id);
  });
});
