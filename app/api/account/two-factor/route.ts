import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// روشن/خاموش‌کردن ورود دومرحله‌ای پیامکی.
//
// شرط روشن‌کردن: شماره‌ی موبایل تأییدشده روی حساب. بدونش، روشن‌کردن ۲FA
// یعنی قفل‌شدن کاربر بیرون حساب خودش — چون هیچ‌جا نمی‌شه کد فرستاد.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const enabled = body?.enabled === true;

  if (enabled) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, phoneVerifiedAt: true } });
    if (!user?.phone) {
      return NextResponse.json({ error: "اول باید شماره موبایلت روی حساب ثبت بشه" }, { status: 400 });
    }
    if (!user.phoneVerifiedAt) {
      return NextResponse.json({ error: "شماره موبایلت هنوز تأیید نشده — بدون شماره‌ی تأییدشده نمی‌شه کد فرستاد" }, { status: 400 });
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: enabled } });
  return NextResponse.json({ ok: true, twoFactorEnabled: enabled });
}
