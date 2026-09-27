"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import { faNum } from "@/lib/jalali";
import type { BlogPost } from "@/lib/blogPosts";

/** برای ساختِ anchor id از متنِ فارسیِ یک تیتر — پایدار و بدونِ کاراکترهای غیرمجاز در URL. */
function headingId(text: string, i: number): string {
  const cleaned = text
    .replace(/[^؀-ۿݐ-ݿa-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned ? `${cleaned}-${i}` : `بخش-${i}`;
}

type AdjacentPost = { href: string; label: string };

/**
 * رندرِ یک مقاله. بلاک‌ها عمدا داده‌اند نه HTML خام: هم `dangerouslySetInnerHTML`
 * لازم نمی‌شود (قانون پروژه)، هم سلسله‌مراتب تیترها (یک H1، بعد H2/H3)
 * ساختاری می‌ماند نه دستیِ نویسنده.
 */
export function BlogArticle({ post, prev, next }: { post: BlogPost; prev?: AdjacentPost; next?: AdjacentPost }) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;

  // فهرستِ مطالب فقط از تیترهای H2 — فقط وقتی حداقل دو تا هست، وگرنه یک
  // فهرستِ یک‌خطی هیچ ارزشی برای خواننده ندارد.
  const h2Ids = post.blocks.map((b, i) => (b.type === "h2" ? headingId(b.text, i) : null));
  const tocItems = post.blocks
    .map((b, i) => (b.type === "h2" ? { id: h2Ids[i] as string, text: b.text } : null))
    .filter((x): x is { id: string; text: string } => x !== null);

  return (
    <main className="pb-10 pt-4 text-right">
      <nav aria-label="مسیر صفحه" className={`mb-4 flex flex-wrap items-center gap-1 text-[11.5px] ${t.muted}`}>
        <Link href="/" className={`${t.accentHoverText} hover:underline`}>آریون</Link>
        <ChevronLeft size={13} aria-hidden="true" className="opacity-60" />
        <Link href="/blog" className={`${t.accentHoverText} hover:underline`}>مقاله‌ها</Link>
        <ChevronLeft size={13} aria-hidden="true" className="opacity-60" />
        <span aria-current="page">{post.title}</span>
      </nav>

      <article className={card}>
        <h1 className={`text-[1.5rem] font-extrabold leading-[1.45] sm:text-[1.95rem] ${t.heading}`}>{post.title}</h1>
        <p className={`mt-2.5 text-[11.5px] ${t.muted}`}>{faNum(post.readingMinutes)} دقیقه مطالعه</p>

        {tocItems.length >= 2 && (
          <nav aria-label="فهرست مطالب" className={`mt-5 rounded-[16px] border ${t.cardBorder} p-4`}>
            <div className={`text-[12px] font-bold ${t.heading}`}>فهرست مطالب</div>
            <ul className="mt-2 space-y-1.5">
              {tocItems.map((it) => (
                <li key={it.id}>
                  <a href={`#${it.id}`} className={`text-[12px] ${t.accentHoverText} hover:underline`}>
                    {it.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-5">
          {post.blocks.map((b, i) => {
            if (b.type === "h2") {
              return (
                <h2 key={i} id={h2Ids[i] as string} className={`mt-7 scroll-mt-24 text-[1.05rem] font-extrabold sm:text-[1.18rem] ${t.heading}`}>
                  {b.text}
                </h2>
              );
            }
            if (b.type === "h3") {
              return (
                <h3 key={i} className={`mt-5 text-[13.5px] font-bold sm:text-[14.5px] ${t.heading}`}>
                  {b.text}
                </h3>
              );
            }
            if (b.type === "ul") {
              return (
                <ul key={i} className="mt-3 space-y-2.5">
                  {b.items.map((it) => (
                    <li key={it.slice(0, 40)} className={`border-r-2 pr-3 text-[12.5px] leading-7 sm:text-[13.5px] ${t.accentBorder} ${t.muted}`}>
                      {it}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className={`mt-3 text-[13px] leading-8 sm:text-[14px] ${t.muted}`}>
                {b.text}
              </p>
            );
          })}
        </div>
      </article>

      {(prev || next) && (
        <nav aria-label="مقاله‌ی قبلی و بعدی" className={`mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2`}>
          {next && (
            <Link href={next.href} className={`${card} flex items-center justify-between gap-2 no-underline`}>
              <span className={`text-[11px] ${t.muted}`}>مقاله‌ی بعدی</span>
              <span className={`flex items-center gap-1.5 text-[12.5px] font-bold ${t.heading}`}>
                {next.label} <ArrowLeft size={14} aria-hidden="true" />
              </span>
            </Link>
          )}
          {prev && (
            <Link href={prev.href} className={`${card} flex items-center justify-between gap-2 no-underline`}>
              <span className={`flex items-center gap-1.5 text-[12.5px] font-bold ${t.heading}`}>
                <ArrowRight size={14} aria-hidden="true" /> {prev.label}
              </span>
              <span className={`text-[11px] ${t.muted}`}>مقاله‌ی قبلی</span>
            </Link>
          )}
        </nav>
      )}

      <section className={`mt-5 ${card}`}>
        <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.15rem] ${t.heading}`}>ادامه‌ی مطلب</h2>
        <ul className="mt-3.5 space-y-2.5">
          {post.related.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>
                {r.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/blog" className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>
              همه‌ی مقاله‌های آریون
            </Link>
          </li>
        </ul>

        <Link
          href="/auth/signup"
          className={`mt-6 inline-flex items-center gap-1.5 rounded-[20px] px-5 py-3 text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] ${t.accentBg} ${t.accentShadow}`}
        >
          شروع رایگان با آریون <ArrowLeft size={16} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
