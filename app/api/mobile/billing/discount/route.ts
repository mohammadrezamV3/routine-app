import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { resolveDiscountCode } from "@/lib/discountValidation";
import type { MobileDiscountPreviewResponse } from "@/lib/mobileAccountContract";

// POST /api/mobile/billing/discount { planKey, code } — نسخه‌ی Bearer ِ
// /api/subscription/discount-preview: فقط اعتبارسنجی، بدونِ هیچ عارضه‌ای
// (ReferralUsage/DiscountCodeUsage فقط در خریدِ واقعی ساخته می‌شن).
// کلیدِ rate limit با وب مشترکه تا حدس‌زدنِ کد با دو کلاینت دو برابر نشه.
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`discount-preview:${userId}`, 15, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }
  const parsed = await readJsonBody<{ planKey?: unknown; code?: unknown }>(req, 2 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const code = typeof parsed.body.code === "string" ? parsed.body.code.trim().slice(0, 40) : "";
  const planKey = typeof parsed.body.planKey === "string" ? parsed.body.planKey.trim().slice(0, 32) : "";
  if (!code || !planKey) return NextResponse.json({ error: "کد تخفیف را وارد کن" }, { status: 400 });

  const r = await resolveDiscountCode(code, userId, planKey);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  const body: MobileDiscountPreviewResponse = { percentOff: r.percent };
  return NextResponse.json(body);
}
