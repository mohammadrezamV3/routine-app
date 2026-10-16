import { BRAND_FA } from "@/lib/brand";
import { sortedPosts } from "@/lib/blogPosts";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { blogCanonicalUrl, blogIndexCanonical, blogIntro, filterPostsForSection, hostOrigin } from "@/lib/sectionBlog";
import { getHostSection } from "@/lib/sectionServer";
import { SECTION_META, isSectionHostingEnabled, type SectionKey } from "@/lib/sections";
import { SITE_URL } from "@/lib/seo";

// RSS 2.0 فارسی برای بلاگ — کاربردش فقط برای فیدخوان‌های آدم نیست:
// بعضی خزنده‌ها و دستیارهای AI هم feed.xml را قبل از خزیدن HTML چک
// می‌کنند تا فهرست تازه‌ترین مقاله‌ها را ارزان‌تر بگیرند. مثل sitemap،
// عمدا مستقیم از `sortedPosts()` ساخته می‌شود تا با محتوای واقعی
// lib/blogPosts.ts هیچ‌وقت واگرا نشود.
// بدون زیردامنه‌ها مثل قبل ایستاست؛ با زیردامنه‌ها (NEXT_PUBLIC_SECTION_BASE_DOMAIN) فید هر میزبان
// فقط مقاله‌های دسته‌های همون بخشه، پس از روی هدر میزبان ساخته می‌شه.
export const revalidate = 86400;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function build(section: SectionKey | null): string {
  const posts = filterPostsForSection(sortedPosts(), section);
  const items = posts
    .map((p) => {
      const url = blogCanonicalUrl(`/blog/${p.slug}`, p.category);
      const pubDate = new Date(p.published).toUTCString();
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(BLOG_CATEGORIES[p.category].label)}</category>
      <description>${escapeXml(p.description)}</description>
    </item>`;
    })
    .join("\n");

  // sortedPosts جدیدترین (به‌روزرسانی یا انتشار) را اول می‌گذارد؛ lastBuildDate از همان
  const lastBuildDate = posts.length > 0 ? new Date(posts[0].updated || posts[0].published).toUTCString() : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>وبلاگ ${BRAND_FA}${section ? ` ${SECTION_META[section].label}` : ""}</title>
    <link>${blogIndexCanonical(section)}</link>
    <atom:link href="${hostOrigin(section)}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>${section ? escapeXml(blogIntro(section)) : `راهنماهای کاربردی درباره‌ی روتین روزانه، عادت‌سازی، برنامه‌ریزی و ژورنال معاملاتی در ${BRAND_FA}.`}</description>
    <language>fa-IR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>${SITE_URL}</generator>
${items}
  </channel>
</rss>`;
}

export async function GET() {
  // بدون زیردامنه‌ها headers() اصلا صدا زده نمی‌شه تا مسیر ایستا بمونه
  const section = isSectionHostingEnabled() ? getHostSection() : null;
  return new Response(build(section), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
