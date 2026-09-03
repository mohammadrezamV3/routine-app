import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cronAuth";
import { logError } from "@/lib/errorLog";
import { externalProviderConfigured, externalProviderName, syncEconomicCalendar } from "@/lib/economicCalendar";

// POST /api/cron/economic-calendar — همگام‌سازی روزانه‌ی تقویم اقتصادی از
// منبع بیرونی (اگر تنظیم شده باشد). مثل بقیه‌ی کران‌ها پشت CRON_SECRET
// قفل است و یک crontab بیرونی صدایش می‌زند، نه کاربر.
//
// اگر هیچ منبعی تنظیم نشده باشد، این روت عمدا خطا نمی‌دهد و فقط گزارش
// می‌کند که کاری نبود — تقویم در آن حالت از ورود دستی ادمین پر می‌شود.
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!externalProviderConfigured()) {
    return NextResponse.json({ ok: true, skipped: "منبع بیرونی تنظیم نشده — تقویم از ورود دستی پر می‌شود" });
  }

  const source = externalProviderName();
  try {
    const result = await syncEconomicCalendar(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logError(
      "cron-economic-calendar",
      `همگام‌سازی تقویم اقتصادی شکست خورد: ${err instanceof Error ? err.message : err}`,
      { context: { source } }
    );
    return NextResponse.json({ error: "همگام‌سازی تقویم اقتصادی ناموفق بود" }, { status: 502 });
  }
}
