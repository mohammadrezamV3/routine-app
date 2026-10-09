import Link from "next/link";
import { localizedBlogCategory } from "@/lib/blog/categories";
import { tr } from "@/lib/i18n";
import type { BlogPost } from "@/lib/blogPosts";
import { blogDate } from "./blogFormat";
import "./blog.css";

/** کارت یک مقاله؛ featured برای جدیدترین مقاله‌ی صفحه‌ی اول */
export function BlogPostCard({ post, featured }: { post: BlogPost; featured?: boolean }) {
  const H = featured ? "h2" : "h3";
  return (
    <article className={`blog-card${featured ? " blog-card-featured" : ""}`}>
      <span className="blog-cat">{localizedBlogCategory(post.category).label}</span>
      <H className="blog-card-title">
        <Link href={`/blog/${post.slug}`} className="blog-card-link">{post.title}</Link>
      </H>
      <p className="blog-card-excerpt">{post.excerpt}</p>
      <div className="blog-card-meta">
        <time dateTime={post.updated || post.published}>{blogDate(post.updated || post.published)}</time>
        <span aria-hidden="true">·</span>
        <span>{tr(`${post.readingMinutes} دقیقه مطالعه`, `${post.readingMinutes} min read`)}</span>
      </div>
    </article>
  );
}
