import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone, isValidEmail, validatePassword } from "@/lib/validate";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function resolveIdentifier(raw: string): { kind: "phone" | "email"; value: string } | null {
  const trimmed = raw.trim();
  if (isValidIranPhone(trimmed)) return { kind: "phone", value: trimmed };
  if (isValidEmail(trimmed)) return { kind: "email", value: trimmed.toLowerCase() };
  return null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json();
  const { identifier: rawIdentifier, code, newPassword } = body as { identifier: string; code: string; newPassword: string };

  const identifier = typeof rawIdentifier === "string" ? resolveIdentifier(rawIdentifier) : null;
  if (!identifier || !code || !newPassword) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل نیست" }, { status: 400 });
  }
  const { kind, value } = identifier;

  // محدودیت تلاش برای حدس‌زدن کد ۵رقمی — هم روی IP هم روی شناسه
  if (!checkRateLimit(`fp-verify-ip:${ip}`, 15, 10 * 60 * 1000) || !checkRateLimit(`fp-verify-id:${value}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const user = await prisma.user.findFirst({ where: kind === "phone" ? { phone: value } : { email: value } });
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

  const passwordError = await validatePassword(newPassword, [user.username || "", user.name || "", value]);
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
