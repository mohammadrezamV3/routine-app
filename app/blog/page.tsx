import { BlogList } from "@/components/BlogList";
import { BRAND_FA } from "@/lib/brand";
import { sortedPosts } from "@/lib/blogPosts";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const INTRO =
  "راهنماهای کاربردی درباره‌ی ساختن روتین روزانه، پیگیری عادت‌ها، برنامه‌ریزی روزانه و ژورنال " +
  "معاملاتی. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.";

export const metadata = pageMetadata({
  title: `مقاله‌های ${BRAND_FA} درباره روتین، عادت و برنامه‌ریزی`,
  description: INTRO,
  path: "/blog",
});

const BREADCRUMB = [
  { name: BRAND_FA, path: "/" },
  { name: "مقاله‌ها", path: "/blog" },
];

export default function BlogIndexPage() {
  const posts = sortedPosts();

  // ItemList فهرست مقاله‌ها را توصیف می‌کند — دقیقا همان چیزی که روی صفحه
  // دیده می‌شود، به همان ترتیب.
  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/blog/${p.slug}`),
      name: p.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), listJsonLd]) }}
      />
      <BlogList posts={posts} intro={INTRO} />
    </>
  );
}
