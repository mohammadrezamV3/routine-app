"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";

type Group = { category: string; label: string; items: { slug: string; question: string; short: string; variants: string[] }[] };

// فهرستِ همه‌ی پرسش‌ها، گروه‌بندی‌شده با جست‌وجوی سمتِ کاربر. همه‌ی
// لینک‌ها در HTMLِ اولیه هست (SSR) — جست‌وجو فقط فیلترِ نمایشی است، پس
// کراولر همه‌ی صفحه‌ها را از همین‌جا پیدا می‌کند.
export function QAHub({ groups }: { groups: Group[] }) {
  const t = useThemeTokens();
  const [q, setQ] = useState("");
  const card = `rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 sm:p-6 ${t.shadow} backdrop-blur-xl`;

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => [it.question, it.short, ...it.variants].some((x) => x.includes(s))) }))
      .filter((g) => g.items.length);
  }, [q, groups]);

  return (
    <main className="pb-10 pt-4 text-right">
      <h1 className={`text-[1.5rem] font-extrabold leading-[1.45] sm:text-[1.95rem] ${t.heading}`}>پرسش و پاسخ آریون</h1>
      <p className={`mt-2.5 text-[13px] leading-8 ${t.muted}`}>
        جوابِ کامل و مستقیم به رایج‌ترین سوال‌ها درباره‌ی روتین روزانه، ساختنِ عادت، برنامه‌ریزی، خواب، ژورنال و روانشناسیِ ترید،
        فارکس، بدنسازی و تغذیه.
      </p>

      <label className={`mt-5 flex items-center gap-2 rounded-[16px] border ${t.cardBorder} px-3.5 py-2.5`}>
        <Search size={16} aria-hidden="true" className={t.muted} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="سوالت رو جست‌وجو کن…"
          className={`w-full bg-transparent text-[13px] outline-none ${t.heading}`} aria-label="جست‌وجو در پرسش‌ها"
        />
      </label>

      <nav aria-label="دسته‌ها" className="mt-4 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a key={g.category} href={`#${g.category}`} className={`rounded-full border ${t.cardBorder} px-3 py-1 text-[11.5px] font-bold ${t.accentHoverText}`}>
            {g.label}
          </a>
        ))}
      </nav>

      {filtered.map((g) => (
        <section key={g.category} id={g.category} className={`mt-5 scroll-mt-24 ${card}`}>
          <h2 className={`text-[1.05rem] font-extrabold sm:text-[1.15rem] ${t.heading}`}>{g.label}</h2>
          <ul className="mt-3 space-y-3">
            {g.items.map((it) => (
              <li key={it.slug}>
                <Link href={`/q/${it.slug}`} className={`text-[13.5px] font-bold ${t.accentText} hover:underline`}>{it.question}</Link>
                <p className={`mt-1 text-[12px] leading-7 ${t.muted}`}>{it.short}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!filtered.length && <p className={`mt-6 text-[13px] ${t.muted}`}>چیزی پیدا نشد — عبارتِ دیگری امتحان کن.</p>}
    </main>
  );
}
