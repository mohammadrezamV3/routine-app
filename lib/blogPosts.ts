import { HEALTH_POSTS } from "./blog/posts/health";
import { ROUTINE_POSTS } from "./blog/posts/routine";
import { TRADING_POSTS } from "./blog/posts/trading";
import type { BlogCategoryKey, BlogPost } from "./blog/types";

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

export const BLOG_POSTS: BlogPost[] = [...ROUTINE_POSTS, ...HEALTH_POSTS, ...TRADING_POSTS];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** جدیدترین اول — برای فهرست بلاگ و sitemap */
export function sortedPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (b.updated || b.published).localeCompare(a.updated || a.published) || b.published.localeCompare(a.published));
}

export function postsInCategory(cat: BlogCategoryKey): BlogPost[] {
  return sortedPosts().filter((p) => p.category === cat);
}

/** مقاله‌های مرتبط: اول هم‌دسته، بعد بقیه — خود مقاله هیچ‌وقت */
export function relatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const others = sortedPosts().filter((p) => p.slug !== post.slug);
  return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, limit);
}
