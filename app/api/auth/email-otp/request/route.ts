import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";
import { sendOtpEmail } from "@/lib/email";
import { generateEmailOtp, hashEmailOtp, EMAIL_OTP_TTL_MS } from "@/lib/emailOtp";

// POST /api/auth/email-otp/request  { email }
// قدم اول ورود بدون رمز — کد رو *بدون چک‌کردن وجود حساب* می‌سازه و
// می‌فرسته (دقیقا مثل الگوی SignupOtp)، تا لحظه‌ی request هیچ‌جوره فاش
// نشه این ایمیل حساب داره یا نه. وجودداشتن حساب فقط بعد اثبات مالکیت
// ایمیل (وارد‌کردن کد درست، توی verify) بررسی می‌شه.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const body = await req.json().catch(() => null);
  const rawEmail = body?.email;

  if (typeof rawEmail !== "string" || !isValidEmail(rawEmail.trim())) {
    return NextResponse.json({ error: tr("ایمیل معتبر نیست", "Invalid email address") }, { status: 400 });
  }
  const email = rawEmail.trim().toLowerCase();

  // ۱ درخواست در ۶۰ ثانیه به‌ازای همین ایمیل (طبق الزام صریح)، به‌علاوه یک
  // سقف سست‌تر IP تا کسی با چرخوندن ایمیل‌های مختلف از سقف per-email فرار نکنه
  if (!(await checkRateLimit(`email-otp-req-email:${email}`, 1, 60 * 1000))) {
    return NextResponse.json({ error: tr("چند لحظه صبر کن و دوباره امتحان کن", "Wait a moment and try again") }, { status: 429 });
  }
  if (!(await checkRateLimit(`email-otp-req-ip:${ip}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json({ error: tr("تعداد درخواست‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن", "Too many requests — try again in a few minutes") }, { status: 429 });
  }

  const code = generateEmailOtp();
  await prisma.emailLoginOtp.create({
    data: {
      email,
      codeHash: hashEmailOtp(code),
      expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
    },
  });

  const result = await sendOtpEmail(email, code);
  if (!result.ok) {
    // این شکست ربطی به وجودداشتن حساب نداره (برای هر ایمیلی یکسان شکست
    // می‌خوره) — پس نشونش‌دادن enumeration نیست، یک خطای واقعی زیرساختیه
    return NextResponse.json({ error: tr("ارسال ایمیل با مشکل مواجه شد — بعدا دوباره امتحان کن", "Sending the email failed — try again later") }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
