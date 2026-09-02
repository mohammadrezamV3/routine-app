import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";
import { hashEmailOtp, hashesMatch, EMAIL_OTP_MAX_ATTEMPTS } from "@/lib/emailOtp";

// POST /api/account/email/verify  { newEmail, code }
// کد درست بود → ایمیل حساب واقعا عوض می‌شه (emailVerifiedAt هم ست می‌شه،
// چون همین لحظه با ارسال کد به همون آدرس اثبات شد).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const body = await req.json().catch(() => null);
  const rawEmail = body?.newEmail;
  const code = body?.code;
  if (typeof rawEmail !== "string" || !isValidEmail(rawEmail.trim()) || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل نیست" }, { status: 400 });
  }
  const newEmail = rawEmail.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!checkRateLimit(`email-change-verify-user:${userId}`, 8, 10 * 60 * 1000) || !checkRateLimit(`email-change-verify-ip:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const otp = await prisma.emailChangeOtp.findFirst({
    where: { userId, newEmail, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }
  if (!hashesMatch(otp.codeHash, hashEmailOtp(cleanCode))) {
    await prisma.emailChangeOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const remaining = EMAIL_OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    return NextResponse.json({ error: remaining > 0 ? "کد وارد شده اشتباه است" : "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }

  // بین ارسال کد و همین لحظه ممکنه یکی دیگه همین ایمیل رو گرفته باشه —
  // دوباره چک می‌کنیم قبل از commit.
  const existing = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "این ایمیل قبلا برای حساب دیگری ثبت شده" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.emailChangeOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { email: newEmail, emailVerifiedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true, email: newEmail });
}
