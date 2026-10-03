import { NextRequest, NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { runWeeklyLetters } from "@/lib/weeklyLetter/dispatch";

// POST /api/cron/weekly-report — ساخت و تحویل «هفته‌نامه»ی همه‌ی کاربرهای واجد
// شرایط (اعلان درون‌برنامه‌ای + ایمیل). نه چیزی که کاربر/کلاینت صداش بزنه.
//
// دیگه لازم نیست crontab بیرونی این‌جا رو بزنه: زمان‌بند داخلی
// (lib/pushScheduler.ts) هر ۱۰ دقیقه همین منطق رو اجرا می‌کنه و هر کاربر رو
// از شنبه ساعت ۸ صبح *به وقت خودش* می‌گیره. این روت برای سرورهایی که هنوز
// crontab قدیمی دارن، یا اجرای دستی/تست، می‌مونه — دوباره‌زدنش امنه چون هر
// (کاربر، هفته) فقط یک شماره می‌گیره (کلید یکتا در WeeklyLetter) و شماره‌ی
// ساخته‌شده دوباره ساخته نمی‌شه.
//
// آدرس عمدا همون آدرس قدیمی «گزارش هفتگی» مونده تا crontab سرورهای موجود
// نیازی به تغییر نداشته باشه. هر اجرا حداکثر ۴۰ کاربر رو پردازش می‌کنه؛
// اگه بیشتر منتظر بودن، اجرای بعدی (یا همون زمان‌بند) ادامه می‌ده.

// مربی AI هر کاربر تا ~۵۵ ثانیه می‌تونه طول بکشه
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await runWeeklyLetters(new Date());
  return NextResponse.json({ ok: true, ...r, total: r.considered, succeeded: r.created });
}
