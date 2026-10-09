"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import type { SeoFaq, SeoRelatedLink, SeoSection } from "@/components/SeoLanding";
import "./tools.css";
import { tr } from "@/lib/i18n";

/**
 * قالب مشترک صفحه‌های ابزار رایگان: مسیر راهنما، H1 + مقدمه، خود ابزار (children)،
 * متن توضیحی، سوال‌های رایج، لینک‌های مرتبط و CTA نرم ثبت‌نام. ظاهر کارت‌ها همان
 * SeoLanding است تا با بقیه‌ی صفحه‌های عمومی یکی باشد.
 */
export function ToolPageShell({
  breadcrumb,
  h1,
  lead,
  children,
  sections = [],
  faqs,
  related,
  cta,
}: {
  breadcrumb: { name: string; path: string }[];
  h1: string;
  lead: string;
  children?: React.ReactNode;
  sections?: SeoSection[];
  faqs?: SeoFaq[];
  related?: SeoRelatedLink[];
  cta?: { title: string; body: string; label: string; href?: string };
}) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;
  const h2 = `text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`;

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

      <header className={card}>
        <h1 className={`text-[1.55rem] font-extrabold leading-[1.4] sm:text-[2.1rem] ${t.heading}`}>{h1}</h1>
        <p className={`mt-4 text-[13.5px] leading-8 sm:text-[15px] ${t.muted}`}>{lead}</p>
        {children}
      </header>

      {sections.map((s) => (
        <section key={s.title} className={`mt-5 ${card}`}>
          <h2 className={h2}>{s.title}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{p}</p>
          ))}
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

      {!!faqs?.length && (
        <section className={`mt-5 ${card}`}>
          <h2 className={h2}>{tr("سوال‌های رایج", "Frequently asked questions")}</h2>
          <div className="mt-4 space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className={`text-[13.5px] font-bold ${t.heading}`}>{f.q}</h3>
                <p className={`mt-1.5 text-[12.5px] leading-7 sm:text-[13.5px] ${t.muted}`}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!related?.length && (
        <section className={`mt-5 ${card}`}>
          <h2 className={h2}>{tr("مطالب و ابزارهای مرتبط", "Related articles and tools")}</h2>
          <ul className="mt-4 space-y-3">
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>{r.label}</Link>
                <p className={`mt-1 text-[12px] leading-7 ${t.muted}`}>{r.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cta && (
        <section className={`mt-5 ${card}`}>
          <h2 className={h2}>{cta.title}</h2>
          <p className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{cta.body}</p>
          <Link
            href={cta.href || "/auth/signup"}
            className={`mt-5 inline-flex items-center gap-1.5 rounded-[20px] px-5 py-3 text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-6 sm:text-[14.5px] ${t.accentBg} ${t.accentShadow}`}
          >
            {cta.label} <ArrowLeft size={16} aria-hidden="true" className="dir-flip" />
          </Link>
        </section>
      )}
    </main>
  );
}
