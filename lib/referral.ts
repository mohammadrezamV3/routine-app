// ثابت‌های رفرال که سمت کلاینت هم لازمن (lib/discountValidation.ts به prisma
// وابسته‌ست و توی باندل کلاینت نمی‌ره).
//
// قاعده‌ی کد دعوت:
// - دوستی که با کد میاد فقط روی *اولین* خریدش REFERRAL_DISCOUNT_PERCENT٪ تخفیف
//   می‌گیره، و هر نفر فقط یک بار (هر کدی که باشه) — کد برای بقیه کار می‌کنه.
// - صاحب کد به‌ازای هر دوستی که خرید اولش رو با کدش انجام بده، یک بار
//   REFERRAL_INVITER_REWARD_PERCENT٪ تخفیف روی خرید بعدی خودش می‌گیره
//   (ReferralUsage.inviterRewardApplied = مصرف شده).
// - هر کس می‌تونه اسم کدش رو خودش انتخاب کنه (/api/account/referral).

export const REFERRAL_DISCOUNT_PERCENT = 10;
export const REFERRAL_INVITER_REWARD_PERCENT = 15;

/** شکل کد رفرال (lib/auth.ts و روت ثبت‌نام: ۱۰ حرف/رقم بزرگ) — کمی آزادتر برای کدهای قدیمی */
export const REFERRAL_CODE_RE = /^[A-Z0-9]{4,24}$/;

/** کدی که کاربر خودش انتخاب می‌کنه: 4 تا 16 حرف انگلیسی یا عدد */
export const CUSTOM_REFERRAL_CODE_RE = /^[A-Z0-9]{4,16}$/;

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase();
}
