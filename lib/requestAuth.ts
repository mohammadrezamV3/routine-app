import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMobileAuth } from "@/lib/mobileAuth";

// ─── هویتِ درخواست برای روت‌های «وبِ کاربر»: کوکیِ next-auth یا Bearerِ موبایل ───
//
// اپ اندروید همون روت‌های وب رو صدا می‌زنه (نه یه نسخه‌ی موازی زیرِ
// /api/mobile/*)، ولی با `Authorization: Bearer <access token>` به‌جای کوکی.
// قاعده‌ها:
//   • اگه هدرِ Bearer *حاضر* باشه فقط همون بررسی می‌شه (getMobileAuth) — هیچ
//     fallbackی به کوکی نیست. وگرنه یه درخواستِ cross-origin با یه Bearerِ
//     آشغال + کوکیِ همراه، بدونِ CSRF-check (middleware برای Bearer ردش
//     نمی‌کنه) با هویتِ کوکی اجرا می‌شد.
//   • Bearer: isSuperAdmin/isAdmin/name/market مستقیم از دیتابیس خونده می‌شن
//     (توکنِ موبایل عمدا هیچ ادعایی جز userId/sid نداره). نشستِ باطل‌شده یا
//     کاربرِ مسدود/حذف‌شده → null (یعنی ۴۰۱).
//   • بدونِ Bearer: دقیقا رفتارِ قبلی (getServerSession).
//   • روت‌های ادمین (requireAdmin)، کران، EA متاتریدر و next-auth از این
//     استفاده نمی‌کنن و Bearer رو قبول نمی‌کنن.

export type RequestUser = {
  userId: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  name: string | null;
  market: string | null;
  via: "cookie" | "bearer";
  /** فقط برای Bearer: شناسه‌ی ردیفِ Sessionِ موبایل (برای پرچمِ «همین دستگاه») */
  mobileSessionId?: string;
};

/** هدرِ Authorization از خودِ req، وگرنه از زمینه‌ی درخواستِ Next (بیرون از درخواست → null) */
function authorizationHeader(req?: Request): string | null {
  if (req) return req.headers.get("authorization");
  try {
    return headers().get("authorization");
  } catch {
    return null;
  }
}

/** true وقتی درخواست هدرِ Authorization: Bearer دارد (حتی اگه نامعتبر باشه) */
export function hasBearer(req?: Request): boolean {
  const h = authorizationHeader(req);
  return !!h && /^Bearer\b/i.test(h.trim());
}

export async function getRequestUser(req?: Request): Promise<RequestUser | null> {
  const authz = authorizationHeader(req);
  if (authz && /^Bearer\b/i.test(authz.trim())) {
    // فقط Bearer — نبودِ fallback به کوکی عمدیه (بالا)
    const auth = await getMobileAuth(req ?? new Request("http://internal/", { headers: { authorization: authz } }));
    if (!auth) return null;
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isSuperAdmin: true, adminPermissions: true, isBlocked: true, deletedAt: true, name: true, market: true },
    });
    if (!user || user.isBlocked || user.deletedAt) return null;
    return {
      userId: auth.userId,
      isSuperAdmin: user.isSuperAdmin,
      isAdmin: user.isSuperAdmin || user.adminPermissions.length > 0,
      name: user.name ?? null,
      market: (user.market as string | null) ?? null,
      via: "bearer",
      mobileSessionId: auth.sessionId,
    };
  }

  const session = await getServerSession(authOptions);
  const u = session?.user as any;
  const userId = u?.id as string | undefined;
  if (!userId) return null;
  return {
    userId,
    isSuperAdmin: !!u.isSuperAdmin,
    isAdmin: !!(u.isAdmin ?? u.isSuperAdmin),
    name: (u.name as string | null | undefined) ?? null,
    market: (u.market as string | null | undefined) ?? null,
    via: "cookie",
  };
}
