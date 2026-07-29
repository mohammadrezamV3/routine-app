// کاتالوگ نمادهای قابل‌دنبال‌کردن توی نوار قیمت بازار — کاربر از همین لیست
// انتخاب می‌کنه. نمادها به سبک Yahoo Finance‌ان چون API قیمت هم از همون‌جا می‌خونه.

export type TickerSymbol = {
  symbol: string;
  label: string;
  category: "index" | "forex" | "commodity" | "crypto";
};

export const TICKER_CATALOG: TickerSymbol[] = [
  { symbol: "SPY", label: "SPY", category: "index" },
  { symbol: "QQQ", label: "QQQ", category: "index" },
  { symbol: "DIA", label: "DOW", category: "index" },
  { symbol: "^VIX", label: "VIX", category: "index" },
  { symbol: "EURUSD=X", label: "EUR/USD", category: "forex" },
  { symbol: "GBPUSD=X", label: "GBP/USD", category: "forex" },
  { symbol: "USDJPY=X", label: "USD/JPY", category: "forex" },
  { symbol: "USDCHF=X", label: "USD/CHF", category: "forex" },
  { symbol: "GC=F", label: "طلا", category: "commodity" },
  { symbol: "CL=F", label: "نفت", category: "commodity" },
  { symbol: "SI=F", label: "نقره", category: "commodity" },
  { symbol: "BTC-USD", label: "بیت‌کوین", category: "crypto" },
  { symbol: "ETH-USD", label: "اتریوم", category: "crypto" },
];

// بازار ایران عمدتاً فارکس/طلا/کریپتو دنبال می‌کنه؛ بازار بین‌المللی به شاخص‌های آمریکایی نزدیک‌تره
export const DEFAULT_TICKER_SYMBOLS_IRAN = ["GC=F", "EURUSD=X", "GBPUSD=X", "BTC-USD", "ETH-USD"];
export const DEFAULT_TICKER_SYMBOLS_INTERNATIONAL = ["SPY", "QQQ", "^VIX", "DIA", "BTC-USD"];

export const MAX_TICKER_SYMBOLS = 8;
export const MIN_TICKER_SYMBOLS = 1;

export function tickerLabelFor(symbol: string): string {
  return TICKER_CATALOG.find((s) => s.symbol === symbol)?.label ?? symbol;
}
