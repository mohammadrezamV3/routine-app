import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SECTION_COOKIE,
  SECTION_COOKIE_MAX_AGE,
  SECTION_HEADER,
  PATH_HEADER,
  isOwnHost,
  isSectionHostingEnabled,
  resolveEffectiveSection,
  sectionFromHost,
  sectionOrigin,
  sectionToSwitchTo,
  seoLandingOwner,
  type SectionKey,
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

// آیکون اپ هر بخش: فایل‌های آیکون پیش‌فرض سایت (app/icon.png، app/apple-icon.png و مسیرهایی که
// iOS خودش بدون لینک امتحان می‌کنه) با آیکون رنگی یکی از سه بخش جایگزین می‌شن (rewrite، نه
// ریدایرکت). بخش آیکون = بخش میزبان، وگرنه (دامنه‌ی اصلی) بخش موثر؛ آیکون عمومی/بی‌بخش وجود نداره.
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

/** پیش‌واکشی Next/مرورگر (hover روی لینک): نباید بخش کاربر رو عوض کنه */
function isPrefetch(req: NextRequest): boolean {
  const h = req.headers;
  return (
    h.get("next-router-prefetch") === "1" ||
    h.get("x-middleware-prefetch") === "1" ||
    /prefetch/i.test(h.get("purpose") || "") ||
    /prefetch/i.test(h.get("sec-purpose") || "")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const enabled = isSectionHostingEnabled();

  // بخش موثر = کوکی host-only `arion_section` (اگه معتبر) وگرنه بخش میزبان. هر سه بخش روی هر میزبان
  // در دسترسن (PWA از scope بیرون نمی‌افته)؛ دامنه فقط هویت اپ نصب‌شده/سئو رو تعیین می‌کنه.
  // هدر بخش هیچ‌وقت از کلاینت قبول نمی‌شه: همیشه پاک و از روی کوکی/میزبان دوباره ساخته می‌شه.
  const host = requestHost(req);
  const hostSection = sectionFromHost(host);
  let section: SectionKey = resolveEffectiveSection(hostSection, req.cookies.get(SECTION_COOKIE)?.value);
  let switchedTo: SectionKey | null = null;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.nextUrl.protocol.replace(/:$/, "");

  const isRead = req.method === "GET" || req.method === "HEAD";

  if (isRead && !isApi) {
    // آیکون اپ رنگی هر بخش: روی زیردامنه میزبان برنده‌ست (هویت اپ نصب‌شده تابع میزبانه، نه کوکی)،
    // روی دامنه‌ی اصلی بخش موثر (کوکی، وگرنه روتین)
    const iconSize = SECTION_ICON_PATHS[pathname];
    if (iconSize) {
      const url = req.nextUrl.clone();
      url.pathname = `/images/sections/app/${hostSection ?? section}-${iconSize}.png`;
      url.search = "";
      // دامنه‌ی اصلی: آیکون تابع کوکی بخشه، پس کش مرورگر/CDN باید با کوکی کلید بخوره (Vary)
      return NextResponse.rewrite(url, hostSection ? undefined : { headers: { Vary: "Cookie" } });
    }

    // دامنه‌ی اصلی: صفحه‌ی فرود سئو به زیردامنه‌ی صاحبش ۳۰۸ می‌شه (یکی‌شدن سئو). تنها ریدایرکت بین میزبان‌ها.
    if (enabled && !hostSection && isOwnHost(host)) {
      const target = seoLandingOwner(pathname);
      const origin = target ? sectionOrigin(target, currentOrigin(req, host)) : null;
      if (origin) return NextResponse.redirect(new URL(`${pathname}${req.nextUrl.search}`, origin), 308);
    }

    // مسیر مال بخش دیگه‌ست: بدون عوض‌کردن دامنه بخش موثر عوض می‌شه (کوکی روی همین پاسخ ست می‌شه)
    if (!isPrefetch(req)) {
      const target = sectionToSwitchTo(section, pathname);
      if (target) {
        section = target;
        switchedTo = target;
      }
    }
  }

  const forward = () => {
    let res: NextResponse;
    const headers = new Headers(req.headers);
    headers.delete(SECTION_HEADER);
    headers.set(SECTION_HEADER, section);
    // مسیر درخواست برای layout ریشه (مثلا preload لوگوی هدر فقط وقتی هدر رندر می‌شه)؛ همیشه از خود middleware
    headers.set(PATH_HEADER, pathname);
    res = NextResponse.next({ request: { headers } });
    if (switchedTo) {
      res.cookies.set(SECTION_COOKIE, switchedTo, { path: "/", maxAge: SECTION_COOKIE_MAX_AGE, sameSite: "lax", secure: proto === "https" });
    }
    return res;
  };

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
