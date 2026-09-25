import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getMobileUserId } from "@/lib/mobileAuth";
import { parseIsoDateTime } from "@/lib/mobileSync";
import { pullTradeChanges } from "@/lib/mobileTradeSyncStore";

// GET /api/mobile/trade/pull?since=<cursor>
// همه‌ی رکوردهای ماژولِ ترید (حساب/برچسب/چک‌لیست/معامله/یادداشت/تنظیم) +
// tombstoneِ حذف‌ها که بعد از since عوض شدن. بدونِ since = همه‌چیز.
// بدونِ دسترسیِ TRADE → 200 با moduleLocked=true و آرایه‌های خالی.
// قرارداد: lib/mobileTradeContract.ts
export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-trade-pull:${userId}`, 240, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const raw = req.nextUrl.searchParams.get("since");
  let since: Date | null = null;
  if (raw) {
    since = parseIsoDateTime(raw);
    if (!since) return NextResponse.json({ error: "since نامعتبر است" }, { status: 400 });
  }

  return NextResponse.json(await pullTradeChanges(userId, since));
}
