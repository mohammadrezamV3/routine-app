import { BlogList } from "@/components/BlogList";
import { BRAND_FA } from "@/lib/brand";
import { sortedPosts } from "@/lib/blogPosts";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const INTRO =
  "راهنماهای کاربردی درباره‌ی روتین روزانه، عادت‌سازی، برنامه‌ریزی، خواب، بدنسازی، کالری و ژورنال " +
  "معاملاتی. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.";

export const metadata = pageMetadata({
  title: `مقاله‌های ${BRAND_FA} درباره روتین، سلامت و ترید`,
  description: INTRO,
  path: "/blog",
});
// feed.xml برای فیدخوان‌ها/خزنده‌ها — pageMetadata فیلد `types` رو نمی‌سازه
// چون فقط توی همین یک صفحه لازمه، پس جدا merge می‌شه.
metadata.alternates = { ...metadata.alternates, types: { "application/rss+xml": absoluteUrl("/blog/feed.xml") } };

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

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `مقاله‌های ${BRAND_FA}`,
    description: INTRO,
    url: absoluteUrl("/blog"),
    inLanguage: "fa-IR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), collectionJsonLd, listJsonLd]) }}
      />
      <BlogList posts={posts} intro={INTRO} heading="مقاله‌های آریون درباره نظم، روتین، سلامت و ترید" />
    </>
  );
}
