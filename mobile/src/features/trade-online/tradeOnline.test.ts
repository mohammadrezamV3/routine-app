import { describe, expect, it } from "vitest";
import type { EconomicEventDto } from "@/lib/trade-online-contract";
import { json, loggedInClient } from "@/sync/testUtils";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyCalendarFilters,
  compareActualToForecast,
  groupByLocalDay,
  hasPendingRelease,
  jalaliWeekLabel,
  weekQuery,
  weekStartOf,
  weeksToEvict,
} from "./lib/calendar";
import { formatPrice, groupCatalog, toggleSymbol, tradingViewUrl } from "./lib/market";
import { TradeOnlineError, describeTradeOnlineError, makeTradeOnlineApi } from "./client";

const ev = (over: Partial<EconomicEventDto>): EconomicEventDto => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  title: "CPI m/m",
  country: "US",
  currency: "USD",
  impact: "HIGH",
  occursAt: "2026-09-26T12:30:00.000Z",
  actual: null,
  forecast: "0.3%",
  previous: "0.2%",
  description: null,
  source: "TEST",
  ...over,
});

describe("calendar logic", () => {
  it("week starts on Saturday (local) and queries a full week with the tz offset", () => {
    const fri = new Date(2026, 8, 25, 18); // جمعه
    expect(weekStartOf(fri)).toEqual(new Date(2026, 8, 19)); // شنبه‌ی قبل
    const sat = new Date(2026, 8, 26, 1);
    expect(weekStartOf(sat)).toEqual(new Date(2026, 8, 26));
    const q = weekQuery(new Date(2026, 8, 26));
    expect(q.from).toBe("2026-09-26");
    expect(q.to).toBe("2026-10-02");
    expect(q.tz).toBe(-new Date().getTimezoneOffset());
    expect(jalaliWeekLabel(new Date(2026, 8, 26))).toContain("مهر");
  });

  it("filters mirror the server semantics (currency OR other, impact, title search)", () => {
    const events = [
      ev({ id: "a", currency: "USD", impact: "HIGH", title: "Non-Farm Payrolls" }),
      ev({ id: "b", currency: "EUR", impact: "LOW", title: "German PMI" }),
      ev({ id: "c", currency: "TRY", impact: "MEDIUM", title: "Rate Decision" }),
    ];
    const ids = (f = EMPTY_FILTERS) => applyCalendarFilters(events, f).map((e) => e.id);
    expect(ids()).toEqual(["a", "b", "c"]);
    expect(ids({ ...EMPTY_FILTERS, currencies: ["usd"] })).toEqual(["a"]);
    expect(ids({ ...EMPTY_FILTERS, other: true })).toEqual(["c"]);
    expect(ids({ ...EMPTY_FILTERS, currencies: ["EUR"], other: true })).toEqual(["b", "c"]);
    expect(ids({ ...EMPTY_FILTERS, impacts: ["HIGH", "LOW"] })).toEqual(["a", "b"]);
    expect(ids({ ...EMPTY_FILTERS, q: "pmi" })).toEqual(["b"]);
    expect(activeFilterCount({ currencies: ["EUR"], other: true, impacts: ["HIGH"], q: " x " })).toBe(4);
  });

  it("groups by local day in time order", () => {
    const a = ev({ id: "a", occursAt: new Date(2026, 8, 27, 9).toISOString() });
    const b = ev({ id: "b", occursAt: new Date(2026, 8, 26, 23, 30).toISOString() });
    const c = ev({ id: "c", occursAt: new Date(2026, 8, 26, 0, 15).toISOString() });
    const days = groupByLocalDay([a, b, c]);
    expect(days.map((d) => d.dayIso)).toEqual(["2026-09-26", "2026-09-27"]);
    expect(days[0].events.map((e) => e.id)).toEqual(["c", "b"]);
  });

  it("actual vs forecast and pending-release window", () => {
    expect(compareActualToForecast("0.4%", "0.3%")).toBe("up");
    expect(compareActualToForecast("-1.2K", "1,000K")).toBe("down");
    expect(compareActualToForecast("0.3%", "0.3%")).toBe("flat");
    expect(compareActualToForecast(null, "0.3%")).toBeNull();
    const t = Date.parse("2026-09-26T12:30:00Z");
    const e = [ev({ occursAt: "2026-09-26T12:30:00.000Z" })];
    expect(hasPendingRelease(e, t - 60_000)).toBe(true);
    expect(hasPendingRelease(e, t + 2 * 60_000)).toBe(true);
    expect(hasPendingRelease(e, t + 10 * 60_000)).toBe(false);
    expect(hasPendingRelease([ev({ actual: "0.4%" })], t)).toBe(false);
  });

  it("evicts the least recently fetched weeks beyond the cap", () => {
    const weeks = Array.from({ length: 10 }, (_, i) => ({ weekStart: `w${i}`, fetchedAt: new Date(2026, 0, i + 1).toISOString() }));
    expect(weeksToEvict(weeks, 8).sort()).toEqual(["w0", "w1"]);
    expect(weeksToEvict(weeks.slice(0, 3), 8)).toEqual([]);
  });
});

describe("market logic", () => {
  it("formats like the web ticker and respects min/max", () => {
    expect(formatPrice(1.08456)).toBe("1.0846");
    expect(formatPrice(2650.1)).toBe("2650.10");
    expect(toggleSymbol(["A"], "A")).toEqual(["A"]); // حداقل ۱
    const twenty = Array.from({ length: 20 }, (_, i) => `S${i}`);
    expect(toggleSymbol(twenty, "X")).toBe(twenty); // حداکثر ۲۰
    expect(toggleSymbol(["A", "B"], "A")).toEqual(["B"]);
  });

  it("groups/searches the catalog and builds TradingView link-outs", () => {
    const cat = [
      { symbol: "EURUSD=X", label: "EUR/USD", category: "forex" as const },
      { symbol: "BTC-USD", label: "بیت‌کوین", category: "crypto" as const },
      { symbol: "AAPL", label: "اپل", category: "stock" as const },
      { symbol: "^VIX", label: "VIX", category: "index" as const },
    ];
    expect(groupCatalog(cat, "usd").map(([c, items]) => [c, items.length])).toEqual([["forex", 1], ["crypto", 1]]);
    expect(tradingViewUrl(cat[0])).toContain(encodeURIComponent("FX:EURUSD"));
    expect(tradingViewUrl(cat[1])).toContain(encodeURIComponent("BINANCE:BTCUSDT"));
    expect(tradingViewUrl(cat[2])).toContain("AAPL");
    expect(tradingViewUrl(cat[3])).toBeNull();
  });
});

describe("trade-online client", () => {
  it("calls the Bearer endpoints, chunks >10 symbols, maps errors", async () => {
    const { api, calls } = await loggedInClient((c) => {
      if (c.path.startsWith("/api/mobile/trade-online/market/prices")) {
        const syms = decodeURIComponent(c.path.split("symbols=")[1]).split(",");
        return json(200, { quotes: syms.map((symbol) => ({ symbol, price: 1, changePercent: 0, changeAbs: 0 })) });
      }
      if (c.path === "/api/mobile/trade-online/metatrader/code") return json(200, { ok: true, code: "ABCD-EFGH-JKLM", expiresAt: "x", link: {} });
      if (c.path === "/api/mobile/trade-online/metatrader/revoke") return json(404, { error: "حساب پیدا نشد" });
      if (c.path.startsWith("/api/mobile/trade-online/calendar")) return json(403, { error: "module_locked" });
      return json(500, {});
    });
    const client = makeTradeOnlineApi(api);
    expect(client.available).toBe(true);

    const symbols = Array.from({ length: 12 }, (_, i) => `S${i}=X`);
    const quotes = await client.prices(symbols);
    expect(quotes.map((q) => q.symbol)).toEqual(symbols);
    expect(calls.filter((c) => c.path.includes("/market/prices"))).toHaveLength(2);
    expect(calls.every((c) => c.auth?.startsWith("Bearer "))).toBe(true);

    const code = await client.mtCreateCode("acc1", "MT5");
    expect(code.code).toBe("ABCD-EFGH-JKLM");
    const codeCall = calls.find((c) => c.path.endsWith("/metatrader/code"))!;
    expect(codeCall.body).toEqual({ accountId: "acc1", platform: "MT5" }); // هیچ رمزی فرستاده نمی‌شه

    await expect(client.mtRevoke("x")).rejects.toMatchObject({ status: 404 });
    const locked = await client.calendar({ from: "2026-09-26", to: "2026-10-02", tz: 210 }).catch((e) => e);
    expect(locked).toBeInstanceOf(TradeOnlineError);
    expect(locked.status).toBe(403);
    expect(describeTradeOnlineError(locked)).toContain("پلن");
  });

  it("is unavailable (401) without a configured, logged-in client", async () => {
    const client = makeTradeOnlineApi(null);
    expect(client.available).toBe(false);
    await expect(client.mtAccounts()).rejects.toMatchObject({ status: 401 });
    expect(client.eaDownloadUrl("MT4")).toBeNull();
  });
});
