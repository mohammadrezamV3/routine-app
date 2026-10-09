import type { Metadata } from "next";
import { BlogList } from "@/components/BlogList";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { sortedPosts } from "@/lib/blogPosts";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

function intro(): string {
  return tr(
    "راهنماهای کاربردی درباره‌ی روتین روزانه، عادت‌سازی، برنامه‌ریزی، خواب، بدنسازی، کالری و ژورنال " +
      "معاملاتی. هر مقاله به یک سوال مشخص جواب می‌دهد، نه بیشتر.",
    "Practical guides on daily routines, habit building, planning, sleep, workouts, calories and the trading " +
      "journal. Each article answers one specific question, no more.",
  );
}

export function generateMetadata(): Metadata {
  const metadata = pageMetadata({
    title: tr(
      `مقاله‌های ${BRAND_FA} درباره روتین، سلامت و ترید`,
      `${brandName()} articles on routines, health and trading`,
    ),
    description: intro(),
    path: "/blog",
  });
  // feed.xml برای فیدخوان‌ها/خزنده‌ها — pageMetadata فیلد `types` رو نمی‌سازه
  // چون فقط توی همین یک صفحه لازمه، پس جدا merge می‌شه.
  metadata.alternates = { ...metadata.alternates, types: { "application/rss+xml": absoluteUrl("/blog/feed.xml") } };
  return metadata;
}

export default function BlogIndexPage() {
  const posts = sortedPosts();
  const brand = brandName();
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
  ];
  const introText = intro();

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
    name: tr(`مقاله‌های ${BRAND_FA}`, `${brand} articles`),
    description: introText,
    url: absoluteUrl("/blog"),
    inLanguage: "fa-IR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumb), collectionJsonLd, listJsonLd]) }}
      />
      <BlogList
        posts={posts}
        intro={introText}
        heading={tr(
          "مقاله‌های آریون درباره نظم، روتین، سلامت و ترید",
          `${brand} articles on discipline, routines, health and trading`,
        )}
      />
    </>
  );
}
