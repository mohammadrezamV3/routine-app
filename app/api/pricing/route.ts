import { NextResponse } from "next/server";
import { getPricingConfig } from "@/lib/planPricingServer";

// قیمت پلن‌ها برای نمایش عمومی (لندینگ، اشتراک، چک‌اوت، بنرهای خرید). فقط
// نمایشیه — مبلغ واقعی پرداخت همیشه سمت سرور در api/subscription/checkout
// از همین پیکربندی (تازه از دیتابیس) حساب می‌شه.
export const dynamic = "force-dynamic";

export async function GET() {
  const pricing = await getPricingConfig();
  return NextResponse.json({ pricing }, { headers: { "Cache-Control": "no-store" } });
}
