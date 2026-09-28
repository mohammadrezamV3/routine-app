import { NextRequest, NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { runDueReminders } from "@/lib/pushReminders";

// POST /api/push/send-reminders — دیگه لازم نیست crontabِ بیرونی صداش بزنه:
// خودِ سرور هر ۳۰ ثانیه (lib/pushScheduler.ts، از instrumentation.ts) همین
// کار رو می‌کنه. روت فقط برای سازگاری/اجرای دستی مونده، پشتِ CRON_SECRET؛
// صدا زدنِ هم‌زمانش با زمان‌بند هم تکراری نمی‌فرسته (PushReminderLog).
export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runDueReminders());
}
