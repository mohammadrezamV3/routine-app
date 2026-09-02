import { NextResponse } from "next/server";

// کدام درگاه‌ها روی *این* دیپلوی واقعا قابل استفاده‌اند.
//
// چرا لازم است: صفحه‌ی چک‌اوت هر دو درگاه را نشان می‌داد و پیش‌فرضش زرین‌پال
// بود، در حالی که روی این سرور فقط کلید زیبال ست شده. یعنی هر کاربری که
// دستی زیبال را انتخاب نمی‌کرد، مستقیم به یک درگاه تنظیم‌نشده می‌خورد و
// خطا می‌گرفت — بدون این‌که بفهمد چرا.
//
// فقط نام درگاه‌ها برمی‌گردد، هیچ کلیدی. این اطلاعات حساس نیست: همان چیزی
// است که روی صفحه‌ی پرداخت هم دیده می‌شود.
export const dynamic = "force-dynamic";

export function GET() {
  const available: string[] = [];
  if (process.env.ZIBAL_MERCHANT_KEY) available.push("zibal");
  if (process.env.ZARINPAL_MERCHANT_ID) available.push("zarinpal");
  return NextResponse.json({ available });
}
