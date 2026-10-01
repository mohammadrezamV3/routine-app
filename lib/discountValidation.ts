import { prisma } from "@/lib/prisma";
import { REFERRAL_DISCOUNT_PERCENT, REFERRAL_INVITER_REWARD_PERCENT } from "@/lib/referral";

export { REFERRAL_DISCOUNT_PERCENT, REFERRAL_INVITER_REWARD_PERCENT };

// منطق اعتبارسنجی کد تخفیف — مشترک بین چک‌اوت واقعی
// (app/api/subscription/checkout) و پیش‌نمایش «اعمال» توی همون صفحه
// (app/api/subscription/discount-preview). اول کدهای تخفیف عمومی ادمین
// (DiscountCode) چک می‌شن، بعد فال‌بک به کد رفرال شخصی. مصرف واقعی کد
// رفرال (ساخت ReferralUsage) عمدا این‌جا نیست — فقط موقع خرید واقعی باید
// ثبت بشه، نه صرفا موقع پیش‌نمایش/اعمال.
export type DiscountResolution =
  | { ok: true; percent: number; source: "promo"; discountCodeId: string; referralCodeId?: undefined }
  | { ok: true; percent: number; source: "referral"; referralCodeId: string; discountCodeId?: undefined }
  | { ok: false; error: string };

/** کاربر قبلا حداقل یک پرداخت موفق داشته؟ (کد دعوت فقط روی اولین خرید) */
async function hasPaidBefore(userId: string): Promise<boolean> {
  const n = await prisma.payment.count({ where: { paidAt: { not: null }, refundedAt: null, subscription: { userId } } });
  return n > 0;
}

export async function resolveDiscountCode(rawCode: string, userId: string, planKey: string): Promise<DiscountResolution> {
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) return { ok: false, error: "کد تخفیف را وارد کن" };

  const promo = await prisma.discountCode.findUnique({ where: { code: normalizedCode } });
  const promoValid = promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date())
    && (!promo.planKey || promo.planKey === planKey);
  if (promoValid) {
    if (promo!.maxUsesPerUser != null) {
      const usedCount = await prisma.discountCodeUsage.count({ where: { discountCodeId: promo!.id, userId } });
      if (usedCount >= promo!.maxUsesPerUser) {
        return { ok: false, error: "این کد تخفیف قبلا توسط شما به حداکثر تعداد مجاز استفاده شده" };
      }
    }
    return { ok: true, percent: promo!.percentOff, source: "promo", discountCodeId: promo!.id };
  }

  const referral = await prisma.referralCode.findUnique({ where: { code: normalizedCode } });
  if (referral) {
    if (referral.userId === userId) return { ok: false, error: "کد دعوت خودت رو نمی‌تونی استفاده کنی — اون مال دوستاته" };
    // هر نفر فقط یک بار و فقط روی اولین خرید
    const usedBefore = await prisma.referralUsage.count({ where: { inviteeUserId: userId, status: "REWARDED" } });
    if (usedBefore > 0) return { ok: false, error: "تو قبلا یک بار از کد دعوت استفاده کردی — هر نفر فقط یک بار" };
    if (await hasPaidBefore(userId)) return { ok: false, error: "کد دعوت فقط روی اولین خرید اعمال می‌شه" };
    return { ok: true, percent: REFERRAL_DISCOUNT_PERCENT, source: "referral", referralCodeId: referral.id };
  }

  return { ok: false, error: "کد تخفیف نامعتبر، منقضی‌شده، یا برای این پکیج نیست" };
}

/**
 * پاداش‌های مصرف‌نشده‌ی صاحب کد: هر دوستی که خرید اولش رو با کد این کاربر
 * انجام داده (ReferralUsage با status=REWARDED) یک بار REFERRAL_INVITER_REWARD_PERCENT٪
 * تخفیف می‌ده. قدیمی‌ترین پاداش اول مصرف می‌شه.
 */
export async function findInviterRewards(userId: string): Promise<{ count: number; nextUsageId: string | null }> {
  const where = { status: "REWARDED" as const, inviterRewardApplied: false, referralCode: { userId } };
  const [count, next] = await Promise.all([
    prisma.referralUsage.count({ where }),
    prisma.referralUsage.findFirst({ where, orderBy: { rewardedAt: "asc" }, select: { id: true } }),
  ]);
  return { count, nextUsageId: next?.id ?? null };
}
