"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import { EnamadBadge } from "@/components/EnamadBadge";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { SOCIAL, SUPPORT_EMAIL } from "@/lib/brand";

// فوتر صفحه‌ی لندینگ — بدون کارت و بدون بک‌گراند (طبق قانون پروژه: هیچ
// عنصری خودسرانه بک‌گراند نمی‌گیرد)، فقط یک خط جداکننده و همان توکن‌های
// رنگی بقیه‌ی لندینگ (useThemeTokens) — ولی حالا یک فوتر واقعی چندستونه:
// برند+توضیح، گروه‌های لینک، و یک ستون تماس/شبکه‌های اجتماعی (از همون
// lib/brand.ts که صفحه‌ی «درباره ما» هم استفاده می‌کند — چیز جدیدی ساخته
// نشده). روی دسکتاپ همه‌چیز راست‌چین (RTL) کنار هم می‌شینند، روی موبایل
// دوستونه می‌شوند تا فهرست ۱۰تایی «امکانات» له نشود.
//
// همه‌ی لینک‌های فوتر قبلی سر جایشان مانده‌اند: /about و /faq و /terms و
// صفحه‌های فرود عمومی بدون این لینک‌ها برای کراولر یتیم‌اند (هیچ لینک
// HTMLای از صفحه‌ی اصلی به آن‌ها نبود). فقط در سه گروه کوتاه چیده شده‌اند.
const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "امکانات",
    links: [
      { href: "/routine", label: "روتین روزانه" },
      { href: "/habit-tracker", label: "پیگیری عادت‌ها" },
      { href: "/daily-planner", label: "برنامه‌ریزی روزانه" },
      { href: "/ai-planner", label: "برنامه‌ریز هوشمند" },
      { href: "/bodybuilding-program", label: "برنامه‌ی بدنسازی" },
      { href: "/calorie-counter", label: "کالری‌شمار" },
      { href: "/trading-journal", label: "ژورنال معاملاتی" },
      { href: "/economic-calendar", label: "تقویم اقتصادی" },
      { href: "/forex-sessions", label: "ساعت بازار فارکس" },
      { href: "/learning-roadmap", label: "رودمپ یادگیری" },
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

// سال شمسی از خود مرورگر/سرور — ثابت دستی هر نوروز کهنه می‌شد.
function jalaliYear(): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { year: "numeric" }).format(new Date());
  } catch {
    return "";
  }
}

export function LandingFooter() {
  const t = useThemeTokens();
  const year = jalaliYear();

  return (
    <footer className={`mt-12 border-t ${t.line} px-1 pb-8 pt-8 text-right`}>
      <div className="flex flex-col gap-8 lg:flex-row-reverse lg:items-start lg:justify-between lg:gap-12">
        <div className="max-w-[240px] shrink-0">
          <Link href="/" aria-label="آریون — صفحه‌ی اصلی" className="inline-flex items-center gap-2.5">
            <span className="relative h-8 w-8 shrink-0" aria-hidden="true">
              {/* هر دو نسخه‌ی لوگو هم‌زمان‌اند و فقط opacity عوض می‌شود — مثل AuthBrandMark. */}
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
              آریون
            </span>
          </Link>
          <p className={`mt-3 text-[12px] leading-6 ${t.muted}`}>
            برنامه‌ریزی کن، اجرا کن و پیشرفتت را ببین؛ همه در یک سیستم.
          </p>
        </div>

        <nav aria-label="صفحه‌های آریون" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-9">
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

          {/* ستون تماس/شبکه‌های اجتماعی — دقیقا همون دیتای واقعی
              lib/brand.ts که صفحه‌ی «درباره ما» هم نشون می‌ده، لینک تازه‌ای
              ساخته نشده. */}
          <div>
            <div className={`text-[12px] font-bold ${t.heading}`}>تماس با ما</div>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={`flex items-center justify-end gap-1.5 text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}
                  dir="ltr"
                >
                  <span dir="rtl">{SUPPORT_EMAIL}</span>
                  <Mail size={13} className="shrink-0" />
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL.telegram.url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-end gap-1.5 whitespace-nowrap text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}
                >
                  تلگرام
                  <TelegramIcon size={13} className="shrink-0" />
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL.instagram.url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-end gap-1.5 whitespace-nowrap text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}
                >
                  اینستاگرام
                  <InstagramIcon size={13} className="shrink-0" />
                </a>
              </li>
            </ul>
          </div>
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
