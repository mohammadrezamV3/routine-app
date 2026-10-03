import { NextRequest, NextResponse } from "next/server";
import { eventThemeById } from "@/lib/eventThemes";
import { ensureEventDiscounts, getLiveEventDiscount } from "@/lib/eventDiscountServer";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// کد تخفیف زنده‌ی مناسبت جاری برای متن تبریک؛ عمومی و بدون هیچ داده‌ی کاربر
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("theme");
  if (!eventThemeById(id)) return NextResponse.json({ code: null }, { headers: NO_STORE });
  await ensureEventDiscounts();
  const live = await getLiveEventDiscount(id as string).catch(() => null);
  if (!live) return NextResponse.json({ code: null }, { headers: NO_STORE });
  return NextResponse.json(live, { headers: NO_STORE });
}
