import { describe, it, expect } from "vitest";
import { calcRisk, symbolSpec, pipValuePerLot, crossQuoteCurrency, yahooSymbolFor, type RiskResult } from "@/lib/riskCalc";

const base = { balance: 10000, mode: "percent" as const, riskValue: 1 };

function ok(r: ReturnType<typeof calcRisk>): RiskResult {
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("symbolSpec", () => {
  it("اندازه‌ی پیپ", () => {
    expect(symbolSpec("EURUSD").pipSize).toBe(0.0001);
    expect(symbolSpec("USDJPY").pipSize).toBe(0.01);
    expect(symbolSpec("eurjpy").pipSize).toBe(0.01);
    expect(symbolSpec("XAUUSD").pipSize).toBe(0.1);
    expect(symbolSpec("US30").pipSize).toBe(1);
    expect(symbolSpec("BTCUSD").pipSize).toBe(1);
  });
});

describe("pipValuePerLot", () => {
  it("EURUSD ده دلار", () => {
    expect(pipValuePerLot(symbolSpec("EURUSD"), 1.1).value).toBeCloseTo(10, 6);
  });
  it("USDJPY: 1000 ین تقسیم بر قیمت", () => {
    expect(pipValuePerLot(symbolSpec("USDJPY"), 150).value).toBeCloseTo(1000 / 150, 6);
  });
  it("USDCHF به قیمت تقسیم می‌شود", () => {
    expect(pipValuePerLot(symbolSpec("USDCHF"), 0.9).value).toBeCloseTo(10 / 0.9, 6);
  });
  it("EURJPY با نرخ کاربر و تقریبی", () => {
    const s = symbolSpec("EURJPY");
    expect(pipValuePerLot(s, 160, 0.0065).value).toBeCloseTo(6.5, 6);
    expect(pipValuePerLot(s, 160, 0.0065).approx).toBe(false);
    expect(pipValuePerLot(s, 160).approx).toBe(true);
  });
  it("XAUUSD: 10 دلار به ازای هر 0.1", () => {
    expect(pipValuePerLot(symbolSpec("XAUUSD"), 2000).value).toBeCloseTo(10, 6);
  });
  it("شاخص یک دلار هر پوینت", () => {
    expect(pipValuePerLot(symbolSpec("US30"), 38000).value).toBe(1);
  });
});

describe("crossQuoteCurrency", () => {
  it("فقط برای کراس", () => {
    expect(crossQuoteCurrency("EURJPY")).toBe("JPY");
    expect(crossQuoteCurrency("EURUSD")).toBeNull();
    expect(crossQuoteCurrency("USDJPY")).toBeNull();
    expect(crossQuoteCurrency("XAUUSD")).toBeNull();
  });
});

describe("calcRisk", () => {
  it("EURUSD خرید: 1 درصد از 10000 با 50 پیپ = 0.2 لات", () => {
    const r = ok(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.095, takeProfits: [{ price: 1.11 }] }));
    expect(r.slPips).toBeCloseTo(50, 6);
    expect(r.lots).toBe(0.2);
    expect(r.riskAmount).toBeCloseTo(100, 6);
    expect(r.tps[0].pips).toBeCloseTo(100, 6);
    expect(r.rr).toBeCloseTo(2, 6);
    expect(r.totalProfit).toBeCloseTo(200, 6);
    expect(r.breakevenWinRate).toBeCloseTo(1 / 3, 6);
  });

  it("فروش EURUSD", () => {
    const r = ok(calcRisk({ ...base, symbol: "EURUSD", direction: "SELL", entry: 1.1, stopLoss: 1.105, takeProfits: [{ price: 1.09 }] }));
    expect(r.lots).toBe(0.2);
    expect(r.rr).toBeCloseTo(2, 6);
  });

  it("USDJPY: 100 دلار ریسک، 50 پیپ", () => {
    const r = ok(calcRisk({ ...base, symbol: "USDJPY", direction: "BUY", entry: 150, stopLoss: 149.5 }));
    expect(r.slPips).toBeCloseTo(50, 6);
    // ارزش پیپ = 1000/150 = 6.667 → 100 / (50*6.667) = 0.3
    expect(r.lots).toBe(0.3);
    expect(r.riskAmount).toBeLessThanOrEqual(100 + 1e-9);
    expect(r.rr).toBeNull();
  });

  it("XAUUSD: 2000 به 1990 یعنی 100 پیپ، ریسک 100 دلار = 0.1 لات", () => {
    const r = ok(calcRisk({ ...base, symbol: "XAUUSD", direction: "BUY", entry: 2000, stopLoss: 1990, takeProfits: [{ price: 2030 }] }));
    expect(r.slPips).toBeCloseTo(100, 6);
    expect(r.lots).toBe(0.1);
    expect(r.totalProfit).toBeCloseTo(300, 6);
    expect(r.rr).toBeCloseTo(3, 6);
  });

  it("مبلغ ثابت", () => {
    const r = ok(calcRisk({ symbol: "EURUSD", direction: "BUY", balance: 0, mode: "amount", riskValue: 50, entry: 1.1, stopLoss: 1.095 }));
    expect(r.lots).toBe(0.1);
    expect(r.riskAmount).toBeCloseTo(50, 6);
  });

  it("لات همیشه به پایین گرد می‌شود", () => {
    const r = ok(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.0937 }));
    expect(r.lotsRaw).toBeGreaterThan(r.lots);
    expect(r.riskAmount).toBeLessThanOrEqual(100);
  });

  it("چند هدف با سهم", () => {
    const r = ok(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.095,
      takeProfits: [{ price: 1.105, share: 50 }, { price: 1.115, share: 50 }] }));
    // 0.1 لات در 50 پیپ + 0.1 لات در 150 پیپ → 50 + 150 = 200
    expect(r.totalProfit).toBeCloseTo(200, 6);
    expect(r.rr).toBeCloseTo(2, 6);
  });

  it("حد ضرر سمت اشتباه", () => {
    expect(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.105 }).ok).toBe(false);
    expect(calcRisk({ ...base, symbol: "EURUSD", direction: "SELL", entry: 1.1, stopLoss: 1.095 }).ok).toBe(false);
    expect(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.1 }).ok).toBe(false);
  });

  it("حد سود سمت اشتباه", () => {
    expect(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.095, takeProfits: [{ price: 1.09 }] }).ok).toBe(false);
  });

  it("ورودی نامعتبر", () => {
    expect(calcRisk({ ...base, balance: 0, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.09 }).ok).toBe(false);
    expect(calcRisk({ ...base, riskValue: 0, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.09 }).ok).toBe(false);
    expect(calcRisk({ ...base, symbol: "EURUSD", direction: "BUY", entry: NaN, stopLoss: 1.09 }).ok).toBe(false);
  });

  it("لات کمتر از حداقل هشدار می‌دهد", () => {
    const r = ok(calcRisk({ ...base, balance: 100, symbol: "EURUSD", direction: "BUY", entry: 1.1, stopLoss: 1.0 }));
    expect(r.lots).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("yahooSymbolFor", () => {
  it("نگاشت", () => {
    expect(yahooSymbolFor("EURUSD")).toBe("EURUSD=X");
    expect(yahooSymbolFor("XAUUSD")).toBe("GC=F");
    expect(yahooSymbolFor("BTCUSD")).toBe("BTC-USD");
    expect(yahooSymbolFor("US30")).toBe("^DJI");
    expect(yahooSymbolFor("???")).toBeNull();
  });
});
