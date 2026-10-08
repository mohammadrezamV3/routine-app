import { prisma } from "@/lib/prisma";
import { debitForCheckout, creditReferralReward } from "@/lib/wallet";
import { consumeAchievementReward } from "@/lib/achievementsServer";
import { isMonthlyOption } from "@/lib/achievementRewards";

// فعال‌سازیِ واقعیِ یک خرید — نقطه‌ی مشترکِ دو مسیر:
//   ۱) verify (بعدِ تاییدِ زیبال، amountCharged > 0)
//   ۲) checkout (وقتی کیفِ اعتبار به‌تنهایی کل قیمت را پوشش می‌دهد، amountCharged = 0)
// عمداً یک تابعِ واحد است — اگر این منطق در دو جا جدا نوشته شود، دیر یا زود
// یکی‌شان از دیگری عقب می‌ماند (مثلاً پاداشِ رفرال، مصرفِ پاداشِ اچیومنت،
// یا سقفِ ارتقا فقط در یکی از دو مسیر اعمال می‌شود).
//
// نکته‌ی مهمِ ضدتورم: پاداشِ رفرال همیشه فقط روی amountCharged (پولِ واقعیِ
// دریافت‌شده از درگاه) حساب می‌شود، نه روی walletApplied. اگر رویِ
// walletApplied هم پاداش می‌دادیم، زنجیره‌ی دعوت می‌توانست بدونِ هیچ پولِ
// واقعیِ تازه‌ای، فقط با چرخاندنِ همان اعتبارِ کیف بینِ حساب‌ها، اعتبارِ
// تازه از هیچ بسازد.
export async function activateSubscription(opts: {
  userId: string;
  planKey: string;
  months: number;
  discountPercent: number;
  referralUsageId?: string;
  discountCodeId?: string;
  achievementRewardId?: string;
  upgradeFromSubId?: string;
  amountCharged: number; // مبلغِ واقعاً دریافت‌شده از درگاه (۰ یعنی کاملاً از کیف پرداخت شده)
  walletApplied: number; // بخشی از قیمت که از کیفِ خودِ همین خریدار کسر شد
  provider: "zibal" | "wallet";
  providerRef?: string;
}): Promise<{ subscriptionId: string; paymentId: string }> {
  const plan = await prisma.plan.findUnique({
    where: { key_market: { key: opts.planKey, market: "IRAN" } },
    include: { modules: true },
  });
  if (!plan) throw new Error("plan_not_found");

  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + opts.months);

  // ارتقا به مکس: سقف انقضا مستقلا از دیتابیس (نه از ورودیِ این تابع که
  // می‌تواند از یک query دستکاری‌شده بیاید) خونده می‌شه — where شامل userId
  // هم هست تا کاربر فقط بتونه یکی از اشتراک‌های خودش رو مبنا بگیره.
  if (opts.upgradeFromSubId) {
    const sourceSub = await prisma.subscription.findFirst({
      where: { id: opts.upgradeFromSubId, userId: opts.userId },
      select: { currentPeriodEnd: true },
    });
    if (sourceSub && sourceSub.currentPeriodEnd.getTime() < currentPeriodEnd.getTime()) {
      currentPeriodEnd.setTime(sourceSub.currentPeriodEnd.getTime());
    }
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: opts.userId,
      planId: plan.id,
      status: "ACTIVE",
      interval: opts.months >= 12 ? "YEARLY" : "MONTHLY",
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

  // دسترسی ماژول‌های پلن: اگه ردیفِ فعلی دیرتر منقضی می‌شد (مثلاً از خریدِ
  // پلنِ بلندتری) همون حفظ می‌شه — خریدِ پلنِ کوتاه‌تر هیچ‌وقت دسترسیِ
  // باقی‌مونده رو کوتاه نمی‌کنه.
  const planModules = plan.modules.map((m) => m.module);
  const existing = await prisma.moduleAccess.findMany({
    where: { userId: opts.userId, module: { in: planModules } },
    select: { module: true, active: true, expiresAt: true },
  });
  const keepUntil = new Map(existing.filter((r) => r.active).map((r) => [r.module, r.expiresAt]));
  await prisma.moduleAccess.deleteMany({ where: { userId: opts.userId, module: { in: planModules } } });
  await prisma.moduleAccess.createMany({
    data: planModules.map((module) => {
      const prev = keepUntil.get(module);
      const expiresAt = prev === null ? null : prev && prev > currentPeriodEnd ? prev : currentPeriodEnd;
      return { userId: opts.userId, module, active: true, expiresAt };
    }),
  });

  if (opts.walletApplied > 0) {
    await debitForCheckout({
      userId: opts.userId,
      amount: opts.walletApplied,
      paymentId: payment.id,
      description: `استفاده از کیفِ اعتبار برای خریدِ ${plan.nameFa}`,
    });
  }

  // شرط «اولین پرداخت موفق» برای کدِ رفرال محقق شد — وضعیت REWARDED می‌شه،
  // و فقط اگه واقعاً پولی از درگاه گرفته شده باشه (نه صرفاً از کیف)، ۱۰٪ آن
  // به‌صورتِ اعتبارِ کیف به صاحبِ کد واریز می‌شه (قاعده‌ی ضدتورم بالا).
  if (opts.referralUsageId) {
    await prisma.referralUsage.updateMany({
      where: { id: opts.referralUsageId, inviteeUserId: opts.userId, status: "PENDING" },
      data: { status: "REWARDED", rewardedAt: new Date() },
    });
    if (opts.amountCharged > 0) {
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
    }
  }

  // مصرفِ پاداشِ اچیومنت — فقط بعدِ فعال‌سازیِ واقعی، فقط روی خریدِ یک‌ماهه.
  if (opts.achievementRewardId && isMonthlyOption(opts.months)) {
    await consumeAchievementReward(opts.achievementRewardId, opts.userId, subscription.id).catch(() => {});
  }

  // مصرفِ کدِ تخفیفِ عمومی (DiscountCode) — فقط بعدِ فعال‌سازیِ واقعی.
  if (opts.discountCodeId) {
    await prisma.discountCodeUsage.create({ data: { discountCodeId: opts.discountCodeId, userId: opts.userId } }).catch(() => {});
  }

  return { subscriptionId: subscription.id, paymentId: payment.id };
}
