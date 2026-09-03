import type { MetadataRoute } from "next";

// آدرس پایه‌ی production — از env می‌خونیم تا هاردکد نباشه (دامنه می‌تونه
// عوض بشه)؛ fallback فقط برای build/dev محلی.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arionapp.ir";

// فقط صفحات عمومی بازاریابی/محتوایی قابل کراله؛ همه‌چیز دیگه (داشبورد
// شخصی کاربر، پنل ادمین، فرم‌های auth، API) نباید crawl بشه — چون یا
// داده‌ی خصوصیه یا برای موتور جست‌وجو هیچ ارزشی نداره (و rate limit رو
// هدر می‌ده). این با X-Robots-Tag توی next.config.js هم تقویت می‌شه —
// اینجا جلوی کراول رو می‌گیریم، اونجا حتی اگه یه لینک بیرونی به یکی از
// این مسیرها اشاره کنه هم از ایندکس بیرون می‌مونه.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/weekly",
        "/exercise",
        "/trade",
        "/roadmaps",
        "/roadmaps/",
        "/account",
        "/account/",
        "/admin",
        "/admin/",
        // خود /subscription پشت AuthGate ـه (کاربر مهمان فقط پیام «وارد
        // شو» می‌بینه، نه جدول پلن‌ها) — جدول واقعی پلن‌ها که عمومیه از
        // قبل توی صفحه‌ی اصلی (PlansSection mode="landing") هست، پس این
        // مسیر برای کراولر محتوای بی‌ارزش/تکراری‌ست.
        "/subscription",
        "/subscription/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
