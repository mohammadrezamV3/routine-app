import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { listBillingPlans } from "@/lib/mobileBilling";

// GET /api/mobile/billing/plans — پلن‌های فعالِ بازارِ ایران (ترکیبِ ماژول‌ها از
// Plan/PlanModule ِ دیتابیس، مبلغ از جدولِ سمتِ سرورِ lib/planPricing.ts)،
// پیش‌نمایشِ ارتقا به مکس، و اشتراکِ فعلی.
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-billing-plans:${userId}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }
  return NextResponse.json(await listBillingPlans(userId), { headers: { "Cache-Control": "private, no-store" } });
}
