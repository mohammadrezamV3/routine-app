import { NextRequest, NextResponse } from "next/server";
import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { parseDateRange, clampQuery } from "@/lib/validate";
import { CALENDAR_CURRENCIES } from "@/lib/economicCalendar";

// جستجو («سرچ یک ایونت خاص») بازه‌ی تاریخِ خیلی وسیع‌تری لازم دارد (چند
// ماه قبل/بعد، نه فقط یک روز/هفته) — سقفِ معمولیِ ۶۰ روز برایِ حالتِ
// جستجو کافی نیست.
const MAX_RANGE_DAYS = 180;

const KNOWN_CURRENCY_CODES = CALENDAR_CURRENCIES.map((c) => c.code);

// رویدادهای اقتصادی برای کاربر ترید — فقط خواندنی. نوشتن از پنل ادمین
// (/api/admin/economic-events) یا کران همگام‌سازی انجام می‌شود.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const params = req.nextUrl.searchParams;
  const range = parseDateRange(params.get("from"), params.get("to"), MAX_RANGE_DAYS);
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  // parseDateRange مرزها رو رویِ نیمه‌شبِ UTC می‌سازه (قرارداد مشترکِ عمومیِ
  // parseIsoDate، مناسبِ ستون‌های @db.Date)، ولی «روز»ی که کاربر با انتخابِ
  // تاریخ توی این تقویم می‌خواد، روزِ محلیِ خودشه، نه UTC. ایران +۳:۳۰ست؛
  // بدونِ این جابه‌جایی، رویدادهایِ ۰۰:۰۰-۰۳:۳۰ بامدادِ محلی به روزِ قبل
  // می‌چسبیدن و رویدادهایِ اواخرِ شب به روزِ بعد — نتیجه‌ش «این روز داده‌ای
  // نداره»یِ گزارش‌شده بود، درحالی‌که داده واقعاً وجود داشت، فقط روزِ
  // مجاورش خونده می‌شد. کلاینت افستِ واقعیِ تایم‌زونِ مرورگر رو می‌فرسته
  // (دقیقه، شرق UTC مثبت) تا هم برایِ ایران هم بازارِ بین‌المللی درست باشه.
  const tzOffsetMin = Number(params.get("tz"));
  const tzShiftMs = Number.isFinite(tzOffsetMin) ? tzOffsetMin * 60_000 : 0;

  const where: Prisma.EconomicEventWhereInput = {
    occursAt: {
      gte: new Date(range.from.getTime() - tzShiftMs),
      lte: new Date(range.to.getTime() + 86_400_000 - 1 - tzShiftMs),
    },
  };

  const q = clampQuery(params.get("q"), 120);
  if (q) where.title = { contains: q, mode: "insensitive" };

  const currencies = (params.get("currencies") || "")
    .split(",").map((c) => c.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  // «سایر ارزها» یعنی هر ارزی خارج از فهرست ۹تایی CALENDAR_CURRENCIES —
  // چون ارزهای کمترمرسوم توی چیپ‌های فیلتر تک‌تک نیستن، این یک کلید
  // جمعیه، نه یک کد ارز واقعی.
  const otherCurrencies = params.get("other") === "1";
  if (currencies.length && otherCurrencies) {
    where.OR = [{ currency: { in: currencies } }, { currency: { notIn: KNOWN_CURRENCY_CODES } }];
  } else if (otherCurrencies) {
    where.currency = { notIn: KNOWN_CURRENCY_CODES };
  } else if (currencies.length) {
    where.currency = { in: currencies };
  }

  const impacts = (params.get("impacts") || "")
    .split(",").map((i) => i.trim().toUpperCase())
    .filter((i): i is "LOW" | "MEDIUM" | "HIGH" => i === "LOW" || i === "MEDIUM" || i === "HIGH");
  if (impacts.length) where.impact = { in: impacts };

  const events = await prisma.economicEvent.findMany({
    where,
    orderBy: { occursAt: "asc" },
    take: 500,
    select: {
      id: true, title: true, country: true, currency: true, impact: true,
      occursAt: true, actual: true, forecast: true, previous: true, description: true, source: true,
    },
  });

  return NextResponse.json({
    events: events.map((e) => ({ ...e, occursAt: e.occursAt.toISOString() })),
  });
}
