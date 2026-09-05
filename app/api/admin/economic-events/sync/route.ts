import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/errorLog";
import { syncEconomicCalendar } from "@/lib/economicCalendar";

// همون کاری که کرانِ روزانه (/api/cron/economic-calendar) انجام می‌ده، ولی
// دستی و فوری — برای وقتی که crontabِ سرور (deploy/cron.example) هنوز ست
// نشده یا ادمین می‌خواد بدونِ صبرکردن تا اجرای بعدیِ کران، همین الان از
// فارکس‌فکتوری/منبعِ تنظیم‌شده به‌روز کنه.
export async function POST() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  // فراخوانیِ یک سرویسِ بیرونی — یه سقفِ سبک تا کلیکِ تکراری/اسکریپت اتفاقی
  // منبع رو اسپم نکنه.
  if (!(await checkRateLimit(`economic-calendar-sync:${guard.userId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  try {
    const result = await syncEconomicCalendar(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logError(
      "admin-economic-calendar-sync",
      `همگام‌سازیِ دستیِ تقویم اقتصادی شکست خورد: ${err instanceof Error ? err.message : err}`,
      { context: { userId: guard.userId } }
    );
    return NextResponse.json({ error: err instanceof Error ? err.message : "همگام‌سازی ناموفق بود" }, { status: 502 });
  }
}
