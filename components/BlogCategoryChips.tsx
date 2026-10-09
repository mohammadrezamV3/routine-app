import Link from "next/link";
import { BLOG_CATEGORY_KEYS, localizedBlogCategory } from "@/lib/blog/categories";
import { tr } from "@/lib/i18n";
import type { BlogCategoryKey } from "@/lib/blog/types";
import "./blog.css";

/** ردیف چیپ دسته‌ها — لینک ساده به صفحه‌ی هر دسته، نه کنترل تب */
export function BlogCategoryChips({ active }: { active?: BlogCategoryKey }) {
  return (
    <nav aria-label={tr("دسته‌های مقاله", "Article categories")} className="blog-chips">
      <Link href="/blog" className="blog-chip" aria-current={!active ? "page" : undefined}>
        {tr("همه", "All")}
      </Link>
      {BLOG_CATEGORY_KEYS.map((k) => (
        <Link key={k} href={`/blog/category/${k}`} className="blog-chip" aria-current={active === k ? "page" : undefined}>
          {localizedBlogCategory(k).label}
        </Link>
      ))}
    </nav>
  );
}
