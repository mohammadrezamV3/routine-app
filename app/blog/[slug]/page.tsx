import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/BlogArticle";
import { BRAND_FA } from "@/lib/brand";
import { BLOG_POSTS, getPost } from "@/lib/blogPosts";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/**
 * مقاله‌ها ثابت‌اند، پس در زمان build رندر می‌شوند: هم HTML کامل برای
 * کراولر آماده است، هم هیچ رفت‌وبرگشتی به دیتابیس لازم نیست.
 */
export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  // اسلاگِ ناموجود در ادامه به notFound می‌رسد؛ این‌جا فقط باید metadata
  // معتبر (و noindex) برگردد تا صفحه‌ی ۴۰۴ ایندکس نشود.
  if (!post) return { title: { absolute: "صفحه پیدا نشد" }, robots: { index: false, follow: false } };
  return pageMetadata({
    title: `${post.metaTitle || post.title} | ${BRAND_FA}`,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogTitle: post.title,
  });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const breadcrumb = [
    { name: BRAND_FA, path: "/" },
    { name: "مقاله‌ها", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(breadcrumb),
            articleJsonLd({
              title: post.title,
              description: post.description,
              path: `/blog/${post.slug}`,
              published: post.published,
              modified: post.updated,
            }),
          ]),
        }}
      />
      <BlogArticle post={post} />
    </>
  );
}
