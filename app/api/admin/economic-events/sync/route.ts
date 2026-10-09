import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { syncEconomicCalendar } from "@/lib/economicCalendar";
import { tr } from "@/lib/i18n";

// همون کاری که کران روزانه (/api/cron/economic-calendar) انجام می‌ده، ولی
// دستی و فوری — برای وقتی که ادمین نمی‌خواد تا اجرای بعدی کران یا تازه‌سازی
// خودکار روت خواندن (ensureFreshCalendar) صبر کنه و همین الان از منبع
// فعال (externalProviderName) به‌روز کنه.
export async function POST() {
  const guard = await requireAdmin("content");
  if (!guard.ok) return guard.response;

  // فراخوانی یک سرویس بیرونی — یه سقف سبک تا کلیک تکراری/اسکریپت اتفاقی
  // منبع رو اسپم نکنه.
  if (!(await checkRateLimit(`economic-calendar-sync:${guard.userId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("درخواست‌های زیاد — کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  }

  try {
    const result = await syncEconomicCalendar(prisma);
    await writeAuditLog(guard.userId, "economic_event.sync", "EconomicEvent", undefined, {
      source: result.source, fetched: result.fetched, created: result.created, updated: result.updated, removed: result.removed,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logError(
      "admin-economic-calendar-sync",
      `همگام‌سازی دستی تقویم اقتصادی شکست خورد: ${err instanceof Error ? err.message : err}`,
      { context: { userId: guard.userId } }
    );
    return NextResponse.json({ error: err instanceof Error ? err.message : tr("همگام‌سازی ناموفق بود", "Sync failed") }, { status: 502 });
  }
}
