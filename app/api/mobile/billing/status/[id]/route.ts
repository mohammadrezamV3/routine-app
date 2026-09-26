import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getCheckoutStatus } from "@/lib/mobileBilling";
import { ACCOUNT_ERROR_NOT_FOUND } from "@/lib/mobileAccountContract";

// GET /api/mobile/billing/status/:checkoutId — فقط مالِ خودِ کاربر (غیرِ آن ۴۰۴،
// بدونِ افشای وجود). PAID فقط از روی Payment ِ verify‌شده — lib/mobileBilling.ts.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-billing-status:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  const status = await getCheckoutStatus(userId, params.id);
  if (!status) return NextResponse.json({ error: ACCOUNT_ERROR_NOT_FOUND }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
