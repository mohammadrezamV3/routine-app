import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";

// رودمپ و نوت‌پد فعلا کاملا غیرفعالن برای همه به‌جز سوپریوزر — نه یه
// ماژول خریدنی مثل بقیه (requireModule)، بلکه یه قفل کامل سطح کد که به
// وضعیت ModuleAccess/Plan توی دیتابیس اصلا کاری نداره. همون الگوی
// ModuleGuardResult رو تکرار می‌کنه تا با requireModule یکدست بمونه.
export type SuperAdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireSuperAdmin(req?: Request): Promise<SuperAdminGuardResult> {
  // کوکیِ وب یا Bearerِ اپ موبایل (lib/requestAuth.ts)
  const auth = await getRequestUser(req);
  const userId = auth?.userId;
  if (!auth || !userId) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!auth.isSuperAdmin) {
    return { ok: false, response: NextResponse.json({ error: "این بخش موقتا غیرفعال است" }, { status: 403 }) };
  }
  const blockedCheck = await prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } });
  if (blockedCheck?.isBlocked) {
    return { ok: false, response: NextResponse.json({ error: "حساب کاربری مسدود شده است" }, { status: 403 }) };
  }
  return { ok: true, userId };
}
