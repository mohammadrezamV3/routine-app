import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ECON_CALENDAR_CURRENCIES, ECON_IMPACT_COLORS, ECON_IMPACT_LABELS, ECON_IMPACT_ORDER,
  TICKER_CATEGORY_LABELS, TICKER_DEFAULT_SYMBOLS, TICKER_MAX_SYMBOLS, TICKER_MIN_SYMBOLS,
} from "@/lib/mobileTradeOnlineContract";
import { CALENDAR_CURRENCIES, IMPACT_COLORS, IMPACT_LABELS, IMPACT_ORDER } from "@/lib/economicCalendar";
import {
  CATEGORY_LABELS, DEFAULT_TICKER_SYMBOLS_IRAN, MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS,
} from "@/lib/tickerSymbols";

// lib/mobileTradeOnlineContract.ts نسخه‌ی مرجعه؛ اپ اندروید کپیِ عینی‌اش رو
// در mobile/src/lib/trade-online-contract.ts داره.
describe("mobile trade-online API contract", () => {
  const root = path.resolve(__dirname, "..");
  const server = fs.readFileSync(path.join(root, "lib/mobileTradeOnlineContract.ts"), "utf8");

  it("mobile/src/lib/trade-online-contract.ts is an exact copy", () => {
    const mobilePath = path.join(root, "mobile/src/lib/trade-online-contract.ts");
    if (!fs.existsSync(mobilePath)) return;
    expect(fs.readFileSync(mobilePath, "utf8")).toBe(server);
  });

  it("has no imports (so it can be copied verbatim)", () => {
    expect(server).not.toMatch(/^\s*import\s/m);
  });

  it("mirrors the web constants it duplicates", () => {
    expect(ECON_CALENDAR_CURRENCIES).toEqual(CALENDAR_CURRENCIES);
    expect(ECON_IMPACT_LABELS).toEqual(IMPACT_LABELS);
    expect(ECON_IMPACT_COLORS).toEqual(IMPACT_COLORS);
    expect(ECON_IMPACT_ORDER).toEqual(IMPACT_ORDER);
    expect(TICKER_CATEGORY_LABELS).toEqual(CATEGORY_LABELS);
    expect(TICKER_DEFAULT_SYMBOLS).toEqual(DEFAULT_TICKER_SYMBOLS_IRAN);
    expect(TICKER_MAX_SYMBOLS).toBe(MAX_TICKER_SYMBOLS);
    expect(TICKER_MIN_SYMBOLS).toBe(MIN_TICKER_SYMBOLS);
  });
});
