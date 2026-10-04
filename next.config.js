/** @type {import('next').NextConfig} */

// هدرهای امنیتی HTTP — فقط روی production اعمال می‌شن. دلیل مهم: حالت
// dev نکست (npm run dev) برای Hot Reload/React Fast Refresh به eval نیاز
// داره؛ اگه همین CSP سخت‌گیرانه روی dev هم اجرا بشه، مرورگر جاوااسکریپت
// اپ رو بلاک می‌کنه و صفحه اصلا هیدریت نمی‌شه (دقیقا همون باگ «فقط صفحه
// اول مثل PDF لود می‌شه» — چون فقط HTML خام سرور می‌مونه، بدون تعامل).
const isProd = process.env.NODE_ENV === "production";

// WebSocket realtime (`/ws`، lib/realtimeServer.ts) روی همون origin سرو می‌شه.
// طبق CSP3، `'self'` باید ws/wss همون host رو هم پوشش بده، ولی Safariهای
// قدیمی‌تر این رو اجرا نمی‌کنن — پس host سایت صریحا با wss:// هم اضافه
// می‌شه (نه `wss:` کلی، که اجازه‌ی وصل‌شدن به *هر* سروری رو می‌داد).
// این هدرها موقع build ثابت می‌شن؛ اگه NEXTAUTH_URL/NEXT_PUBLIC_SITE_URL
// اون لحظه در دسترس نباشن، دامنه‌ی اصلی پیش‌فرض (lib/siteUrl.ts) استفاده می‌شه.
function realtimeConnectSources() {
  const hosts = new Set(["arionapp.ir", "www.arionapp.ir"]);
  for (const u of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    try {
      const h = new URL(u).host;
      if (h && !/^(localhost|127\.|0\.0\.0\.0)/.test(h)) {
        hosts.add(h);
        hosts.add(h.startsWith("www.") ? h.slice(4) : `www.${h}`);
      }
    } catch {}
  }
  return Array.from(hosts).map((h) => `wss://${h}`).join(" ");
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // blob: لازمه: کراپ عکس پروفایل/بنر، پیش‌نمایش اسکن غذا و آپلود
      // عکس حرکات با URL.createObjectURL کار می‌کنن و بدونش فقط روی
      // پروداکشن بی‌صدا شکست می‌خوردن («نمی‌تونم عکس پروفایل/بنر بذارم»).
      // blob: فقط به داده‌ای اشاره می‌کنه که خود همین صفحه ساخته.
      "img-src 'self' data: blob: https:",
      // s.tradingview.com فقط برای یک پروب `no-cors` است که می‌سنجد آیا
      // میزبان ویجت اصلا در دسترس هست یا نه (نگاه کن به
      // components/TradingViewChart.tsx). پاسخ خوانده نمی‌شود — همان
      // میزبانی است که از قبل در `frame-src` مجاز بود، پس سطح دسترسی
      // تازه‌ای باز نمی‌شود.
      `connect-src 'self' ${realtimeConnectSources()} https://s.tradingview.com https://api.anthropic.com`,
      // چارت تریدینگ‌ویو. عمدا فقط `frame-src` باز شده و نه `script-src`:
      // ویجت را به‌شکل iframe جاسازی می‌کنیم، نه با اسکریپت رسمی `tv.js`.
      // تفاوت مهم است — `tv.js` باید داخل origin خودمان اجرا شود و به
      // DOM و کوکی‌ها دسترسی دارد، ولی iframe در origin تریدینگ‌ویو جدا
      // می‌ماند. یعنی برای همان قابلیت، سطح حمله‌ی بسیار کمتری باز می‌کنیم.
      "frame-src https://s.tradingview.com https://www.tradingview.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

// این مسیرها یا داده‌ی خصوصی کاربر/ادمینن یا صرفا ابزاری‌ان (فرم‌های
// auth، چک‌اوت) — هیچ‌کدوم نباید توی نتایج جست‌وجو ظاهر بشن. با
// X-Robots-Tag (نه فقط با متاتگ HTML) این تضمین می‌شه چون این هدر حتی
// روی صفحات کلاینت‌ساید‌رندرشده (که نمی‌تونن metadata سرور صادر کنن) هم
// اثر می‌کنه، و مستقل از robots.txt عمل می‌کنه (اگه یه لینک بیرونی هم به
// این مسیرها اشاره کنه، بازم ایندکس نمی‌شن). لیست باید با disallow توی
// app/robots.ts هماهنگ بمونه.
const NOINDEX_PATH_PREFIXES = [
  "/api/:path*",
  "/auth/:path*",
  "/weekly",
  "/weekly/:path*",
  "/exercise",
  "/exercise/:path*",
  "/trade",
  "/trade/:path*",
  "/roadmaps",
  "/roadmaps/:path*",
  "/account",
  "/account/:path*",
  "/admin",
  "/admin/:path*",
  "/notepad",
  "/notepad/:path*",
  // خود /subscription (نه فقط چک‌اوت) پشت AuthGate‌ـه — کاربر مهمان/کراولر
  // فقط پیام «وارد شو» می‌بینه؛ جدول واقعی پلن‌های عمومی از قبل توی صفحه‌ی
  // اصلی (PlansSection mode="landing") هست.
  "/subscription",
  "/subscription/:path*",
  // بخش مربی‌ها/شاگردی و آنالیز هفتگی کاملا پشت لاگین‌اند (API‌شون برای
  // مهمان 401 می‌ده)، پس کراولر فقط یه پوسته‌ی خالی کلاینتی با عنوان
  // عمومی سایت می‌دید — «soft 404»/محتوای تکراری که کیفیت کل سایت رو
  // پیش گوگل پایین می‌آره. /terms/mentors (عمومی) با این‌ها match نمی‌شه.
  "/mentor",
  "/mentor/:path*",
  "/mentors",
  "/mentors/:path*",
  "/mentorship",
  "/mentorship/:path*",
  "/mentor-programs/:path*",
  "/analysis/:path*",
  "/offline",
];

// دامنه‌ی کانونیکال — همونی که lib/seo.ts (SITE_URL) برای canonical/sitemap
// استفاده می‌کنه. نسخه‌ی دیگه‌ی همون دامنه (با/بدون www) با 301 به این
// برمی‌گرده؛ قبلا https://www.arionapp.ir هم مستقیم 200 می‌داد، یعنی گوگل هر
// صفحه رو روی دو هاست جدا (محتوای تکراری) می‌دید.
function canonicalHostRedirects() {
  let host = "arionapp.ir";
  try {
    const h = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://arionapp.ir").host;
    if (h && !/^(localhost|127\.|0\.0\.0\.0)/.test(h) && !h.includes(":")) host = h;
  } catch {}
  const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: alt }],
      destination: `https://${host}/:path*`,
      permanent: true,
    },
  ];
}

const nextConfig = {
  reactStrictMode: true,
  // نسخه‌ی اپ که ته پنل کاربری نشان داده می‌شود. تک‌منبع حقیقت خود
  // package.json است تا هیچ‌وقت با نسخه‌ی واقعی بیلد فرق نکند.
  env: { NEXT_PUBLIC_APP_VERSION: require("./package.json").version },
  // instrumentation.ts رو فعال می‌کنه — اون‌جا کانکشن‌پول دیتابیس موقع بالا
  // آمدن سرور گرم می‌شه تا اولین بازدیدکننده‌ی بعد از هر ری‌استارت هزینه‌ی
  // ساخت کانکشن رو ندهد. (در Next 15 پیش‌فرض شده؛ در 14 هنوز فلگ می‌خواد.)
  //
  // ws/pg (سرور WebSocket `/ws` و LISTEN Postgres، lib/realtimeServer.ts)
  // external می‌مونن: باندل‌شدن ws با webpack افزونه‌های اختیاری
  // bufferutil/utf-8-validate رو خراب می‌کنه، و pg هم require‌های پویا داره.
  // file-tracing خروجی standalone خودش node_modules/ws و pg رو کنار
  // server.js کپی می‌کنه (بعد از build: ls .next/standalone/node_modules/{ws,pg}).
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["ws", "pg"],
    // فایل‌های اکسپرت مدیریت سرمایه با fs خونده می‌شن (نه import)، پس باید صریح توی خروجی standalone بیان
    outputFileTracingIncludes: { "/api/trade/money/ea": ["./ea-src/**"] },
  },
  output: "standalone", // برای ایمیج داکر سبک — فقط فایل‌های لازم اجرا رو کپی می‌کنه، نه کل node_modules
  poweredByHeader: false, // هدر X-Powered-By: Next.js رو حذف می‌کنه تا استک فنی رو لو نده
  async headers() {
    const noindexHeaders = NOINDEX_PATH_PREFIXES.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
    if (!isProd) return noindexHeaders; // روی dev هیچ هدر امنیتی سخت‌گیرانه‌ای اعمال نمی‌شه، ولی noindex بی‌ضرره
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...noindexHeaders,
    ];
  },
  async redirects() {
    return [
      ...canonicalHostRedirects(),
      {
        source: "/report/weekly",
        destination: "/analysis/weekly",
        permanent: true,
      },
      {
        source: "/report/weekly/:path*",
        destination: "/analysis/weekly",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
