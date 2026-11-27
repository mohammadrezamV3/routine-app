"use client";

import { SmartLink as Link } from "@/components/SmartLink";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/useThemeTokens";

/**
 * نمای عمومی صفحه‌های سئوی جدول کالری (هاب و صفحه‌ی هر غذا). همه‌ی متن‌ها
 * از سرور (با tr) آماده می‌رسن؛ این کامپوننت فقط ظاهر رو می‌سازه و داده‌ی
 * همان یک صفحه رو می‌گیره. ظاهر هم‌خانواده‌ی SeoLanding.
 */

export type FoodCell = string | { text: string; href: string };

export type FoodBlock =
  | { type: "text"; title: string; paragraphs: string[] }
  | { type: "facts"; title: string; items: { label: string; value: string }[] }
  | { type: "table"; title: string; headers: string[]; rows: FoodCell[][]; note?: string; level?: 2 | 3 }
  | { type: "links"; title: string; links: { href: string; label: string; note: string }[] }
  | { type: "faq"; title: string; faqs: { q: string; a: string }[] };

export function FoodSeoView({
  breadcrumb,
  h1,
  lead,
  blocks,
  ctaHref = "/auth/signup",
  ctaLabel,
  ctaNote,
  secondaryHref,
  secondaryLabel,
}: {
  breadcrumb: { name: string; path: string }[];
  h1: string;
  lead: string;
  blocks: FoodBlock[];
  ctaHref?: string;
  ctaLabel: string;
  ctaNote?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;
  const h2 = `text-[1.05rem] font-extrabold sm:text-[1.2rem] ${t.heading}`;

  return (
    <main className="pb-10 pt-4 text-start">
      <nav aria-label="breadcrumb" className={`mb-4 flex flex-wrap items-center gap-1 text-[11.5px] ${t.muted}`}>
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
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Link
            href={ctaHref}
            className={`inline-flex items-center gap-1.5 rounded-[20px] px-5 py-3 text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-6 sm:text-[14.5px] ${t.accentBg} ${t.accentShadow}`}
          >
            {ctaLabel} <ArrowLeft size={16} aria-hidden="true" className="dir-flip" />
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref} className={`text-[13px] font-bold ${t.accentText} hover:underline`}>
              {secondaryLabel}
            </Link>
          )}
          {ctaNote && <span className={`text-[11.5px] ${t.muted}`}>{ctaNote}</span>}
        </div>
      </header>

      {blocks.map((b) => (
        <section key={b.type + b.title} className={`mt-5 ${card}`}>
          {b.type === "table" && b.level === 3 ? (
            <h3 className={h2}>{b.title}</h3>
          ) : (
            <h2 className={h2}>{b.title}</h2>
          )}

          {b.type === "text" &&
            b.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{p}</p>
            ))}

          {b.type === "facts" && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {b.items.map((it) => (
                <div key={it.label} className={`border-s-2 ps-3 ${t.accentBorder}`}>
                  <dt className={`text-[11.5px] ${t.muted}`}>{it.label}</dt>
                  <dd className={`mt-0.5 text-[15px] font-extrabold sm:text-[17px] ${t.heading}`}>{it.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {b.type === "table" && (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-start text-[13px] sm:text-[14px]">
                  <thead>
                    <tr>
                      {b.headers.map((h) => (
                        <th key={h} scope="col" className={`border-b py-2 pe-3 text-start text-[12px] font-bold ${t.line} ${t.muted}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((c, ci) => {
                          const cls = `border-b py-2 pe-3 ${t.line} ${ci === 0 ? `font-bold ${t.heading}` : t.muted}`;
                          return typeof c === "string" ? (
                            ci === 0 ? <th key={ci} scope="row" className={`${cls} text-start`}>{c}</th> : <td key={ci} className={cls}>{c}</td>
                          ) : (
                            <td key={ci} className={cls}>
                              <Link href={c.href} className={`font-bold ${t.accentText} hover:underline`}>{c.text}</Link>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {b.note && <p className={`mt-3 text-[11.5px] leading-7 ${t.muted}`}>{b.note}</p>}
            </>
          )}

          {b.type === "links" && (
            <ul className="mt-4 space-y-3">
              {b.links.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>{r.label}</Link>
                  <p className={`mt-1 text-[12px] leading-7 ${t.muted}`}>{r.note}</p>
                </li>
              ))}
            </ul>
          )}

          {b.type === "faq" && (
            <div className="mt-4 space-y-4">
              {b.faqs.map((f) => (
                <div key={f.q}>
                  <h3 className={`text-[13.5px] font-bold ${t.heading}`}>{f.q}</h3>
                  <p className={`mt-1.5 text-[12.5px] leading-7 sm:text-[13.5px] ${t.muted}`}>{f.a}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
