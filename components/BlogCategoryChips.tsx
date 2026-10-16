import { SmartLink as Link } from "@/components/SmartLink";
import { localizedBlogCategory } from "@/lib/blog/categories";
import { tr } from "@/lib/i18n";
import type { BlogCategoryKey } from "@/lib/blog/types";
import { visibleBlogCategories } from "@/lib/sectionBlog";
import type { SectionKey } from "@/lib/sections";
import "./blog.css";

/** ردیف چیپ دسته‌ها — لینک ساده به صفحه‌ی هر دسته، نه کنترل تب */
export function BlogCategoryChips({ active, section = null }: { active?: BlogCategoryKey; section?: SectionKey | null }) {
  return (
    <nav aria-label={tr("دسته‌های مقاله", "Article categories")} className="blog-chips">
      <Link href="/blog" className="blog-chip" aria-current={!active ? "page" : undefined}>
        {tr("همه", "All")}
      </Link>
      {visibleBlogCategories(section).map((k) => (
        <Link key={k} href={`/blog/category/${k}`} className="blog-chip" aria-current={active === k ? "page" : undefined}>
          {localizedBlogCategory(k).label}
        </Link>
      ))}
    </nav>
  );
}
