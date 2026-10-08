import { prisma } from "@/lib/prisma";

// کیفِ اعتبارِ رفرال — منطقِ تغییرِ موجودی فقط همین‌جاست؛ هیچ روتِ دیگه‌ای
// مستقیم User.walletBalance را تغییر نمی‌دهد. این کیف **صرفاً داخلِ اپ** قابل
// خرج است (کم‌کردن از مبلغِ خریدِ یک پلن) — هیچ تابعِ withdraw/transfer/payout
// در این فایل وجود ندارد و عمداً نباید اضافه شود؛ موجودی هیچ‌وقت به پول واقعی
// (بانک/درگاه/کیف دیگری) تبدیل نمی‌شود.

/** مقدارِ قابل‌اعمال از موجودیِ کیف روی یک خرید — هیچ‌وقت بیشتر از موجودیِ
 * واقعی یا بیشتر از خودِ مبلغِ قابل‌پرداخت نیست (کیف نمی‌تواند خرید را منفی کند). */
export function clampWalletApply(requested: number, balance: number, amountDue: number): number {
  const r = Math.max(0, Math.floor(requested || 0));
  return Math.min(r, Math.max(0, balance), Math.max(0, amountDue));
}

/**
 * واریزِ پاداشِ رفرال به کیفِ دعوت‌کننده — اتمیک (افزایشِ موجودی + ثبتِ
 * تراکنش + علامت‌گذاریِ ReferralUsage همگی در یک تراکنشِ دیتابیسی، تا در صورتِ
 * خطا هیچ‌کدام نیمه‌کاره نماند). امن در برابر فراخوانیِ دوباره: اگر
 * ReferralUsage از قبل REWARDED باشد، چیزی واریز نمی‌شود.
 */
export async function creditReferralReward(opts: {
  referralUsageId: string;
  inviterUserId: string;
  amount: number; // ۱۰٪ مبلغِ پرداخت‌شده‌ی دعوت‌شونده (بعد از تخفیف)، همین واحدِ ارزِ همان خرید
  description: string;
}): Promise<void> {
  if (opts.amount <= 0) return;

  await prisma.$transaction(async (tx) => {
    const usage = await tx.referralUsage.findUnique({
      where: { id: opts.referralUsageId },
      select: { status: true, inviterRewardApplied: true },
    });
    // یا قبلاً پاداش‌دهی شده، یا خودِ استفاده دیگر معتبر نیست (مثلاً REVOKED)
    if (!usage || usage.inviterRewardApplied) return;

    const user = await tx.user.update({
      where: { id: opts.inviterUserId },
      data: { walletBalance: { increment: opts.amount } },
      select: { walletBalance: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId: opts.inviterUserId,
        type: "REFERRAL_REWARD",
        amount: opts.amount,
        balanceAfter: user.walletBalance,
        referralUsageId: opts.referralUsageId,
        description: opts.description,
      },
    });

    await tx.referralUsage.update({
      where: { id: opts.referralUsageId },
      data: { inviterRewardApplied: true, rewardAmount: opts.amount },
    });
  });
}

/**
 * خرجِ مقداری از موجودیِ کیف برای کم‌کردن از مبلغِ یک خرید — اتمیک. اگر
 * موجودیِ لحظه‌ای (به‌خاطرِ یک خریدِ هم‌زمانِ دیگر) کمتر از amount باشد، فقط
 * به‌اندازه‌ی موجودیِ واقعی کسر می‌شود (هیچ‌وقت منفی نمی‌رود) و همان مقدارِ
 * واقعاً کسرشده برگردانده می‌شود — صدازننده باید این مقدار را با چیزی که
 * قبلاً به کاربر/درگاه اعلام کرده بود مقایسه کند.
 */
export async function debitForCheckout(opts: {
  userId: string;
  amount: number;
  paymentId: string;
  description: string;
}): Promise<{ debited: number }> {
  if (opts.amount <= 0) return { debited: 0 };

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: opts.userId }, select: { walletBalance: true } });
    const debited = Math.min(opts.amount, Math.max(0, current?.walletBalance ?? 0));
    if (debited <= 0) return { debited: 0 };

    const user = await tx.user.update({
      where: { id: opts.userId },
      data: { walletBalance: { decrement: debited } },
      select: { walletBalance: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId: opts.userId,
        type: "CHECKOUT_REDEMPTION",
        amount: -debited,
        balanceAfter: user.walletBalance,
        paymentId: opts.paymentId,
        description: opts.description,
      },
    });

    return { debited };
  });
}
