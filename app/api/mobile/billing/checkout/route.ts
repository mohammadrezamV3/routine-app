import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getSiteUrl } from "@/lib/siteUrl";
import { createMobileCheckout } from "@/lib/mobileBilling";

// POST /api/mobile/billing/checkout { planKey, duration, discountCode? }
// → یک ردیفِ PENDING (مالِ همین کاربر) + آدرسِ یک‌بارمصرفِ ≤۱۰ دقیقه‌ایِ وب.
// هیچ پرداخت/اعطایی این‌جا اتفاق نمی‌افته — lib/mobileBilling.ts.
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-billing-checkout:${userId}`, 8, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 2 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  try {
    const r = await createMobileCheckout(userId, parsed.body ?? {}, getSiteUrl(req.nextUrl.origin));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json(r.body, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "خطای داخلی سرور — لطفا بعدا دوباره امتحان کن" }, { status: 500 });
  }
}
