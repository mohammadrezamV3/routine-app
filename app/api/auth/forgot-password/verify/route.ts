import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone, validatePassword } from "@/lib/validate";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json();
  const { phone, code, newPassword } = body as { phone: string; code: string; newPassword: string };

  if (!phone || !isValidIranPhone(phone) || !code || !newPassword) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل نیست" }, { status: 400 });
  }

  // محدودیت تلاش برای حدس‌زدن کد ۵رقمی — هم روی IP هم روی شماره
  if (!checkRateLimit(`fp-verify-ip:${ip}`, 15, 10 * 60 * 1000) || !checkRateLimit(`fp-verify-phone:${phone}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    return NextResponse.json({ error: "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }

  const otp = await prisma.passwordResetOtp.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= 5) {
    return NextResponse.json({ error: "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }

  if (otp.codeHash !== hashCode(code.trim())) {
    await prisma.passwordResetOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "کد وارد شده اشتباه است" }, { status: 400 });
  }

  const passwordError = await validatePassword(newPassword, [user.username || "", user.name || "", phone]);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  // رمز جدید نباید با رمز قبلی یکی باشه
  if (user.passwordHash) {
    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) {
      return NextResponse.json({ error: "رمز جدید نباید با رمز قبلی یکی باشه" }, { status: 400 });
    }
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.passwordResetOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
