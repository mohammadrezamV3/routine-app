"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import type { QAItem } from "@/lib/qa/types";

// صفحه‌ی یک پرسش — همان زبانِ بصریِ مقاله‌های بلاگ (BlogArticle): یک H1 (خودِ
// سوال)، جوابِ مستقیم در ابتدا (همان چیزی که گوگل و دستیارهای AI برمی‌دارند)،
// بعد جوابِ کامل، سوال‌های مرتبط و لینک به ابزارِ مرتبطِ آریون.
export function QAArticle({ qa, categoryLabel, related }: { qa: QAItem; categoryLabel: string; related: { slug: string; question: string }[] }) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;

  return (
    <main className="pb-10 pt-4 text-right">
      <nav aria-label="مسیر صفحه" className={`mb-4 flex flex-wrap items-center gap-1 text-[11.5px] ${t.muted}`}>
        <Link href="/" className={`${t.accentHoverText} hover:underline`}>آریون</Link>
        <ChevronLeft size={13} aria-hidden="true" className="opacity-60" />
        <Link href="/q" className={`${t.accentHoverText} hover:underline`}>پرسش و پاسخ</Link>
        <ChevronLeft size={13} aria-hidden="true" className="opacity-60" />
        <Link href={`/q#${qa.category}`} className={`${t.accentHoverText} hover:underline`}>{categoryLabel}</Link>
      </nav>

      <article className={card}>
        <h1 className={`text-[1.4rem] font-extrabold leading-[1.5] sm:text-[1.8rem] ${t.heading}`}>{qa.question}</h1>

        <p className={`mt-4 border-r-2 pr-3 text-[13.5px] font-bold leading-8 sm:text-[14.5px] ${t.accentBorder} ${t.heading}`}>
          {qa.short}
        </p>

        <div className="mt-4">
          {qa.answer.map((b, i) => {
            if (typeof b === "string") {
              return <p key={i} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>{b}</p>;
            }
            if ("h" in b) {
              return <h2 key={i} className={`mt-6 text-[1.02rem] font-extrabold sm:text-[1.12rem] ${t.heading}`}>{b.h}</h2>;
            }
            return (
              <ul key={i} className="mt-3 space-y-2.5">
                {b.list.map((it, j) => (
                  <li key={j} className={`border-r-2 pr-3 text-[12.5px] leading-7 sm:text-[13.5px] ${t.accentBorder} ${t.muted}`}>{it}</li>
                ))}
              </ul>
            );
          })}
        </div>

        {qa.variants.length > 0 && (
          <p className={`mt-6 text-[11.5px] leading-7 ${t.muted}`}>
            این سوال را این‌طور هم می‌پرسند: {qa.variants.join(" · ")}
          </p>
        )}

        {qa.cta && (
          <Link href={qa.cta.href} className={`mt-5 inline-flex text-[13px] font-bold ${t.accentText} hover:underline`}>
            {qa.cta.label} ←
          </Link>
        )}
      </article>

      {related.length > 0 && (
        <section className={`mt-5 ${card}`}>
          <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.15rem] ${t.heading}`}>سوال‌های مرتبط</h2>
          <ul className="mt-3.5 space-y-2.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/q/${r.slug}`} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>{r.question}</Link>
              </li>
            ))}
            <li>
              <Link href="/q" className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>همه‌ی پرسش‌ها و پاسخ‌ها</Link>
            </li>
          </ul>
        </section>
      )}
    </main>
  );
}
