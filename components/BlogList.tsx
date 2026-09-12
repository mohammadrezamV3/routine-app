"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import { faNum } from "@/lib/jalali";
import type { BlogPost } from "@/lib/blogPosts";

/** فهرست مقاله‌ها — هر کارت خودش یک لینک با متنِ توصیفی (عنوان مقاله) است. */
export function BlogList({ posts, intro }: { posts: BlogPost[]; intro: string }) {
  const t = useThemeTokens();
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-7 ${t.shadow} backdrop-blur-xl`;

  return (
    <main className="pb-10 pt-4 text-right">
      <nav aria-label="مسیر صفحه" className={`mb-4 flex items-center gap-1 text-[11.5px] ${t.muted}`}>
        <Link href="/" className={`${t.accentHoverText} hover:underline`}>آریون</Link>
        <ChevronLeft size={13} aria-hidden="true" className="opacity-60" />
        <span aria-current="page">مقاله‌ها</span>
      </nav>

      <header className={card}>
        <h1 className={`text-[1.55rem] font-extrabold leading-[1.4] sm:text-[2rem] ${t.heading}`}>
          مقاله‌های آریون درباره نظم، روتین و برنامه‌ریزی
        </h1>
        <p className={`mt-4 text-[13.5px] leading-8 sm:text-[15px] ${t.muted}`}>{intro}</p>
      </header>

      <section className="mt-5 space-y-4">
        {posts.map((p) => (
          <article key={p.slug} className={card}>
            <h2 className={`text-[1.02rem] font-extrabold leading-7 sm:text-[1.15rem] ${t.heading}`}>
              <Link href={`/blog/${p.slug}`} className="hover:underline">{p.title}</Link>
            </h2>
            <p className={`mt-2.5 text-[12.5px] leading-7 sm:text-[13.5px] ${t.muted}`}>{p.excerpt}</p>
            <div className={`mt-3 flex items-center gap-3 text-[11px] ${t.muted}`}>
              <span>{faNum(p.readingMinutes)} دقیقه مطالعه</span>
              <Link href={`/blog/${p.slug}`} className={`font-bold ${t.accentText} hover:underline`}>
                خواندن مقاله
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
