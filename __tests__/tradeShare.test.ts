import { describe, it, expect } from "vitest";
import {
  computeTradeShare,
  isValidIsoDate,
  resolveTradeShareRange,
  tehranMidnightUtc,
  tehranToday,
  type TradeShareAccountInput,
  type TradeShareEntryInput,
} from "@/lib/tradeShare";
import { computeTradeStats } from "@/lib/tradeAnalytics";

// همه‌ی تاریخ‌ها با تقویم واقعی چک شده‌اند: 2026-10-01 = پنجشنبه 9 مهر 1405،
// 1 مهر 1405 = 2026-09-23، اسفند 1403 سی‌روزه (کبیسه) و اسفند 1404 بیست‌ونه‌روزه.

describe("resolveTradeShareRange", () => {
  it("day: نیمه‌شب تهران تا نیمه‌شب بعد، به UTC", () => {
    const r = resolveTradeShareRange("day", "2026-10-01");
    expect(r.startIso).toBe("2026-09-30T20:30:00.000Z");
    expect(r.endIso).toBe("2026-10-01T20:30:00.000Z");
    expect(r.days).toEqual(["2026-10-01"]);
    expect(r.rangeLabel).toBe("پنجشنبه 9 مهر 1405");
  });

  it("week: از شنبه تا جمعه، هر روز هفته همان بازه را می‌دهد", () => {
    for (const d of ["2026-09-26", "2026-09-28", "2026-10-01", "2026-10-02"]) {
      const r = resolveTradeShareRange("week", d);
      expect(r.firstDay).toBe("2026-09-26"); // شنبه
      expect(r.lastDay).toBe("2026-10-02"); // جمعه
      expect(r.days).toHaveLength(7);
      expect(r.startIso).toBe("2026-09-25T20:30:00.000Z");
      expect(r.endIso).toBe("2026-10-02T20:30:00.000Z");
      expect(r.rangeLabel).toBe("هفته‌ی 4 تا 10 مهر 1405");
    }
    // شنبه‌ی بعد یعنی هفته‌ی بعد
    expect(resolveTradeShareRange("week", "2026-10-03").firstDay).toBe("2026-10-03");
  });

  it("week: برچسب دو ماهه و دو ساله", () => {
    expect(resolveTradeShareRange("week", "2026-09-21").rangeLabel).toBe("هفته‌ی 28 شهریور تا 3 مهر 1405");
    expect(resolveTradeShareRange("week", "2025-03-20").rangeLabel).toBe("هفته‌ی 25 اسفند 1403 تا 1 فروردین 1404");
  });

  it("month: ماه شمسی، 31 روزه و 30 روزه", () => {
    const shahrivar = resolveTradeShareRange("month", "2026-09-22");
    expect(shahrivar.firstDay).toBe("2026-08-23");
    expect(shahrivar.lastDay).toBe("2026-09-22");
    expect(shahrivar.days).toHaveLength(31);
    expect(shahrivar.rangeLabel).toBe("شهریور 1405");

    const mehr = resolveTradeShareRange("month", "2026-09-23");
    expect(mehr.firstDay).toBe("2026-09-23");
    expect(mehr.lastDay).toBe("2026-10-22");
    expect(mehr.days).toHaveLength(30);
    expect(mehr.startIso).toBe("2026-09-22T20:30:00.000Z");
    expect(mehr.endIso).toBe("2026-10-22T20:30:00.000Z");
    expect(mehr.rangeLabel).toBe("مهر 1405");
    expect(resolveTradeShareRange("month", "2026-10-22").firstDay).toBe("2026-09-23");
  });

  it("month: اسفند کبیسه و غیرکبیسه", () => {
    const e1403 = resolveTradeShareRange("month", "2025-03-01");
    expect(e1403.firstDay).toBe("2025-02-19");
    expect(e1403.lastDay).toBe("2025-03-20");
    expect(e1403.days).toHaveLength(30);
    expect(e1403.rangeLabel).toBe("اسفند 1403");

    const e1404 = resolveTradeShareRange("month", "2026-03-01");
    expect(e1404.firstDay).toBe("2026-02-20");
    expect(e1404.lastDay).toBe("2026-03-20");
    expect(e1404.days).toHaveLength(29);
    expect(resolveTradeShareRange("month", "2026-03-21").rangeLabel).toBe("فروردین 1405");
  });

  it("تاریخ نامعتبر", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-2-3")).toBe(false);
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(() => resolveTradeShareRange("day", "nope")).toThrow();
  });

  it("امروز و نیمه‌شب تهران", () => {
    expect(tehranToday(new Date("2026-09-30T20:29:00Z"))).toBe("2026-09-30");
    expect(tehranToday(new Date("2026-09-30T20:30:00Z"))).toBe("2026-10-01");
    expect(new Date(tehranMidnightUtc("2026-06-15")).toISOString()).toBe("2026-06-14T20:30:00.000Z");
  });

  it("برچسب‌ها بدون اعراب و ارقام لاتین", () => {
    const labels = ["day", "week", "month"].map((p) => resolveTradeShareRange(p as "day", "2026-10-01").rangeLabel);
    for (const l of labels) {
      expect(l).not.toMatch(/[\u064B-\u0652\u0654\u0655\u0623\u0625]/);
      expect(l).not.toMatch(/[\u06F0-\u06F9\u0660-\u0669]/);
    }
  });
});

const ACC_USD: TradeShareAccountInput = { id: "a1", name: "اصلی", color: "#00A86B", currency: "USD", initialBalance: 1000 };
const ACC_USD2: TradeShareAccountInput = { id: "a2", name: "دوم", color: "#3E7BFA", currency: "USD", initialBalance: 500 };
const ACC_EUR: TradeShareAccountInput = { id: "a3", name: "یورو", color: "#ff0000", currency: "EUR", initialBalance: 1000 };

function e(accountId: string, openedAt: string, pnl: number, symbol = "EURUSD", rMultiple: number | null = null, status = "CLOSED"): TradeShareEntryInput {
  return { accountId, openedAt, pnl, symbol, rMultiple, status };
}

const NOW = new Date("2026-10-01T12:00:00Z"); // پنجشنبه 9 مهر، عصر تهران

describe("computeTradeShare", () => {
  const week = resolveTradeShareRange("week", "2026-10-01");
  const entries = [
    e("a1", "2026-09-26T06:00:00Z", 100, "EURUSD", 2), // شنبه
    e("a1", "2026-09-26T09:00:00Z", -50, "XAUUSD", -1),
    e("a1", "2026-09-28T07:00:00Z", 0, "EURUSD", 0),
    e("a1", "2026-09-29T07:00:00Z", 30, "GBPUSD", null),
    e("a1", "2026-09-29T08:00:00Z", 999, "EURUSD", null, "OPEN"), // باز، حساب نمی‌شود
    e("a1", "2026-09-25T20:00:00Z", 77, "EURUSD"), // جمعه‌ی قبل (به وقت تهران)، بیرون
    e("a1", "2026-10-02T21:00:00Z", 77, "EURUSD"), // شنبه‌ی بعد، بیرون
    e("zz", "2026-09-27T08:00:00Z", 500, "BTCUSD"), // حساب دیگر
  ];

  it("آمار هم‌تعریف computeTradeStats", () => {
    const d = computeTradeShare(entries, [ACC_USD], "week", week, { a1: 200 }, "a1", NOW);
    const inRange = entries.slice(0, 4);
    const ref = computeTradeStats(inRange.map((x) => ({ status: "CLOSED" as const, pnl: x.pnl, rMultiple: x.rMultiple, openedAt: String(x.openedAt) })));
    expect(d.stats.trades).toBe(4);
    expect(d.stats.wins).toBe(ref.winCount);
    expect(d.stats.losses).toBe(ref.lossCount);
    expect(d.stats.breakEven).toBe(1);
    expect(d.stats.winRate).toBe(ref.winRate);
    expect(d.stats.winRate).toBe(50);
    expect(d.stats.profitFactor).toBe(ref.profitFactor);
    expect(d.stats.profitFactor).toBe(2.6);
    expect(d.stats.avgR).toBe(ref.avgR);
    expect(d.stats.netPnl).toBe(80);
    expect(d.stats.bestTrade).toBe(100);
    expect(d.stats.worstTrade).toBe(-50);
    // 80 / (1000 + 200)
    expect(d.stats.returnPct).toBe(6.67);
    expect(d.account).toEqual({ id: "a1", name: "اصلی", color: "#00A86B", currency: "USD" });
    expect(d.accountCount).toBe(1);
    expect(d.currency).toBe("USD");
    expect(d.currencyMixed).toBe(false);
    expect(d.rangeLabel).toBe(week.rangeLabel);
    expect(d.startIso).toBe(week.startIso);
  });

  it("منحنی هفته: پایان هر روز تا امروز، روزهای خالی صاف", () => {
    const d = computeTradeShare(entries, [ACC_USD], "week", week, {}, "a1", NOW);
    // شنبه 50، یکشنبه 50، دوشنبه 50، سه‌شنبه 80، چهارشنبه 80، پنجشنبه (امروز) 80؛ جمعه آینده است
    expect(d.curve).toEqual([0, 50, 50, 50, 80, 80, 80]);
  });

  it("منحنی هفته‌ی گذشته کامل است و ماه هم روزبه‌روز", () => {
    const past = computeTradeShare(entries, [ACC_USD], "week", week, {}, "a1", new Date("2026-12-01T00:00:00Z"));
    expect(past.curve).toHaveLength(8);
    const month = resolveTradeShareRange("month", "2026-10-01");
    const m = computeTradeShare(entries, [ACC_USD], "month", month, {}, "a1", NOW);
    // 1 تا 9 مهر = 9 روز تا امروز
    expect(m.curve).toHaveLength(10);
    // معامله‌ی جمعه 3 مهر هم داخل ماه است: 77 + 80
    expect(m.curve[m.curve.length - 1]).toBe(157);
  });

  it("منحنی روز: بعد از هر معامله", () => {
    const day = resolveTradeShareRange("day", "2026-09-26");
    const d = computeTradeShare(entries, [ACC_USD], "day", day, {}, "a1", NOW);
    expect(d.curve).toEqual([0, 100, 50]);
    expect(d.stats.trades).toBe(2);
    expect(d.rangeLabel).toBe("شنبه 4 مهر 1405");
  });

  it("بدون معامله", () => {
    const day = resolveTradeShareRange("day", "2026-09-27");
    const d = computeTradeShare(entries, [ACC_USD], "day", day, {}, "a1", NOW);
    expect(d.stats).toMatchObject({ trades: 0, winRate: null, netPnl: 0, returnPct: 0, profitFactor: null, avgR: null, bestTrade: null, worstTrade: null });
    expect(d.curve).toEqual([0]);
    expect(d.topSymbols).toEqual([]);
  });

  it("همه‌ی حساب‌ها با یک ارز: جمع و پایه‌ی بازده", () => {
    const list = [...entries, e("a2", "2026-09-27T08:00:00Z", 40, "XAUUSD")];
    const d = computeTradeShare(list, [ACC_USD, ACC_USD2], "week", week, { a1: 0, a2: -100 }, null, NOW);
    expect(d.account).toBeNull();
    expect(d.accountCount).toBe(2);
    expect(d.currency).toBe("USD");
    expect(d.stats.netPnl).toBe(120);
    // 120 / (1000 + 500 - 100)
    expect(d.stats.returnPct).toBe(8.57);
  });

  it("ارزهای مختلف: مبالغ و منحنی null/خالی", () => {
    const list = [...entries, e("a3", "2026-09-27T08:00:00Z", 40, "EURUSD")];
    const d = computeTradeShare(list, [ACC_USD, ACC_EUR], "week", week, {}, null, NOW);
    expect(d.currencyMixed).toBe(true);
    expect(d.currency).toBeNull();
    expect(d.stats.netPnl).toBeNull();
    expect(d.stats.returnPct).toBeNull();
    expect(d.stats.bestTrade).toBeNull();
    expect(d.stats.worstTrade).toBeNull();
    expect(d.stats.trades).toBe(5);
    expect(d.stats.winRate).toBe(60);
    expect(d.curve).toEqual([]);
    expect(d.topSymbols.every((s) => s.netPnl === null)).toBe(true);
  });

  it("پایه‌ی صفر یا منفی → returnPct null", () => {
    const zero = { ...ACC_USD, initialBalance: 0 };
    const d = computeTradeShare(entries, [zero], "week", week, {}, "a1", NOW);
    expect(d.stats.returnPct).toBeNull();
    const neg = computeTradeShare(entries, [ACC_USD], "week", week, { a1: -1000 }, "a1", NOW);
    expect(neg.stats.returnPct).toBeNull();
  });

  it("نمادهای برتر: حداکثر 3، تعداد و بعد قدرمطلق سود/زیان", () => {
    const list = [
      e("a1", "2026-09-26T06:00:00Z", 10, "EURUSD"),
      e("a1", "2026-09-26T06:10:00Z", 10, "EURUSD"),
      e("a1", "2026-09-26T06:20:00Z", 5, "GBPUSD"),
      e("a1", "2026-09-26T06:30:00Z", -300, "XAUUSD"),
      e("a1", "2026-09-26T06:40:00Z", 20, "USDJPY"),
    ];
    const d = computeTradeShare(list, [ACC_USD], "week", week, {}, "a1", NOW);
    expect(d.topSymbols).toEqual([
      { symbol: "EURUSD", count: 2, netPnl: 20 },
      { symbol: "XAUUSD", count: 1, netPnl: -300 },
      { symbol: "USDJPY", count: 1, netPnl: 20 },
    ]);
  });
});
