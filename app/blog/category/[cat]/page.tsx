import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogList } from "@/components/BlogList";
import { BLOG_CATEGORIES, BLOG_CATEGORY_KEYS, isBlogCategory } from "@/lib/blog/categories";
import { BRAND_FA } from "@/lib/brand";
import { postsInCategory } from "@/lib/blogPosts";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return BLOG_CATEGORY_KEYS.map((cat) => ({ cat }));
}

export function generateMetadata({ params }: { params: { cat: string } }): Metadata {
  if (!isBlogCategory(params.cat)) return { title: { absolute: "صفحه پیدا نشد" }, robots: { index: false, follow: false } };
  const cat = BLOG_CATEGORIES[params.cat];
  return pageMetadata({
    title: `${cat.title} | ${BRAND_FA}`,
    description: cat.intro,
    path: `/blog/category/${params.cat}`,
    ogTitle: cat.title,
    ownOgImage: true,
  });
}

export default function BlogCategoryPage({ params }: { params: { cat: string } }) {
  if (!isBlogCategory(params.cat)) notFound();
  const key = params.cat;
  const cat = BLOG_CATEGORIES[key];
  const posts = postsInCategory(key);
  const path = `/blog/category/${key}`;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: BRAND_FA, path: "/" },
      { name: "مقاله‌ها", path: "/blog" },
      { name: cat.label, path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: cat.title,
      description: cat.intro,
      url: absoluteUrl(path),
      inLanguage: "fa-IR",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/blog/${p.slug}`),
        name: p.title,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogList posts={posts} intro={cat.intro} heading={cat.title} category={key} categoryLabel={cat.label} />
    </>
  );
}
