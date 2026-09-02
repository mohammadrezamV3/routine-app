import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { issueTwoFactorOtp } from "@/lib/twoFactor";
import { sendOtpSms } from "@/lib/sms";

// POST /api/auth/2fa/start { identifier, password }
//
// مرحله‌ی اول ورود وقتی دومرحله‌ای روشنه: رمز این‌جا بررسی می‌شه و اگه درست
// بود یک کد پیامکی می‌ره. نشستی این‌جا صادر نمی‌شه — صدور نشست فقط از
// provider «sms-2fa» توی lib/auth.ts انجام می‌شه که خودش کد رو دوباره از
// صفر اعتبارسنجی می‌کنه.
//
// پاسخ عمدا بین «رمز غلط» و «کاربر وجود نداره» فرق نمی‌ذاره (همون قرارداد
// ضد user-enumeration بقیه‌ی اپ): هر دو حالت `{ required: false }` برمی‌گردونن
// تا فرانت مسیر عادی ورود رو ادامه بده و همون‌جا خطای عمومی بگیره.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers as any);
  if (!checkRateLimit(`2fa-start-ip:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password) return NextResponse.json({ required: false });

  if (!checkRateLimit(`2fa-start-id:${identifier}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { phone: identifier },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: { id: true, phone: true, passwordHash: true, isBlocked: true, twoFactorEnabled: true },
  });

  if (!user || !user.passwordHash || user.isBlocked || !user.twoFactorEnabled || !user.phone) {
    return NextResponse.json({ required: false });
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ required: false });
  }

  const code = await issueTwoFactorOtp(user.id);
  const sent = await sendOtpSms(user.phone, code);
  if (!sent.ok) {
    return NextResponse.json({ error: "ارسال پیامک ناموفق بود — کمی بعد دوباره امتحان کن" }, { status: 502 });
  }

  // فقط چهار رقم آخر شماره نشون داده می‌شه، نه کل شماره
  return NextResponse.json({ required: true, phoneHint: user.phone.slice(-4), simulated: sent.simulated });
}
