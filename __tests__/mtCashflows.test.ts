import { describe, it, expect } from "vitest";
import {
  classifyMtCashflow,
  normalizeMtCashflows,
  summarizeCashflows,
  mtTradeToEntryData,
  MtCashflowInput,
  MtTradeInput,
  MtTradeData,
} from "@/lib/metatrader";
import { computeTradeStats, StatEntry, StatAccount } from "@/lib/tradeAnalytics";

// ─────────────────────────────────────────────────────────────────────────────
// classifyMtCashflow tests
// ─────────────────────────────────────────────────────────────────────────────

describe("classifyMtCashflow", () => {
  // MT5 type names
  describe("MT5 type names", () => {
    it('classifies "DEAL_TYPE_TAX" as TAX', () => {
      expect(classifyMtCashflow("DEAL_TYPE_TAX", -10, null)).toBe("TAX");
    });

    it('classifies "DEAL_TAX" as TAX', () => {
      expect(classifyMtCashflow("DEAL_TAX", -10, null)).toBe("TAX");
    });

    it('classifies "TAX" as TAX', () => {
      expect(classifyMtCashflow("TAX", -10, null)).toBe("TAX");
    });

    it('classifies "COMMISSION_DAILY" as COMMISSION', () => {
      expect(classifyMtCashflow("DEAL_TYPE_COMMISSION_DAILY", -5, null)).toBe("COMMISSION");
    });

    it('classifies "COMMISSION" as COMMISSION', () => {
      expect(classifyMtCashflow("DEAL_COMMISSION", -5, null)).toBe("COMMISSION");
    });

    it('classifies "INTEREST" as INTEREST', () => {
      expect(classifyMtCashflow("DEAL_TYPE_INTEREST", 2, null)).toBe("INTEREST");
    });

    it('classifies "DIVIDEND" as DIVIDEND', () => {
      expect(classifyMtCashflow("DEAL_TYPE_DIVIDEND", 5, null)).toBe("DIVIDEND");
    });

    it('classifies "BONUS" as BONUS', () => {
      expect(classifyMtCashflow("DEAL_TYPE_BONUS", 100, null)).toBe("BONUS");
    });

    it('classifies "CREDIT" as CREDIT', () => {
      expect(classifyMtCashflow("DEAL_TYPE_CREDIT", 50, null)).toBe("CREDIT");
    });

    it('classifies "CORRECTION" as CORRECTION', () => {
      expect(classifyMtCashflow("DEAL_TYPE_CORRECTION", -10, null)).toBe("CORRECTION");
    });

    it('classifies "CHARGE" or "FEE" as FEE', () => {
      expect(classifyMtCashflow("DEAL_TYPE_CHARGE", -5, null)).toBe("FEE");
      expect(classifyMtCashflow("DEAL_TYPE_FEE", -5, null)).toBe("FEE");
    });

    it('classifies "7" as CREDIT', () => {
      expect(classifyMtCashflow("7", 50, null)).toBe("CREDIT");
    });
  });

  // MT4 "BALANCE" with comments
  describe("MT4 BALANCE with comments", () => {
    it('classifies BALANCE with "Deposit" as DEPOSIT', () => {
      expect(classifyMtCashflow("BALANCE", 500, "Deposit")).toBe("DEPOSIT");
    });

    it('classifies BALANCE with "Withdrawal" as WITHDRAWAL', () => {
      expect(classifyMtCashflow("BALANCE", -500, "Withdrawal")).toBe("WITHDRAWAL");
    });

    it('classifies BALANCE with "tax 10%" as TAX', () => {
      expect(classifyMtCashflow("BALANCE", -10, "tax 10%")).toBe("TAX");
    });

    it('classifies BALANCE with "withholding" as TAX', () => {
      expect(classifyMtCashflow("BALANCE", -5, "withholding tax")).toBe("TAX");
    });

    it('classifies BALANCE with "vat" as TAX', () => {
      expect(classifyMtCashflow("BALANCE", -20, "vat on profit")).toBe("TAX");
    });

    it('classifies BALANCE with "commission" as COMMISSION', () => {
      expect(classifyMtCashflow("BALANCE", -10, "commission")).toBe("COMMISSION");
    });

    it('classifies BALANCE with "comm" as COMMISSION', () => {
      expect(classifyMtCashflow("BALANCE", -10, "comm")).toBe("COMMISSION");
    });

    it('classifies BALANCE with "swap" or "rollover" as SWAP', () => {
      expect(classifyMtCashflow("BALANCE", -5, "swap")).toBe("SWAP");
      expect(classifyMtCashflow("BALANCE", -5, "rollover")).toBe("SWAP");
      expect(classifyMtCashflow("BALANCE", -5, "overnight")).toBe("SWAP");
    });

    it('classifies BALANCE with "interest" as INTEREST', () => {
      expect(classifyMtCashflow("BALANCE", 2, "interest")).toBe("INTEREST");
    });

    it('classifies BALANCE with "dividend" as DIVIDEND', () => {
      expect(classifyMtCashflow("BALANCE", 5, "dividend")).toBe("DIVIDEND");
    });

    it('classifies BALANCE with "fee" or "inactivity" as FEE', () => {
      expect(classifyMtCashflow("BALANCE", -5, "fee")).toBe("FEE");
      expect(classifyMtCashflow("BALANCE", -5, "charge")).toBe("FEE");
      expect(classifyMtCashflow("BALANCE", -5, "inactivity fee")).toBe("FEE");
    });

    it('classifies BALANCE with "bonus" as BONUS', () => {
      expect(classifyMtCashflow("BALANCE", 50, "bonus")).toBe("BONUS");
    });

    it('classifies BALANCE with empty comment by amount sign', () => {
      expect(classifyMtCashflow("BALANCE", 500, null)).toBe("DEPOSIT");
      expect(classifyMtCashflow("BALANCE", -500, null)).toBe("WITHDRAWAL");
      expect(classifyMtCashflow("BALANCE", 100, "")).toBe("DEPOSIT");
    });
  });

  // Edge cases
  describe("edge cases", () => {
    it("is case-insensitive", () => {
      expect(classifyMtCashflow("deal_type_tax", -10, null)).toBe("TAX");
      expect(classifyMtCashflow("DEAL_TYPE_TAX", -10, null)).toBe("TAX");
      expect(classifyMtCashflow("Tax", -10, null)).toBe("TAX");
    });

    it("handles empty/null type as BALANCE", () => {
      expect(classifyMtCashflow(null, 500, null)).toBe("DEPOSIT");
      expect(classifyMtCashflow("", 500, null)).toBe("DEPOSIT");
      expect(classifyMtCashflow(undefined, -500, null)).toBe("WITHDRAWAL");
    });

    it("handles type 6 as BALANCE", () => {
      expect(classifyMtCashflow("6", 500, null)).toBe("DEPOSIT");
      expect(classifyMtCashflow("6", -10, "commission")).toBe("COMMISSION");
    });

    it("returns OTHER for unknown type", () => {
      expect(classifyMtCashflow("UNKNOWN_TYPE", 100, null)).toBe("OTHER");
    });

    it("prioritizes type over comment", () => {
      // Type explicitly says TAX, comment says commission — type should win
      expect(classifyMtCashflow("DEAL_TYPE_TAX", -10, "commission applied")).toBe("TAX");
    });

    it("is case-insensitive for comments", () => {
      expect(classifyMtCashflow("BALANCE", -10, "TAX 10%")).toBe("TAX");
      expect(classifyMtCashflow("BALANCE", -10, "Commission")).toBe("COMMISSION");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeMtCashflows tests
// ─────────────────────────────────────────────────────────────────────────────

describe("normalizeMtCashflows", () => {
  it("skips non-array input", () => {
    expect(normalizeMtCashflows(null)).toEqual([]);
    expect(normalizeMtCashflows(undefined)).toEqual([]);
    expect(normalizeMtCashflows("not an array")).toEqual([]);
    expect(normalizeMtCashflows({ array: "like" })).toEqual([]);
  });

  it("skips non-object items", () => {
    const result = normalizeMtCashflows([
      null,
      undefined,
      "string",
      123,
      { ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("T1");
  });

  it("skips items with missing ticket", () => {
    const result = normalizeMtCashflows([
      { amount: 100, time: 1700000000, type: "BALANCE" },
      { ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("skips items with ticket '0'", () => {
    const result = normalizeMtCashflows([
      { ticket: "0", amount: 100, time: 1700000000, type: "BALANCE" },
      { ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("skips items with zero or missing amount", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 0, time: 1700000000, type: "BALANCE" },
      { ticket: "T2", amount: null, time: 1700000000, type: "BALANCE" },
      { ticket: "T3", time: 1700000000, type: "BALANCE" },
      { ticket: "T4", amount: 100, time: 1700000000, type: "BALANCE" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("skips items with missing or invalid time", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 100, time: 0, type: "BALANCE" },
      { ticket: "T2", amount: 100, time: -100, type: "BALANCE" },
      { ticket: "T3", amount: 100, type: "BALANCE" },
      { ticket: "T4", amount: 100, time: 1700000000, type: "BALANCE" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("parses unix seconds (not milliseconds)", () => {
    const result = normalizeMtCashflows([{ ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE" }]);
    expect(result).toHaveLength(1);
    const expectedDate = new Date(1700000000 * 1000);
    expect(result[0].occurredAt.getTime()).toBe(expectedDate.getTime());
  });

  it("rounds amount to 2 decimals", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 123.456, time: 1700000000, type: "BALANCE" },
      { ticket: "T2", amount: 123.454, time: 1700000000, type: "BALANCE" },
      { ticket: "T3", amount: "123.455", time: 1700000000, type: "BALANCE" },
    ]);
    expect(result[0].amount).toBe(123.46);
    expect(result[1].amount).toBe(123.45);
    expect(result[2].amount).toBe(123.46); // rounds 123.455 up
  });

  it("accepts amount as string with comma decimal", () => {
    const result = normalizeMtCashflows([{ ticket: "T1", amount: "12,5", time: 1700000000, type: "BALANCE" }]);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(12.50);
  });

  it("strips control characters from comment", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE", comment: "test\x00\x01\x1fcomment\x7f" },
    ]);
    expect(result).toHaveLength(1);
    // Control characters replaced with space, then trimmed
    expect(result[0].comment).toBe("test   comment");
  });

  it("trims and limits comment length", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE", comment: "  spaces  " },
      { ticket: "T2", amount: 100, time: 1700000000, type: "BALANCE", comment: "a".repeat(150) },
    ]);
    expect(result[0].comment).toBe("spaces");
    expect(result[1].comment).toHaveLength(120);
  });

  it("handles comment fallback for falsy values", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 100, time: 1700000000, type: "BALANCE", comment: "" },
      { ticket: "T2", amount: 100, time: 1700000000, type: "BALANCE", comment: null },
      { ticket: "T3", amount: 100, time: 1700000000, type: "BALANCE", comment: "valid" },
    ]);
    expect(result[0].comment).toBeNull();
    expect(result[1].comment).toBeNull();
    expect(result[2].comment).toBe("valid");
  });

  it("supports both 'id' and 'ticket' field names", () => {
    const result = normalizeMtCashflows([
      { id: "T1", amount: 100, time: 1700000000, type: "BALANCE" },
      { ticket: "T2", amount: 100, time: 1700000000, type: "BALANCE" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].externalId).toBe("T1");
    expect(result[1].externalId).toBe("T2");
  });

  it("respects MT_MAX_TRADES_PER_REQUEST limit", () => {
    const items = Array.from({ length: 1100 }, (_, i) => ({
      ticket: `T${i}`,
      amount: 100,
      time: 1700000000,
      type: "BALANCE",
    }));
    const result = normalizeMtCashflows(items);
    expect(result.length).toBe(1000);
  });

  it("classifies cashflows automatically", () => {
    const result = normalizeMtCashflows([
      { ticket: "T1", amount: 500, time: 1700000000, type: "BALANCE" },
      { ticket: "T2", amount: -100, time: 1700000000, type: "BALANCE", comment: "commission" },
      { ticket: "T3", amount: 50, time: 1700000000, type: "DEAL_TYPE_TAX" },
    ]);
    expect(result[0].kind).toBe("DEPOSIT");
    expect(result[1].kind).toBe("COMMISSION");
    expect(result[2].kind).toBe("TAX");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// summarizeCashflows tests
// ─────────────────────────────────────────────────────────────────────────────

describe("summarizeCashflows", () => {
  it("sums funding (DEPOSIT + WITHDRAWAL + CREDIT + BONUS)", () => {
    const rows: { kind: string; amount: number }[] = [
      { kind: "DEPOSIT", amount: 500 },
      { kind: "WITHDRAWAL", amount: -100 },
      { kind: "CREDIT", amount: 50 },
      { kind: "BONUS", amount: 25 },
    ];
    const result = summarizeCashflows(rows);
    expect(result.funding).toBe(475); // 500 - 100 + 50 + 25
  });

  it("sums charges (everything else)", () => {
    const rows: { kind: string; amount: number }[] = [
      { kind: "TAX", amount: -10 },
      { kind: "COMMISSION", amount: -5 },
      { kind: "FEE", amount: -2 },
      { kind: "SWAP", amount: -1 },
      { kind: "INTEREST", amount: 3 },
      { kind: "DIVIDEND", amount: 2 },
    ];
    const result = summarizeCashflows(rows);
    expect(result.charges).toBe(-13); // -10 - 5 - 2 - 1 + 3 + 2
  });

  it("ignores funding amounts in charges sum", () => {
    const rows: { kind: string; amount: number }[] = [
      { kind: "DEPOSIT", amount: 500 },
      { kind: "TAX", amount: -10 },
      { kind: "BONUS", amount: 100 },
    ];
    const result = summarizeCashflows(rows);
    expect(result.funding).toBe(600);
    expect(result.charges).toBe(-10);
  });

  it("handles empty rows", () => {
    const result = summarizeCashflows([]);
    expect(result.funding).toBe(0);
    expect(result.charges).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    const rows: { kind: string; amount: number }[] = [
      { kind: "DEPOSIT", amount: 100.156 },
      { kind: "TAX", amount: -50.234 },
    ];
    const result = summarizeCashflows(rows);
    expect(result.funding).toBe(100.16);
    expect(result.charges).toBe(-50.23);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mtTradeToEntryData tests
// ─────────────────────────────────────────────────────────────────────────────

describe("mtTradeToEntryData", () => {
  const baseDate = new Date("2026-01-15T12:00:00Z");

  it("calculates pnl = profit + commission + swap (net)", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 500, // gross profit
      commission: -10,
      swap: -5,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    const result = mtTradeToEntryData(trade, 0, "MT5");
    expect(result.pnl).toBe(485); // 500 - 10 - 5
  });

  it("rounds pnl to 2 decimals", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 100.456,
      commission: -50.234,
      swap: -25.111,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    const result = mtTradeToEntryData(trade, 0, "MT5");
    expect(result.pnl).toBe(25.11); // rounded
  });

  it("handles null commission and swap", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 500,
      commission: null,
      swap: null,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    const result = mtTradeToEntryData(trade, 0, "MT5");
    expect(result.pnl).toBe(500); // just profit
  });

  it("sets pnl=0 for open trades", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: null,
      stopLoss: null,
      takeProfit: null,
      profit: 100,
      commission: -5,
      swap: -2,
      openTime: baseDate,
      closeTime: null,
      closed: false,
    };
    const result = mtTradeToEntryData(trade, 0, "MT5");
    expect(result.pnl).toBe(0); // pnl is zeroed for open trades
    expect(result.status).toBe("OPEN");
  });

  it("adjusts times by timezone offset", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 500,
      commission: null,
      swap: null,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    // tzOffsetMs = 3 hours = 3 * 3600 * 1000
    const tzOffsetMs = 3 * 3600 * 1000;
    const result = mtTradeToEntryData(trade, tzOffsetMs, "MT5");
    const expectedTime = new Date(baseDate.getTime() - tzOffsetMs);
    expect(result.openedAt.getTime()).toBe(expectedTime.getTime());
    expect(result.closedAt?.getTime()).toBe(expectedTime.getTime());
  });

  it("handles timezone offset of 0", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 500,
      commission: null,
      swap: null,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    const result = mtTradeToEntryData(trade, 0, "MT5");
    expect(result.openedAt).toEqual(baseDate);
    expect(result.closedAt).toEqual(baseDate);
  });

  it("sets result field based on pnl", () => {
    const createTrade = (profit: number): MtTradeInput => ({
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit,
      commission: null,
      swap: null,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    });

    expect(mtTradeToEntryData(createTrade(100), 0, "MT5").result).toBe("PROFIT");
    expect(mtTradeToEntryData(createTrade(-50), 0, "MT5").result).toBe("LOSS");
    expect(mtTradeToEntryData(createTrade(0), 0, "MT5").result).toBe("BREAKEVEN");
  });

  it("sets volumeUnit to LOT", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 0.01,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 500,
      commission: null,
      swap: null,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    const result = mtTradeToEntryData(trade, 0, "MT5");
    expect(result.volumeUnit).toBe("LOT");
  });

  it("preserves externalSource as platform", () => {
    const trade: MtTradeInput = {
      externalId: "T1",
      symbol: "EURUSD",
      direction: "BUY",
      volume: 1,
      openPrice: 1.0800,
      closePrice: 1.0850,
      stopLoss: null,
      takeProfit: null,
      profit: 500,
      commission: null,
      swap: null,
      openTime: baseDate,
      closeTime: baseDate,
      closed: true,
    };
    expect(mtTradeToEntryData(trade, 0, "MT4").externalSource).toBe("MT4");
    expect(mtTradeToEntryData(trade, 0, "MT5").externalSource).toBe("MT5");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeTradeStats balance calculation tests
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTradeStats balance with cashflows", () => {
  it("calculates balance = initialBalance + cashFunding + cashCharges + netPnl", () => {
    const account: StatAccount = {
      initialBalance: 1000,
      goalType: "PERCENT",
      goalValue: 10,
      cashFunding: 500, // deposit + credit + bonus - withdrawal
      cashCharges: -50, // taxes, commissions, fees
    };
    const entries: StatEntry[] = [
      {
        status: "CLOSED" as const,
        pnl: 100,
        rMultiple: null,
        openedAt: new Date("2026-01-01"),
      },
    ];
    const result = computeTradeStats(entries, account);
    // balance = 1000 + 500 + (-50) + 100 = 1550
    expect(result.balance).toBe(1550);
  });

  it("behaves as before (balance = initialBalance + netPnl) without cashFunding/cashCharges", () => {
    const account: StatAccount = {
      initialBalance: 1000,
      goalType: "PERCENT",
      goalValue: 10,
    };
    const entries: StatEntry[] = [
      {
        status: "CLOSED" as const,
        pnl: 150,
        rMultiple: null,
        openedAt: new Date("2026-01-01"),
      },
    ];
    const result = computeTradeStats(entries, account);
    // balance = 1000 + 0 + 0 + 150 = 1150
    expect(result.balance).toBe(1150);
  });

  it("calculates goalTarget correctly with PERCENT goalType", () => {
    const account: StatAccount = {
      initialBalance: 1000,
      goalType: "PERCENT",
      goalValue: 10,
      cashFunding: 500,
    };
    const entries: StatEntry[] = [];
    const result = computeTradeStats(entries, account);
    // goalTarget = (initialBalance + cashFunding) * goalValue / 100 = (1000 + 500) * 10 / 100 = 150
    expect(result.goalTarget).toBe(150);
  });

  it("calculates goalTarget correctly with ABSOLUTE goalType", () => {
    const account: StatAccount = {
      initialBalance: 1000,
      goalType: "ABSOLUTE",
      goalValue: 200,
    };
    const entries: StatEntry[] = [];
    const result = computeTradeStats(entries, account);
    expect(result.goalTarget).toBe(200);
  });

  it("returns null goalTarget when no goalValue", () => {
    const account: StatAccount = {
      initialBalance: 1000,
      goalType: "PERCENT",
      goalValue: 0,
    };
    const entries: StatEntry[] = [];
    const result = computeTradeStats(entries, account);
    expect(result.goalTarget).toBeNull();
  });

  it("handles multiple trades with cashflows", () => {
    const account: StatAccount = {
      initialBalance: 5000,
      goalType: "PERCENT",
      goalValue: 20,
      cashFunding: 1000,
      cashCharges: -100,
    };
    const entries: StatEntry[] = [
      { status: "CLOSED" as const, pnl: 250, rMultiple: null, openedAt: new Date("2026-01-01") },
      { status: "CLOSED" as const, pnl: -100, rMultiple: null, openedAt: new Date("2026-01-05") },
      { status: "CLOSED" as const, pnl: 75, rMultiple: null, openedAt: new Date("2026-01-10") },
      { status: "OPEN" as const, pnl: 50, rMultiple: null, openedAt: new Date("2026-01-15") },
    ];
    const result = computeTradeStats(entries, account);
    // netPnl = 250 - 100 + 75 = 225
    // balance = 5000 + 1000 - 100 + 225 = 6125
    expect(result.netPnl).toBe(225);
    expect(result.balance).toBe(6125);
    // closedCount = 3, openCount = 1
    expect(result.closedCount).toBe(3);
    expect(result.openCount).toBe(1);
    // goalTarget = (5000 + 1000) * 20 / 100 = 1200
    expect(result.goalTarget).toBe(1200);
    // goalProgress = 225 / 1200
    expect(result.goalProgress).toBeCloseTo(0.1875);
  });

  it("rounds balance to 2 decimals", () => {
    const account: StatAccount = {
      initialBalance: 1000.123,
      goalType: "PERCENT",
      goalValue: 10,
      cashFunding: 500.456,
      cashCharges: -50.789,
    };
    const entries: StatEntry[] = [
      { status: "CLOSED" as const, pnl: 123.456, rMultiple: null, openedAt: new Date("2026-01-01") },
    ];
    const result = computeTradeStats(entries, account);
    // balance = 1000.123 + 500.456 + (-50.789) + 123.456 = 1573.246 → 1573.25
    expect(result.balance).toBe(1573.25);
  });

  it("handles negative cashCharges (fees) correctly", () => {
    const account: StatAccount = {
      initialBalance: 1000,
      goalType: "PERCENT",
      goalValue: 10,
      cashFunding: 500,
      cashCharges: -150, // fees and taxes
    };
    const entries: StatEntry[] = [
      { status: "CLOSED" as const, pnl: 100, rMultiple: null, openedAt: new Date("2026-01-01") },
    ];
    const result = computeTradeStats(entries, account);
    // balance = 1000 + 500 + (-150) + 100 = 1450
    expect(result.balance).toBe(1450);
  });
});
