"use client";

import { SmartLink as Link } from "@/components/SmartLink";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/useThemeTokens";
import type { SeoFaq, SeoRelatedLink, SeoSection } from "@/components/SeoLanding";
import { tr } from "@/lib/i18n";
import "./seo-tools.css";

/**
 * قالب صفحه‌ی ابزار رایگان عمومی: مسیر راهنما، H1، خود ماشین‌حساب (بالا)، بعد
 * متن کامل سئو (بخش‌ها، فرمول، مثال، سوال‌های رایج، لینک‌های مرتبط). ظاهر کارت‌ها
 * عین SeoLanding است؛ تنها فرق جای ابزار و یک دکمه‌ی دعوت پایین صفحه است.
 */
export type ToolSection = SeoSection & {
  /** فرمول (متن لاتین/عددی، چپ‌به‌راست) */
  formula?: string;
};

export function SeoToolPage({
  breadcrumb,
  h1,
  lead,
  toolTitle,
  tool,
  sections,
  faqs,
  faqTitle = tr("سوال‌های رایج", "Frequently asked questions"),
  related,
  relatedTitle = tr("بخش‌ها و مقاله‌های مرتبط", "Related tools and articles"),
  ctaHref = "/auth/signup",
  ctaLabel = tr("شروع رایگان", "Start free"),
  ctaText,
}: {
  breadcrumb: { name: string; path: string }[];
  h1: string;
  lead: string;
  toolTitle: string;
  tool: React.ReactNode;
  sections: ToolSection[];
  faqs: SeoFaq[];
  faqTitle?: string;
  related: SeoRelatedLink[];
  relatedTitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaText: string;
}) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;

  return (
    <main className="pb-10 pt-4 text-start">
      <nav aria-label={tr("مسیر صفحه", "Breadcrumb")} className={`mb-4 flex flex-wrap items-center gap-1 text-[11.5px] ${t.muted}`}>
        {breadcrumb.map((b, i) => (
          <span key={b.path} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronLeft size={13} aria-hidden="true" className="dir-flip opacity-60" />}
            {i === breadcrumb.length - 1 ? (
              <span aria-current="page">{b.name}</span>
            ) : (
              <Link href={b.path} className={`${t.accentHoverText} hover:underline`}>{b.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <header>
        <h1 className={`text-[1.55rem] font-extrabold leading-[1.4] sm:text-[2.1rem] ${t.heading}`}>{h1}</h1>
        <p className={`mt-3 text-[13.5px] leading-8 sm:text-[15px] ${t.muted}`}>{lead}</p>
      </header>

      <section aria-label={toolTitle} className={`mt-5 ${card}`}>
        <h2 className={`mb-4 text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{toolTitle}</h2>
        {tool}
      </section>

      {sections.map((s) => (
        <section key={s.title} className={`mt-5 ${card}`}>
          <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{s.title}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{p}</p>
          ))}
          {s.formula && (
            <div className={`stl-formula ${t.heading}`} dir="auto"><bdi>{s.formula}</bdi></div>
          )}
          {!!s.bullets?.length && (
            <ul className="mt-4 space-y-3">
              {s.bullets.map((b) => (
                <li key={b.body.slice(0, 40)} className={`border-s-2 ps-3 ${t.accentBorder}`}>
                  {b.title && <h3 className={`text-[13.5px] font-bold ${t.heading}`}>{b.title}</h3>}
                  <p className={`text-[12.5px] leading-7 sm:text-[13.5px] ${t.muted}`}>{b.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className={`mt-5 ${card}`}>
        <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{faqTitle}</h2>
        <div className="mt-4 space-y-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className={`text-[13.5px] font-bold ${t.heading}`}>{f.q}</h3>
              <p className={`mt-1.5 text-[12.5px] leading-7 sm:text-[13.5px] ${t.muted}`}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`mt-5 ${card}`}>
        <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{relatedTitle}</h2>
        <ul className="mt-4 space-y-3">
          {related.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>{r.label}</Link>
              <p className={`mt-1 text-[12px] leading-7 ${t.muted}`}>{r.note}</p>
            </li>
          ))}
        </ul>
        <p className={`mt-6 text-[13px] leading-8 ${t.muted}`}>{ctaText}</p>
        <div className="mt-3">
          <Link href={ctaHref} className="btn btn-primary">
            {ctaLabel} <ArrowLeft size={16} aria-hidden="true" className="dir-flip" />
          </Link>
        </div>
      </section>
    </main>
  );
}
