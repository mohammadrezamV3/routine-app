import { describe, it, expect } from "vitest";
import {
  cleanMtSymbol, mtTradeToEntryData, mtUpdateData, normalizeMtTrades, normalizeTzOffsetMs,
} from "@/lib/metatrader";

// پایپ‌لاینِ ورودیِ EA: هر ردیفِ معتبر باید برسد و یک ردیفِ خراب نباید بقیه را بیندازد.

const base = { ticket: "1001", symbol: "EURUSD", type: "BUY", volume: 0.1, openTime: 1_780_000_000 };

describe("normalizeMtTrades", () => {
  it("نمادهای رایجِ بروکر با پسوند/فاصله/اسلش دیگر دور ریخته نمی‌شوند", () => {
    const syms = ["EURUSD+", "XAUUSD!", "US30 Cash", "BTC/USD", ".US500", "[DJI30]", "GER40$", "eurusd.m"];
    const out = normalizeMtTrades(syms.map((symbol, i) => ({ ...base, ticket: String(i + 1), symbol })));
    expect(out.map((t) => t.symbol)).toEqual(syms.map((s) => s.toUpperCase()));
  });

  it("۱۰ معامله با SL/TP صفر، حجمِ ۰٫۰۰ و قیمتِ ناقص → هر ۱۰ تا", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ...base, ticket: String(2000 + i), stopLoss: 0, takeProfit: 0, volume: i % 3 ? 0.1 : "0.00",
      openPrice: i % 2 ? 1.1 : 0, closePrice: 1.2, closeTime: 1_780_000_600, closed: true,
    }));
    const out = normalizeMtTrades(rows);
    expect(out).toHaveLength(10);
    expect(out[0].stopLoss).toBeNull();
    expect(out[0].takeProfit).toBeNull();
    expect(out[0].openPrice).toBeNull();
  });

  it("ردیفِ بدشکل فقط خودش حذف می‌شود", () => {
    const out = normalizeMtTrades([
      { ...base, ticket: "1" },
      null,
      { ...base, ticket: "" },
      { ...base, ticket: "0" },
      { ...base, ticket: "4", openTime: 0 },
      { ...base, ticket: "5", symbol: "" },
      { ...base, ticket: "6" },
    ]);
    expect(out.map((t) => t.externalId)).toEqual(["1", "6"]);
  });

  it("معامله‌ی بازِ MT4 (closeTime=0، closePrice=قیمتِ لحظه) بسته حساب نمی‌شود", () => {
    const [t] = normalizeMtTrades([{ ...base, closeTime: 0, closePrice: 1.23, closed: false }]);
    expect(t.closed).toBe(false);
    expect(t.closeTime).toBeNull();
    expect(t.closePrice).toBeNull();
  });

  it("ممیزِ «,» و زمانِ رشته‌ای را می‌فهمد", () => {
    const [t] = normalizeMtTrades([{ ...base, volume: "0,05", openTime: "1780000000" }]);
    expect(t.volume).toBe(0.05);
    expect(t.openTime.getTime()).toBe(1_780_000_000_000);
  });

  it("سقفِ هر درخواست از چانکِ EA (۳۰۰) بزرگ‌تر است", () => {
    const rows = Array.from({ length: 800 }, (_, i) => ({ ...base, ticket: String(i + 1) }));
    expect(normalizeMtTrades(rows)).toHaveLength(800);
  });

  it("cleanMtSymbol کاراکترِ کنترلی را حذف می‌کند", () => {
    expect(cleanMtSymbol("EUR\u0000USD\n")).toBe("EURUSD");
  });
});

describe("normalizeTzOffsetMs", () => {
  it("اختلافِ کمی عقب از TimeCurrent به ۱۵ دقیقه گرد می‌شود", () => {
    expect(normalizeTzOffsetMs(119)).toBe(120 * 60_000);
    expect(normalizeTzOffsetMs(181)).toBe(180 * 60_000);
  });
  it("مقدارِ نامعتبرِ آخرِ هفته (−۴۸ساعت) نادیده گرفته می‌شود", () => {
    expect(normalizeTzOffsetMs(-2880)).toBe(0);
    expect(normalizeTzOffsetMs(undefined)).toBe(0);
  });
});

describe("mtTradeToEntryData / mtUpdateData", () => {
  it("زمان به UTC و pnl خالص (سود + کمیسیون + سواپ)", () => {
    const [t] = normalizeMtTrades([{
      ...base, profit: 10, commission: -1.5, swap: -0.25, closePrice: 1.2, closeTime: 1_780_003_600, closed: true,
    }]);
    const d = mtTradeToEntryData(t, 120 * 60_000, "MT5");
    expect(d.openedAt.getTime()).toBe((1_780_000_000 - 7200) * 1000);
    expect(d.pnl).toBe(8.25);
    expect(d.status).toBe("CLOSED");
  });

  it("پیلودِ قدیمیِ MT5 (بدونِ openPrice/SL/TP) داده‌ی کاملِ قبلی را پاک نمی‌کند", () => {
    const [t] = normalizeMtTrades([{
      ticket: "77", symbol: "EURUSD", type: "BUY", volume: 0.1, closePrice: 1.2, profit: 5,
      commission: -1, swap: 0, openTime: 1_780_003_600, closeTime: 1_780_003_600, closed: true,
    }]);
    const upd = mtUpdateData(mtTradeToEntryData(t, 0, "MT5"), t);
    expect(upd).not.toHaveProperty("openedAt");
    expect(upd).not.toHaveProperty("entryPrice");
    expect(upd).not.toHaveProperty("stopLoss");
    expect(upd).not.toHaveProperty("takeProfit");
    expect(upd.status).toBe("CLOSED");
    expect(upd.pnl).toBe(4);
    expect(upd.exitPrice).toBe(1.2);
  });

  it("پیلودِ کامل همه‌ی فیلدها را به‌روز می‌کند", () => {
    const [t] = normalizeMtTrades([{ ...base, openPrice: 1.1, stopLoss: 1.09, takeProfit: 1.12 }]);
    const upd = mtUpdateData(mtTradeToEntryData(t, 0, "MT4"), t);
    expect(upd.openedAt).toBeInstanceOf(Date);
    expect(upd.entryPrice).toBe(1.1);
    expect(upd.stopLoss).toBe(1.09);
  });
});
