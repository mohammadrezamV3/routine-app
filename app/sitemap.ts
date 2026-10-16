import type { MetadataRoute } from "next";
import { BLOG_CATEGORY_KEYS } from "@/lib/blog/categories";
import { postsInCategory, sortedPosts } from "@/lib/blogPosts";
import { blogCanonicalUrl, blogCategoryOwner, blogIndexCanonical } from "@/lib/sectionBlog";
import { absoluteUrl, sectionHomeUrl, SITE_URL } from "@/lib/seo";
import { getHostSection } from "@/lib/sectionServer";
import { isSectionHostingEnabled, seoLandingOwner } from "@/lib/sections";

// تاریخ ثابت برای صفحه‌های ایستا: تغییر واقعی‌شان با تغییر این ثابت (هنگام
// ویرایش محتوا) اعلام می‌شود. `new Date()` همیشه-امروز به گوگل سیگنال دروغ
// «تازه به‌روز شد» می‌دهد.
const STATIC_LASTMOD = new Date("2026-10-07");

// صفحه‌های فرود سئو (مسیرها با seoLandingOwner در lib/sections.ts یکی بمونن) و اولویتشون
const SECTION_LANDING_ENTRIES: { path: string; priority: number }[] = [
  { path: "/routine", priority: 0.9 },
  { path: "/habit-tracker", priority: 0.8 },
  { path: "/daily-planner", priority: 0.8 },
  { path: "/trading-journal", priority: 0.8 },
  { path: "/bodybuilding-program", priority: 0.8 },
  { path: "/calorie-counter", priority: 0.8 },
  { path: "/ai-planner", priority: 0.8 },
  { path: "/economic-calendar", priority: 0.8 },
  { path: "/forex-sessions", priority: 0.8 },
  { path: "/learning-roadmap", priority: 0.5 },
];

// فقط URLهای عمومی و کانونیکال — نه صفحات خصوصی/داشبورد (اون‌ها توی
// robots.ts هم disallow شدن)، نه چک‌اوت (صفحه‌ی تراکنشی، نه محتوایی)، نه
// /subscription (پشت AuthGate‌ـه؛ جدول پلن‌های عمومی همینجا، توی خود
// صفحه‌ی اصلیه)، نه هیچ مسیر تکراری/موقتی.
export default function sitemap(): MetadataRoute.Sitemap {
  // با زیردامنه‌های بخش‌ها (lib/sections.ts): هر میزبان فقط URLهای خودش رو فهرست می‌کنه — خود صفحه‌ی
  // اصلی بخش + صفحه‌های فرود سئوی همون بخش؛ دامنه‌ی اصلی صفحه‌هایی که حالا مال زیردامنه‌ان رو نمی‌آره
  // (کانونیکالشون به زیردامنه‌ست). بدون NEXT_PUBLIC_SECTION_BASE_DOMAIN دقیقا مثل قبل.
  const section = isSectionHostingEnabled() ? getHostSection() : null; // بدون زیردامنه‌ها headers() صدا زده نمی‌شه و مسیر ایستا می‌مونه
  if (section) {
    const landings: MetadataRoute.Sitemap = SECTION_LANDING_ENTRIES
      .filter((e) => seoLandingOwner(e.path) === section)
      .map((e) => ({ url: absoluteUrl(e.path), lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: e.priority }));
    // بلاگ: صفحه‌ی فهرست میزبان + دسته‌ها و مقاله‌هایی که canonicalشون همین میزبانه (دسته‌ی مشترک
    // مثل «خواب» فقط در سایت‌مپ بخش صاحبش میاد، نه دوبار)
    const owned = (cat: (typeof BLOG_CATEGORY_KEYS)[number]) => blogCategoryOwner(cat) === section;
    const sectionPosts = sortedPosts().filter((p) => owned(p.category));
    const newest = sectionPosts[0];
    const blogEntries: MetadataRoute.Sitemap = [
      {
        url: blogIndexCanonical(section),
        lastModified: newest ? new Date(newest.updated || newest.published) : STATIC_LASTMOD,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...BLOG_CATEGORY_KEYS.filter(owned).map((key) => {
        const top = postsInCategory(key)[0];
        return {
          url: blogCanonicalUrl(`/blog/category/${key}`, key),
          lastModified: top ? new Date(top.updated || top.published) : STATIC_LASTMOD,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        };
      }),
      ...sectionPosts.map((p) => ({
        url: blogCanonicalUrl(`/blog/${p.slug}`, p.category),
        lastModified: new Date(p.updated || p.published),
        changeFrequency: "yearly" as const,
        priority: 0.6,
      })),
    ];
    return [
      { url: sectionHomeUrl(section), lastModified: STATIC_LASTMOD, changeFrequency: "weekly", priority: 1 },
      ...landings,
      { url: `${sectionHomeUrl(section)}/about`, lastModified: STATIC_LASTMOD, changeFrequency: "monthly", priority: 0.6 },
      ...blogEntries,
    ];
  }

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
  const hosting = isSectionHostingEnabled();
  const posts: MetadataRoute.Sitemap = hosting ? [] : sortedPosts().map((p) => ({
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
  const categoryPages: MetadataRoute.Sitemap = hosting ? [] : BLOG_CATEGORY_KEYS.map((key) => {
    const newest = postsInCategory(key)[0];
    return {
      url: absoluteUrl(`/blog/category/${key}`),
      lastModified: newest ? new Date(newest.updated || newest.published) : STATIC_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.5,
    };
  });

  const apexStatic = isSectionHostingEnabled()
    ? staticPages.filter((p) => !SECTION_LANDING_ENTRIES.some((e) => absoluteUrl(e.path) === p.url && seoLandingOwner(e.path)))
    : staticPages;

  return [...apexStatic, ...blogIndex, ...categoryPages, ...posts];
}
