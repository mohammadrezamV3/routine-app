import { createHmac, timingSafeEqual } from "crypto";

// امضای پارامترهای آدرس بازگشت درگاه (checkout → verify).
//
// چرا: verify پلن/مدت/مبلغ رو از query آدرس بازگشت می‌خونه. زیبال فقط تضمین
// می‌کنه «مبلغ» با پرداخت واقعی یکیه — نه این‌که پلن و مدت همونی باشن که
// قیمتش حساب شده. بدون امضا، کسی می‌تونست ارزان‌ترین پلن رو بخره و توی URL
// بازگشت planKey=max&duration=12 بذاره. حالا که تعداد ماه هر مدت هم از پنل
// ادمین عوض می‌شه، خود «ماه» هم امضا می‌شه تا verify دقیقا همون چیزی رو
// بده که موقع پرداخت قیمتش حساب شده بود (حتی اگه ادمین وسط پرداخت عوضش کنه).

export type CheckoutParams = {
  userId: string;
  planKey: string;
  duration: string;
  months: number;
  amount: number;
  discountPercent: number;
  referralUsageId?: string;
  discountCodeId?: string;
  upgradeFromSubId?: string;
  /** پاداش اچیومنت (lib/achievementRewards.ts) — فقط وقتی هست ته رشته میاد */
  achievementRewardId?: string;
  /** مقدار کسرشده از کیفِ اعتبارِ خودِ خریدار (lib/wallet.ts) — امضا می‌شه تا
   * کاربر نتونه این عدد رو توی URL برگشتی دستکاری کنه و بدون کسرِ واقعی از
   * کیفش همون تخفیف رو بگیره. */
  walletApplied?: number;
};

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET تنظیم نشده");
  return s;
}

function canonical(p: CheckoutParams): string {
  return [
    "checkout-v1",
    p.userId,
    p.planKey,
    p.duration,
    String(p.months),
    String(p.amount),
    String(p.discountPercent),
    p.referralUsageId || "",
    p.discountCodeId || "",
    p.upgradeFromSubId || "",
    // فقط وقتی هست اضافه می‌شه تا امضای پرداخت‌های در جریان قبل از این تغییر معتبر بمونه
    ...(p.achievementRewardId ? [`ach:${p.achievementRewardId}`] : []),
    ...(p.walletApplied ? [`wal:${p.walletApplied}`] : []),
  ].join("|");
}

export function signCheckoutParams(p: CheckoutParams): string {
  return createHmac("sha256", secret()).update(canonical(p)).digest("base64url");
}

export function verifyCheckoutSignature(p: CheckoutParams, sig: string | null | undefined): boolean {
  if (!sig) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(signCheckoutParams(p), "base64url");
  } catch {
    return false;
  }
  const given = Buffer.from(sig, "base64url");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
