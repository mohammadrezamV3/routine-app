import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidUsername } from "@/lib/validate";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// PATCH /api/account/username  { username }  → تنظیم/تغییر یوزرنیم خود کاربر.
// اصلی‌ترین کاربردش: کاربرهایی که با گوگل ثبت‌نام کردن اصلا یوزرنیم ندارن
// (فرم ثبت‌نام معمولی می‌گیره، ورود با گوگل نه) — بدون یوزرنیم، هیچ‌وقت با
// فیچر دوستان پیدا نمی‌شن. تطبیق بدون حساسیت به بزرگ/کوچکی حروف، هم‌راستا
// با همون قاعده‌ای که موقع ورود (lib/auth.ts) و جستجوی دوست (api/friends) هست.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (!isSuperAdmin && (!checkRateLimit(`username-change:${userId}`, 5, 60 * 60 * 1000) || !checkRateLimit(`username-change-ip:${ip}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "").trim();
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "یوزرنیم باید ۳ تا ۲۰ کاراکتر انگلیسی/عدد/آندرلاین باشد" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, id: { not: userId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "این یوزرنیم قبلا گرفته شده" }, { status: 409 });
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { username } });
  } catch {
    return NextResponse.json({ error: "این یوزرنیم قبلا گرفته شده" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, username });
}
