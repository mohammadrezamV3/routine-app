import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone } from "@/lib/validate";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// تایید کد پیامک‌شده — فقط verifiedAt رو ست می‌کنه (مصرف واقعی/usedAt
// موقع ثبت‌نام نهایی توی route.ts خود signup انجام می‌شه، تا اگه کاربر
// بین این مرحله و مرحله‌ی بعد رها کرد، تاییدیه هدر نره).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json();
  const { phone, code } = body as { phone: string; code: string };

  if (!phone || !isValidIranPhone(phone) || !code) {
    return NextResponse.json({ error: "اطلاعات وارد شده کامل نیست" }, { status: 400 });
  }

  if (!checkRateLimit(`signup-otp-verify-ip:${ip}`, 15, 10 * 60 * 1000) || !checkRateLimit(`signup-otp-verify-phone:${phone}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const otp = await prisma.signupOtp.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= 5) {
    return NextResponse.json({ error: "کد نامعتبر یا منقضی‌شده است" }, { status: 400 });
  }

  if (otp.codeHash !== hashCode(code.trim())) {
    await prisma.signupOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "کد وارد شده اشتباه است" }, { status: 400 });
  }

  await prisma.signupOtp.update({ where: { id: otp.id }, data: { verifiedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
