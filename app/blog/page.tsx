import type { Metadata } from "next";
import { BlogList } from "@/components/BlogList";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { sortedPosts } from "@/lib/blogPosts";
import { blogCanonicalUrl, blogIndexCanonical, blogIntro, blogMetadata, filterPostsForSection } from "@/lib/sectionBlog";
import { getHostSection, getSection } from "@/lib/sectionServer";
import { SECTION_META } from "@/lib/sections";
import { breadcrumbJsonLd } from "@/lib/seo";

function titles(section: ReturnType<typeof getSection>) {
  const brand = brandName();
  if (section) {
    const label = SECTION_META[section].label;
    return {
      meta: tr(`مقاله‌های ${BRAND_FA} ${label}`, `${brand} ${label} articles`),
      heading: tr(`مقاله‌های ${BRAND_FA} ${label}`, `${brand} ${label} articles`),
    };
  }
  return {
    meta: tr(`مقاله‌های ${BRAND_FA} درباره روتین، سلامت و ترید`, `${brand} articles on routines, health and trading`),
    heading: tr("مقاله‌های آریون درباره نظم، روتین، سلامت و ترید", `${brand} articles on discipline, routines, health and trading`),
  };
}

export function generateMetadata(): Metadata {
  // متن از بخش موثر؛ canonical و فید از میزبان
  const section = getSection();
  const host = getHostSection();
  return blogMetadata({
    title: titles(section).meta,
    description: blogIntro(section),
    canonical: blogIndexCanonical(host),
    section: host,
  });
}

export default function BlogIndexPage() {
  const section = getSection();
  const posts = filterPostsForSection(sortedPosts(), section);
  const brand = brandName();
  const origin = blogIndexCanonical(getHostSection()).replace(/\/blog$/, "");
  const introText = blogIntro(section);
  const t = titles(section);
  const crumb = (path: string) => `${origin}${path === "/" ? "" : path}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: brand, path: "/" },
      { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
    ].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: crumb(it.path) })),
  };

  // ItemList فهرست مقاله‌ها را توصیف می‌کند — دقیقا همان چیزی که روی صفحه
  // دیده می‌شود، به همان ترتیب. آدرس هر مقاله canonical خودشه.
  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: blogCanonicalUrl(`/blog/${p.slug}`, p.category),
      name: p.title,
    })),
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: section ? t.meta : tr(`مقاله‌های ${BRAND_FA}`, `${brand} articles`),
    description: introText,
    url: blogIndexCanonical(getHostSection()),
    inLanguage: "fa-IR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(section ? [breadcrumb, collectionJsonLd, listJsonLd] : [breadcrumbJsonLd([{ name: brand, path: "/" }, { name: tr("مقاله‌ها", "Articles"), path: "/blog" }]), collectionJsonLd, listJsonLd]) }}
      />
      <BlogList posts={posts} intro={introText} heading={t.heading} section={section} />
    </>
  );
}
