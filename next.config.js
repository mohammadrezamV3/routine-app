/** @type {import('next').NextConfig} */

// هدرهای امنیتی HTTP — فقط روی production اعمال می‌شن. دلیل مهم: حالت
// dev نکست (npm run dev) برای Hot Reload/React Fast Refresh به eval نیاز
// داره؛ اگه همین CSP سخت‌گیرانه روی dev هم اجرا بشه، مرورگر جاوااسکریپت
// اپ رو بلاک می‌کنه و صفحه اصلاً هیدریت نمی‌شه (دقیقاً همون باگ «فقط صفحه
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
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // هدر X-Powered-By: Next.js رو حذف می‌کنه تا استک فنی رو لو نده
  async headers() {
    if (!isProd) return []; // روی dev هیچ هدر امنیتی سخت‌گیرانه‌ای اعمال نمی‌شه
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
