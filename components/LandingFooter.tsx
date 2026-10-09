"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import { EnamadBadge } from "@/components/EnamadBadge";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { SOCIAL, SUPPORT_EMAIL, brandName } from "@/lib/brand";
import { PUBLIC_TOOLS, toolLabel } from "@/lib/tools";
import { isEn, tr } from "@/lib/i18n";

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
const groups = (): { title: string; links: { href: string; label: string }[] }[] => [
  {
    title: tr("امکانات", "Features"),
    links: [
      { href: "/routine", label: tr("روتین روزانه", "Daily routine") },
      { href: "/habit-tracker", label: tr("پیگیری عادت‌ها", "Habit tracking") },
      { href: "/daily-planner", label: tr("برنامه‌ریزی روزانه", "Daily planning") },
      { href: "/ai-planner", label: tr("برنامه‌ریز هوشمند", "Smart planner") },
      { href: "/bodybuilding-program", label: tr("برنامه‌ی بدنسازی", "Workout plan") },
      { href: "/calorie-counter", label: tr("کالری‌شمار", "Calorie counter") },
      { href: "/trading-journal", label: tr("ژورنال معاملاتی", "Trading journal") },
      { href: "/economic-calendar", label: tr("تقویم اقتصادی", "Economic calendar") },
      { href: "/forex-sessions", label: tr("ساعت بازار فارکس", "Forex market hours") },
      { href: "/learning-roadmap", label: tr("رودمپ یادگیری", "Learning roadmap") },
    ],
  },
  {
    title: tr("منابع", "Resources"),
    links: [
      { href: "/blog", label: tr("مقاله‌ها", "Articles") },
      // ابزارهای رایگان: هاب و هر ابزار از فهرست مشترک lib/tools.ts
      { href: "/tools", label: tr("ابزارهای رایگان", "Free tools") },
      ...PUBLIC_TOOLS.map((t) => ({ href: t.path, label: toolLabel(t) })),
      { href: "/faq", label: tr("سوالات متداول", "FAQ") },
    ],
  },
  {
    title: brandName(),
    links: [
      { href: "/about", label: tr("درباره ما", "About us") },
      { href: "/terms", label: tr("قوانین و مقررات", "Terms and conditions") },
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
  const GROUPS = groups();

  return (
    <footer className={`mt-12 border-t ${t.line} px-1 pb-8 pt-8 text-start`}>
      <div className="flex flex-col gap-8 rtl:lg:flex-row-reverse lg:items-start lg:justify-between lg:gap-12">
        <div className="max-w-[240px] shrink-0">
          <Link href="/" aria-label={tr("آریون — صفحه‌ی اصلی", `${brandName()} - home`)} className="inline-flex items-center gap-2.5">
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
              {brandName()}
            </span>
          </Link>
          <p className={`mt-3 text-[12px] leading-6 ${t.muted}`}>
            {tr("برنامه‌ریزی کن، اجرا کن و پیشرفتت را ببین؛ همه در یک سیستم.", "Plan, do and see your progress, all in one system.")}
          </p>
        </div>

        <nav aria-label={tr("صفحه‌های آریون", `${brandName()} pages`)} className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-9">
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
            <div className={`text-[12px] font-bold ${t.heading}`}>{tr("تماس با ما", "Contact us")}</div>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={`flex items-center justify-end ltr:justify-start gap-1.5 text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}
                  dir="ltr"
                >
                  <span dir={isEn() ? "ltr" : "rtl"} className="min-w-0 ltr:break-all">{SUPPORT_EMAIL}</span>
                  <Mail size={13} className="shrink-0" />
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL.telegram.url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-end ltr:justify-start gap-1.5 whitespace-nowrap text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}
                >
                  {tr("تلگرام", "Telegram")}
                  <TelegramIcon size={13} className="shrink-0" />
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL.instagram.url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-end ltr:justify-start gap-1.5 whitespace-nowrap text-[12px] transition-colors ${t.muted} ${t.accentHoverText}`}
                >
                  {tr("اینستاگرام", "Instagram")}
                  <InstagramIcon size={13} className="shrink-0" />
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className={`mt-8 flex flex-col-reverse items-center gap-4 border-t ${t.line} pt-5 sm:flex-row sm:justify-between`}>
        <p className={`text-[11px] ${t.muted}`} suppressHydrationWarning>
          {tr(`© ${year} آریون — همه‌ی حقوق محفوظ است.`, `© ${year} ${brandName()}. All rights reserved.`)}
        </p>
        <EnamadBadge />
      </div>
    </footer>
  );
}
