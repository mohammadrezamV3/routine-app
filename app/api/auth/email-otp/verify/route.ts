import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";
import { hashEmailOtp, hashesMatch, EMAIL_OTP_MAX_ATTEMPTS } from "@/lib/emailOtp";

// POST /api/auth/email-otp/verify  { email, code }
// فقط یک پیش‌بررسی‌ست — درستی کد رو تایید می‌کنه و verifiedAt رو ست می‌کنه،
// ولی OTP رو usedAt نمی‌کنه (مصرف واقعی/صدور نشست توسط provider
// «email-otp» توی lib/auth.ts انجام می‌شه، دقیقا جایی که NextAuth کوکی
// نشست رو می‌سازه). این جداسازی چون authorize() NextAuth پیام خطای
// سفارشی رو حفظ نمی‌کنه (نگاه کن به کامنت همون provider) — پس تشخیص
// «کد اشتباه» در برابر «این ایمیل حساب نداره» باید همین‌جا اتفاق بیفته.
//
// hasAccount فقط *بعد* واردکردن کد درست فاش می‌شه — یعنی کسی که کد رو
// نمی‌دونه (به ایمیل دسترسی نداره) هیچ‌وقت از این مسیر نمی‌فهمه اون ایمیل
// حساب داره یا نه.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json().catch(() => null);
  const rawEmail = body?.email;
  const code = body?.code;

  if (typeof rawEmail !== "string" || !isValidEmail(rawEmail.trim()) || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل نیست" }, { status: 400 });
  }
  const email = rawEmail.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!checkRateLimit(`email-otp-verify-ip:${ip}`, 20, 10 * 60 * 1000) || !checkRateLimit(`email-otp-verify-email:${email}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const otp = await prisma.emailLoginOtp.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }

  if (!hashesMatch(otp.codeHash, hashEmailOtp(cleanCode))) {
    await prisma.emailLoginOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const remaining = EMAIL_OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    return NextResponse.json({ error: remaining > 0 ? "کد وارد شده اشتباه است" : "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }

  await prisma.emailLoginOtp.update({ where: { id: otp.id }, data: { verifiedAt: new Date() } });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ ok: true, hasAccount: !!user });
}
