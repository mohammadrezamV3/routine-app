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

// ─── /api/mobile/*: اپ اندروید (Capacitor) ───────────────────────────────
//
// این مسیرها فقط با هدرِ `Authorization: Bearer` احراز می‌شن و هیچ کوکی‌ای
// نمی‌خونن (lib/mobileAuth.ts)؛ صفحه‌ی مخربِ یه سایتِ دیگه نمی‌تونه اون هدر
// رو جعل کنه، پس CSRF معنی نداره و بررسیِ Originِ پایین براشون اجرا نمی‌شه.
// به‌جاش CORS لازم دارن: UIِ اپ از `https://localhost` (اندروید) یا
// `capacitor://localhost` (iOS) لود می‌شه. بدونِ credentials — کوکی هیچ‌وقت
// همراهِ این درخواست‌ها نمی‌ره. Originِ ناشناسِ مرورگری صریحا ۴۰۳ می‌گیره؛
// نبودِ Origin (HTTPِ نیتیوِ Capacitor) مجازه چون باز هم فقط Bearer کار می‌کنه.
const MOBILE_PREFIX = "/api/mobile/";

function mobileAllowedOrigins(): Set<string> {
  const origins = new Set(["https://localhost", "capacitor://localhost"]);
  // سرورِ dev ِ Vite برای توسعه‌ی UIِ اپ توی مرورگر — هرگز در production
  if (process.env.NODE_ENV !== "production") origins.add("http://localhost:5173");
  return origins;
}

function applyMobileCors(res: NextResponse, origin: string | null): NextResponse {
  res.headers.set("Vary", "Origin");
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.headers.set("Access-Control-Max-Age", "600");
  }
  return res;
}

function handleMobile(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin");
  const allowed = !!origin && mobileAllowedOrigins().has(origin);
  // Originِ خودِ سایت (مثلا تست از همون دامنه) هم مثل بقیه‌ی API مجازه، ولی CORS لازم نداره
  const sameHost = !!origin && hostOf(origin) === req.headers.get("host");

  if (req.method === "OPTIONS") {
    return applyMobileCors(new NextResponse(null, { status: allowed ? 204 : 403 }), allowed ? origin : null);
  }
  if (origin && !allowed && !sameHost) {
    return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
  }
  return applyMobileCors(NextResponse.next(), allowed ? origin : null);
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith(MOBILE_PREFIX)) return handleMobile(req);

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
