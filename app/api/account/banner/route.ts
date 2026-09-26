import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// بنرِ بالای پروفایل — دقیقا هم‌الگویِ /api/account/avatar: data URL توی
// همون ردیفِ User. سقفش بزرگ‌تره چون تصویر پهنه (۱۰۲۴×۳۲۰)، ولی باز هم
// سمت کلاینت فشرده می‌شه و این فقط یه محافظِ اضافه‌ست.
const MAX_DATA_URL_LENGTH = 700_000;

export async function GET() {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { bannerUrl: true } });
  return NextResponse.json({ bannerUrl: user?.bannerUrl ?? null });
}

export async function PATCH(req: NextRequest) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!auth!.isSuperAdmin && !(await checkRateLimit(`banner-change:${userId}`, 10, 60 * 60 * 1000))) {
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

  await prisma.user.update({ where: { id: userId }, data: { bannerUrl: dataUrl } });
  return NextResponse.json({ ok: true, bannerUrl: dataUrl });
}

export async function DELETE() {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: userId }, data: { bannerUrl: null } });
  return NextResponse.json({ ok: true });
}
