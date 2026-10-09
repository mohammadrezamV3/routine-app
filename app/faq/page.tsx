import type { Metadata } from "next";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { getFaqs } from "@/lib/faqContent";
import { brandName } from "@/lib/brand";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import Link from "next/link";
import { tr } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr("سوالات متداول آریون", "Arion FAQ"),
    description: tr(
      "جواب 15 سوال رایج درباره‌ی آریون: چیست، رایگان است یا نه، تقویم شمسی دارد؟ چطور روتین روزانه بسازم، " +
        "ژورنال ترید چیست، برنامه‌ی بدنسازی چطور ساخته می‌شود و اطلاعاتم چقدر امن است.",
      "Answers to 15 common questions about Arion: what it is, whether it is free, whether it has a Jalali calendar, " +
        "how to build a daily routine, what a trading journal is, how the workout plan is built and how safe your data is.",
    ),
    path: "/faq",
    ogTitle: tr("سوالات متداول درباره آریون", "Frequently asked questions about Arion"),
    // og:image از app/faq/opengraph-image.tsx می‌آید
    ownOgImage: true,
  });
}

// محتوای این صفحه عمدا واقعی و دقیقا منطبق بر چیزیه که آریون الان واقعا
// انجام می‌ده — بدون ادعای غیرقابل‌اثبات «بهترین» یا آمار ساختگی. هدف اینه
// که هم آدم‌ها هم موتورهای جست‌وجو/AI زنده‌سرچ یه جواب صادقانه و مشخص پیدا
// کنن، نه یه متن تبلیغاتی پرکلمه. خود آرایه در lib/faqContent.ts است —
// llms-full.txt هم از همون‌جا می‌خواند تا این دو از هم واگرا نشوند.

// قیمت «روتین من» از پنل ادمین (/admin/pricing) پر می‌شه؛ ISR تا تغییر قیمت بدون دیپلوی برسه
export const revalidate = 300;

export default async function FaqPage() {
  const faqs = fillPriceCopy(getFaqs(), await getPricingConfig());
  const FAQ_JSON_LD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: brandName(), path: "/" }, { name: tr("سوالات متداول", "FAQ"), path: "/faq" }])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <h1>{tr("سوالات متداول", "Frequently asked questions")}</h1>
      <div className="about-list" style={{ marginTop: 12 }}>
        {faqs.map((f) => (
          <div key={f.q} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 14 }}>{f.q}</h2>
            <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.9 }}>{f.a}</div>
          </div>
        ))}
      </div>
      {/* لینک‌های داخلی با متن توصیفی — هر کدام به صفحه‌ای می‌روند که همان
          موضوع را کامل توضیح داده، نه یک «اینجا کلیک کنید». */}
      <div style={{ marginTop: 28, fontSize: 12.5, color: "var(--muted)", lineHeight: 2 }}>
        {tr("توضیح کامل هر بخش:", "Full details on each section:")}{" "}
        <Link href="/routine" style={{ color: "var(--accent)" }}>{tr("روتین روزانه در آریون", "Daily routine in Arion")}</Link>
        {tr("،", ",")}{" "}
        <Link href="/habit-tracker" style={{ color: "var(--accent)" }}>{tr("مدیریت عادت‌ها", "Habit tracking")}</Link>
        {tr("،", ",")}{" "}
        <Link href="/daily-planner" style={{ color: "var(--accent)" }}>{tr("برنامه‌ریزی روزانه", "Daily planning")}</Link>
        {tr("،", ",")}{" "}
        <Link href="/bodybuilding-program" style={{ color: "var(--accent)" }}>{tr("برنامه‌ی بدنسازی هوشمند", "Smart workout plan")}</Link>
        {tr("،", ",")}{" "}
        <Link href="/calorie-counter" style={{ color: "var(--accent)" }}>{tr("کالری‌شمار فارسی", "Calorie counter")}</Link>
        {tr("،", ",")}{" "}
        <Link href="/trading-journal" style={{ color: "var(--accent)" }}>{tr("ژورنال معاملاتی", "Trading journal")}</Link>
        {tr("،", ",")}{" "}
        <Link href="/economic-calendar" style={{ color: "var(--accent)" }}>{tr("تقویم اقتصادی", "Economic calendar")}</Link>{" "}
        {tr("و", "and")}{" "}
        <Link href="/forex-sessions" style={{ color: "var(--accent)" }}>{tr("ساعت بازار فارکس", "Forex market hours")}</Link>
        .
        <br />
        {tr("سوال دیگه‌ای داری؟", "Have another question?")} <Link href="/about" style={{ color: "var(--accent)" }}>{tr("با ما تماس بگیر", "Get in touch")}</Link>.
      </div>
    </section>
  );
}
