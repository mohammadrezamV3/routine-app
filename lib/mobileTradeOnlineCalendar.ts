// هسته‌ی مشترکِ خواندنِ تقویمِ اقتصادی — روتِ وب (/api/trade/economic-calendar)
// و روتِ موبایل (/api/mobile/trade-online/calendar) هر دو از همین استفاده
// می‌کنن تا فیلترها و مرزِ «روزِ محلی» یکی بمونه.
//
// تقویم همیشه از جدولِ خودمون (EconomicEvent) خونده می‌شه، نه مستقیم از
// سرویسِ بیرونی — پر کردنِ جدول کارِ کران/ادمینه (lib/economicCalendar.ts).
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateRange, clampQuery } from "@/lib/validate";
import { CALENDAR_CURRENCIES } from "@/lib/economicCalendar";
import {
  ECON_CALENDAR_MAX_EVENTS,
  ECON_CALENDAR_MAX_RANGE_DAYS,
  type EconomicCalendarResponse,
} from "@/lib/mobileTradeOnlineContract";

const KNOWN_CURRENCY_CODES = CALENDAR_CURRENCIES.map((c) => c.code);

/**
 * پارامترهای query → where. خطای اعتبارسنجی → { error } (۴۰۰).
 *
 * parseDateRange مرزها رو رویِ نیمه‌شبِ UTC می‌سازه، ولی «روز»ی که کاربر
 * انتخاب می‌کنه روزِ محلیِ خودشه (ایران +۳:۳۰). کلاینت افستِ واقعیِ
 * تایم‌زونش رو (دقیقه، شرقِ UTC مثبت) در `tz` می‌فرسته تا رویدادهای
 * ۰۰:۰۰-۰۳:۳۰ بامدادِ محلی به روزِ قبل نچسبن.
 */
export function buildEconomicCalendarWhere(
  params: URLSearchParams
): { where: Prisma.EconomicEventWhereInput } | { error: string } {
  const range = parseDateRange(params.get("from"), params.get("to"), ECON_CALENDAR_MAX_RANGE_DAYS);
  if ("error" in range) return { error: range.error };

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
  // یک کلیدِ جمعی، نه یک کدِ ارزِ واقعی.
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

  return { where };
}

/** رویدادها + بازه‌ای که واقعاً داده داریم (کلاینت نوارِ روزهاش رو از همین می‌سازه، نه حدس) */
export async function queryEconomicCalendar(where: Prisma.EconomicEventWhereInput): Promise<EconomicCalendarResponse> {
  const [events, bounds] = await Promise.all([
    prisma.economicEvent.findMany({
      where,
      orderBy: { occursAt: "asc" },
      take: ECON_CALENDAR_MAX_EVENTS,
      select: {
        id: true, title: true, country: true, currency: true, impact: true,
        occursAt: true, actual: true, forecast: true, previous: true, description: true, source: true,
      },
    }),
    prisma.economicEvent.aggregate({ _min: { occursAt: true }, _max: { occursAt: true } }),
  ]);

  return {
    events: events.map((e) => ({ ...e, occursAt: e.occursAt.toISOString() })),
    range: {
      from: bounds._min.occursAt?.toISOString() ?? null,
      to: bounds._max.occursAt?.toISOString() ?? null,
    },
  };
}
