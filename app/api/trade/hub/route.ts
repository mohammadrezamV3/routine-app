import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked, resolveFeaturesFor } from "@/lib/featureFlagsServer";
import { checkRateLimit } from "@/lib/rateLimit";
import { resolveDay } from "@/lib/dashboardServer";
import { buildTradeHub } from "@/lib/tradeHub";
import { tr } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * GET /api/trade/hub?date=YYYY-MM-DD&tz=<دقیقه شرق UTC>
 *
 * همه‌ی خلاصه‌های هاب ترید در یک درخواست (یک چک ماژول + کوئری‌های موازی).
 * گیت سمت سرور: ماژول پولی TRADE (requireModule) + فلگ کل بخش ترید؛ هر
 * زیربخش هم با فلگ خودش در buildTradeHub (خاموش → null). تقویم از جدول
 * خودمونه و هیچ تماس بیرونی نیست (lib/tradeHub.ts).
 */
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;
  const { userId, isSuperAdmin } = guard;

  const blocked = await featureBlocked("trade", userId);
  if (blocked) return blocked;

  if (!isSuperAdmin && !(await checkRateLimit(`tradehub:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: tr("درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  }

  const day = resolveDay(req.nextUrl.searchParams.get("date"), req.nextUrl.searchParams.get("tz"));
  const features = await resolveFeaturesFor(userId);
  const data = await buildTradeHub(userId, day, features);
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
