import type { Metadata } from "next";
import { OG_BASE } from "@/lib/brand";
import { FAQS } from "@/lib/faqContent";
import Link from "next/link";

export const metadata: Metadata = {
  // absolute یعنی قالب «%s | Arion آریون» به این اضافه نشود — نام برند از
  // قبل داخل عنوان هست و تکرارش فقط عنوان را از حد ~۶۰ کاراکتر گوگل رد
  // می‌کند و ته‌اش بریده نمایش داده می‌شود.
  title: { absolute: "سوالات متداول آریون" },
  description:
    "جواب ۱۵ سوال رایج درباره‌ی آریون: چیست، رایگان است یا نه، تقویم شمسی دارد؟ چطور روتین روزانه بسازم، " +
    "ژورنال ترید چیست، برنامه‌ی بدنسازی چطور ساخته می‌شود و اطلاعاتم چقدر امن است.",
  alternates: { canonical: "/faq" },
  // images رو صراحتا حذف می‌کنیم تا نکست بتونه opengraph-image.tsx خودِ این
  // مسیر رو تزریق کنه — وگرنه og:image همیشه /og.png عمومیِ OG_BASE می‌موند.
  openGraph: { ...OG_BASE, images: undefined, url: "/faq", title: "سوالات متداول درباره آریون" },
};

// محتوای این صفحه عمدا واقعی و دقیقا منطبق بر چیزیه که آریون الان واقعا
// انجام می‌ده — بدون ادعای غیرقابل‌اثبات «بهترین» یا آمار ساختگی. هدف اینه
// که هم آدم‌ها هم موتورهای جست‌وجو/AI زنده‌سرچ یه جواب صادقانه و مشخص پیدا
// کنن، نه یه متن تبلیغاتی پرکلمه. خودِ آرایه در lib/faqContent.ts است —
// llms-full.txt هم از همون‌جا می‌خواند تا این دو از هم واگرا نشوند.

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <h1>سوالات متداول</h1>
      <div className="about-list" style={{ marginTop: 12 }}>
        {FAQS.map((f) => (
          <div key={f.q} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 14 }}>{f.q}</h2>
            <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.9 }}>{f.a}</div>
          </div>
        ))}
      </div>
      {/* لینک‌های داخلی با متنِ توصیفی — هر کدام به صفحه‌ای می‌روند که همان
          موضوع را کامل توضیح داده، نه یک «اینجا کلیک کنید». */}
      <div style={{ marginTop: 28, fontSize: 12.5, color: "var(--muted)", lineHeight: 2 }}>
        توضیح کامل هر بخش:{" "}
        <Link href="/routine" style={{ color: "var(--accent)" }}>روتین روزانه در آریون</Link>
        ،{" "}
        <Link href="/habit-tracker" style={{ color: "var(--accent)" }}>مدیریت عادت‌ها</Link>
        ،{" "}
        <Link href="/daily-planner" style={{ color: "var(--accent)" }}>برنامه‌ریزی روزانه</Link>
        ،{" "}
        <Link href="/bodybuilding-program" style={{ color: "var(--accent)" }}>برنامه‌ی بدنسازی هوشمند</Link>
        ،{" "}
        <Link href="/calorie-counter" style={{ color: "var(--accent)" }}>کالری‌شمار فارسی</Link>
        ،{" "}
        <Link href="/trading-journal" style={{ color: "var(--accent)" }}>ژورنال معاملاتی</Link>
        ،{" "}
        <Link href="/economic-calendar" style={{ color: "var(--accent)" }}>تقویم اقتصادی</Link>{" "}
        و{" "}
        <Link href="/forex-sessions" style={{ color: "var(--accent)" }}>ساعت بازار فارکس</Link>
        .
        <br />
        سوال دیگه‌ای داری؟ <Link href="/about" style={{ color: "var(--accent)" }}>با ما تماس بگیر</Link>.
      </div>
    </section>
  );
}
