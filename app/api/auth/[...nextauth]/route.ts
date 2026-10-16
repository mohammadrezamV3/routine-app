import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withLegacyCookieCleanup } from "@/lib/authCookies";

const nextAuth = NextAuth(authOptions);

// کوکی نشست حالا مشترک بین زیردامنه‌هاست (Domain=.base)؛ هر پاسخی که اون رو ست یا پاک می‌کنه،
// نسخه‌ی قدیمی host-only هم‌اسمش رو هم منقضی می‌کنه تا خروج واقعا از همه‌جا باشه و نشست کهنه
// جلوتر از نشست تازه ارسال نشه (lib/authCookies.ts). بدون دامنه‌ی مشترک هیچ تغییری نمی‌کنه.
async function handler(req: Request, ctx: unknown) {
  const res = await (nextAuth as unknown as (req: Request, ctx: unknown) => Promise<Response>)(req, ctx);
  return withLegacyCookieCleanup(res);
}

export { handler as GET, handler as POST };
