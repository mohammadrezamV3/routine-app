import { NextRequest, NextResponse } from "next/server";

// پروکسی سمت سرور برای قیمت لحظه‌ای بازار — هیچ سرویس رسمی/کلیددار برای این
// پروژه تنظیم نشده، پس از endpoint عمومی (و غیررسمی) یاهو فایننس استفاده
// می‌کنیم. عمداً از سمت سرور صدا زده می‌شه نه با یک اسکریپت شخص‌ثالث توی
// مرورگر کاربر — چون این‌طوری نیازی به شل کردن CSP (script-src/frame-src)
// نیست و هیچ اسکریپت خارجی داخل صفحه اجرا نمی‌شه.
// این API بدون SLA است؛ خطاها بی‌صدا نادیده گرفته می‌شن و فقط نمادهای موفق
// برمی‌گردن — کلاینت هم طوری طراحی شده که نبود داده رو بدون شکستن UI نشون بده.

type Quote = { symbol: string; price: number; changePercent: number; changeAbs: number };

const CACHE_TTL_MS = 30_000;
const MAX_SYMBOLS_PER_REQUEST = 10;
const cache = new Map<string, { data: Quote; expiresAt: number }>();

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
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

// GET /api/market/prices?symbols=SPY,QQQ,^VIX
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, MAX_SYMBOLS_PER_REQUEST);
  if (!symbols.length) return NextResponse.json({ quotes: [] });

  const results = await Promise.all(symbols.map(fetchQuote));
  const quotes = results.filter((q): q is Quote => q !== null);
  return NextResponse.json({ quotes });
}
