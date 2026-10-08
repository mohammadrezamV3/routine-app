import { prisma } from "@/lib/prisma";
import { debitForCheckout, creditReferralReward } from "@/lib/wallet";
import type { Duration } from "@/lib/planPricing";

const DURATION_MONTHS: Record<Duration, number> = { "1": 1, "3": 3, "6": 6, "12": 12 };

// فعال‌سازیِ واقعیِ یک خرید — نقطه‌ی مشترکِ دو مسیر:
//   ۱) verify (بعدِ تاییدِ زرین‌پال، amountCharged > 0)
//   ۲) checkout (وقتی کیفِ اعتبار به‌تنهایی کل قیمت را پوشش می‌دهد، amountCharged = 0)
// عمداً یک تابعِ واحد است — اگر این منطق در دو جا جدا نوشته شود، دیر یا زود
// یکی‌شان از دیگری عقب می‌ماند (مثلاً پاداشِ رفرال یا دسترسیِ ماژول فقط در
// یکی از دو مسیر اعمال می‌شود).
//
// نکته‌ی مهمِ ضدتورم: پاداشِ رفرال همیشه فقط روی amountCharged (پولِ واقعیِ
// دریافت‌شده از درگاه) حساب می‌شود، نه روی walletApplied. اگر رویِ
// walletApplied هم پاداش می‌دادیم، زنجیره‌ی دعوت می‌توانست بدونِ هیچ پولِ
// واقعیِ تازه‌ای، فقط با چرخاندنِ همان اعتبارِ کیف بینِ حساب‌ها، اعتبارِ
// تازه از هیچ بسازد.
export async function activatePaidSubscription(opts: {
  userId: string;
  planKey: string;
  duration: Duration;
  discountPercent: number;
  referralUsageId?: string;
  amountCharged: number; // مبلغِ واقعاً دریافت‌شده از درگاه (۰ یعنی کاملاً از کیف پرداخت شده)
  walletApplied: number; // بخشی از قیمت که از کیفِ خودِ همین خریدار کسر شد
  provider: "zarinpal" | "wallet";
  providerRef?: string;
}): Promise<{ subscriptionId: string; paymentId: string }> {
  const plan = await prisma.plan.findUnique({
    where: { key_market: { key: opts.planKey, market: "IRAN" } },
    include: { modules: true },
  });
  if (!plan) throw new Error("plan_not_found");

  const months = DURATION_MONTHS[opts.duration];
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + months);

  const subscription = await prisma.subscription.create({
    data: {
      userId: opts.userId,
      planId: plan.id,
      status: "ACTIVE",
      interval: opts.duration === "12" ? "YEARLY" : "MONTHLY",
      currentPeriodEnd,
      discountPercent: opts.discountPercent,
      appliedReferralUsageId: opts.referralUsageId,
      payments: {
        create: {
          amount: opts.amountCharged,
          walletAmountApplied: opts.walletApplied,
          currency: "IRR",
          provider: opts.provider,
          providerRef: opts.providerRef,
          paidAt: new Date(),
        },
      },
    },
    include: { payments: true },
  });
  const payment = subscription.payments[0];

  await prisma.moduleAccess.deleteMany({ where: { userId: opts.userId, module: { in: plan.modules.map((m) => m.module) } } });
  await prisma.moduleAccess.createMany({
    data: plan.modules.map((m) => ({ userId: opts.userId, module: m.module, active: true, expiresAt: currentPeriodEnd })),
  });

  if (opts.walletApplied > 0) {
    await debitForCheckout({
      userId: opts.userId,
      amount: opts.walletApplied,
      paymentId: payment.id,
      description: `استفاده از کیفِ اعتبار برای خریدِ ${plan.nameFa}`,
    });
  }

  if (opts.referralUsageId && opts.amountCharged > 0) {
    const usage = await prisma.referralUsage.findUnique({
      where: { id: opts.referralUsageId },
      select: { referralCode: { select: { userId: true } } },
    });
    if (usage) {
      await creditReferralReward({
        referralUsageId: opts.referralUsageId,
        inviterUserId: usage.referralCode.userId,
        amount: Math.round(opts.amountCharged * 0.1),
        description: `۱۰٪ پاداشِ رفرال از خریدِ ${plan.nameFa} توسطِ کاربرِ دعوت‌شده`,
      });
    }
    await prisma.referralUsage.updateMany({
      where: { id: opts.referralUsageId, status: "PENDING" },
      data: { status: "REWARDED", rewardedAt: new Date() },
    });
  }

  return { subscriptionId: subscription.id, paymentId: payment.id };
}
