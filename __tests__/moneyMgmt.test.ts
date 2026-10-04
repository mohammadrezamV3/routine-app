import { describe, it, expect } from "vitest";
import {
  DEFAULT_MONEY_RULES, appendMmLog, normalizeMmEvents, readStoredRules, rulesForEa, validateMoneyRules,
} from "@/lib/moneyMgmt";

describe("validateMoneyRules", () => {
  it("ورودی خالی یا خراب = پیش‌فرض", () => {
    expect(validateMoneyRules(null)).toEqual(DEFAULT_MONEY_RULES);
    expect(validateMoneyRules("x")).toEqual(DEFAULT_MONEY_RULES);
    expect(readStoredRules(undefined)).toEqual(DEFAULT_MONEY_RULES);
  });
  it("عددها داخل بازه clamp می‌شن", () => {
    const r = validateMoneyRules({
      riskPerTradePct: 99, slGraceSec: 1, maxOpenTrades: 500, maxDailyTrades: 0.2,
      maxDailyLossPct: 0.1, breakEvenAtR: 99, beOffsetPoints: -5,
    });
    expect(r.riskPerTradePct).toBe(10);
    expect(r.slGraceSec).toBe(10);
    expect(r.maxOpenTrades).toBe(50);
    expect(r.maxDailyTrades).toBe(1);
    expect(r.maxDailyLossPct).toBe(0.5);
    expect(r.breakEvenAtR).toBe(5);
    expect(r.beOffsetPoints).toBe(0);
  });
  it("صفر = خاموش و رشته‌ی عددی پذیرفته می‌شه", () => {
    const r = validateMoneyRules({ maxOpenTrades: 0, maxDailyLossPct: "0", riskPerTradePct: "2.5", enabled: "true" });
    expect(r.maxOpenTrades).toBe(0);
    expect(r.maxDailyLossPct).toBe(0);
    expect(r.riskPerTradePct).toBe(2.5);
    expect(r.enabled).toBe(true);
  });
  it("ریسک SL خودکار از ریسک هر معامله بیشتر نمی‌شه", () => {
    expect(validateMoneyRules({ riskPerTradePct: 1, autoSLPct: 5 }).autoSLPct).toBe(1);
  });
  it("تریلینگ ناقص خاموش می‌شه", () => {
    const r = validateMoneyRules({ trailingStartR: 1, trailingDistR: 0 });
    expect(r.trailingStartR).toBe(0);
    expect(r.trailingDistR).toBe(0);
    const ok = validateMoneyRules({ trailingStartR: 1.5, trailingDistR: 1 });
    expect(ok.trailingStartR).toBe(1.5);
    expect(ok.trailingDistR).toBe(1);
  });
  it("NaN و نوع اشتباه به مقدار پایه برمی‌گرده", () => {
    const r = validateMoneyRules({ riskPerTradePct: NaN, requireSL: "maybe" });
    expect(r.riskPerTradePct).toBe(DEFAULT_MONEY_RULES.riskPerTradePct);
    expect(r.requireSL).toBe(DEFAULT_MONEY_RULES.requireSL);
  });
});

describe("mmLog", () => {
  it("رویدادها سقف و کوتاه‌سازی دارن", () => {
    const raw = Array.from({ length: 40 }, (_, i) => ({ t: "t", action: "sl_set", ticket: i, detail: "x".repeat(500) }));
    const ev = normalizeMmEvents(raw);
    expect(ev).toHaveLength(20);
    expect(ev[0].detail).toHaveLength(120);
    expect(ev[3].ticket).toBe("3");
    expect(normalizeMmEvents([{ t: "x" }, 5, null])).toEqual([]);
    expect(normalizeMmEvents("x")).toEqual([]);
  });
  it("لاگ آخرین 30 مورد رو نگه می‌داره", () => {
    let log: unknown = [];
    for (let i = 0; i < 3; i++) {
      log = appendMmLog(log, normalizeMmEvents(Array.from({ length: 20 }, (_, j) => ({ t: "t", action: "trail", ticket: `${i}-${j}` }))));
    }
    expect(log as unknown[]).toHaveLength(30);
    expect((log as { ticket: string }[])[29].ticket).toBe("2-19");
  });
});

describe("rulesForEa", () => {
  it("بولین‌ها 0/1 می‌شن", () => {
    const r = rulesForEa({ ...DEFAULT_MONEY_RULES, requireSL: true, lockOnTarget: false });
    expect(r.requireSL).toBe(1);
    expect(r.lockOnTarget).toBe(0);
    expect(r.riskPct).toBe(1);
  });
});
