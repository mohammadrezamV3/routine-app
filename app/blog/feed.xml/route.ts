import { BRAND_FA } from "@/lib/brand";
import { sortedPosts } from "@/lib/blogPosts";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

// RSS 2.0 فارسی برای بلاگ — کاربردش فقط برای فیدخوان‌های آدم نیست:
// بعضی خزنده‌ها و دستیارهای AI هم feed.xml را قبل از خزیدن HTML چک
// می‌کنند تا فهرست تازه‌ترین مقاله‌ها را ارزان‌تر بگیرند. مثل sitemap،
// عمدا مستقیم از `sortedPosts()` ساخته می‌شود تا با محتوای واقعی
// lib/blogPosts.ts هیچ‌وقت واگرا نشود.
export const dynamic = "force-static";
export const revalidate = 86400;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function build(): string {
  const posts = sortedPosts();
  const items = posts
    .map((p) => {
      const url = absoluteUrl(`/blog/${p.slug}`);
      const pubDate = new Date(p.published).toUTCString();
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`;
    })
    .join("\n");

  const lastBuildDate = posts.length > 0 ? new Date(posts[0].updated || posts[0].published).toUTCString() : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>وبلاگ ${BRAND_FA}</title>
    <link>${absoluteUrl("/blog")}</link>
    <atom:link href="${absoluteUrl("/blog/feed.xml")}" rel="self" type="application/rss+xml" />
    <description>راهنماهای کاربردی درباره‌ی روتین روزانه، عادت‌سازی، برنامه‌ریزی و ژورنال معاملاتی در ${BRAND_FA}.</description>
    <language>fa-IR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>${SITE_URL}</generator>
${items}
  </channel>
</rss>`;
}

export async function GET() {
  return new Response(build(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
