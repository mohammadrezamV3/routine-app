import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cronAuth";
import { logError } from "@/lib/errorLog";
import {
  computeNextSyncDelayMs, externalProviderName,
  hasPendingRelease, syncEconomicCalendar,
} from "@/lib/economicCalendar";

// POST /api/cron/economic-calendar — همگام‌سازی تقویم اقتصادی از منبع
// بیرونی. مثل بقیه‌ی کران‌ها پشت CRON_SECRET قفل است و یا یک crontab
// بیرونی صدایش می‌زند یا خودِ cluster.js (primary) از داخل کانتینر.
//
// دیگر حالتِ «منبعی تنظیم نشده» وجود ندارد: بدونِ کلید هم فیدِ رایگان
// (فارکس‌فکتوری) گرفته می‌شود. قبلاً این روت در آن حالت بی‌صدا ۲۰۰ با
// `skipped` برمی‌گرداند و cluster.js آن را موفق می‌دید — تقویم ماه‌ها
// مرده می‌ماند بدونِ اینکه جایی خطایی دیده شود.
//
// `nextCheckInMs` توی پاسخ: طبقِ درخواستِ صریح («سرِ ساعتِ ایونت دقیقا
// ۱۰ثانیه بعدش اپدیت شه، در غیرِ این حالت نیازی نیست تند‌تند اپدیت شه»)
// این روت به caller (cluster.js) می‌گه دفعه‌ی بعد کِی دوباره صداش بزنه —
// نزدیکِ لحظه‌ی یک رویدادِ بی‌actual خیلی زودتر از حالتِ آرومِ معمولی.
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const source = externalProviderName();
  try {
    // نزدیکِ لحظه‌ی انتشارِ یک خبر، پاسِ «تند» می‌زنیم (فقط فیدِ هفته‌ی
    // جاری و فقط رویدادهای همین حوالی) — همان چیزی که اجازه می‌دهد هر
    // چند ثانیه تکرار شود بدونِ اینکه منبع یا دیتابیس را بکوبد.
    const fast = await hasPendingRelease(prisma);
    const result = await syncEconomicCalendar(prisma, { fast });
    const nextCheckInMs = await computeNextSyncDelayMs(prisma);
    return NextResponse.json({ ok: true, ...result, nextCheckInMs });
  } catch (err) {
    logError(
      "cron-economic-calendar",
      `همگام‌سازی تقویم اقتصادی شکست خورد: ${err instanceof Error ? err.message : err}`,
      { context: { source } }
    );
    return NextResponse.json({ error: "همگام‌سازی تقویم اقتصادی ناموفق بود" }, { status: 502 });
  }
}
