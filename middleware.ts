import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SECTION_HEADER,
  isOwnHost,
  isSectionHostingEnabled,
  pathAllowedIn,
  sectionFromHost,
  sectionOrigin,
  sectionsOwningPath,
  seoLandingOwner,
} from "@/lib/sections";

// ─── دفاع سرور-محور CSRF: بررسی Origin روی درخواست‌های تغییردهنده ──────────
//
// چرا لازم است در حالی که کوکی نشست SameSite=Lax دارد: SameSite را «مرورگر»
// اجرا می‌کند، نه سرور ما. مرورگر قدیمی، یک کلاینت غیرمرورگری، یا یک
// مهاجم same-site (مثلا تزریق HTML روی یک زیردامنه) می‌توانند دورش بزنند.
// این چک یک لایه‌ی دوم سرور-محور است.
//
// منطق: فقط روی متدهای تغییردهنده. اگر هدر Origin *حاضر* بود و با میزبان
// خودمان یکی نبود → رد. مرورگر روی هر درخواست cross-origin از نوع
// POST/PUT/PATCH/DELETE همیشه Origin می‌فرستد، پس حمله‌ی cross-site گرفته
// می‌شود. نبود Origin (کلاینت سرور-به-سرور: کران، EA متاتریدر) رد نمی‌شود،
// چون آن مسیرها با سکرت/توکن خودشان محافظت می‌شوند و اصلا از مرورگر
// فراخوانی نمی‌شوند.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// مسیرهایی که یا محافظت CSRF خودشان را دارند (next-auth) یا کلاینتشان
// مرورگر نیست و Origin ندارند (کران، EA، وب‌پوش).
const EXEMPT_PREFIXES = ["/api/auth/", "/api/cron/", "/api/mt/", "/api/push/"];

// آیکون اپ هر بخش: روی زیردامنه‌ی بخش، فایل‌های آیکون پیش‌فرض سایت (app/icon.png،
// app/apple-icon.png و مسیرهایی که iOS خودش بدون لینک امتحان می‌کنه) با آیکون رنگی همون
// بخش جایگزین می‌شن (rewrite، نه ریدایرکت). روی دامنه‌ی اصلی هیچ تغییری نیست.
const SECTION_ICON_PATHS: Record<string, number> = {
  "/icon.png": 256,
  "/apple-icon.png": 180,
  "/apple-touch-icon.png": 180,
  "/apple-touch-icon-precomposed.png": 180,
};

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/** میزبان واقعی درخواست: x-forwarded-host (اولین مقدار) و بعد host. nginx مقدار x-forwarded-host رو خودش ست می‌کنه (deploy/) */
function requestHost(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return (fwd || req.headers.get("host") || req.nextUrl.host || "").toLowerCase();
}

/** origin فعلی با پروتکل و پورت واقعی (پشت پروکسی x-forwarded-proto)، برای ساخت آدرس ریدایرکت */
function currentOrigin(req: NextRequest, host: string): string {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.nextUrl.protocol.replace(/:$/, "") || "https";
  return `${proto}://${host}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const enabled = isSectionHostingEnabled();

  // هدر بخش هیچ‌وقت از کلاینت قبول نمی‌شه: همیشه پاک و از روی میزبان دوباره ساخته می‌شه.
  const host = requestHost(req);
  const section = sectionFromHost(host);
  const hadSpoofed = req.headers.has(SECTION_HEADER);
  const forward = () => {
    if (!section && !hadSpoofed) return NextResponse.next();
    const headers = new Headers(req.headers);
    headers.delete(SECTION_HEADER);
    if (section) headers.set(SECTION_HEADER, section);
    return NextResponse.next({ request: { headers } });
  };

  const isRead = req.method === "GET" || req.method === "HEAD";

  if (enabled && isRead && !isApi) {
    // آیکون اپ رنگی هر بخش (فقط روی زیردامنه‌ی بخش)
    const iconSize = SECTION_ICON_PATHS[pathname];
    if (section && iconSize) {
      const url = req.nextUrl.clone();
      url.pathname = `/images/sections/app/${section}-${iconSize}.png`;
      url.search = "";
      return NextResponse.rewrite(url);
    }

    // ریدایرکت بین میزبان‌ها: ۳۰۸ (متد و مسیر و query حفظ می‌شن). فقط برای میزبان‌های خانواده‌ی ما.
    if (isOwnHost(host)) {
      const cur = currentOrigin(req, host);
      let target: ReturnType<typeof sectionsOwningPath>[number] | null = null;
      if (section) {
        // مسیر مال بخش دیگه‌ست → زیردامنه‌ی صاحبش
        if (!pathAllowedIn(section, pathname)) target = sectionsOwningPath(pathname)[0] ?? null;
      } else {
        // دامنه‌ی اصلی: صفحه‌ی فرود سئو به زیردامنه‌ی صاحبش (یکی‌شدن سئو)
        target = seoLandingOwner(pathname);
      }
      const origin = target ? sectionOrigin(target, cur) : null;
      if (origin) return NextResponse.redirect(new URL(`${pathname}${req.nextUrl.search}`, origin), 308);
    }
  }

  // ─── دفاع CSRF روی API ───
  if (SAFE_METHODS.has(req.method)) return forward();
  if (!isApi) return forward();
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return forward();

  const origin = req.headers.get("origin");
  // کلاینت غیرمرورگری (بدون Origin) — با توکن/سکرت خودش محافظت می‌شود.
  if (!origin) return forward();

  const originHost = hostOf(origin);

  // میزبان‌های مجاز: میزبان خود درخواست (پشت nginx همان دامنه‌ی واقعی است)
  // به‌علاوه‌ی هرچه در env تنظیم شده.
  const allowed = new Set<string>();
  const reqHost = req.headers.get("host");
  if (reqHost) allowed.add(reqHost);
  for (const envUrl of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    const h = hostOf(envUrl);
    if (h) allowed.add(h);
  }

  if (originHost && allowed.has(originHost)) return forward();
  // زیردامنه‌های بخش‌ها (و دامنه‌ی اصلی) همگی یک اپ‌اند؛ فقط وقتی زیردامنه‌ها روشنن.
  if (originHost && isOwnHost(originHost)) return forward();

  return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
}

export const config = {
  // API + همه‌ی صفحه‌ها، به‌جز فایل‌های استاتیک و asset (هر مسیر با پسوند فایل) تا هزینه‌ی هر
  // درخواست کم بمونه. مسیرهای بدون پسوند ولی خاص (مثل manifest.webmanifest) و آیکون‌ها که
  // per-host عوض می‌شن یا از هدر بخش استفاده می‌کنن صریح اضافه شدن.
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sw.js|api/|.*\\..*).*)",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/icon.png",
    "/apple-icon.png",
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
  ],
};
