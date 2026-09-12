"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";

/**
 * قالبِ مشترکِ صفحه‌های فرودِ عمومی (روتین، عادت‌ساز، برنامه‌ریز روزانه،
 * ژورنال ترید) و مقاله‌های بلاگ.
 *
 * عمدا یک کامپوننت مشترک است نه چهار صفحه‌ی کپی‌شده: هر چهار صفحه ساختار
 * سئویی یکسانی لازم دارند (یک H1، H2 برای هر بخش، مسیر راهنما، CTA، لینک
 * داخلی) و اگر جدا نوشته می‌شدند، اولین تغییرِ ظاهری در یکی‌شان بقیه را
 * عقب می‌گذاشت. توکن‌های رنگ هم از همان `useThemeTokens` صفحه‌ی اصلی
 * می‌آیند، پس ظاهر با بقیه‌ی سایت یکی است و تمِ روشن/تیره خودکار کار می‌کند.
 */

export type SeoSection = {
  /** تیتر H2 بخش */
  title: string;
  /** پاراگراف‌های متن */
  paragraphs?: string[];
  /** فهرست نکات — هر کدام می‌تواند تیتر کوتاه (H3) داشته باشد */
  bullets?: { title?: string; body: string }[];
};

export type SeoFaq = { q: string; a: string };

export type SeoRelatedLink = { href: string; label: string; note: string };

export function SeoLanding({
  breadcrumb,
  h1,
  lead,
  sections,
  faqs,
  faqTitle = "سوال‌های رایج",
  related,
  relatedTitle = "بخش‌های مرتبط",
  ctaHref = "/auth/signup",
  ctaLabel = "شروع رایگان",
  ctaNote,
}: {
  breadcrumb: { name: string; path: string }[];
  h1: string;
  lead: string;
  sections: SeoSection[];
  faqs?: SeoFaq[];
  faqTitle?: string;
  related?: SeoRelatedLink[];
  relatedTitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaNote?: string;
}) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;

  return (
    <main className="pb-10 pt-4 text-right">
      {/* مسیر راهنما — همان چیزی که BreadcrumbList در JSON-LD توصیفش می‌کند،
          پس باید واقعا روی صفحه دیده شود. */}
      <nav aria-label="مسیر صفحه" className={`mb-4 flex flex-wrap items-center gap-1 text-[11.5px] ${t.muted}`}>
        {breadcrumb.map((b, i) => (
          <span key={b.path} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronLeft size={13} aria-hidden="true" className="opacity-60" />}
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
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Link
            href={ctaHref}
            className={`inline-flex items-center gap-1.5 rounded-[20px] px-5 py-3 text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-6 sm:text-[14.5px] ${t.accentBg} ${t.accentShadow}`}
          >
            {ctaLabel} <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          {ctaNote && <span className={`text-[11.5px] ${t.muted}`}>{ctaNote}</span>}
        </div>
      </header>

      {sections.map((s) => (
        <section key={s.title} className={`mt-5 ${card}`}>
          <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{s.title}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{p}</p>
          ))}
          {!!s.bullets?.length && (
            <ul className="mt-4 space-y-3">
              {s.bullets.map((b) => (
                <li key={b.body.slice(0, 40)} className={`border-r-2 pr-3 ${t.accentBorder}`}>
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
      )}

      {!!related?.length && (
        <section className={`mt-5 ${card}`}>
          <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{relatedTitle}</h2>
          <ul className="mt-4 space-y-3">
            {related.map((r) => (
              <li key={r.href}>
                {/* متنِ لینک عمدا توصیفی‌ست («مدیریت عادت‌ها در آریون»)، نه
                    «اینجا کلیک کنید» — هم برای کاربرِ اسکرین‌ریدر هم برای
                    گوگل، متنِ لینک تنها سرنخِ مقصد است. */}
                <Link href={r.href} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>
                  {r.label}
                </Link>
                <p className={`mt-1 text-[12px] leading-7 ${t.muted}`}>{r.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
