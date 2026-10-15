import { prisma } from "@/lib/prisma";
import { ensureEventDiscounts } from "@/lib/eventDiscountServer";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { tr } from "@/lib/i18n";

export { REFERRAL_DISCOUNT_PERCENT };

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
  if (!normalizedCode) return { ok: false, error: tr("کد تخفیف را وارد کن", "Enter a discount code") };

  // کد مناسبت جاری اگه هنوز ساخته نشده، همین‌جا (با throttle) ساخته می‌شه
  await ensureEventDiscounts();

  const promo = await prisma.discountCode.findUnique({ where: { code: normalizedCode } });
  const promoValid = promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date())
    && (!promo.planKey || promo.planKey === planKey);
  if (promoValid) {
    if (promo!.maxUsesPerUser != null) {
      const usedCount = await prisma.discountCodeUsage.count({ where: { discountCodeId: promo!.id, userId } });
      if (usedCount >= promo!.maxUsesPerUser) {
        return { ok: false, error: tr("این کد تخفیف قبلا توسط شما به حداکثر تعداد مجاز استفاده شده", "You have already used this discount code the maximum number of times") };
      }
    }
    return { ok: true, percent: promo!.percentOff, source: "promo", discountCodeId: promo!.id };
  }

  const referral = await prisma.referralCode.findUnique({ where: { code: normalizedCode } });
  if (referral) {
    if (referral.userId === userId) return { ok: false, error: tr("کد دعوت خودت رو نمی‌تونی استفاده کنی — اون مال دوستاته", "You cannot use your own invite code. It is for your friends") };
    // هر نفر فقط یک بار و فقط روی اولین خرید
    const usedBefore = await prisma.referralUsage.count({ where: { inviteeUserId: userId, status: "REWARDED" } });
    if (usedBefore > 0) return { ok: false, error: tr("تو قبلا یک بار از کد دعوت استفاده کردی — هر نفر فقط یک بار", "You have already used an invite code. Each person can use one only once") };
    if (await hasPaidBefore(userId)) return { ok: false, error: tr("کد دعوت فقط روی اولین خرید اعمال می‌شه", "An invite code only applies to your first purchase") };
    return { ok: true, percent: REFERRAL_DISCOUNT_PERCENT, source: "referral", referralCodeId: referral.id };
  }

  return { ok: false, error: tr("کد تخفیف نامعتبر، منقضی‌شده، یا برای این پکیج نیست", "The discount code is invalid, expired, or not valid for this plan") };
}
