import { describe, it, expect } from "vitest";
import { shapeAccountSummaries, buildChecklistSnapshotData, serializeNote } from "@/lib/tradeShapes";
import { computeTradeStats } from "@/lib/tradeAnalytics";

// fixture: شکلِ پاسخِ روت‌ها بعد از استخراج به lib/tradeShapes.ts باید
// دقیقا همون قبلی بمونه. «legacy» پایین کپیِ عینیِ کدِ inlineِ قبلیِ روت‌هاست.

const d = (s: string) => new Date(s);

const ACCOUNTS = [
  {
    id: "acc1", name: "اصلی", broker: "IC", type: "REAL", currency: "USD",
    initialBalance: 1000, leverage: 100, color: "#3E7BFA", note: null,
    goalType: "PROFIT_AMOUNT", goalValue: 500, archived: false, order: 0,
    tags: [{ id: "t1", name: "swing", color: "#fff" }],
    mtLink: { tokenHash: "abc", revokedAt: null, lastSyncAt: d("2026-09-20T08:00:00.000Z"), platform: "MT5" },
  },
  {
    id: "acc2", name: "دمو", broker: null, type: "DEMO", currency: "USD",
    initialBalance: 5000, leverage: null, color: "#E05252", note: "n",
    goalType: null, goalValue: null, archived: false, order: 1,
    tags: [],
    mtLink: { tokenHash: "x", revokedAt: d("2026-09-01T00:00:00.000Z"), lastSyncAt: null, platform: "MT4" },
  },
  {
    id: "acc3", name: "بدون اتصال", broker: null, type: "REAL", currency: "EUR",
    initialBalance: 0, leverage: null, color: "#000000", note: null,
    goalType: null, goalValue: null, archived: true, order: 2,
    tags: [],
    mtLink: null,
  },
] as any[];

const STATS = [
  { accountId: "acc1", status: "CLOSED", pnl: 120, rMultiple: 2, openedAt: d("2026-09-10T10:00:00.000Z") },
  { accountId: "acc1", status: "CLOSED", pnl: -40, rMultiple: -1, openedAt: d("2026-09-11T10:00:00.000Z") },
  { accountId: "acc1", status: "OPEN", pnl: 0, rMultiple: null, openedAt: d("2026-09-12T10:00:00.000Z") },
  { accountId: "acc2", status: "CLOSED", pnl: 0, rMultiple: 0, openedAt: d("2026-09-09T10:00:00.000Z") },
  { accountId: "acc2", status: "CANCELED", pnl: 0, rMultiple: null, openedAt: d("2026-09-08T10:00:00.000Z") },
];

function legacyAccounts(accounts: any[], stats: typeof STATS) {
  const byAccount = new Map<string, typeof stats>();
  for (const s of stats) {
    if (!byAccount.has(s.accountId)) byAccount.set(s.accountId, []);
    byAccount.get(s.accountId)!.push(s);
  }
  return accounts.map((account) => {
    const { mtLink, ...a } = account;
    const list = (byAccount.get(a.id) || []).map((e) => ({
      status: e.status, pnl: e.pnl, rMultiple: e.rMultiple, openedAt: e.openedAt.toISOString(),
    }));
    const s = computeTradeStats(list as any, a);
    return {
      ...a,
      mtConnected: !!mtLink?.tokenHash && !mtLink.revokedAt,
      mtLastSyncAt: mtLink?.lastSyncAt ? mtLink.lastSyncAt.toISOString() : null,
      summary: {
        tradeCount: s.total, closedCount: s.closedCount, netPnl: s.netPnl,
        balance: s.balance, winRate: s.winRate, goalProgress: s.goalProgress,
      },
    };
  });
}

describe("shapeAccountSummaries", () => {
  it("matches the legacy inline route output byte-for-byte", () => {
    const now = JSON.stringify(shapeAccountSummaries(ACCOUNTS, STATS));
    expect(now).toBe(JSON.stringify(legacyAccounts(ACCOUNTS, STATS)));
  });

  it("fixture values: mt connection flags, no token hash leak, summary numbers", () => {
    const [a1, a2, a3] = shapeAccountSummaries(ACCOUNTS, STATS) as any[];
    expect(a1.mtConnected).toBe(true);
    expect(a1.mtLastSyncAt).toBe("2026-09-20T08:00:00.000Z");
    expect(a2.mtConnected).toBe(false); // revoked
    expect(a3.mtConnected).toBe(false);
    expect(a3.mtLastSyncAt).toBeNull();
    for (const a of [a1, a2, a3]) {
      expect(a).not.toHaveProperty("mtLink");
      expect(JSON.stringify(a)).not.toContain("tokenHash");
    }
    expect(a1.summary).toMatchObject({ tradeCount: 3, closedCount: 2, netPnl: 80, balance: 1080, winRate: 50 });
    expect(a2.summary).toMatchObject({ tradeCount: 2, closedCount: 1, netPnl: 0 });
    expect(a3.summary).toMatchObject({ tradeCount: 0, closedCount: 0, netPnl: 0 });
    expect(Object.keys(a1)).toEqual([
      "id", "name", "broker", "type", "currency", "initialBalance", "leverage", "color", "note",
      "goalType", "goalValue", "archived", "order", "tags", "mtConnected", "mtLastSyncAt", "summary",
    ]);
  });
});

describe("buildChecklistSnapshotData", () => {
  const checklist = {
    id: "cl1", name: "قبل از ورود",
    items: [{ id: "i1", text: "روند" }, { id: "i2", text: "حد ضرر" }, { id: "i3", text: "خبر" }],
  };

  it("copies item text (snapshot, not a live reference) and counts done", () => {
    const r = buildChecklistSnapshotData(checklist, { i1: true, i3: true, bogus: true });
    expect(r).toEqual({
      checklistId: "cl1",
      checklistName: "قبل از ورود",
      checklistDone: 2,
      checklistTotal: 3,
      checklistSnapshot: [
        { text: "روند", checked: true },
        { text: "حد ضرر", checked: false },
        { text: "خبر", checked: true },
      ],
    });
    // تغییرِ بعدیِ چک‌لیست نباید اسنپ‌شاتِ ساخته‌شده رو عوض کنه
    checklist.items[0].text = "عوض‌شد";
    expect(r.checklistSnapshot![0].text).toBe("روند");
    checklist.items[0].text = "روند";
  });

  it("incomplete checklist never blocks (0 done is fine)", () => {
    expect(buildChecklistSnapshotData(checklist, {})).toMatchObject({ checklistDone: 0, checklistTotal: 3 });
  });

  it("no / not-owned checklist → all null", () => {
    expect(buildChecklistSnapshotData(null, { i1: true })).toEqual({
      checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: null,
    });
  });
});

describe("serializeNote", () => {
  it("ISO dates, everything else untouched (same key order)", () => {
    const n = {
      id: "n1", title: "t", content: "c", color: "#3E7BFA", pinned: true,
      accountId: null, entryId: "e1",
      createdAt: d("2026-09-01T01:02:03.000Z"), updatedAt: d("2026-09-02T01:02:03.000Z"),
      tags: [{ id: "t1", name: "x", color: "#fff" }],
    };
    const legacy = { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
    expect(JSON.stringify(serializeNote(n))).toBe(JSON.stringify(legacy));
    expect(serializeNote(n).createdAt).toBe("2026-09-01T01:02:03.000Z");
  });
});
