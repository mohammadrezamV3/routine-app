import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

// چک‌کردن رمز کران بیرونی (crontab خود VPS) — مشترک بین همه‌ی
// روت‌های cron (send-reminders، weekly-report). استخراج‌شده از
// app/api/push/send-reminders/route.ts تا این منطق امنیتی دو جای جدا
// نگهداری/دریفت نکنه.

/**
 * مقایسه‌ی رمز در زمان ثابت — `!==` معمولی به‌محض اولین بایت متفاوت
 * برمی‌گرده، پس زمان پاسخ اطلاعاتی درباره‌ی طول پیشوند درست می‌ده.
 */
function timingSafeEqualStr(a: string | null | undefined, b: string): boolean {
  if (typeof a !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** true یعنی درخواست رمز CRON_SECRET درستی داشته (هدر Bearer یا کوئری secret). */
export function isValidCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  return !!secret && timingSafeEqualStr(provided, secret);
}
