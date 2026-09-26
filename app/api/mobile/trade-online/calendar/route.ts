import { NextRequest, NextResponse } from "next/server";
import { guardTradeOnline } from "@/lib/mobileTradeOnline";
import { buildEconomicCalendarWhere, queryEconomicCalendar, refreshEconomicCalendar } from "@/lib/mobileTradeOnlineCalendar";

// GET /api/mobile/trade-online/calendar?from=&to=&tz=&currencies=&other=&impacts=&q=
// همون روتِ وب (/api/trade/economic-calendar) با Bearer — از جدولِ خودمون،
// هیچ‌وقت مستقیم از سرویسِ بیرونی. قرارداد: lib/mobileTradeOnlineContract.ts
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await guardTradeOnline(req, { key: "mobile-trade-online-calendar", limit: 240, windowMs: 10 * 60 * 1000 });
  if (!guard.ok) return guard.response;

  // همون sync هنگامِ خواندنِ روتِ وب — داده‌ی کهنه قبل از خواندن تازه می‌شه
  await refreshEconomicCalendar();

  const built = buildEconomicCalendarWhere(req.nextUrl.searchParams);
  if ("error" in built) return NextResponse.json({ error: built.error }, { status: 400 });

  return NextResponse.json(await queryEconomicCalendar(built.where), { headers: { "Cache-Control": "private, no-store" } });
}
