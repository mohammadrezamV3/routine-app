import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validate";
import { sendOtpEmail } from "@/lib/email";
import { generateEmailOtp, hashEmailOtp, EMAIL_OTP_TTL_MS } from "@/lib/emailOtp";

// POST /api/account/email/request  { newEmail }
// قدم اول تغییر ایمیل حساب — کد به newEmail (نه ایمیل فعلی) فرستاده
// می‌شه تا مالکیت ایمیل جدید ثابت بشه؛ بدون این، هرکسی با یه سشن
// سرقتی می‌تونست ایمیل بازیابی حساب رو مستقیم عوض کنه.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const body = await req.json().catch(() => null);
  const rawEmail = body?.newEmail;
  if (typeof rawEmail !== "string" || !isValidEmail(rawEmail.trim())) {
    return NextResponse.json({ error: tr("ایمیل معتبر نیست", "Invalid email address") }, { status: 400 });
  }
  const newEmail = rawEmail.trim().toLowerCase();

  if (!(await checkRateLimit(`email-change-req-user:${userId}`, 3, 60 * 60 * 1000)) || !(await checkRateLimit(`email-change-req-ip:${ip}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json({ error: tr("تعداد درخواست‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن", "Too many requests — try again in a few minutes") }, { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: tr("این ایمیل قبلا برای حساب دیگری ثبت شده", "This email is already registered to another account") }, { status: 409 });
  }

  const code = generateEmailOtp();
  await prisma.emailChangeOtp.create({
    data: {
      userId,
      newEmail,
      codeHash: hashEmailOtp(code),
      expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
    },
  });

  const result = await sendOtpEmail(newEmail, code, "change-email");
  if (!result.ok) {
    return NextResponse.json({ error: tr("ارسال ایمیل با مشکل مواجه شد — بعدا دوباره امتحان کن", "Sending the email failed — try again later") }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
