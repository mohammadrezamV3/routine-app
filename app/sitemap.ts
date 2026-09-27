import type { MetadataRoute } from "next";
import { sortedPosts } from "@/lib/blogPosts";
import { ALL_QA } from "@/lib/qa";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

// فقط URLهای عمومی و کانونیکال — نه صفحات خصوصی/داشبورد (اون‌ها توی
// robots.ts هم disallow شدن)، نه چک‌اوت (صفحه‌ی تراکنشی، نه محتوایی)، نه
// /subscription (پشت AuthGate‌ـه؛ جدول پلن‌های عمومی همینجا، توی خود
// صفحه‌ی اصلیه)، نه هیچ مسیر تکراری/موقتی.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    // صفحه‌ی دسته‌ی روتین — مقصد اصلیِ جست‌وجوی «روتین اپ»/«برنامه روتین روزانه»
    { url: absoluteUrl("/routine"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/habit-tracker"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/daily-planner"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/trading-journal"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/bodybuilding-program"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/calorie-counter"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/ai-planner"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/economic-calendar"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/forex-sessions"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/learning-roadmap"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/weekly-planner"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/todo-list"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/sleep-tracker"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/workout-tracker"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/trading-checklist"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/metatrader-journal"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/prop-firm-journal"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/habit-streak"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/persian-calendar-planner"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/q"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // lastModified مقاله‌ها از تاریخ واقعیِ خودشان می‌آید، نه `now` — تاریخِ
  // همیشه-امروز به گوگل سیگنالِ دروغِ «تازه به‌روز شد» می‌دهد و بعد از
  // چند بار، اعتبار کلِ sitemap را پایین می‌آورد.
  const posts: MetadataRoute.Sitemap = sortedPosts().map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.updated || p.published),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  // هر پرسشِ مرکزِ پرسش و پاسخ یک URL جدا — همان صفحه‌ای که برای جست‌وجوی
  // همان سوال (در گوگل یا یک دستیارِ AI) باید پیدا شود.
  const qa: MetadataRoute.Sitemap = ALL_QA.map((q) => ({
    url: absoluteUrl(`/q/${q.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...posts, ...qa];
}
