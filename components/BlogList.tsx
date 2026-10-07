import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { BlogCategoryKey, BlogPost } from "@/lib/blogPosts";
import { BlogCategoryChips } from "./BlogCategoryChips";
import { BlogPostCard } from "./BlogPostCard";
import "./blog.css";

/**
 * فهرست مقاله‌ها برای صفحه‌ی اول بلاگ و صفحه‌ی هر دسته. جدیدترین مقاله
 * (فقط در صفحه‌ی اول) بزرگ‌تر نشون داده می‌شه. هر کارت یک لینک با متن
 * توصیفی (عنوان مقاله) داره.
 */
export function BlogList({
  posts,
  intro,
  heading,
  category,
  categoryLabel,
}: {
  posts: BlogPost[];
  intro: string;
  heading: string;
  category?: BlogCategoryKey;
  categoryLabel?: string;
}) {
  const featured = category ? undefined : posts[0];
  const rest = featured ? posts.slice(1) : posts;

  return (
    <main className="blog-root blog-index">
      <nav aria-label="مسیر صفحه" className="blog-crumb">
        <Link href="/">آریون</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        {category ? (
          <>
            <Link href="/blog">مقاله‌ها</Link>
            <ChevronLeft size={13} aria-hidden="true" />
            <span aria-current="page">{categoryLabel}</span>
          </>
        ) : (
          <span aria-current="page">مقاله‌ها</span>
        )}
      </nav>

      <header className="blog-hero">
        <h1>{heading}</h1>
        <p>{intro}</p>
      </header>

      <BlogCategoryChips active={category} />

      {featured && <BlogPostCard post={featured} featured />}

      {rest.length > 0 ? (
        <section className="blog-grid" aria-label="فهرست مقاله‌ها">
          {rest.map((p) => (
            <BlogPostCard key={p.slug} post={p} />
          ))}
        </section>
      ) : (
        !featured && <p className="blog-empty">هنوز مقاله‌ای در این دسته نیست.</p>
      )}
    </main>
  );
}
