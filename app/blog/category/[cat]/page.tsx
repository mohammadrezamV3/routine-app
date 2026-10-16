import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogList } from "@/components/BlogList";
import { BLOG_CATEGORY_KEYS, isBlogCategory, localizedBlogCategory } from "@/lib/blog/categories";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { postsInCategory } from "@/lib/blogPosts";
import { blogCanonicalUrl, blogMetadata, blogViewSection, filterPostsForSection, hostOrigin } from "@/lib/sectionBlog";
import { getHostSection, getSection } from "@/lib/sectionServer";
import { breadcrumbJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return BLOG_CATEGORY_KEYS.map((cat) => ({ cat }));
}

export function generateMetadata({ params }: { params: { cat: string } }): Metadata {
  if (!isBlogCategory(params.cat)) return { title: { absolute: tr("صفحه پیدا نشد", "Page not found") }, robots: { index: false, follow: false } };
  const cat = localizedBlogCategory(params.cat);
  return blogMetadata({
    title: `${cat.title} | ${brandName()}`,
    description: cat.intro,
    canonical: blogCanonicalUrl(`/blog/category/${params.cat}`, params.cat),
    section: getHostSection(),
    ogTitle: cat.title,
    ownOgImage: true,
  });
}

export default function BlogCategoryPage({ params }: { params: { cat: string } }) {
  if (!isBlogCategory(params.cat)) notFound();
  const key = params.cat;
  // دسته‌ی بخش دیگه: همین‌جا و با بخش صاحب دسته نمایش داده می‌شه (دامنه عوض نمی‌شه)
  const section = blogViewSection(getSection(), key);
  const cat = localizedBlogCategory(key);
  const posts = filterPostsForSection(postsInCategory(key), section);
  const path = `/blog/category/${key}`;

  const origin = hostOrigin(getHostSection());
  const jsonLd = [
    section
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { name: brandName(), path: "/" },
            { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
            { name: cat.label, path },
          ].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${origin}${it.path === "/" ? "" : it.path}` })),
        }
      : breadcrumbJsonLd([
          { name: brandName(), path: "/" },
          { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
          { name: cat.label, path },
        ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: cat.title,
      description: cat.intro,
      url: blogCanonicalUrl(path, key),
      inLanguage: "fa-IR",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: blogCanonicalUrl(`/blog/${p.slug}`, p.category),
        name: p.title,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogList posts={posts} intro={cat.intro} heading={cat.title} category={key} categoryLabel={cat.label} section={section} />
    </>
  );
}
