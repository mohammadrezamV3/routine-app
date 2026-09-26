import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";

// روشن/خاموش‌کردن ورود دومرحله‌ای پیامکی.
//
// شرط روشن‌کردن: شماره‌ی موبایل تأییدشده روی حساب. بدونش، روشن‌کردن ۲FA
// یعنی قفل‌شدن کاربر بیرون حساب خودش — چون هیچ‌جا نمی‌شه کد فرستاد.
export async function PATCH(req: NextRequest) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
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
