// کوکی نشست مشترک بین زیردامنه‌ها (routine./trade./workout.) — قرارداد کامل در docs/sections.md
//
// خالص و بدون import سروری. دو کار:
//  1) دامنه‌ی کوکی نشست/callback-url (sessionCookieDomain) که lib/auth.ts به next-auth می‌ده
//  2) مهاجرت: کاربرهای قدیمی یک کوکی نشست host-only روی دامنه‌ی اصلی دارن. بعد از دیپلوی، همون
//     اسم با Domain=.base دوباره ست می‌شه و مرورگر *هر دو* رو نگه می‌داره (هویتشون فرق داره) و
//     ترتیب ارسالشون تضمینی نیست؛ اگه نسخه‌ی قدیمی جلو بیفته یا خروج فقط یکی رو پاک کنه، کاربر
//     «خارج‌نشده» یا «با نشست کهنه» می‌مونه. راه‌حل: هر پاسخ next-auth که کوکی نشست با Domain
//     می‌ذاره یا پاک می‌کنه، همون لحظه نسخه‌ی host-only هم‌اسمش رو منقضی می‌کنه
//     (app/api/auth/[...nextauth]/route.ts → withLegacyCookieCleanup).
import { cookieDomainForHost, sectionBaseDomain } from "@/lib/sections";

/**
 * دامنه‌ی کوکی نشست: AUTH_COOKIE_DOMAIN (صریح، مثلا .arionapp.ir)، وگرنه «.<base>» وقتی زیردامنه‌ها
 * روشنن و base دامنه‌ی واقعیه (نه localhost/IP)؛ وگرنه undefined یعنی دقیقا پیش‌فرض‌های next-auth.
 */
export function sessionCookieDomain(): string | undefined {
  const explicit = (process.env.AUTH_COOKIE_DOMAIN || "").trim().toLowerCase();
  if (explicit) return explicit.startsWith(".") ? explicit : `.${explicit}`;
  const base = sectionBaseDomain();
  if (!base) return undefined;
  return cookieDomainForHost(base) ?? undefined;
}

const SESSION_COOKIE_RE = /^(__Secure-)?next-auth\.session-token(\.\d+)?$/;

/**
 * برای هر Set-Cookie نشست که Domain داره (ست‌کردن یا پاک‌کردن)، یک Set-Cookie منقضی‌کننده‌ی
 * نسخه‌ی host-only همون اسم برمی‌گردونه. بقیه‌ی کوکی‌ها (csrf، callback-url، ...) دست‌نخورده.
 */
export function legacyCookieCleanupHeaders(setCookies: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of setCookies) {
    const name = raw.split("=")[0]?.trim() ?? "";
    if (!SESSION_COOKIE_RE.test(name) || seen.has(name)) continue;
    if (!/;\s*domain=/i.test(raw)) continue;
    seen.add(name);
    const secure = name.startsWith("__Secure-") ? "; Secure" : "";
    out.push(`${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${secure}`);
  }
  return out;
}

/** پاسخ next-auth را با پاک‌سازی کوکی قدیمی host-only کامل می‌کند (بدون تغییر وقتی لازم نیست) */
export function withLegacyCookieCleanup(res: Response): Response {
  if (!sessionCookieDomain()) return res;
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const extra = legacyCookieCleanupHeaders(list);
  if (!extra.length) return res;
  try {
    for (const c of extra) res.headers.append("Set-Cookie", c);
    return res;
  } catch {
    const headers = new Headers(res.headers);
    for (const c of extra) headers.append("Set-Cookie", c);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
}
