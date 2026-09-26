import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { TOO_MANY, guardTradeOnline } from "@/lib/mobileTradeOnline";
import {
  MARKET_PRICES_RATE_LIMIT, MARKET_PRICES_RATE_WINDOW_MS, fetchMarketQuotes, marketPricesRateKey, parseMarketSymbols,
} from "@/lib/mobileTradeOnlineMarket";
import type { MarketPricesResponse } from "@/lib/mobileTradeOnlineContract";

// GET /api/mobile/trade-online/market/prices?symbols=GC=F,EURUSD=X
// همون پروکسیِ /api/market/prices وب (همون کش، همون سطلِ rate limitِ
// کاربر، سوپریوزر معاف) — به‌علاوه‌ی گیتِ TRADE.
export async function GET(req: NextRequest) {
  const guard = await guardTradeOnline(req, null);
  if (!guard.ok) return guard.response;
  if (
    !guard.isSuperAdmin &&
    !(await checkRateLimit(marketPricesRateKey(guard.userId), MARKET_PRICES_RATE_LIMIT, MARKET_PRICES_RATE_WINDOW_MS))
  ) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const symbols = parseMarketSymbols(req.nextUrl.searchParams.get("symbols"));
  const body: MarketPricesResponse = { quotes: await fetchMarketQuotes(symbols) };
  return NextResponse.json(body);
}
