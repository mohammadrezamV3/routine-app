import { NextResponse } from "next/server";

// زرین‌پال طبق درخواست صریح کامل حذف شد — زیبال تنها درگاهه، پس این روت
// دیگه لازم نیست (صفحه‌ی چک‌اوت هم دیگه صداش نمی‌زنه). فقط برای سازگاری
// عقب‌رو نگه داشته شده تا هیچ کلاینت قدیمی/کش‌شده‌ای ۴۰۴ نگیره.
export const dynamic = "force-dynamic";

export function GET() {
  const available: string[] = process.env.ZIBAL_MERCHANT_KEY ? ["zibal"] : [];
  return NextResponse.json({ available });
}
