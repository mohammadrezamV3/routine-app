import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// عکس پروفایل به‌جای آپلود فایل روی یه استوریج ابری (که هنوز راه‌اندازی
// نشده)، به‌شکل data URL مستقیم توی همون فیلد avatarUrl ذخیره می‌شه — چون
// سمت کلاینت قبل از ارسال با canvas به ۲۵۶×۲۵۶ فشرده می‌شه، حجمش خیلی از
// سقف زیر (که فقط یه محافظ اضافه‌ست) کمتره.
const MAX_DATA_URL_LENGTH = 400_000;

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  return NextResponse.json({ avatarUrl: user?.avatarUrl ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(session!.user as any).isSuperAdmin && !(await checkRateLimit(`avatar-change:${userId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const dataUrl = String(body?.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "فایل معتبر نیست" }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "حجم عکس زیاد است" }, { status: 413 });
  }

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: dataUrl } });
  return NextResponse.json({ ok: true, avatarUrl: dataUrl });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  return NextResponse.json({ ok: true });
}
