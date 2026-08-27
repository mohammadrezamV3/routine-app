import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone } from "@/lib/validate";
import { sendOtpSms } from "@/lib/sms";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json();
  const { phone } = body as { phone: string };

  if (!phone || !isValidIranPhone(phone)) {
    return NextResponse.json({ error: "شماره موبایل معتبر نیست (فرمت: 09xxxxxxxxx)" }, { status: 400 });
  }

  // محدودیت روی IP و روی خودِ شماره — جلوگیری از پیامک‌بمبارون یه شماره
  if (!checkRateLimit(`fp-req-ip:${ip}`, 8, 10 * 60 * 1000) || !checkRateLimit(`fp-req-phone:${phone}`, 3, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }
  // کولداونِ ثابتِ ۲ دقیقه‌ای — چک می‌شه حتی اگه شماره حساب نداشته باشه، وگرنه
  // خودِ کدِ ۴۲۹ (که فقط موقعِ عبور از این کولداون برمی‌گرده) لو می‌داد که
  // شماره‌ی موردنظر قبلاً یه درخواستِ موفق داشته یا نه.
  const cooldownOk = checkRateLimit(`fp-req-cooldown:${phone}`, 1, 2 * 60 * 1000);
  if (!cooldownOk) {
    return NextResponse.json({ error: "لطفاً ۲ دقیقه صبر کن و دوباره امتحان کن" }, { status: 429 });
  }

  const user = await prisma.user.findFirst({ where: { phone } });
  // پاسخ همیشه یکسانه چه شماره ثبت‌نام شده باشه چه نه — تا نشه با امتحان
  // شماره‌های مختلف فهمید کدوم شماره حساب داره (همون قرارداد امنیتی بقیه سایت)
  if (user) {
    const code = String(Math.floor(10000 + Math.random() * 90000)); // ۵ رقمی، مثل اکثر سرویس‌های ایرانی
    await Promise.all([
      prisma.passwordResetOtp.create({
        data: {
          userId: user.id,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      }),
      sendOtpSms(phone, code),
    ]);
  }

  return NextResponse.json({ ok: true });
}
