import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validate";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// POST /api/account/password  { currentPassword, newPassword }
// تغییر رمز عبور خود کاربر از داخل پنل — برخلاف فراموشی رمز (که با OTP
// پیامکی هویت رو تایید می‌کنه)، این‌جا چون کاربر از قبل لاگین‌ه، رمز *فعلی*
// همون تاییدیه‌ست؛ جلوی این رو می‌گیره که یه سشن سرقتی/بازمونده‌ی باز یه
// دستگاه مشترک بتونه بدون دونستن رمز واقعی، رمز رو عوض کنه و صاحب اصلی رو بندازه بیرون.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(`password-change:${userId}`, 5, 60 * 60 * 1000)) || !(await checkRateLimit(`password-change-ip:${ip}`, 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("درخواست‌های زیاد — کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true, username: true, phone: true } });
  if (!user) return NextResponse.json({ error: tr("کاربر پیدا نشد", "User not found") }, { status: 404 });

  if (!user.passwordHash) {
    return NextResponse.json({ error: tr("این حساب با گوگل وارد شده و رمز عبور جداگانه‌ای ندارد", "This account signed in with Google and has no separate password") }, { status: 400 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: tr("رمز عبور فعلی اشتباه است", "The current password is incorrect") }, { status: 401 });
  }

  const userInputs = [user.email, user.username, user.phone].filter((v): v is string => !!v);
  const passwordError = await validatePassword(newPassword, userInputs);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
