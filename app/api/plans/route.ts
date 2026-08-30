import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DURATIONS, findPlanPricing } from "@/lib/planPricing";
import { formatPriceAmount } from "@/lib/formatPrice";
import { findUpgradeSource, computeUpgradePricing, UPGRADE_TARGET_PLAN_KEY } from "@/lib/planUpgrade";

const DURATION_MONTHS: Record<string, number> = { "1": 1, "3": 3, "6": 6, "12": 12 };

// GET /api/plans → پلن‌های فعالِ بازارِ خودِ کاربر + وضعیتِ اشتراکِ فعلیش،
// برای صفحه‌ی «اشتراک». قیمت‌گذاری بازاری‌ست (هر پلن مخصوص یک Market)، پس
// همیشه فقط پلن‌های هم‌بازارِ خودِ کاربر برمی‌گرده.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { market: true, isSuperAdmin: true } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [plans, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: { market: user.market, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, key: true, nameFa: true, currency: true, priceMonthly: true, priceYearly: true,
        modules: { select: { module: true } },
      },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIAL"] } },
      orderBy: { createdAt: "desc" },
      select: { planId: true, status: true, currentPeriodEnd: true, plan: { select: { key: true, nameFa: true } } },
    }),
  ]);

  // پیش‌نمایشِ «قیمتِ ارتقا به مکس» — فقط بازارِ ایران (تنها بازاری که چک‌اوتِ
  // واقعی پشتیبانی می‌کنه). فرمولِ واقعی (اعتبار + سقفِ مدت) دقیقاً همونیه که
  // موقعِ خریدِ واقعی توی api/subscription/checkout و verify اجرا می‌شه —
  // این‌جا فقط برای نمایشه، مبلغِ واقعی همیشه سمتِ سرورِ همون درخواست حساب می‌شه.
  type UpgradeOfferDuration = { amount: number; priceLabel: string; capEndIso: string; capped: boolean };
  let upgradeOffer: { fromPlanKey: string; toPlanKey: string; perDuration: Record<string, UpgradeOfferDuration> } | null = null;
  if (user.market === "IRAN") {
    const upgradeSource = await findUpgradeSource(userId);
    const maxPricing = upgradeSource ? findPlanPricing(UPGRADE_TARGET_PLAN_KEY, false) : undefined;
    if (upgradeSource && maxPricing?.amounts) {
      const perDuration: Record<string, UpgradeOfferDuration> = {};
      for (const d of DURATIONS) {
        const { amount, periodEnd, capped } = computeUpgradePricing(maxPricing.amounts[d], upgradeSource, DURATION_MONTHS[d]);
        perDuration[d] = { amount, priceLabel: formatPriceAmount(amount, false), capEndIso: periodEnd.toISOString(), capped };
      }
      upgradeOffer = { fromPlanKey: upgradeSource.fromPlanKey, toPlanKey: UPGRADE_TARGET_PLAN_KEY, perDuration };
    }
  }

  return NextResponse.json({
    plans: plans.map((p) => ({ ...p, modules: p.modules.map((m) => m.module) })),
    subscription,
    upgradeOffer,
    isSuperAdmin: user.isSuperAdmin,
  });
}
