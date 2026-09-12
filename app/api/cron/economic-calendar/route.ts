import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCronRequest } from "@/lib/cronAuth";
import { logError } from "@/lib/errorLog";
import {
  computeNextSyncDelayMs, externalProviderConfigured, externalProviderName,
  SLOW_SYNC_INTERVAL_MS, syncEconomicCalendar,
} from "@/lib/economicCalendar";

// POST /api/cron/economic-calendar — همگام‌سازی تقویم اقتصادی از منبع
// بیرونی. مثل بقیه‌ی کران‌ها پشت CRON_SECRET قفل است و یا یک crontab
// بیرونی صدایش می‌زند یا خودِ cluster.js (primary) از داخل کانتینر.
//
// اگر هیچ منبعی تنظیم نشده باشد، این روت عمدا خطا نمی‌دهد و فقط گزارش
// می‌کند که کاری نبود — تقویم در آن حالت از ورود دستی ادمین پر می‌شود.
//
// `nextCheckInMs` توی پاسخ: طبقِ درخواستِ صریح («سرِ ساعتِ ایونت دقیقا
// ۱۰ثانیه بعدش اپدیت شه، در غیرِ این حالت نیازی نیست تند‌تند اپدیت شه»)
// این روت به caller (cluster.js) می‌گه دفعه‌ی بعد کِی دوباره صداش بزنه —
// نزدیکِ لحظه‌ی یک رویدادِ بی‌actual خیلی زودتر از حالتِ آرومِ معمولی.
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!externalProviderConfigured()) {
    return NextResponse.json({ ok: true, skipped: "منبع بیرونی تنظیم نشده — تقویم از ورود دستی پر می‌شود", nextCheckInMs: SLOW_SYNC_INTERVAL_MS });
  }

  const source = externalProviderName();
  try {
    const result = await syncEconomicCalendar(prisma);
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
