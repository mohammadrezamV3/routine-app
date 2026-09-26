import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// فقط صفحات عمومی بازاریابی/محتوایی قابل کراله؛ همه‌چیز دیگه (داشبورد
// شخصی کاربر، پنل ادمین، فرم‌های auth، API) نباید crawl بشه — چون یا
// داده‌ی خصوصیه یا برای موتور جست‌وجو هیچ ارزشی نداره (و rate limit رو
// هدر می‌ده). این با X-Robots-Tag توی next.config.js هم تقویت می‌شه —
// اینجا جلوی کراول رو می‌گیریم، اونجا حتی اگه یه لینک بیرونی به یکی از
// این مسیرها اشاره کنه هم از ایندکس بیرون می‌مونه.
// خزنده‌های هوش‌مصنوعی که پاسخ‌های ChatGPT/Claude/Perplexity/Gemini/
// Copilot و امثالشون رو تغذیه می‌کنن. عمدا صریح allow می‌شن (نه فقط
// تکیه به قانون `*`) تا اگه فردا قانون `*` سخت‌گیرانه‌تر شد، این‌ها جدا
// بمونن — دیسالووِشون دقیقا همون لیست پایینه، یعنی بخش‌های خصوصی برای
// این‌ها هم بسته می‌مونه.
const AI_CRAWLER_AGENTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "Bingbot",
  "CCBot", "meta-externalagent", "cohere-ai", "YandexBot",
];

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      // هشدارِ واقعی که این‌جا خورده شد: در robots.txt تطابق **پیشوندی**
      // است، نه مسیرِ کامل. یعنی `Disallow: /trade` صفحه‌ی عمومیِ
      // `/trading-journal` را هم بلاک می‌کرد. برای مسیرهایی که یک صفحه‌ی
      // عمومی با همان پیشوند وجود دارد، باید `$` (پایانِ آدرس) گذاشت و
      // زیرمسیرها را جدا با `/` بست. next.config.js این مشکل را ندارد
      // چون آن‌جا `source` تطابقِ کاملِ مسیر است، نه پیشوندی.
      disallow: [
        "/api/",
        "/auth/",
        "/weekly$",
        "/weekly/",
        "/exercise$",
        "/exercise/",
        "/trade$",
        "/trade/",
        "/roadmaps$",
        "/roadmaps/",
        "/account$",
        "/account/",
        "/admin$",
        "/admin/",
        // خود /subscription پشت AuthGate ـه (کاربر مهمان فقط پیام «وارد
        // شو» می‌بینه، نه جدول پلن‌ها) — جدول واقعی پلن‌ها که عمومیه از
        // قبل توی صفحه‌ی اصلی (PlansSection mode="landing") هست، پس این
        // مسیر برای کراولر محتوای بی‌ارزش/تکراری‌ست.
        "/subscription$",
        "/subscription/",
        // صفحه‌ی fallbackِ سرویس‌ورکر — محتوای واقعی نیست، فقط وقتی شبکه
        // نیست نشان داده می‌شود. `noindex` هم روی خودش هست.
        "/offline",
      ],
    },
  ];

  const disallow = rules[0].disallow as string[];
  for (const agent of AI_CRAWLER_AGENTS) {
    rules.push({ userAgent: agent, allow: "/", disallow });
  }

  return { rules, host: SITE_URL, sitemap: `${SITE_URL}/sitemap.xml` };
}
