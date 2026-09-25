import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { guardTradeOnline, readWatchlist, sanitizeWatchlist, writeWatchlist } from "@/lib/mobileTradeOnline";
import { TICKER_MAX_SYMBOLS } from "@/lib/mobileTradeOnlineContract";

// واچ‌لیستِ گوشی = همون تنظیمِ tradeTickerSymbolsِ نوارِ قیمتِ وب.
const RATE = { key: "mobile-trade-online-watchlist", limit: 60, windowMs: 10 * 60 * 1000 };

// GET /api/mobile/trade-online/market/watchlist → { symbols, saved, catalog }
export async function GET(req: NextRequest) {
  const guard = await guardTradeOnline(req, RATE);
  if (!guard.ok) return guard.response;
  return NextResponse.json(await readWatchlist(guard.userId));
}

// POST /api/mobile/trade-online/market/watchlist { symbols: string[] }
export async function POST(req: NextRequest) {
  const guard = await guardTradeOnline(req, RATE);
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody<{ symbols?: unknown }>(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const symbols = sanitizeWatchlist(parsed.body?.symbols);
  if (!symbols) {
    return NextResponse.json({ error: `بین ۱ تا ${TICKER_MAX_SYMBOLS} نماد از فهرستِ بازارها انتخاب کن` }, { status: 400 });
  }
  await writeWatchlist(guard.userId, symbols);
  return NextResponse.json(await readWatchlist(guard.userId));
}
