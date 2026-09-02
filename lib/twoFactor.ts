import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashesMatch } from "@/lib/emailOtp";

// منطقِ مشترکِ کدِ ورودِ دومرحله‌ایِ پیامکی — بینِ روتِ start (که کد رو
// می‌سازه و می‌فرسته) و authorize()ِ providerِ «sms-2fa» توی lib/auth.ts
// (که واقعاً مصرفش می‌کنه) به اشتراک گذاشته می‌شه. عیناً هم‌الگوی
// lib/emailOtp.ts، فقط روی userId به‌جای ایمیلِ خام.

export const TWO_FACTOR_OTP_LENGTH = 5;
export const TWO_FACTOR_OTP_TTL_MS = 5 * 60 * 1000; // ۵ دقیقه
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

export function generateTwoFactorOtp(): string {
  return String(crypto.randomInt(0, 10 ** TWO_FACTOR_OTP_LENGTH)).padStart(TWO_FACTOR_OTP_LENGTH, "0");
}

export function hashTwoFactorOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** ساختِ یک کدِ تازه برای این کاربر و باطل‌کردنِ کدهای قبلیِ مصرف‌نشده. */
export async function issueTwoFactorOtp(userId: string): Promise<string> {
  const code = generateTwoFactorOtp();
  await prisma.twoFactorOtp.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.twoFactorOtp.create({
    data: {
      userId,
      codeHash: hashTwoFactorOtp(code),
      expiresAt: new Date(Date.now() + TWO_FACTOR_OTP_TTL_MS),
    },
  });
  return code;
}

export type ConsumeTwoFactorResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "too_many_attempts" | "wrong_code" };

/**
 * بررسی + مصرفِ نهاییِ کد. `attempts` فقط روی «کدِ غلط» زیاد می‌شه، نه روی
 * نبودن/منقضی‌بودنِ ردیف — همون قرارداد ضدِ enumeration بقیه‌ی OTPهای اپ.
 */
export async function verifyAndConsumeTwoFactorOtp(userId: string, code: string): Promise<ConsumeTwoFactorResult> {
  const otp = await prisma.twoFactorOtp.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, reason: "not_found" };
  if (otp.attempts >= TWO_FACTOR_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  if (!hashesMatch(otp.codeHash, hashTwoFactorOtp(code))) {
    await prisma.twoFactorOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "wrong_code" };
  }

  await prisma.twoFactorOtp.update({ where: { id: otp.id }, data: { verifiedAt: new Date(), usedAt: new Date() } });
  return { ok: true };
}
