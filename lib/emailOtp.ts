import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// منطقِ مشترکِ کدِ OTPِ ایمیل — بینِ روتِ request، روتِ verify، و
// authorize()ِ providerِ «email-otp» توی lib/auth.ts به اشتراک گذاشته می‌شه
// تا هش‌کردن/طولِ کد یک‌جا تعریف بشه، نه سه بار تکراری.

export const EMAIL_OTP_LENGTH = 6;
export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000; // ۱۰ دقیقه
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

/** تولیدِ کدِ ۶رقمی با crypto.randomInt — امنِ رمزنگاری‌شده (نه Math.random) */
export function generateEmailOtp(): string {
  return String(crypto.randomInt(0, 10 ** EMAIL_OTP_LENGTH)).padStart(EMAIL_OTP_LENGTH, "0");
}

export function hashEmailOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** مقایسه‌ی زمان-ثابت (timing-safe) به‌جای === خام روی هشِ hex */
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export type ConsumeEmailOtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "too_many_attempts" | "wrong_code" };

/**
 * بررسیِ نهایی + مصرفِ واقعیِ OTP (usedAt) — منبعِ واحدِ حقیقتِ «آیا این کد
 * الان معتبره و می‌شه باهاش وارد شد»، هم برای authorize()ِ providerِ
 * «email-otp» توی lib/auth.ts (که واقعاً نشست صادر می‌کنه) هم برای تست.
 * attempts فقط روی «کدِ غلط» زیاد می‌شه، نه روی نبودن/expired‌بودنِ ردیف —
 * تا کسی نتونه با چک‌کردنِ رفتارِ attempts بفهمه اصلاً OTPِ فعالی برای این
 * ایمیل وجود داره یا نه.
 */
export async function verifyAndConsumeEmailOtp(email: string, code: string): Promise<ConsumeEmailOtpResult> {
  const otp = await prisma.emailLoginOtp.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, reason: "not_found" };
  if (otp.attempts >= EMAIL_OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  if (!hashesMatch(otp.codeHash, hashEmailOtp(code))) {
    await prisma.emailLoginOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "wrong_code" };
  }

  await prisma.emailLoginOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return { ok: true };
}
