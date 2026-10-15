import { HEALTH_POSTS } from "./blog/posts/health";
import { ROUTINE_POSTS } from "./blog/posts/routine";
import { TRADING_POSTS } from "./blog/posts/trading";
import type { BlogCategoryKey, BlogPost } from "./blog/types";
import { HEALTH_POSTS_EN } from "./blog/posts/en/health";
import { ROUTINE_POSTS_EN } from "./blog/posts/en/routine";
import { TRADING_POSTS_EN } from "./blog/posts/en/trading";
import { isEn } from "./i18n";

/**
 * محتوای بلاگ، به‌صورت داده‌ی تایپ‌دار در همین ریپو (lib/blog/posts/*).
 *
 * چرا CMS نیست: افزودن یک CMS (یا حتی MDX و وابستگی‌های پارسرش) برای چند
 * ده مقاله، هم یک سرویس/وابستگی تازه به استک اضافه می‌کند هم یک مسیر رندر
 * جدید. این ساختار همان چیزی را می‌دهد که سئو لازم دارد (HTML رندرشده‌ی
 * سمت سرور، متادیتای یکتا، کانونیکال، Article/FAQ schema).
 *
 * قانون محتوا: هر مقاله باید به سوال واقعی کاربر کامل جواب بدهد. هیچ ادعای
 * اثبات‌نشدنی («بهترین»، آمار ساختگی، وعده‌ی نتیجه) در متن‌ها نوشته نمی‌شود.
 */

export type { BlogBlock, BlogCategoryKey, BlogFaq, BlogPost } from "./blog/types";

/** تعداد کلمه‌ی متن واقعی مقاله (بدنه + پرسش‌ها) — برای wordCount schema و زمان مطالعه */
export function postWordCount(post: BlogPost): number {
  const parts: string[] = [];
  for (const b of post.blocks) {
    if (b.type === "ul" || b.type === "ol") parts.push(...b.items);
    else if (b.type === "table") parts.push(...b.head, ...b.rows.flat());
    else if (b.type === "tip") parts.push(b.title || "", b.text);
    else parts.push(b.text);
  }
  for (const f of post.faq || []) parts.push(f.q, f.a);
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

// زمان مطالعه از روی متن واقعی حساب می‌شه (حدود 200 کلمه در دقیقه)، نه عدد
// دستی که با هر بازنویسی از متن جا بمونه.
export const BLOG_POSTS: BlogPost[] = [...ROUTINE_POSTS, ...HEALTH_POSTS, ...TRADING_POSTS].map((p) => ({
  ...p,
  readingMinutes: Math.max(1, Math.round(postWordCount(p) / 200)),
}));

// نسخه‌ی انگلیسی (lib/blog/posts/en/*) — فقط مقاله‌هایی که ترجمه دارن؛ بقیه فارسی می‌مونن
const POSTS_EN = { ...ROUTINE_POSTS_EN, ...HEALTH_POSTS_EN, ...TRADING_POSTS_EN };
const BLOG_POSTS_EN: BlogPost[] = BLOG_POSTS.map((p) => {
  const en = POSTS_EN[p.slug];
  if (!en) return p;
  const merged: BlogPost = { ...p, ...en };
  return { ...merged, readingMinutes: Math.max(1, Math.round(postWordCount(merged) / 200)) };
});

/** مقاله‌ها به زبان جاری (برای نمایش؛ BLOG_POSTS همیشه فارسیه) */
export function localizedPosts(): BlogPost[] {
  return isEn() ? BLOG_POSTS_EN : BLOG_POSTS;
}

/** آیا این مقاله در زبان جاری محتوای ترجمه‌شده داره (برای lang/dir بدنه) */
export function postHasCurrentLocale(slug: string): boolean {
  return !isEn() || !!POSTS_EN[slug];
}

export function getPost(slug: string): BlogPost | undefined {
  return localizedPosts().find((p) => p.slug === slug);
}

/** جدیدترین اول — برای فهرست بلاگ و sitemap */
export function sortedPosts(): BlogPost[] {
  return [...localizedPosts()].sort((a, b) => (b.updated || b.published).localeCompare(a.updated || a.published) || b.published.localeCompare(a.published));
}

export function postsInCategory(cat: BlogCategoryKey): BlogPost[] {
  return sortedPosts().filter((p) => p.category === cat);
}

/** مقاله‌های مرتبط: اول هم‌دسته، بعد بقیه — خود مقاله هیچ‌وقت */
export function relatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const others = sortedPosts().filter((p) => p.slug !== post.slug);
  return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, limit);
}
