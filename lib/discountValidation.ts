import { prisma } from "@/lib/prisma";

// منطقِ اعتبارسنجیِ کدِ تخفیف — مشترک بینِ چک‌اوتِ واقعی
// (app/api/subscription/checkout) و پیش‌نمایشِ «اعمال» توی همون صفحه
// (app/api/subscription/discount-preview). اول کدهای تخفیفِ عمومیِ ادمین
// (DiscountCode) چک می‌شن، بعد فال‌بک به کدِ رفرالِ شخصی. مصرفِ واقعیِ کدِ
// رفرال (ساختِ ReferralUsage) عمداً این‌جا نیست — فقط موقعِ خریدِ واقعی باید
// ثبت بشه، نه صرفاً موقعِ پیش‌نمایش/اعمال.
export type DiscountResolution =
  | { ok: true; percent: number; source: "promo"; referralCodeId?: undefined }
  | { ok: true; percent: number; source: "referral"; referralCodeId: string }
  | { ok: false; error: string };

export async function resolveDiscountCode(rawCode: string, userId: string, planKey: string): Promise<DiscountResolution> {
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) return { ok: false, error: "کد تخفیف را وارد کن" };

  const promo = await prisma.discountCode.findUnique({ where: { code: normalizedCode } });
  const promoValid = promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date())
    && (!promo.planKey || promo.planKey === planKey);
  if (promoValid) {
    return { ok: true, percent: promo!.percentOff, source: "promo" };
  }

  const referral = await prisma.referralCode.findUnique({ where: { code: normalizedCode } });
  if (referral && referral.userId !== userId) {
    return { ok: true, percent: REFERRAL_DISCOUNT_PERCENT, source: "referral", referralCodeId: referral.id };
  }

  return { ok: false, error: "کد تخفیف نامعتبر، منقضی‌شده، یا برای این پکیج نیست" };
}

// درصدِ تخفیفِ کدِ رفرال در چک‌اوت — پاداشِ «یک ماه رایگان برای هردو طرف»یِ
// خودِ سیستم رفرال (بعد از اولین پرداختِ موفق دعوت‌شونده) جدا و هنوز سمتِ
// این چک‌اوت پیاده نشده؛ اینجا فقط همون تخفیفِ لحظه‌ی خریدِ دعوت‌شونده‌ست.
export const REFERRAL_DISCOUNT_PERCENT = 10;
