import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createDeviceSession, newSessionId } from "@/lib/deviceSessions";

// نشستِ وبِ کوتاه‌عمر برای ادامه‌ی خرید در مرورگرِ سیستم (بعد از مصرفِ
// توکنِ یک‌بارمصرفِ checkout).
//
// چرا لازمه: برگشتِ درگاه به /api/subscription/verify ِ وب می‌رسه که کاربر رو
// فقط از کوکیِ نشستِ next-auth می‌شناسه — و ما عمدا اون مسیر رو دست نمی‌زنیم
// (تنها مسیرِ اعطای ماژول). پس مرورگر باید یک نشستِ وبِ واقعی داشته باشه.
//
// محدودیت‌ها:
//   • عمرِ ۳۰ دقیقه (هم exp ِ JWT، هم expiresAt ِ ردیفِ Session) — برای
//     پرداخت کافیه، برای «ورودِ دائمی» نه.
//   • ردیفِ Session با provider «mobile-checkout» ساخته می‌شه: توی «دستگاه‌های
//     فعال» دیده می‌شه و قابلِ ابطاله؛ «خروج از بقیه‌ی دستگاه‌ها» هم می‌کُشدش.
//   • فقط بعد از مصرفِ اتمیکِ توکنی ساخته می‌شه که یک نشستِ موبایلِ زنده
//     (که خودش از رمز/۲FA رد شده) در ۱۰ دقیقه‌ی اخیر صادر کرده.
//   • payload همون شکلِ jwt callback ِ lib/auth.ts است (userId/name/market/
//     isSuperAdmin/sid)، مقادیر از دیتابیس.
export const CHECKOUT_WEB_SESSION_TTL_SECONDS = 30 * 60;
export const CHECKOUT_SESSION_PROVIDER = "mobile-checkout";

export function sessionCookieName(): string {
  return authOptions.useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

export async function createCheckoutWebSession(
  userId: string,
  meta: { ip: string | null; userAgent: string | null }
): Promise<{ cookieName: string; value: string; maxAge: number; secure: boolean } | null> {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, market: true, isSuperAdmin: true, isBlocked: true, deletedAt: true },
  });
  if (!user || user.isBlocked || user.deletedAt) return null;

  const exp = Math.floor(Date.now() / 1000) + CHECKOUT_WEB_SESSION_TTL_SECONDS;
  const sid = newSessionId();
  await createDeviceSession({
    userId: user.id,
    sid,
    provider: CHECKOUT_SESSION_PROVIDER,
    ip: meta.ip,
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 400) : null,
    expiresAt: new Date(exp * 1000),
  });

  const value = await encode({
    token: { sub: user.id, name: user.name, email: user.email, userId: user.id, market: user.market, isSuperAdmin: user.isSuperAdmin, sid, exp },
    secret,
    maxAge: CHECKOUT_WEB_SESSION_TTL_SECONDS,
  });
  return { cookieName: sessionCookieName(), value, maxAge: CHECKOUT_WEB_SESSION_TTL_SECONDS, secure: !!authOptions.useSecureCookies };
}
