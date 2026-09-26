import { describe, it, expect } from "vitest";
import {
  buildChecklistSnapshot,
  checklistEditedAt,
  decideAgainstTombstone,
  findBrokerFieldEdits,
  isTradeSyncSettingKey,
  nextArchivedAt,
  parseTradeSyncChange,
  prepareEntryWrite,
  validateChecklistData,
} from "@/lib/mobileTradeSync";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const ID = "ctradeentry0000000000001";
const ID2 = "ctradeentry0000000000002";

function manualTrade(over: Record<string, unknown> = {}) {
  return {
    accountId: "cacc000000000000000000001",
    symbol: "eurusd",
    direction: "BUY",
    openedAt: "2026-07-15T07:30:00.000Z",
    volume: 1,
    result: "PROFIT",
    pnl: 100,
    status: "CLOSED",
    riskAmount: 50,
    ...over,
  };
}

const mtRow = {
  externalId: "123456",
  accountId: "cacc000000000000000000001",
  symbol: "XAUUSD.m",
  direction: "SELL",
  volume: 0.5,
  volumeUnit: "LOT",
  openedAt: new Date("2026-09-01T10:00:00.000Z"),
  closedAt: new Date("2026-09-01T12:00:00.000Z"),
  status: "CLOSED",
  result: "LOSS",
  pnl: -42.5,
  entryPrice: 2500.1,
  exitPrice: 2501,
  stopLoss: null,
  takeProfit: null,
  commission: -1.5,
  swap: 0,
};

describe("trade sync — LWW helpers", () => {
  it("tombstones: only an edit made after the delete resurrects", () => {
    const t = { deletedAt: new Date("2026-09-20T10:00:00.000Z") };
    expect(decideAgainstTombstone(null, NOW)).toBe("apply");
    expect(decideAgainstTombstone(t, new Date("2026-09-20T09:00:00.000Z"))).toBe("stale");
    expect(decideAgainstTombstone(t, new Date("2026-09-20T10:00:00.000Z"))).toBe("stale"); // تساوی ← سرور
    expect(decideAgainstTombstone(t, new Date("2026-09-20T10:00:00.001Z"))).toBe("apply");
  });

  it("checklist edited time includes item toggles made on the web after the last checklist write", () => {
    const w = new Date("2026-09-20T10:00:00.000Z");
    const mobileWritten = { updatedAt: w, syncWrittenAt: w, syncEditedAt: new Date("2026-09-19T08:00:00.000Z") };
    // آیتم‌ها با همون updatedAt نوشته شدن → زمانِ منطقیِ موبایل
    expect(checklistEditedAt({ ...mobileWritten, items: [{ updatedAt: w }] }).toISOString()).toBe("2026-09-19T08:00:00.000Z");
    // تیکِ وب بعدش → زمانِ سرورِ تیک
    const toggled = new Date("2026-09-21T00:00:00.000Z");
    expect(checklistEditedAt({ ...mobileWritten, items: [{ updatedAt: w }, { updatedAt: toggled }] })).toEqual(toggled);
  });

  it("archivedAt is server-computed and preserved while archived", () => {
    const at = new Date("2026-09-10T00:00:00.000Z");
    expect(nextArchivedAt(null, false, NOW)).toBeNull();
    expect(nextArchivedAt({ archived: false, archivedAt: null }, true, NOW)).toEqual(NOW);
    expect(nextArchivedAt({ archived: true, archivedAt: at }, true, NOW)).toEqual(at);
    expect(nextArchivedAt({ archived: true, archivedAt: at }, false, NOW)).toBeNull();
  });
});

describe("trade sync — parsing", () => {
  it("accounts cannot be deleted from mobile (archive instead)", () => {
    const r = parseTradeSyncChange({ entity: "tradeAccount", id: ID, op: "delete", clientUpdatedAt: NOW.toISOString() }, NOW);
    expect(r).toMatchObject({ ok: false, code: "invalid", entity: "tradeAccount", id: ID });
  });

  it("rejects malformed ids, entities and timestamps; clamps future client time to now", () => {
    expect(parseTradeSyncChange({ entity: "tradeTag", id: "X", op: "delete", clientUpdatedAt: NOW.toISOString() }, NOW).ok).toBe(false);
    expect(parseTradeSyncChange({ entity: "trade", id: ID, op: "delete", clientUpdatedAt: NOW.toISOString() }, NOW).ok).toBe(false);
    expect(parseTradeSyncChange({ entity: "tradeTag", id: ID, op: "delete", clientUpdatedAt: "yesterday" }, NOW).ok).toBe(false);
    const r = parseTradeSyncChange({ entity: "tradeTag", id: ID, op: "delete", clientUpdatedAt: "2027-01-01T00:00:00.000Z" }, NOW);
    expect(r.ok && r.change.clientAt).toEqual(NOW);
  });

  it("only trade setting keys, never server-managed ones", () => {
    expect(isTradeSyncSettingKey("tradeVisibleStats")).toBe(true);
    expect(isTradeSyncSettingKey("theme")).toBe(false);
    expect(isTradeSyncSettingKey("tradeChecklistSeeded")).toBe(false);
    expect(isTradeSyncSettingKey("tradeNewsAlertLog")).toBe(false);
  });

  it("checklist items need unique client ids and the web's 2..40 bounds", () => {
    const item = (id: string) => ({ id, text: "x" });
    expect(validateChecklistData({ name: "a", items: [item(ID)] }).ok).toBe(false);
    expect(validateChecklistData({ name: "a", items: [item(ID), item(ID)] }).ok).toBe(false);
    expect(validateChecklistData({ name: "a", items: [item(ID), item("bad")] }).ok).toBe(false);
    const ok = validateChecklistData({ name: "a", items: [item(ID), { id: ID2, text: "y", checked: true }] });
    expect(ok.ok && ok.value.items.map((i) => [i.order, i.checked])).toEqual([[0, false], [1, true]]);
  });
});

describe("trade sync — entries: derived fields are server-side", () => {
  it("computes sessions from openedAt with real DST and ignores client sessions/rMultiple", () => {
    const summer = prepareEntryWrite(null, manualTrade({ sessions: ["SYDNEY"], rMultiple: 99 }));
    expect(summer.ok).toBe(true);
    if (!summer.ok) return;
    // 07:30Z در جولای = 08:30 لندن (BST) → لندن باز
    expect(summer.value.data.sessions).toContain("LONDON");
    expect(summer.value.data.sessions).not.toContain("SYDNEY");
    expect(summer.value.data.rMultiple).toBe(2); // 100 ÷ 50
    expect(summer.value.data.symbol).toBe("EURUSD");

    // همون ساعتِ UTC در ژانویه = 07:30 لندن (GMT) → هنوز باز نشده
    const winter = prepareEntryWrite(null, manualTrade({ openedAt: "2026-01-14T07:30:00.000Z" }));
    expect(winter.ok && winter.value.data.sessions).not.toContain("LONDON");
  });

  it("requires full ISO timestamps (no server-local guessing)", () => {
    expect(prepareEntryWrite(null, manualTrade({ openedAt: "2026-07-15 07:30" })).ok).toBe(false);
    expect(prepareEntryWrite(null, manualTrade({ closedAt: "2026-07-15" })).ok).toBe(false);
  });

  it("uses the web validator (sign of pnl must match result)", () => {
    const r = prepareEntryWrite(null, manualTrade({ result: "LOSS", pnl: 5 }));
    expect(r.ok).toBe(false);
  });

  it("an incomplete checklist never blocks saving; snapshot copies stored text", () => {
    const r = prepareEntryWrite(null, manualTrade({ checklistId: "ccl", checklistState: { i1: true } }));
    expect(r.ok).toBe(true);
    const snap = buildChecklistSnapshot(
      { id: "ccl", name: "London", items: [{ id: "i2", text: "B", order: 1 }, { id: "i1", text: "A", order: 0 }] },
      { i1: true, ghost: true }
    );
    expect(snap).toMatchObject({ checklistName: "London", checklistDone: 1, checklistTotal: 2 });
    expect(snap.snapshot).toEqual([{ text: "A", checked: true }, { text: "B", checked: false }]);
    expect(buildChecklistSnapshot(null, {}).snapshot).toBeNull();
  });
});

describe("trade sync — MetaTrader trades", () => {
  it("broker fields may be omitted or echoed unchanged, never edited", () => {
    expect(findBrokerFieldEdits(mtRow, {})).toEqual([]);
    expect(
      findBrokerFieldEdits(mtRow, {
        symbol: "XAUUSD.m",
        pnl: -42.5,
        openedAt: "2026-09-01T10:00:00.000Z",
        closedAt: "2026-09-01T12:00:00Z",
        stopLoss: null,
      })
    ).toEqual([]);
    expect(findBrokerFieldEdits(mtRow, { pnl: 10, symbol: "XAUUSD", closedAt: null, accountId: "other" }).sort()).toEqual(
      ["accountId", "closedAt", "pnl", "symbol"].sort()
    );
  });

  it("rejects an MT trade edit that touches a broker field", () => {
    const r = prepareEntryWrite(mtRow, { pnl: 999, note: "x" });
    expect(r).toMatchObject({ ok: false, code: "broker_field_locked" });
  });

  it("applies only manual fields and recomputes R against the broker pnl", () => {
    const r = prepareEntryWrite(mtRow, {
      symbol: "XAUUSD.m",
      note: "moved SL too early",
      emotionAfter: "REGRET",
      riskAmount: 85,
      entryReasons: ["FOMO"],
      checklistId: "ignored",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.data).toMatchObject({ note: "moved SL too early", emotionAfter: "REGRET", riskAmount: 85, entryReasons: ["FOMO"], rMultiple: -0.5 });
    for (const f of ["symbol", "pnl", "openedAt", "accountId", "result", "sessions"]) expect(r.value.data).not.toHaveProperty(f);
    expect(r.value.checklistId).toBeNull();
  });
});
