import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

// integration روی دیتابیسِ واقعی (با migrationها، از جمله triggerِ tombstone) —
// هم‌الگوی mobileSyncRoute.test.ts.
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
});

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { GET as pull } from "@/app/api/mobile/trade/pull/route";
import { POST as push } from "@/app/api/mobile/trade/push/route";
import { prisma } from "@/lib/prisma";
import type { MobileAuthSuccess } from "@/lib/mobileApiContract";
import type {
  TradeChecklistRecord,
  TradeEntryRecord,
  TradeNoteRecord,
  TradeSyncPullResponse,
  TradeSyncPushResponse,
} from "@/lib/mobileTradeContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];
let seq = 0;

/** شناسه‌ی سمتِ کلاینت (الگوی cuid) */
function cid(prefix = "c"): string {
  seq++;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2)}`.replace(/[^a-z0-9]/g, "").slice(0, 25).padEnd(24, "x");
}

async function makeUser(opts: { trade?: boolean } = { trade: true }) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `trd_${tag}`.slice(0, 20), passwordHash: await bcrypt.hash(PASSWORD, 4), market: "IRAN" },
  });
  createdUsers.push(user.id);
  if (opts.trade) await prisma.moduleAccess.create({ data: { userId: user.id, module: "TRADE", active: true } });
  const res = await login(req("/api/mobile/auth/login", { identifier: user.username, password: PASSWORD, deviceName: "Trade Test" }));
  expect(res.status).toBe(200);
  const auth: MobileAuthSuccess = await res.json();
  return { user, token: auth.accessToken };
}

function req(path: string, body: unknown, token?: string, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function doPush(token: string, changes: unknown[]): Promise<TradeSyncPushResponse> {
  const res = await push(req("/api/mobile/trade/push", { changes }, token));
  expect(res.status).toBe(200);
  return res.json();
}

async function doPull(token: string, since?: string | null): Promise<TradeSyncPullResponse> {
  const q = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await pull(req(`/api/mobile/trade/pull${q}`, null, token, "GET"));
  expect(res.status).toBe(200);
  return res.json();
}

const now = () => new Date().toISOString();

function account(id: string, clientUpdatedAt: string, data: Record<string, unknown> = {}) {
  return { entity: "tradeAccount", id, op: "upsert", clientUpdatedAt, data: { name: "Prop 100k", type: "PROP", initialBalance: 100000, ...data } };
}
function entry(id: string, accountId: string, clientUpdatedAt: string, data: Record<string, unknown> = {}) {
  return {
    entity: "tradeEntry",
    id,
    op: "upsert",
    clientUpdatedAt,
    data: { accountId, symbol: "EURUSD", direction: "BUY", openedAt: "2026-07-15T07:30:00.000Z", volume: 1, result: "PROFIT", pnl: 120, status: "CLOSED", riskAmount: 60, ...data },
  };
}
function checklist(id: string, itemIds: string[], clientUpdatedAt: string, texts = ["Level valid?", "Candle confirmed?"]) {
  return {
    entity: "tradeChecklist",
    id,
    op: "upsert",
    clientUpdatedAt,
    data: { name: "London Breakout", items: itemIds.map((iid, i) => ({ id: iid, text: texts[i] ?? `item ${i}` })) },
  };
}

afterAll(async () => {
  await prisma.tradeSyncTombstone.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

describe("mobile trade sync — module gating", () => {
  it("without TRADE access: pull returns nothing, push rejects everything with module_locked and writes nothing", async () => {
    const { user, token } = await makeUser({ trade: false });
    // داده‌ای که از قبل (مثلا دوره‌ی اشتراکِ قبلی) وجود داره هم نباید بیرون بیاد
    await prisma.tradeAccount.create({ data: { userId: user.id, name: "old" } });

    const p = await doPull(token);
    expect(p).toMatchObject({ moduleLocked: true, cursor: null, accounts: [], entries: [], tombstones: [] });

    const accId = cid();
    const r = await doPush(token, [account(accId, now()), { entity: "tradeTag", id: "bad", op: "delete", clientUpdatedAt: now() }]);
    expect(r.moduleLocked).toBe(true);
    expect(r.results).toMatchObject([
      { index: 0, status: "rejected", code: "module_locked", entity: "tradeAccount", id: accId, serverRecord: null },
      { index: 1, status: "rejected", code: "module_locked" },
    ]);
    expect(await prisma.tradeAccount.findUnique({ where: { id: accId } })).toBeNull();

    // اشتراکِ منقضی‌شده هم قفله
    await prisma.moduleAccess.create({ data: { userId: user.id, module: "TRADE", active: true, expiresAt: new Date(Date.now() - 1000) } });
    expect((await doPull(token)).moduleLocked).toBe(true);
  });

  it("rejects missing auth", async () => {
    expect((await pull(req("/api/mobile/trade/pull", null, undefined, "GET"))).status).toBe(401);
    expect((await push(req("/api/mobile/trade/push", { changes: [] }, "garbage"))).status).toBe(401);
  });
});

describe("mobile trade sync — create, derived fields, snapshot", () => {
  it("creates account → tag → checklist → trade in one ordered batch; server computes session, R and snapshot", async () => {
    const { user, token } = await makeUser();
    const accId = cid(), tagId = cid(), clId = cid(), i1 = cid(), i2 = cid(), i3 = cid(), tradeId = cid();
    const t = "2026-09-24T10:00:00.000Z";
    const r = await doPush(token, [
      account(accId, t, { tagIds: [tagId] }), // برچسب هنوز نیست → بی‌صدا حذف
      { entity: "tradeTag", id: tagId, op: "upsert", clientUpdatedAt: t, data: { name: "breakout", color: "#112233" } },
      checklist(clId, [i1, i2, i3], t, ["A", "B", "C"]),
      entry(tradeId, accId, t, {
        tagIds: [tagId],
        checklistId: clId,
        // چک‌لیستِ ناقص (۱ از ۳) — ثبت نباید رد بشه
        checklistState: { [i1]: true },
        // مقادیرِ مشتقِ دروغین از کلاینت
        sessions: ["SYDNEY"],
        rMultiple: 42,
        images: ["data:image/png;base64,AAAA"],
      }),
    ]);
    expect(r.results.map((x) => x.status)).toEqual(["applied", "applied", "applied", "applied"]);
    const e = r.results[3].serverRecord as TradeEntryRecord;
    expect(e.sessions).toContain("LONDON"); // 08:30 BST
    expect(e.sessions).not.toContain("SYDNEY");
    expect(e.rMultiple).toBe(2);
    expect(e.imageCount).toBe(0); // عکس همگام نمی‌شه
    expect(e.tagIds).toEqual([tagId]);
    expect(e).toMatchObject({ checklistId: clId, checklistName: "London Breakout", checklistDone: 1, checklistTotal: 3, editedAt: t });
    expect(e.checklistSnapshot).toEqual([
      { text: "A", checked: true },
      { text: "B", checked: false },
      { text: "C", checked: false },
    ]);
    const row = await prisma.tradeEntry.findUnique({ where: { id: tradeId } });
    expect(row).toMatchObject({ userId: user.id, externalId: null, sessions: ["TOKYO", "LONDON"] });
  });

  it("the checklist snapshot never changes after creation — not by checklist edits, not by later trade edits", async () => {
    const { token } = await makeUser();
    const accId = cid(), clId = cid(), i1 = cid(), i2 = cid(), cl2 = cid(), j1 = cid(), j2 = cid(), tradeId = cid();
    await doPush(token, [
      account(accId, "2026-09-24T10:00:00.000Z"),
      checklist(clId, [i1, i2], "2026-09-24T10:00:00.000Z", ["old A", "old B"]),
      checklist(cl2, [j1, j2], "2026-09-24T10:00:00.000Z", ["other A", "other B"]),
      entry(tradeId, accId, "2026-09-24T10:00:00.000Z", { checklistId: clId, checklistState: { [i1]: true, [i2]: true } }),
    ]);
    // متنِ چک‌لیست عوض می‌شه
    const edit = await doPush(token, [checklist(clId, [i1, cid()], "2026-09-24T11:00:00.000Z", ["new A", "new C"])]);
    expect(edit.results[0].status).toBe("applied");
    expect((edit.results[0].serverRecord as TradeChecklistRecord).items.map((i) => i.text)).toEqual(["new A", "new C"]);
    // ویرایشِ معامله با چک‌لیست/state دیگه
    const e2 = await doPush(token, [entry(tradeId, accId, "2026-09-24T12:00:00.000Z", { note: "edited", checklistId: cl2, checklistState: {} })]);
    expect(e2.results[0].status).toBe("applied");
    const rec = e2.results[0].serverRecord as TradeEntryRecord;
    expect(rec.note).toBe("edited");
    expect(rec).toMatchObject({ checklistId: clId, checklistDone: 2, checklistTotal: 2 });
    expect(rec.checklistSnapshot).toEqual([
      { text: "old A", checked: true },
      { text: "old B", checked: true },
    ]);
  });
});

describe("mobile trade sync — ownership", () => {
  it("another user's accountId / tradeId / checklist item id / note refs are rejected or ignored", async () => {
    const alice = await makeUser();
    const mallory = await makeUser();
    const accId = cid(), tradeId = cid(), clId = cid(), i1 = cid(), i2 = cid(), noteId = cid();
    await doPush(alice.token, [
      account(accId, "2026-09-24T10:00:00.000Z"),
      checklist(clId, [i1, i2], "2026-09-24T10:00:00.000Z"),
      entry(tradeId, accId, "2026-09-24T10:00:00.000Z", { note: "alice" }),
    ]);

    const mAcc = cid();
    const attack = await doPush(mallory.token, [
      account(mAcc, now()),
      // معامله روی حسابِ آلیس
      entry(cid(), accId, now()),
      // بازنویسی و حذفِ معامله‌ی آلیس با idِ حدس‌زده
      entry(tradeId, mAcc, now(), { note: "pwned" }),
      { entity: "tradeEntry", id: tradeId, op: "delete", clientUpdatedAt: now() },
      // بازنویسیِ حسابِ آلیس
      account(accId, now(), { name: "pwned" }),
      // دزدیدنِ آیتم‌های چک‌لیستِ آلیس با idشون
      checklist(cid(), [i1, i2], now(), ["x", "y"]),
      // یادداشت با ارجاع به حساب/معامله‌ی آلیس
      { entity: "tradeNote", id: noteId, op: "upsert", clientUpdatedAt: now(), data: { title: "n", accountId: accId, entryId: tradeId } },
    ]);
    expect(attack.results.map((r) => [r.status, r.code])).toEqual([
      ["applied", undefined],
      ["rejected", "not_found"],
      ["rejected", "invalid"],
      ["rejected", "invalid"],
      ["rejected", "invalid"],
      ["rejected", "invalid"],
      ["applied", undefined],
    ]);
    for (const r of attack.results.slice(1, 6)) expect(r.serverRecord).toBeNull();
    const note = attack.results[6].serverRecord as TradeNoteRecord;
    expect(note).toMatchObject({ accountId: null, entryId: null });

    expect(await prisma.tradeEntry.findUnique({ where: { id: tradeId } })).toMatchObject({ userId: alice.user.id, note: "alice", accountId: accId });
    expect(await prisma.tradeAccount.findUnique({ where: { id: accId } })).toMatchObject({ userId: alice.user.id, name: "Prop 100k" });
    expect(await prisma.tradeChecklistItem.count({ where: { id: { in: [i1, i2] }, checklistId: clId } })).toBe(2);

    const mp = await doPull(mallory.token);
    expect(mp.entries).toHaveLength(0);
    expect(mp.accounts.map((a) => a.id)).toEqual([mAcc]);
    expect(mp.checklists).toHaveLength(0);
  });
});

describe("mobile trade sync — LWW", () => {
  it("older edits are stale, newer apply, and a later web write wins over an earlier offline edit", async () => {
    const { token } = await makeUser();
    const accId = cid(), tradeId = cid();
    await doPush(token, [account(accId, "2026-09-24T10:00:00.000Z"), entry(tradeId, accId, "2026-09-24T10:00:00.000Z", { note: "v1" })]);

    const older = await doPush(token, [entry(tradeId, accId, "2026-09-24T09:00:00.000Z", { note: "older" })]);
    expect(older.results[0]).toMatchObject({ status: "stale", serverRecord: { note: "v1" } });
    const replay = await doPush(token, [entry(tradeId, accId, "2026-09-24T10:00:00.000Z", { note: "v1" })]);
    expect(replay.results[0].status).toBe("stale");

    // نوشتنِ وب (مثلِ PATCH /api/trade/entries) — updatedAt = حالا
    await prisma.tradeEntry.update({ where: { id: tradeId }, data: { note: "web" } });
    const offline = await doPush(token, [entry(tradeId, accId, "2026-09-24T11:00:00.000Z", { note: "offline" })]);
    expect(offline.results[0]).toMatchObject({ status: "stale", serverRecord: { note: "web" } });

    const fresh = await doPush(token, [entry(tradeId, accId, now(), { note: "fresh" })]);
    expect(fresh.results[0]).toMatchObject({ status: "applied", serverRecord: { note: "fresh" } });
  });

  it("a backdated offline edit still reaches a device that already pulled past it", async () => {
    const { token } = await makeUser();
    const first = await doPull(token);
    const accId = cid();
    await doPush(token, [account(accId, "2026-09-01T10:00:00.000Z"), { entity: "tradeSetting", key: "tradeVisibleStats", op: "upsert", data: { value: ["winRate"] }, clientUpdatedAt: "2026-09-01T10:00:00.000Z" }]);
    const second = await doPull(token, first.cursor);
    expect(second.accounts.find((a) => a.id === accId)).toMatchObject({ editedAt: "2026-09-01T10:00:00.000Z" });
    expect(second.settings).toEqual([expect.objectContaining({ key: "tradeVisibleStats", value: ["winRate"] })]);
  });

  it("a web checklist tick after the last mobile write beats an older offline checklist edit, and shows up in pull", async () => {
    const { token } = await makeUser();
    const clId = cid(), i1 = cid(), i2 = cid();
    await doPush(token, [checklist(clId, [i1, i2], "2026-09-24T10:00:00.000Z")]);
    const p1 = await doPull(token);
    // تیکِ وب — فقط خودِ آیتم (PATCH /api/trade/checklists/[id]/items)
    await prisma.tradeChecklistItem.updateMany({ where: { id: i1, checklistId: clId }, data: { checked: true } });
    const p2 = await doPull(token, p1.cursor);
    expect(p2.checklists.map((c) => c.id)).toEqual([clId]);
    expect(p2.checklists[0].items.find((i) => i.id === i1)?.checked).toBe(true);

    const stale = await doPush(token, [checklist(clId, [i1, i2], "2026-09-24T12:00:00.000Z", ["edited", "edited2"])]);
    expect(stale.results[0].status).toBe("stale");
    expect((stale.results[0].serverRecord as TradeChecklistRecord).items[0]).toMatchObject({ id: i1, checked: true });
  });
});

describe("mobile trade sync — deletes, tombstones, archive", () => {
  it("mobile deletes leave tombstones; older upserts from another device lose", async () => {
    const { user, token } = await makeUser();
    const accId = cid(), tradeId = cid(), ghost = cid();
    await doPush(token, [account(accId, "2026-09-24T10:00:00.000Z"), entry(tradeId, accId, "2026-09-24T10:00:00.000Z")]);
    const del = await doPush(token, [
      { entity: "tradeEntry", id: tradeId, op: "delete", clientUpdatedAt: "2026-09-24T12:00:00.000Z" },
      // حذفِ چیزی که سرور هیچ‌وقت نداشته
      { entity: "tradeNote", id: ghost, op: "delete", clientUpdatedAt: "2026-09-24T12:00:00.000Z" },
    ]);
    expect(del.results.map((r) => r.status)).toEqual(["applied", "applied"]);
    expect(del.results[0].serverRecord).toMatchObject({ entity: "tradeEntry", id: tradeId, deleted: true, editedAt: "2026-09-24T12:00:00.000Z" });
    expect(await prisma.tradeEntry.findUnique({ where: { id: tradeId } })).toBeNull();

    const late = await doPush(token, [
      entry(tradeId, accId, "2026-09-24T11:00:00.000Z", { note: "zombie" }),
      { entity: "tradeNote", id: ghost, op: "upsert", clientUpdatedAt: "2026-09-24T11:00:00.000Z", data: { title: "zombie" } },
    ]);
    expect(late.results.map((r) => r.status)).toEqual(["stale", "stale"]);
    expect(late.results[0].serverRecord).toMatchObject({ deleted: true });
    expect(await prisma.tradeEntry.findUnique({ where: { id: tradeId } })).toBeNull();

    const p = await doPull(token);
    expect(p.tombstones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: "tradeEntry", id: tradeId, deleted: true }),
        expect.objectContaining({ entity: "tradeNote", id: ghost, deleted: true }),
      ])
    );
    expect(p.entries).toHaveLength(0);

    // ویرایشِ جدیدتر از حذف (LWW) دوباره می‌سازدش
    const revive = await doPush(token, [entry(tradeId, accId, now(), { note: "revived" })]);
    expect(revive.results[0]).toMatchObject({ status: "applied", serverRecord: { note: "revived" } });
    expect(await prisma.tradeSyncTombstone.count({ where: { userId: user.id, entity: "tradeEntry", entityId: tradeId } })).toBe(0);
  });

  it("web hard-deletes (incl. account purge cascade) show up as tombstones via the trigger", async () => {
    const { user, token } = await makeUser();
    const accId = cid(), tradeId = cid(), noteId = cid(), tagId = cid();
    await doPush(token, [
      account(accId, "2026-09-24T10:00:00.000Z"),
      entry(tradeId, accId, "2026-09-24T10:00:00.000Z"),
      { entity: "tradeTag", id: tagId, op: "upsert", clientUpdatedAt: "2026-09-24T10:00:00.000Z", data: { name: "t" } },
      { entity: "tradeNote", id: noteId, op: "upsert", clientUpdatedAt: "2026-09-24T10:00:00.000Z", data: { title: "n", accountId: accId } },
    ]);
    const p1 = await doPull(token);
    expect(p1.notes[0]).toMatchObject({ id: noteId, accountId: accId });

    // همون چیزی که DELETE ?mode=purge و DELETE /api/trade/tags می‌کنن
    await prisma.tradeAccount.deleteMany({ where: { id: accId, userId: user.id } });
    await prisma.tradeTag.deleteMany({ where: { id: tagId, userId: user.id } });
    const p2 = await doPull(token, p1.cursor);
    const tomb = p2.tombstones.map((t) => `${t.entity}:${t.id}`).sort();
    expect(tomb).toEqual([`tradeAccount:${accId}`, `tradeEntry:${tradeId}`, `tradeTag:${tagId}`].sort());
    // یادداشت خودش می‌مونه (SetNull) — کلاینت طبقِ قرارداد accountId رو null می‌کنه
    expect(await prisma.tradeNote.findUnique({ where: { id: noteId } })).toMatchObject({ accountId: null });
  });

  it("accounts are archived, never deleted, from mobile; history stays", async () => {
    const { token } = await makeUser();
    const accId = cid(), tradeId = cid();
    await doPush(token, [account(accId, "2026-09-24T10:00:00.000Z"), entry(tradeId, accId, "2026-09-24T10:00:00.000Z")]);
    const del = await doPush(token, [{ entity: "tradeAccount", id: accId, op: "delete", clientUpdatedAt: now() }]);
    expect(del.results[0]).toMatchObject({ status: "rejected", code: "invalid" });

    const arch = await doPush(token, [account(accId, "2026-09-24T11:00:00.000Z", { archived: true })]);
    expect(arch.results[0].serverRecord).toMatchObject({ archived: true, archivedAt: "2026-09-24T11:00:00.000Z" });
    expect(await prisma.tradeEntry.findUnique({ where: { id: tradeId } })).not.toBeNull();
    const p = await doPull(token);
    expect(p.accounts[0]).toMatchObject({ id: accId, archived: true });
    expect(p.entries.map((e) => e.id)).toEqual([tradeId]);
  });
});

describe("mobile trade sync — MetaTrader trades", () => {
  it("only manual fields are editable; broker field edits are rejected; EA sync is not locked out", async () => {
    const { user, token } = await makeUser();
    const accId = cid();
    await doPush(token, [account(accId, "2026-09-24T10:00:00.000Z")]);
    // همون شکلی که /api/mt/sync می‌سازه
    const mt = await prisma.tradeEntry.create({
      data: {
        userId: user.id,
        accountId: accId,
        externalId: "778899",
        externalSource: "MT5",
        symbol: "XAUUSD.m",
        direction: "SELL",
        volume: 0.3,
        openedAt: new Date("2026-09-22T13:00:00.000Z"),
        closedAt: new Date("2026-09-22T15:00:00.000Z"),
        status: "CLOSED",
        result: "PROFIT",
        pnl: 250.4,
        entryPrice: 2600.5,
        exitPrice: 2590.1,
        sessions: ["LONDON", "NEWYORK"],
      },
    });
    const p = await doPull(token);
    const rec = p.entries.find((e) => e.id === mt.id)!;
    expect(rec.externalId).toBe("778899");

    // کلاینت کلِ رکورد رو با فیلدهای بروکریِ دست‌نخورده برمی‌گردونه + فیلدهای دستی
    const { id: _id, editedAt: _e, updatedAt: _u, ...echo } = rec;
    const ok = await doPush(token, [
      { entity: "tradeEntry", id: mt.id, op: "upsert", clientUpdatedAt: now(), data: { ...echo, note: "chased", emotionAfter: "REGRET", riskAmount: 125.2, sessions: ["SYDNEY"] } },
    ]);
    expect(ok.results[0]).toMatchObject({ status: "applied", serverRecord: { note: "chased", emotionAfter: "REGRET", pnl: 250.4, symbol: "XAUUSD.m", rMultiple: 2, sessions: ["LONDON", "NEWYORK"] } });
    expect(await prisma.tradeEntry.findUnique({ where: { id: mt.id } })).toMatchObject({ syncLocked: false, pnl: 250.4 });

    const bad = await doPush(token, [
      { entity: "tradeEntry", id: mt.id, op: "upsert", clientUpdatedAt: now(), data: { ...echo, pnl: 9999, note: "cheat" } },
    ]);
    expect(bad.results[0]).toMatchObject({ status: "rejected", code: "broker_field_locked" });
    expect(await prisma.tradeEntry.findUnique({ where: { id: mt.id } })).toMatchObject({ pnl: 250.4, note: "chased" });
  });
});

describe("mobile trade sync — limits", () => {
  it("caps the batch and rejects duplicate tag names", async () => {
    const { token } = await makeUser();
    const tooMany = Array.from({ length: 201 }, () => ({ entity: "tradeTag", id: "x", op: "delete", clientUpdatedAt: now() }));
    expect((await push(req("/api/mobile/trade/push", { changes: tooMany }, token))).status).toBe(413);

    const r = await doPush(token, [
      { entity: "tradeTag", id: cid(), op: "upsert", clientUpdatedAt: now(), data: { name: "dup" } },
      { entity: "tradeTag", id: cid(), op: "upsert", clientUpdatedAt: now(), data: { name: "dup" } },
      { entity: "tradeSetting", key: "tradeChecklistSeeded", op: "upsert", clientUpdatedAt: now(), data: { value: true } },
    ]);
    expect(r.results.map((x) => [x.status, x.code])).toEqual([
      ["applied", undefined],
      ["rejected", "conflict"],
      ["rejected", "invalid"],
    ]);
  });
});

describe("mobile trade sync — MetaTrader per-field LWW", () => {
  it("EA syncs after an offline manual edit do not make that edit stale; web edits (syncLocked) do", async () => {
    const { user, token } = await makeUser();
    const accId = cid();
    await doPush(token, [account(accId, "2026-09-24T10:00:00.000Z")]);
    const mt = await prisma.tradeEntry.create({
      data: {
        userId: user.id, accountId: accId, externalId: "5550001", externalSource: "MT5", symbol: "EURUSD", direction: "BUY",
        volume: 1, openedAt: new Date("2026-09-23T09:00:00.000Z"), status: "OPEN", result: "BREAKEVEN", pnl: 0, sessions: ["LONDON"],
        // EA ده دقیقه پیش ساختش
        createdAt: new Date(Date.now() - 10 * 60_000),
      },
    });
    const edit1 = new Date(Date.now() - 60_000).toISOString();
    const r1 = await doPush(token, [{ entity: "tradeEntry", id: mt.id, op: "upsert", clientUpdatedAt: edit1, data: { note: "first" } }]);
    expect(r1.results[0]).toMatchObject({ status: "applied", serverRecord: { note: "first", manualEditedAt: edit1 } });

    // EA بعدش پوزیشن رو می‌بنده (همون شکلِ به‌روزرسانیِ /api/mt/sync)
    await prisma.tradeEntry.update({ where: { id: mt.id }, data: { status: "CLOSED", result: "PROFIT", pnl: 88, closedAt: new Date() } });
    const pulled = (await doPull(token)).entries.find((e) => e.id === mt.id)!;
    expect(new Date(pulled.editedAt).getTime()).toBeGreaterThan(new Date(edit1).getTime());
    expect(pulled.manualEditedAt).toBe(edit1);

    // ویرایشِ آفلاینی که *قبل* از syncِ EA انجام شده ولی الان رسیده → برنده، فیلدهای EA می‌مونن
    const offline = new Date(Date.now() - 30_000).toISOString();
    const r2 = await doPush(token, [{ entity: "tradeEntry", id: mt.id, op: "upsert", clientUpdatedAt: offline, data: { note: "offline", emotionAfter: "RELIEVED" } }]);
    expect(r2.results[0]).toMatchObject({ status: "applied", serverRecord: { note: "offline", emotionAfter: "RELIEVED", pnl: 88, status: "CLOSED" } });
    // ویرایشِ دستیِ قدیمی‌تر هنوز stale
    const r3 = await doPush(token, [{ entity: "tradeEntry", id: mt.id, op: "upsert", clientUpdatedAt: edit1, data: { note: "older" } }]);
    expect(r3.results[0].status).toBe("stale");

    // ویرایشِ وب (PATCH → syncLocked) از این به بعد LWWِ کلِ ردیف
    await prisma.tradeEntry.update({ where: { id: mt.id }, data: { note: "web", syncLocked: true } });
    const r4 = await doPush(token, [{ entity: "tradeEntry", id: mt.id, op: "upsert", clientUpdatedAt: new Date(Date.now() - 10_000).toISOString(), data: { note: "late" } }]);
    expect(r4.results[0]).toMatchObject({ status: "stale", serverRecord: { note: "web" } });
  });
});
