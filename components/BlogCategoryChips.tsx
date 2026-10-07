import Link from "next/link";
import { BLOG_CATEGORIES, BLOG_CATEGORY_KEYS } from "@/lib/blog/categories";
import type { BlogCategoryKey } from "@/lib/blog/types";
import "./blog.css";

/** ردیف چیپ دسته‌ها — لینک ساده به صفحه‌ی هر دسته، نه کنترل تب */
export function BlogCategoryChips({ active }: { active?: BlogCategoryKey }) {
  return (
    <nav aria-label="دسته‌های مقاله" className="blog-chips">
      <Link href="/blog" className="blog-chip" aria-current={!active ? "page" : undefined}>
        همه
      </Link>
      {BLOG_CATEGORY_KEYS.map((k) => (
        <Link key={k} href={`/blog/category/${k}`} className="blog-chip" aria-current={active === k ? "page" : undefined}>
          {BLOG_CATEGORIES[k].label}
        </Link>
      ))}
    </nav>
  );
}
