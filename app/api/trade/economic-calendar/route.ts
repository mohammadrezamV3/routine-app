import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { buildEconomicCalendarWhere, queryEconomicCalendar } from "@/lib/mobileTradeOnlineCalendar";

// رویدادهای اقتصادی برای کاربر ترید — فقط خواندنی. نوشتن از پنل ادمین
// (/api/admin/economic-events) یا کران همگام‌سازی انجام می‌شود.
//
// منطقِ فیلتر/بازه (سقفِ ۱۸۰ روزه برایِ جستجو، افستِ «روزِ محلی» با `tz`،
// «سایر ارزها»، مرزهای واقعیِ داده برایِ نوارِ روزها) در
// lib/mobileTradeOnlineCalendar.ts است تا روتِ اپ موبایل
// (/api/mobile/trade-online/calendar) دقیقاً همین رفتار را داشته باشد.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const built = buildEconomicCalendarWhere(req.nextUrl.searchParams);
  if ("error" in built) return NextResponse.json({ error: built.error }, { status: 400 });

  return NextResponse.json(await queryEconomicCalendar(built.where));
}
