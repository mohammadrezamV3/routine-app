import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidUsername } from "@/lib/validate";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { withLiveSync } from "@/lib/realtime";

// PATCH /api/account/username  { username }  → تنظیم/تغییر یوزرنیم خود کاربر.
// اصلی‌ترین کاربردش: کاربرهایی که با گوگل ثبت‌نام کردن اصلا یوزرنیم ندارن
// (فرم ثبت‌نام معمولی می‌گیره، ورود با گوگل نه) — بدون یوزرنیم، هیچ‌وقت با
// فیچر دوستان پیدا نمی‌شن. تطبیق بدون حساسیت به بزرگ/کوچکی حروف، هم‌راستا
// با همون قاعده‌ای که موقع ورود (lib/auth.ts) و جستجوی دوست (api/friends) هست.
async function handlePATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (!isSuperAdmin && (!(await checkRateLimit(`username-change:${userId}`, 5, 60 * 60 * 1000)) || !(await checkRateLimit(`username-change-ip:${ip}`, 10, 60 * 60 * 1000)))) {
    return NextResponse.json({ error: tr("درخواست‌های زیاد — کمی بعد دوباره امتحان کن", "Too many requests — try again shortly") }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "").trim();
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: tr("یوزرنیم باید 3 تا 20 کاراکتر انگلیسی/عدد/آندرلاین باشد", "Username must be 3 to 20 English letters, digits or underscores") }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, id: { not: userId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: tr("این یوزرنیم قبلا گرفته شده", "This username is already taken") }, { status: 409 });
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { username } });
  } catch {
    return NextResponse.json({ error: tr("این یوزرنیم قبلا گرفته شده", "This username is already taken") }, { status: 409 });
  }

  return NextResponse.json({ ok: true, username });
}

// حساب/پروفایل روی بقیه‌ی دستگاه‌های همین کاربر همون لحظه (lib/realtime.ts)
export const PATCH = withLiveSync(["account"], handlePATCH);
