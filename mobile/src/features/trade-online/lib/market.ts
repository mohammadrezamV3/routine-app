// منطقِ خالصِ واچ‌لیست/قیمت (تست‌پذیر).
import {
  TICKER_MAX_SYMBOLS,
  TICKER_MIN_SYMBOLS,
  type MarketQuote,
  type TickerCategory,
  type TickerSymbolDto,
} from "@m/lib/trade-online-contract";

/** همون قالبِ نوارِ قیمتِ وب: زیرِ ۱۰ → ۴ رقمِ اعشار، وگرنه ۲ */
export function formatPrice(price: number): string {
  return price.toFixed(price < 10 ? 4 : 2);
}

export function formatChange(q: Pick<MarketQuote, "changePercent">): string {
  return `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}٪`;
}

export function labelFor(symbol: string, catalog: TickerSymbolDto[]): string {
  return catalog.find((s) => s.symbol === symbol)?.label ?? symbol;
}

/** افزودن/حذفِ نماد با سقف/کفِ وب؛ اگه مجاز نباشه همون آرایه برمی‌گرده */
export function toggleSymbol(list: string[], symbol: string): string[] {
  const has = list.includes(symbol);
  if (has && list.length <= TICKER_MIN_SYMBOLS) return list;
  if (!has && list.length >= TICKER_MAX_SYMBOLS) return list;
  return has ? list.filter((s) => s !== symbol) : [...list, symbol];
}

export function groupCatalog(catalog: TickerSymbolDto[], query: string): [TickerCategory, TickerSymbolDto[]][] {
  const q = query.trim().toLowerCase();
  const filtered = q ? catalog.filter((s) => s.symbol.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)) : catalog;
  const map = new Map<TickerCategory, TickerSymbolDto[]>();
  for (const s of filtered) {
    const list = map.get(s.category);
    if (list) list.push(s);
    else map.set(s.category, [s]);
  }
  return [...map.entries()];
}

/**
 * نمادِ یاهو → لینکِ چارتِ تریدینگ‌ویو (فقط link-out — چارتِ جاسازی‌شده‌ی وب
 * در اپ نیست). برای فیوچرز/شاخص‌هایی که نگاشتِ مطمئن ندارن null.
 */
export function tradingViewUrl(symbol: TickerSymbolDto | { symbol: string; category: TickerCategory }): string | null {
  const s = symbol.symbol.toUpperCase();
  let tv: string | null = null;
  if (/^[A-Z]{6}=X$/.test(s)) tv = `FX:${s.slice(0, 6)}`;
  else if (/^[A-Z0-9]{2,10}-USD$/.test(s)) tv = `BINANCE:${s.slice(0, -4)}USDT`;
  else if (s === "GC=F") tv = "OANDA:XAUUSD";
  else if (s === "SI=F") tv = "OANDA:XAGUSD";
  else if (s === "CL=F") tv = "TVC:USOIL";
  else if (s === "BZ=F") tv = "TVC:UKOIL";
  else if (symbol.category === "stock" && /^[A-Z.]{1,10}$/.test(s)) tv = s;
  return tv ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tv)}` : null;
}
