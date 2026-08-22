import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// نگهبانِ سمتِ سرورِ دسترسیِ ماژول‌ها. تا پیش از این، گیت‌کردنِ ماژول‌های
// پولی فقط سمتِ کلاینت (کامپوننت ModuleGate) انجام می‌شد؛ ولی کلاینت رو
// می‌شه دور زد — کافیه کاربر مستقیم API رو صدا بزنه. این فایل همون منطقِ
// ModuleGate رو سمتِ سرور اجرا می‌کنه تا هیچ روتِ پولی بدون دسترسیِ واقعی
// اجرا نشه. منطق دقیقاً آینه‌ی /api/account و ModuleGate است:
//   سوپریوزر → همیشه مجاز؛
//   وگرنه → باید یک ردیفِ moduleAccess فعال و منقضی‌نشده برای همون ماژول باشه.

export type ModuleGuardResult =
  | { ok: true; userId: string; isSuperAdmin: boolean }
  | { ok: false; response: NextResponse };

/**
 * بررسی می‌کند کاربرِ واردشده به این ماژول دسترسی دارد یا نه.
 * اگر نه، یک NextResponse آماده (۴۰۱ برای مهمان، ۴۰۳ برای نبودِ اشتراک)
 * برمی‌گرداند تا خودِ روت فقط `if (!guard.ok) return guard.response` بزند.
 */
export async function requireModule(module: ModuleKey): Promise<ModuleGuardResult> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  // چون session با JWT ذخیره می‌شه (نه یک ردیفِ قابل‌ابطال سمتِ سرور)، اگه
  // Owner یک کاربر رو بعد از صدورِ توکن مسدود کنه، خودِ توکن هنوز «معتبر»
  // به‌نظر می‌رسه — پس این‌جا صریحاً از دیتابیس چک می‌کنیم تا مسدودشدن واقعاً
  // همون لحظه اثر کنه، نه فقط با انقضای توکن (تا ۳۰ روز بعد).
  const blockedCheck = await prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } });
  if (blockedCheck?.isBlocked) {
    return { ok: false, response: NextResponse.json({ error: "حساب کاربری مسدود شده است" }, { status: 403 }) };
  }

  // سوپریوزر به همه‌چیز دسترسی نامحدود دارد (هم‌راستا با /api/account)
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (isSuperAdmin) {
    return { ok: true, userId, isSuperAdmin: true };
  }

  const access = await prisma.moduleAccess.findUnique({
    where: { userId_module: { userId, module } },
    select: { active: true, expiresAt: true },
  });

  const now = Date.now();
  const hasAccess = !!access && access.active && (!access.expiresAt || access.expiresAt.getTime() > now);
  if (!hasAccess) {
    return {
      ok: false,
      response: NextResponse.json({ error: "این بخش نیاز به اشتراک فعال دارد" }, { status: 403 }),
    };
  }

  return { ok: true, userId, isSuperAdmin: false };
}
