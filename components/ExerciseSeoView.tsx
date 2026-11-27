"use client";

import { SmartLink as Link } from "@/components/SmartLink";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/useThemeTokens";
import { tr } from "@/lib/i18n";

// نمای ارائه‌ای صفحه‌های کتابخانه‌ی حرکات (/exercises). فقط رشته‌های همون
// یک صفحه رو می‌گیره؛ هیچ‌وقت کاتالوگ کامل به کلاینت پاس داده نمی‌شه. ظاهر
// عین SeoLanding.

export type ExLink = { href: string; label: string; note?: string };
export type ExSection = {
  title: string;
  paragraphs?: string[];
  /** مراحل شماره‌دار */
  steps?: string[];
  /** ردیف‌های برچسب/مقدار */
  facts?: { label: string; value: string }[];
  bullets?: string[];
  links?: ExLink[];
  /** لینک‌ها به‌صورت چیپ فشرده */
  chips?: boolean;
};

export function ExerciseSeoView({
  breadcrumb, h1, subtitle, lead, sections, cta,
}: {
  breadcrumb: { name: string; path: string }[];
  h1: string;
  subtitle?: string;
  lead: string;
  sections: ExSection[];
  cta?: { href: string; label: string; secondaryHref?: string; secondaryLabel?: string };
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

      <header className={card}>
        <h1 className={`text-[1.55rem] font-extrabold leading-[1.4] sm:text-[2.1rem] ${t.heading}`}>{h1}</h1>
        {subtitle && <p className={`mt-1 text-[13px] font-semibold ${t.accentText}`} dir="ltr">{subtitle}</p>}
        <p className={`mt-4 text-[13.5px] leading-8 sm:text-[15px] ${t.muted}`}>{lead}</p>
        {cta && (
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href={cta.href}
              className={`inline-flex items-center gap-1.5 rounded-[20px] px-5 py-3 text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-6 sm:text-[14.5px] ${t.accentBg} ${t.accentShadow}`}
            >
              {cta.label} <ArrowLeft size={16} aria-hidden="true" className="dir-flip" />
            </Link>
            {cta.secondaryHref && cta.secondaryLabel && (
              <Link href={cta.secondaryHref} className={`text-[13px] font-bold ${t.accentText} hover:underline`}>
                {cta.secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </header>

      {sections.map((s) => (
        <section key={s.title} className={`mt-5 ${card}`}>
          <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`}>{s.title}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{p}</p>
          ))}
          {!!s.facts?.length && (
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {s.facts.map((f) => (
                <div key={f.label} className={`flex items-baseline justify-between gap-3 border-b pb-2 ${t.line}`}>
                  <dt className={`text-[12.5px] ${t.muted}`}>{f.label}</dt>
                  <dd className={`text-[13px] font-bold ${t.heading}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {!!s.steps?.length && (
            <ol className="mt-4 space-y-3">
              {s.steps.map((st, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${t.accentBorder} ${t.accentText}`}>{i + 1}</span>
                  <p className={`text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{st}</p>
                </li>
              ))}
            </ol>
          )}
          {!!s.bullets?.length && (
            <ul className="mt-4 space-y-2">
              {s.bullets.map((b) => (
                <li key={b} className={`border-s-2 ps-3 text-[13px] leading-8 sm:text-[14px] ${t.accentBorder} ${t.muted}`}>{b}</li>
              ))}
            </ul>
          )}
          {!!s.links?.length && (s.chips ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {s.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={`inline-block rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${t.line} ${t.heading} ${t.accentHoverBorder}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 space-y-3">
              {s.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>{l.label}</Link>
                  {l.note && <p className={`mt-1 text-[12px] leading-7 ${t.muted}`}>{l.note}</p>}
                </li>
              ))}
            </ul>
          ))}
        </section>
      ))}
    </main>
  );
}
