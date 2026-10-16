import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/BlogArticle";
import { brandName } from "@/lib/brand";
import { localizedBlogCategory } from "@/lib/blog/categories";
import { tr } from "@/lib/i18n";
import { BLOG_POSTS, getPost, postWordCount } from "@/lib/blogPosts";
import { blogCanonicalUrl, blogMetadata, blogViewSection, hostOrigin } from "@/lib/sectionBlog";
import { getHostSection, getSection } from "@/lib/sectionServer";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";

/**
 * مقاله‌ها ثابت‌اند، پس در زمان build رندر می‌شوند: هم HTML کامل برای
 * کراولر آماده است، هم هیچ رفت‌وبرگشتی به دیتابیس لازم نیست.
 */
export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  // اسلاگ ناموجود در ادامه به notFound می‌رسد؛ این‌جا فقط باید metadata
  // معتبر (و noindex) برگردد تا صفحه‌ی 404 ایندکس نشود.
  if (!post) return { title: { absolute: tr("صفحه پیدا نشد", "Page not found") }, robots: { index: false, follow: false } };
  const meta = blogMetadata({
    title: `${post.metaTitle || post.title} | ${brandName()}`,
    description: post.description,
    canonical: blogCanonicalUrl(`/blog/${post.slug}`, post.category),
    section: getHostSection(),
    ogTitle: post.title,
    ownOgImage: true,
  });
  // pageMetadata نوع openGraph رو website می‌ذاره؛ این‌جا article می‌شه و
  // رفتار ownOgImage (بدون images) دست‌نخورده می‌مونه.
  return {
    ...meta,
    keywords: post.keywords,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated || post.published,
      section: localizedBlogCategory(post.category).label,
    },
  } as Metadata;
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  // مقاله‌ی دسته‌ی بخش دیگه: همین‌جا و با بخش صاحب دسته نمایش داده می‌شه (دامنه عوض نمی‌شه)
  const section = blogViewSection(getSection(), post.category);

  const breadcrumb = [
    { name: brandName(), path: "/" },
    { name: tr("مقاله‌ها", "Articles"), path: "/blog" },
    { name: localizedBlogCategory(post.category).label, path: `/blog/category/${post.category}` },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  const wordCount = postWordCount(post);

  const canonical = blogCanonicalUrl(`/blog/${post.slug}`, post.category);
  const article = {
    ...articleJsonLd({
      title: post.title,
      description: post.description,
      path: `/blog/${post.slug}`,
      published: post.published,
      modified: post.updated,
    }),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    articleSection: localizedBlogCategory(post.category).label,
    ...(post.keywords?.length ? { keywords: post.keywords.join("، ") } : {}),
    wordCount,
  };
  const origin = hostOrigin(getHostSection());
  const sectionBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumb.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${origin}${it.path === "/" ? "" : it.path}` })),
  };
  const ld = [section ? sectionBreadcrumb : breadcrumbJsonLd(breadcrumb), article, ...(post.faq?.length ? [faqJsonLd(post.faq)] : [])];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ld),
        }}
      />
      <BlogArticle post={post} section={section} />
    </>
  );
}
