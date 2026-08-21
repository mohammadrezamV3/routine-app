import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zarinpalVerifyPayment } from "@/lib/zarinpal";
import type { Duration } from "@/lib/planPricing";

const DURATION_MONTHS: Record<Duration, number> = { "1": 1, "3": 3, "6": 6, "12": 12 };

// GET /api/subscription/verify → مرورگرِ کاربر بعدِ پرداخت از زرین‌پال
// اینجا برمی‌گرده (Authority/Status توی query). مبلغ رو مستقیم از همون
// query که خودمون موقعِ ساختِ callback_url ساختیم می‌خونیم — امنیتش با
// verifyِ خودِ زرین‌پال تضمین می‌شه (اگه کسی این مبلغ رو دستکاری کنه،
// verify روی زرین‌پال با مبلغِ واقعاً پرداخت‌شده مچ نمی‌شه و fail می‌شه).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const { searchParams } = req.nextUrl;
  const redirectBase = new URL("/subscription", req.nextUrl.origin);

  if (!userId) {
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  const status = searchParams.get("Status");
  const authority = searchParams.get("Authority");
  const planKey = searchParams.get("planKey");
  const duration = searchParams.get("duration") as Duration | null;
  const amount = Number(searchParams.get("amount"));
  const discountPercent = Number(searchParams.get("discountPercent") || 0);
  const referralUsageId = searchParams.get("referralUsageId") || undefined;

  if (status !== "OK" || !authority || !planKey || !duration || !DURATION_MONTHS[duration] || !amount) {
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  let verified: { ok: boolean; refId?: string };
  try {
    verified = await zarinpalVerifyPayment({ amountRial: amount, authority });
  } catch {
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }
  if (!verified.ok) {
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  const plan = await prisma.plan.findUnique({
    where: { key_market: { key: planKey, market: "IRAN" } },
    include: { modules: true },
  });
  if (!plan) {
    redirectBase.searchParams.set("checkout", "failed");
    return NextResponse.redirect(redirectBase);
  }

  const months = DURATION_MONTHS[duration];
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + months);

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      interval: duration === "12" ? "YEARLY" : "MONTHLY",
      currentPeriodEnd,
      discountPercent,
      appliedReferralUsageId: referralUsageId,
      payments: {
        create: {
          amount,
          currency: "IRR",
          provider: "zarinpal",
          providerRef: verified.refId,
          paidAt: new Date(),
        },
      },
    },
  });

  // دسترسیِ ماژول‌های پلن — همون قاعده‌ی ثبت‌نام (BASIC_MODULES): هر ماژول
  // یک ردیفِ ModuleAccess با تاریخِ انقضای پایانِ دوره‌ی اشتراک.
  await prisma.moduleAccess.deleteMany({ where: { userId, module: { in: plan.modules.map((m) => m.module) } } });
  await prisma.moduleAccess.createMany({
    data: plan.modules.map((m) => ({ userId, module: m.module, active: true, expiresAt: currentPeriodEnd })),
  });

  // شرطِ «اولین پرداختِ موفق» برای کدِ رفرال محقق شد — وضعیت REWARDED می‌شه.
  // توجه: پاداشِ «یک ماه رایگان برای دعوت‌کننده» هنوز پیاده نشده (فازِ بعدی)،
  // اینجا فقط رکوردِ استفاده‌ی موفق ثبت می‌شه.
  if (referralUsageId) {
    await prisma.referralUsage.update({
      where: { id: referralUsageId },
      data: { status: "REWARDED", rewardedAt: new Date() },
    }).catch(() => {});
  }

  redirectBase.searchParams.set("checkout", "success");
  redirectBase.searchParams.set("sub", subscription.id);
  return NextResponse.redirect(redirectBase);
}
