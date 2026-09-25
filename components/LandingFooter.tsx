"use client";

import Image from "next/image";
import Link from "next/link";
import { useThemeTokens } from "@/components/PlanShowcase";
import { EnamadBadge } from "@/components/EnamadBadge";

// فوترِ صفحه‌ی لندینگ — عمداً مینیمال: بدونِ کارت و بدونِ بک‌گراند، فقط یک
// خطِ جداکننده و همان توکن‌های رنگیِ بقیه‌ی لندینگ (useThemeTokens).
//
// همه‌ی لینک‌های فوترِ قبلی سرِ جایشان مانده‌اند: /about و /faq و /terms و
// صفحه‌های فرودِ عمومی بدونِ این لینک‌ها برای کراولر یتیم‌اند (هیچ لینکِ
// HTMLای از صفحه‌ی اصلی به آن‌ها نبود). فقط در سه گروهِ کوتاه چیده شده‌اند.
const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "امکانات",
    links: [
      { href: "/routine", label: "روتین روزانه" },
      { href: "/habit-tracker", label: "پیگیری عادت‌ها" },
      { href: "/daily-planner", label: "برنامه‌ریزی روزانه" },
      { href: "/trading-journal", label: "ژورنال معاملاتی" },
    ],
  },
  {
    title: "منابع",
    links: [
      { href: "/blog", label: "مقاله‌ها" },
      { href: "/faq", label: "سوالات متداول" },
    ],
  },
  {
    title: "آریون",
    links: [
      { href: "/about", label: "درباره ما" },
      { href: "/terms", label: "قوانین و مقررات" },
    ],
  },
];

// سالِ شمسی از خودِ مرورگر/سرور — ثابتِ دستی هر نوروز کهنه می‌شد.
function jalaliYear(): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
  } catch {
    return "";
  }
}

export function LandingFooter() {
  const t = useThemeTokens();
  const year = jalaliYear();

  return (
    <footer className={`mt-12 border-t ${t.line} px-1 pb-8 pt-8 text-right`}>
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[230px]">
          <Link href="/" aria-label="آریون — صفحه‌ی اصلی" className="inline-flex items-center gap-2.5">
            <span className="relative h-8 w-8 shrink-0" aria-hidden="true">
              {/* هر دو نسخه‌ی لوگو هم‌زمان‌اند و فقط opacity عوض می‌شود — مثلِ AuthBrandMark. */}
              <Image
                src="/images/logo-icon-dark-theme.png" alt="" fill sizes="32px"
                className={`object-contain transition-opacity duration-150 ${t.isLight ? "opacity-0" : "opacity-100"}`}
              />
              <Image
                src="/images/logo-icon-light-theme.webp" alt="" fill sizes="32px"
                className={`object-contain transition-opacity duration-150 ${t.isLight ? "opacity-100" : "opacity-0"}`}
              />
            </span>
            <span className={`text-[15px] font-extrabold ${t.heading}`}>
              آریون <span className={`text-[12px] font-bold ${t.accentText}`}>Arion</span>
            </span>
          </Link>
          <p className={`mt-3 text-[12px] leading-6 ${t.muted}`}>
            روتین، بدنسازی، ترید و یادگیری — همه‌ی نظمِ زندگی‌ات یک‌جا.
          </p>
        </div>

        <nav aria-label="صفحه‌های آریون" className="grid grid-cols-3 gap-6 sm:gap-9">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className={`text-[12px] font-bold ${t.heading}`}>{g.title}</div>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={`whitespace-nowrap text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={`mt-8 flex flex-col-reverse items-center gap-4 border-t ${t.line} pt-5 sm:flex-row sm:justify-between`}>
        <p className={`text-[11px] ${t.muted}`} suppressHydrationWarning>
          © {year} آریون — همه‌ی حقوق محفوظ است.
        </p>
        <EnamadBadge />
      </div>
    </footer>
  );
}
