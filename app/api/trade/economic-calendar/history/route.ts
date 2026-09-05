import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { clampText } from "@/lib/validate";

const HISTORY_LIMIT = 8;

// GET /api/trade/economic-calendar/history?title=...&currency=...&before=<iso>
//
// «باکسِ هیستوری»ی فارکس‌فکتوری برای هر رویداد، انتشارهای قبلیِ همون
// شاخص رو نشون می‌ده (مثلاً CPIِ ماه‌های قبل). طبقِ همون قاعده‌ای که کلِ
// این ماژول ازش پیروی می‌کنه (نگاه کن به lib/economicCalendar.ts): هیچ‌وقت
// چیزی فبریکیت نمی‌کنیم — این هیستوری هم صرفاً یک کوئری روی همون جدولِ
// خودمونه (ردیف‌های قبلیِ همین (title, currency) که کرانِ روزانه/دستی قبلاً
// upsert کرده)، نه یک سرویسِ بیرونیِ جدید یا داده‌ی ساختگی. اگه کمتر از
// چند انتشار سابقه داشته باشیم، همون تعدادِ واقعی برمی‌گرده، نه ردیفِ خالی.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const title = clampText(req.nextUrl.searchParams.get("title") || "", 160);
  const currency = (req.nextUrl.searchParams.get("currency") || "").trim().toUpperCase().slice(0, 8);
  if (!title || !currency) {
    return NextResponse.json({ error: "title و currency الزامی‌ان" }, { status: 400 });
  }

  const beforeRaw = req.nextUrl.searchParams.get("before");
  const before = beforeRaw ? new Date(beforeRaw) : null;
  const validBefore = before && !isNaN(before.getTime()) ? before : new Date();

  const events = await prisma.economicEvent.findMany({
    where: { title, currency, occursAt: { lt: validBefore } },
    orderBy: { occursAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, occursAt: true, actual: true, forecast: true, previous: true },
  });

  return NextResponse.json({
    events: events.map((e) => ({ ...e, occursAt: e.occursAt.toISOString() })),
  });
}
