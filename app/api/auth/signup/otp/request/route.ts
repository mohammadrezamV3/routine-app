import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone } from "@/lib/validate";
import { sendOtpSms } from "@/lib/sms";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// قدم اول ثبت‌نام — قبل از پر کردن بقیه‌ی فرم، باید مالکیت شماره موبایل
// با یک کد ۵رقمی تایید بشه. عمدا چک نمی‌کنه که این شماره از قبل ثبت‌نام
// کرده یا نه (همون قرارداد ضدenumeration بقیه‌ی سایت) — تکراری‌بودن فقط
// در انتهای مسیر، موقع ثبت‌نام واقعی، با یک پیام کلی مشخص می‌شه.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json();
  const { phone } = body as { phone: string };

  if (!phone || !isValidIranPhone(phone)) {
    return NextResponse.json({ error: "شماره موبایل معتبر نیست (فرمت: 09xxxxxxxxx)" }, { status: 400 });
  }

  if (!(await checkRateLimit(`signup-otp-req-ip:${ip}`, 8, 10 * 60 * 1000)) || !(await checkRateLimit(`signup-otp-req-phone:${phone}`, 3, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }
  // کولداون ثابت ۲ دقیقه‌ای بین هر درخواست برای همین شماره — جدا از سقف
  // بالا (که فقط تعداد رو محدود می‌کنه)، این مطمئن می‌شه صدازدن مستقیم API
  // (دور زدن تایمر کلاینت) هم نمی‌تونه زودتر از ۲ دقیقه کد بعدی رو بگیره.
  if (!(await checkRateLimit(`signup-otp-cooldown:${phone}`, 1, 2 * 60 * 1000))) {
    return NextResponse.json({ error: "لطفا ۲ دقیقه صبر کن و دوباره امتحان کن" }, { status: 429 });
  }

  const code = String(Math.floor(10000 + Math.random() * 90000)); // ۵ رقمی
  await prisma.signupOtp.create({
    data: {
      phone,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  // ارسال واقعی پیامک عمدا await نمی‌شه — کد از قبل توی دیتابیس ذخیره
  // شده، پس صفحه‌ی بعدی (واردکردن کد) فورا قابل استفاده‌ست و کاربر لازم
  // نیست پشت اسپینر منتظر رسیدن درخواست به ملی‌پیامک بمونه. چون این
  // پروژه روی یه Node process همیشه‌روشن (Docker) اجرا می‌شه نه سرورلس،
  // این Promise رهاشده بعد return هم کامل اجرا می‌شه (sendOtpSms هم
  // هیچ‌وقت throw نمی‌کنه، خطاش رو داخلی catch و لاگ می‌کنه).
  void sendOtpSms(phone, code);

  return NextResponse.json({ ok: true });
}
