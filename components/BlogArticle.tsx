"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import { faNum } from "@/lib/jalali";
import type { BlogPost } from "@/lib/blogPosts";

/**
 * رندرِ یک مقاله. بلاک‌ها عمدا داده‌اند نه HTML خام: هم `dangerouslySetInnerHTML`
 * لازم نمی‌شود (قانون پروژه)، هم سلسله‌مراتب تیترها (یک H1، بعد H2/H3)
 * ساختاری می‌ماند نه دستیِ نویسنده.
 */
export function BlogArticle({ post }: { post: BlogPost }) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;

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

        <div className="mt-5">
          {post.blocks.map((b, i) => {
            if (b.type === "h2") {
              return (
                <h2 key={i} className={`mt-7 text-[1.05rem] font-extrabold sm:text-[1.18rem] ${t.heading}`}>
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
