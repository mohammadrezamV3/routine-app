import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QAArticle } from "@/components/QAArticle";
import { ALL_QA, QA_CATEGORY_LABELS, answerPlainText, getQA, relatedOf } from "@/lib/qa";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, ORGANIZATION_ID } from "@/lib/seo";

// همه‌ی صفحه‌ها موقعِ build ساخته می‌شوند (استاتیک) — سریع برای کاربر و کراولر.
export function generateStaticParams() {
  return ALL_QA.map((q) => ({ slug: q.slug }));
}
export const dynamicParams = false;

function clip(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const q = getQA(params.slug);
  if (!q) return {};
  const title = q.question.length <= 50 ? `${q.question} | آریون` : clip(q.question, 60);
  return {
    ...pageMetadata({ title, description: clip(q.short, 160), path: `/q/${q.slug}`, ownOgImage: true }),
    keywords: [...q.keywords, ...q.variants].slice(0, 20),
  };
}

export default function QAPage({ params }: { params: { slug: string } }) {
  const q = getQA(params.slug);
  if (!q) notFound();
  const related = relatedOf(q).map((r) => ({ slug: r.slug, question: r.question }));
  const url = absoluteUrl(`/q/${q.slug}`);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      url,
      inLanguage: "fa-IR",
      publisher: { "@id": ORGANIZATION_ID },
      mainEntity: [{
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: answerPlainText(q), url },
      }],
    },
    breadcrumbJsonLd([
      { name: "آریون", path: "/" },
      { name: "پرسش و پاسخ", path: "/q" },
      { name: q.question, path: `/q/${q.slug}` },
    ]),
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <QAArticle qa={q} categoryLabel={QA_CATEGORY_LABELS[q.category]} related={related} />
    </>
  );
}
