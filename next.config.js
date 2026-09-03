/** @type {import('next').NextConfig} */

// هدرهای امنیتی HTTP — فقط روی production اعمال می‌شن. دلیل مهم: حالت
// dev نکست (npm run dev) برای Hot Reload/React Fast Refresh به eval نیاز
// داره؛ اگه همین CSP سخت‌گیرانه روی dev هم اجرا بشه، مرورگر جاوااسکریپت
// اپ رو بلاک می‌کنه و صفحه اصلا هیدریت نمی‌شه (دقیقا همون باگ «فقط صفحه
// اول مثل PDF لود می‌شه» — چون فقط HTML خام سرور می‌مونه، بدون تعامل).
const isProd = process.env.NODE_ENV === "production";

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
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.anthropic.com",
      // چارتِ تریدینگ‌ویو. عمداً فقط `frame-src` باز شده و نه `script-src`:
      // ویجت را به‌شکلِ iframe جاسازی می‌کنیم، نه با اسکریپتِ رسمیِ `tv.js`.
      // تفاوت مهم است — `tv.js` باید داخلِ originِ خودمان اجرا شود و به
      // DOM و کوکی‌ها دسترسی دارد، ولی iframe در originِ تریدینگ‌ویو جدا
      // می‌ماند. یعنی برای همان قابلیت، سطحِ حمله‌ی بسیار کمتری باز می‌کنیم.
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
];

const nextConfig = {
  reactStrictMode: true,
  // instrumentation.ts رو فعال می‌کنه — اون‌جا کانکشن‌پولِ دیتابیس موقعِ بالا
  // آمدنِ سرور گرم می‌شه تا اولین بازدیدکننده‌ی بعد از هر ری‌استارت هزینه‌ی
  // ساختِ کانکشن رو ندهد. (در Next 15 پیش‌فرض شده؛ در 14 هنوز فلگ می‌خواد.)
  experimental: { instrumentationHook: true },
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
};

module.exports = nextConfig;
