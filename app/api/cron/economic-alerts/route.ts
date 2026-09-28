import { NextRequest, NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { runEconomicAlerts } from "@/lib/pushReminders";

// POST /api/cron/economic-alerts — هشدار پیش از اخبار مهم. منطق در
// lib/pushReminders.ts است و زمان‌بندِ داخلی (lib/pushScheduler.ts) هر ۳۰
// ثانیه اجراش می‌کنه؛ این روت فقط برای سازگاری با crontabِ قدیمی/اجرای دستی
// مونده، پشتِ CRON_SECRET. ضدتکرار اتمیکه (PushReminderLog)، پس اجرای
// هم‌زمانِ هر دو هیچ هشداری رو دوبار نمی‌فرسته.
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runEconomicAlerts());
}
