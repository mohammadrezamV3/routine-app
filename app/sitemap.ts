import type { MetadataRoute } from "next";
import { BLOG_CATEGORY_KEYS } from "@/lib/blog/categories";
import { postsInCategory, sortedPosts } from "@/lib/blogPosts";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

// تاریخ ثابت برای صفحه‌های ایستا: تغییر واقعی‌شان با تغییر این ثابت (هنگام
// ویرایش محتوا) اعلام می‌شود. `new Date()` همیشه-امروز به گوگل سیگنال دروغ
// «تازه به‌روز شد» می‌دهد.
const STATIC_LASTMOD = new Date("2026-10-07");

// فقط URLهای عمومی و کانونیکال — نه صفحات خصوصی/داشبورد (اون‌ها توی
// robots.ts هم disallow شدن)، نه چک‌اوت (صفحه‌ی تراکنشی، نه محتوایی)، نه
// /subscription (پشت AuthGate‌ـه؛ جدول پلن‌های عمومی همینجا، توی خود
// صفحه‌ی اصلیه)، نه هیچ مسیر تکراری/موقتی.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: STATIC_LASTMOD, changeFrequency: "weekly", priority: 1 },
    // صفحه‌ی دسته‌ی روتین — مقصد اصلی جست‌وجوی «روتین اپ»/«برنامه روتین روزانه»
    { url: absoluteUrl("/routine"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/habit-tracker"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/daily-planner"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/trading-journal"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/bodybuilding-program"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/calorie-counter"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/ai-planner"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/economic-calendar"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/forex-sessions"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/learning-roadmap"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/faq"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/terms"), lastModified: STATIC_LASTMOD, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms/mentors"), lastModified: STATIC_LASTMOD, changeFrequency: "yearly", priority: 0.3 },
  ];

  // lastModified مقاله‌ها از تاریخ واقعی خودشان می‌آید، نه `now` — تاریخ
  // همیشه-امروز به گوگل سیگنال دروغ «تازه به‌روز شد» می‌دهد و بعد از
  // چند بار، اعتبار کل sitemap را پایین می‌آورد.
  const posts: MetadataRoute.Sitemap = sortedPosts().map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.updated || p.published),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  // صفحه‌ی فهرست بلاگ: تازگی‌اش از جدیدترین مقاله می‌آید (نه امروز)
  const newestPost = sortedPosts()[0];
  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/blog"),
      lastModified: newestPost ? new Date(newestPost.updated || newestPost.published) : STATIC_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // صفحه‌ی هر دسته‌ی بلاگ: تازگی از جدیدترین مقاله‌ی همان دسته
  const categoryPages: MetadataRoute.Sitemap = BLOG_CATEGORY_KEYS.map((key) => {
    const newest = postsInCategory(key)[0];
    return {
      url: absoluteUrl(`/blog/category/${key}`),
      lastModified: newest ? new Date(newest.updated || newest.published) : STATIC_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.5,
    };
  });

  return [...staticPages, ...blogIndex, ...categoryPages, ...posts];
}
