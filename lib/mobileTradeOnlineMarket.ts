// هسته‌ی مشترکِ قیمتِ لحظه‌ای بازار — روتِ وب (/api/market/prices) و روتِ
// موبایل (/api/mobile/trade-online/market/prices) از همین (و همین کشِ
// در-حافظه) استفاده می‌کنن.
//
// هیچ سرویسِ رسمی/کلیددار برای این پروژه تنظیم نشده، پس از endpointِ
// عمومی (و غیررسمیِ) یاهو فایننس استفاده می‌شه — عمدا سمتِ سرور، تا نیازی
// به شل کردنِ CSP نباشه. این API بدونِ SLA است؛ خطاها بی‌صدا نادیده گرفته
// می‌شن و فقط نمادهای موفق برمی‌گردن.
import type { MarketQuote } from "@/lib/mobileTradeOnlineContract";
import { MARKET_MAX_SYMBOLS_PER_REQUEST } from "@/lib/mobileTradeOnlineContract";

export type Quote = MarketQuote;

const CACHE_TTL_MS = 30_000;
// سقفِ تعدادِ نمادِ کش‌شده — بدونِ این، نمادهای ساختگیِ بی‌نهایت حافظه‌ی
// پروسه رو پر می‌کرد.
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, { data: Quote; expiresAt: number }>();

/** سقفِ نرخِ مشترکِ وب و موبایل (یک سطل برای هر کاربر، نه دو تا) */
export const MARKET_PRICES_RATE_LIMIT = 60;
export const MARKET_PRICES_RATE_WINDOW_MS = 60 * 1000;
export const marketPricesRateKey = (userId: string) => `market-prices:${userId}`;

// اول منقضی‌شده‌ها، بعد قدیمی‌ترین‌ها (Map ترتیبِ درج رو حفظ می‌کنه)
function evictIfNeeded() {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (cache.size <= MAX_CACHE_ENTRIES) return;
    if (v.expiresAt <= now) cache.delete(k);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

// نماد بازار: فقط شکل‌های واقعی (AAPL، BTC-USD، ^VIX، EURUSD=X) — تا این روت
// به یه پروکسیِ عمومیِ دلخواه تبدیل نشه و کشش با نمادِ آشغال پر نشه.
export const MARKET_SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,20}$/;

/** "SPY, QQQ,^VIX" → نمادهای معتبرِ یکتا، حداکثر ۱۰ تا */
export function parseMarketSymbols(raw: string | null | undefined): string[] {
  return [...new Set((raw || "").split(",").map((s) => s.trim()).filter((s) => MARKET_SYMBOL_RE.test(s)))]
    .slice(0, MARKET_MAX_SYMBOLS_PER_REQUEST);
}

async function fetchQuote(symbol: string): Promise<Quote | null> {
  const cached = cache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return cached?.data ?? null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (typeof price !== "number") return cached?.data ?? null;
    const prevClose = typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : meta.previousClose;
    const changeAbs = typeof prevClose === "number" ? price - prevClose : 0;
    const changePercent = typeof prevClose === "number" && prevClose !== 0 ? (changeAbs / prevClose) * 100 : 0;
    const data: Quote = { symbol, price, changePercent, changeAbs };
    cache.set(symbol, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    evictIfNeeded();
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

/** قیمتِ نمادهای (از قبل parseشده) — ناموفق‌ها حذف می‌شن */
export async function fetchMarketQuotes(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];
  const results = await Promise.all(symbols.map(fetchQuote));
  return results.filter((q): q is Quote => q !== null);
}
