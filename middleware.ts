import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── دفاعِ سرور-محورِ CSRF: بررسیِ Origin روی درخواست‌های تغییردهنده ──────────
//
// چرا لازم است در حالی که کوکیِ نشست SameSite=Lax دارد: SameSite را «مرورگر»
// اجرا می‌کند، نه سرورِ ما. مرورگرِ قدیمی، یک کلاینتِ غیرمرورگری، یا یک
// مهاجمِ same-site (مثلاً تزریقِ HTML روی یک زیردامنه) می‌توانند دورش بزنند.
// این چک یک لایه‌ی دومِ سرور-محور است.
//
// منطق: فقط روی متدهای تغییردهنده. اگر هدرِ Origin *حاضر* بود و با میزبانِ
// خودمان یکی نبود → رد. مرورگر روی هر درخواستِ cross-origin از نوعِ
// POST/PUT/PATCH/DELETE همیشه Origin می‌فرستد، پس حمله‌ی cross-site گرفته
// می‌شود. نبودِ Origin (کلاینتِ سرور-به-سرور: کران، EA متاتریدر) رد نمی‌شود،
// چون آن مسیرها با سکرت/توکنِ خودشان محافظت می‌شوند و اصلاً از مرورگر
// فراخوانی نمی‌شوند.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// مسیرهایی که یا محافظتِ CSRFِ خودشان را دارند (next-auth) یا کلاینتشان
// مرورگر نیست و Origin ندارند (کران، EA، وب‌پوش).
const EXEMPT_PREFIXES = ["/api/auth/", "/api/cron/", "/api/mt/", "/api/push/"];

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const origin = req.headers.get("origin");
  // کلاینتِ غیرمرورگری (بدونِ Origin) — با توکن/سکرتِ خودش محافظت می‌شود.
  if (!origin) return NextResponse.next();

  const originHost = hostOf(origin);

  // میزبان‌های مجاز: میزبانِ خودِ درخواست (پشتِ nginx همان دامنه‌ی واقعی است)
  // به‌علاوه‌ی هرچه در env تنظیم شده.
  const allowed = new Set<string>();
  const reqHost = req.headers.get("host");
  if (reqHost) allowed.add(reqHost);
  for (const envUrl of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    const h = hostOf(envUrl);
    if (h) allowed.add(h);
  }

  if (originHost && allowed.has(originHost)) return NextResponse.next();

  return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
}

export const config = {
  // فقط روی مسیرهای API اجرا شود (نه صفحات/asset‌ها).
  matcher: ["/api/:path*"],
};
