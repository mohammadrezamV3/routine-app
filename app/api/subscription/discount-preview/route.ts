import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { resolveDiscountCode } from "@/lib/discountValidation";

// POST /api/subscription/discount-preview → دکمه‌ی «اعمال» فیلد کد تخفیف
// چک‌اوت این‌جا رو صدا می‌زنه تا قبل از رفتن به درگاه، درصد تخفیف رو
// پیش‌نمایش بده. هیچ عارضه‌ی جانبی‌ای (مثل مصرف کد رفرال) نداره — فقط
// اعتبارسنجی، نه اعمال نهایی؛ اعمال واقعی موقع خود پرداخت
// (app/api/subscription/checkout) اتفاق می‌افته.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(`discount-preview:${userId}:${ip}`, 15, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { code, planKey } = body as { code?: string; planKey?: string };
    if (!code?.trim() || !planKey) {
      return NextResponse.json({ error: "کد تخفیف را وارد کن" }, { status: 400 });
    }

    const resolution = await resolveDiscountCode(code, userId, planKey);
    if (!resolution.ok) {
      return NextResponse.json({ error: resolution.error }, { status: 400 });
    }
    return NextResponse.json({ percentOff: resolution.percent });
  } catch (e: any) {
    if (e?.code?.startsWith?.("P")) {
      return NextResponse.json({ error: "خطای داخلی سرور — لطفا بعدا دوباره امتحان کن" }, { status: 500 });
    }
    return NextResponse.json({ error: "خطایی پیش آمد — دوباره امتحان کن" }, { status: 502 });
  }
}
