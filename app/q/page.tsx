import { QAHub } from "@/components/QAHub";
import { ALL_QA, qaByCategory } from "@/lib/qa";
import { breadcrumbJsonLd, pageMetadata, absoluteUrl } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "پرسش و پاسخ روتین، عادت، ترید، بدنسازی و تغذیه | آریون",
  description: "جواب کامل و مستقیم به رایج‌ترین سوال‌ها درباره‌ی روتین روزانه، ترک عادت، برنامه‌ریزی، خواب، ژورنال ترید، فارکس، بدنسازی و کالری — در آریون.",
  path: "/q",
});

export default function QAHubPage() {
  const groups = qaByCategory().map((g) => ({
    category: g.category,
    label: g.label,
    items: g.items.map((q) => ({ slug: q.slug, question: q.question, short: q.short, variants: q.variants })),
  }));
  // FAQPage فقط با سوال و جوابِ کوتاه — دقیقا همان چیزی که روی این صفحه دیده می‌شود
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_QA.map((q) => ({
      "@type": "Question",
      name: q.question,
      url: absoluteUrl(`/q/${q.slug}`),
      acceptedAnswer: { "@type": "Answer", text: q.short },
    })),
  };
  const crumbs = breadcrumbJsonLd([{ name: "آریون", path: "/" }, { name: "پرسش و پاسخ", path: "/q" }]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, "\\u003c") }} />
      <QAHub groups={groups} />
    </>
  );
}
