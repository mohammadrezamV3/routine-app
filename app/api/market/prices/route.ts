import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  MARKET_PRICES_RATE_LIMIT, MARKET_PRICES_RATE_WINDOW_MS, fetchMarketQuotes, marketPricesRateKey, parseMarketSymbols,
} from "@/lib/mobileTradeOnlineMarket";

// پروکسی سمت سرور برای قیمت لحظه‌ای بازار (یاهو فایننس، بدون SLA). منطق
// fetch/کش/اعتبارسنجی نماد در lib/mobileTradeOnlineMarket.ts است و با روت
// اپ موبایل (/api/mobile/trade-online/market/prices) مشترک است — همان کش
// در-حافظه و همان سطل rate limit.

// GET /api/market/prices?symbols=SPY,QQQ,^VIX
export async function GET(req: NextRequest) {
  // قبلا کاملا باز بود: هرکسی بدون حساب می‌تونست از این سرور به‌عنوان یه
  // پروکسی رایگان یاهو استفاده کنه. حالا هم لاگین لازمه هم سقف نرخ داره.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (
    !(session!.user as any).isSuperAdmin &&
    !(await checkRateLimit(marketPricesRateKey(userId), MARKET_PRICES_RATE_LIMIT, MARKET_PRICES_RATE_WINDOW_MS))
  ) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const symbols = parseMarketSymbols(req.nextUrl.searchParams.get("symbols"));
  if (!symbols.length) return NextResponse.json({ quotes: [] });
  return NextResponse.json({ quotes: await fetchMarketQuotes(symbols) });
}
