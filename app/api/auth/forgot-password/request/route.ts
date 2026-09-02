import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone, isValidEmail } from "@/lib/validate";
import { sendOtpSms } from "@/lib/sms";
import { sendOtpEmail } from "@/lib/email";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// شناسه می‌تونه شماره‌همراه یا ایمیل باشه — یک باکس واحد، تشخیص نوعش با
// همون regexهای مشترک lib/validate. اگه هیچ‌کدوم نبود، شناسه نامعتبره.
function resolveIdentifier(raw: string): { kind: "phone" | "email"; value: string } | null {
  const trimmed = raw.trim();
  if (isValidIranPhone(trimmed)) return { kind: "phone", value: trimmed };
  if (isValidEmail(trimmed)) return { kind: "email", value: trimmed.toLowerCase() };
  return null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json();
  const { identifier: rawIdentifier } = body as { identifier: string };

  const identifier = typeof rawIdentifier === "string" ? resolveIdentifier(rawIdentifier) : null;
  if (!identifier) {
    return NextResponse.json({ error: "شماره همراه یا ایمیل معتبر نیست" }, { status: 400 });
  }
  const { kind, value } = identifier;

  // محدودیت روی IP و روی خود شناسه — جلوگیری از پیامک/ایمیل‌بمبارون
  if (!checkRateLimit(`fp-req-ip:${ip}`, 8, 10 * 60 * 1000) || !checkRateLimit(`fp-req-id:${value}`, 3, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }
  // کولداون ثابت ۲ دقیقه‌ای — چک می‌شه حتی اگه شناسه حساب نداشته باشه، وگرنه
  // خود کد ۴۲۹ (که فقط موقع عبور از این کولداون برمی‌گرده) لو می‌داد که
  // شناسه‌ی موردنظر قبلا یه درخواست موفق داشته یا نه.
  const cooldownOk = checkRateLimit(`fp-req-cooldown:${value}`, 1, 2 * 60 * 1000);
  if (!cooldownOk) {
    return NextResponse.json({ error: "لطفا ۲ دقیقه صبر کن و دوباره امتحان کن" }, { status: 429 });
  }

  const user = await prisma.user.findFirst({ where: kind === "phone" ? { phone: value } : { email: value } });
  // پاسخ همیشه یکسانه چه شناسه ثبت‌نام شده باشه چه نه — تا نشه با امتحان
  // شناسه‌های مختلف فهمید کدوم حساب داره (همون قرارداد امنیتی بقیه سایت)
  if (user) {
    const code = String(Math.floor(10000 + Math.random() * 90000)); // ۵ رقمی، مثل اکثر سرویس‌های ایرانی
    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    // ارسال واقعی پیامک/ایمیل عمدا await نمی‌شه — روی خطوط پرترافیک
    // ملی‌پیامک/SMTP این می‌تونه چند ثانیه طول بکشه و کاربر رو پشت اسپینر
    // نگه می‌داشت، درحالی‌که کد از قبل توی دیتابیس ذخیره شده و صفحه‌ی بعدی
    // (تایید کد) فورا قابل استفاده‌ست. چون این پروژه روی یه Node process
    // همیشه‌روشن (Docker) اجرا می‌شه نه سرورلس، این Promise رهاشده بعد
    // return هم کامل اجرا می‌شه (خود sendOtpSms/sendOtpEmail هم هیچ‌وقت
    // throw نمی‌کنن، خطاهاشون رو داخلی catch و لاگ می‌کنن).
    void (kind === "phone" ? sendOtpSms(value, code) : sendOtpEmail(value, code));
  }

  return NextResponse.json({ ok: true, kind });
}
