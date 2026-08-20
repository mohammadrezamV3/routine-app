import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

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
// سقفِ تعدادِ نمادِ کش‌شده. قبلاً این Map هیچ سقف/تخلیه‌ای نداشت و چون این
// روت *بدونِ لاگین* هم جواب می‌داد، هرکسی می‌تونست با نمادهای ساختگیِ
// بی‌نهایت (۱۰ تا در هر درخواست) بی‌سروصدا حافظه‌ی پروسه رو پر کنه.
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, { data: Quote; expiresAt: number }>();

// نگه‌داشتنِ سقفِ کش: اول منقضی‌شده‌ها، بعد قدیمی‌ترین‌ها (Map ترتیبِ درج رو
// حفظ می‌کنه، پس اولین کلید همون قدیمی‌ترینه).
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

// نمادِ بازار: فقط شکل‌های واقعی (AAPL، BTC-USD، ^VIX، EURUSD=X). هرچیزِ
// دیگه‌ای اصلاً به سمتِ یاهو فرستاده نمی‌شه — نه برای جلوگیری از تزریق (مسیر
// از قبل encodeURIComponent می‌شد) بلکه تا این روت به یه پروکسیِ عمومیِ
// دلخواه تبدیل نشه و کشش با نمادِ آشغال پر نشه.
const SYMBOL_RE = /^[A-Za-z0-9.^=-]{1,20}$/;

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

// GET /api/market/prices?symbols=SPY,QQQ,^VIX
export async function GET(req: NextRequest) {
  // قبلاً کاملاً باز بود: هرکسی بدونِ حساب می‌تونست از این سرور به‌عنوان یه
  // پروکسیِ رایگانِ یاهو استفاده کنه (هزینه‌ی پهنای‌باند و ریسکِ بلاک‌شدنِ IPِ
  // سرور). حالا هم لاگین لازمه هم سقفِ نرخ داره.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(session!.user as any).isSuperAdmin && !checkRateLimit(`market-prices:${userId}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const symbols = [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => SYMBOL_RE.test(s)))]
    .slice(0, MAX_SYMBOLS_PER_REQUEST);
  if (!symbols.length) return NextResponse.json({ quotes: [] });

  const results = await Promise.all(symbols.map(fetchQuote));
  const quotes = results.filter((q): q is Quote => q !== null);
  return NextResponse.json({ quotes });
}
