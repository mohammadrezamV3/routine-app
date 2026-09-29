"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, CalendarClock, CalendarDays, Check, Dumbbell, Flame, GraduationCap, Route, Sparkles,
  TrendingUp, UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useThemeTokens } from "@/components/PlanShowcase";
import { faNum } from "@/components/LandingHero";
import { INERT } from "@/components/LandingMockups";
import {
  PreviewRoutine, PreviewStreak, PreviewAnalysis, PreviewNumo, PreviewFitness, PreviewCalorie,
  PreviewTrade, PreviewMarket, PreviewRoadmap, PreviewMentor, type PreviewProps,
} from "@/components/LandingPreviews";
import "./landing-hero.css";

// ─── ویترینِ تعاملیِ قابلیت‌ها ─────────────────────────────────────────────
// انتخابِ بخش با همون SegmentedTabs ـِ سایت (قانونِ «انتخابِ تکی فقط با
// SegmentedTabs»)، داخلِ یک اسکرولرِ افقی برای موبایل. پخشِ خودکار با یک نوارِ
// پیشرفتِ CSS انجام می‌شه: پایانِ انیمیشنش (animationend) تبِ بعدی رو باز
// می‌کنه، پس «مکث» یعنی فقط animation-play-state: paused — بدون تایمرِ JS.
// روی هاور/فوکوس مکث، بعد از انتخابِ دستی کلاً متوقف، بیرونِ دید متوقف، و با
// prefers-reduced-motion اصلاً پخشِ خودکار نداره. هر پیش‌نمایش یک برش از
// صفحه‌ی واقعیِ همون بخشه (LandingPreviews)، و هر ادعای متن با کدِ اپ چک شده.

type ModKey = "routine" | "streak" | "analysis" | "numo" | "fitness" | "calorie" | "trade" | "market" | "roadmap" | "mentor";

type Mod = {
  key: ModKey;
  tab: string;
  icon: LucideIcon;
  title: string;
  hook: string;
  bullets: [string, string, string];
  cta: string;
  href: string;
};

const MODS: Mod[] = [
  {
    key: "routine", tab: "روتین", icon: CalendarDays, href: "/routine",
    title: "روتین روزانه و برنامه هفتگی",
    hook: "هیچ کاری لای شلوغیِ روز گم نمی‌شود",
    bullets: [
      "برنامه‌های تکرارشونده با ساعت، برچسب و میزان اهمیت؛ «امروز» و «برنامه هفتگی» همیشه هم‌گام‌اند",
      "تاریخچه‌ی هر روز در تقویم؛ کاری که وقتش گذشته و انجام نشده، پنهان نمی‌ماند",
      "یادآوری برنامه‌ها و نوبت‌های دارو با نوتیفیکیشن، سرِ وقت",
    ],
    cta: "روتینم را بسازم",
  },
  {
    key: "streak", tab: "استریک و دوستان", icon: Flame, href: "/habit-tracker",
    title: "استریک و دوستان",
    hook: "زنجیره‌ای که دلت نمی‌آید پاره‌اش کنی",
    bullets: [
      "8 سطح استریک از 1 تا 365 روز؛ هر سطح رنگ و شعله‌ی خودش را دارد",
      "دوستانت را اضافه کن تا پیشرفت امروز و استریکِ همدیگر را ببینید",
      "در بدنسازی و کالری هم جلسه‌ها و روزهای موفقِ دوستانت کنارت است",
    ],
    cta: "استریکم را شروع کنم",
  },
  {
    key: "analysis", tab: "آنالیز هفتگی", icon: BarChart3, href: "/auth/signup",
    title: "آنالیز هفتگی هوشمند",
    hook: "ببین هفته‌ات واقعاً چطور گذشت",
    bullets: [
      "امتیاز و نمره‌ی کل هفته از روتین، کارها، تمرین، تغذیه، ترید و یادگیری",
      "بینش از داده‌ی خودت — مثل اثر خواب روی روتین — و پیش‌بینی پایان هفته",
      "مقایسه با هفته‌ی قبل، هدف هفتگی و دستاوردها",
    ],
    cta: "آنالیزم را ببینم",
  },
  {
    key: "numo", tab: "نومو", icon: Sparkles, href: "/ai-planner",
    title: "«نومو»، دستیار برنامه‌ریزی",
    hook: "بنویس چه می‌خواهی؛ چیدنش با نومو",
    bullets: [
      "به فارسیِ معمولی بنویس؛ نومو برنامه‌ی روتینت را می‌سازد، جابه‌جا می‌کند یا حذف می‌کند",
      "روز و ساعت را از جمله‌ات درمی‌آورد و تداخل با برنامه‌های دیگرت را بررسی می‌کند",
      "هر تغییر همان لحظه در «روتین من» و بقیه‌ی دستگاه‌هایت دیده می‌شود",
    ],
    cta: "با نومو شروع کنم",
  },
  {
    key: "fitness", tab: "بدنسازی", icon: Dumbbell, href: "/bodybuilding-program",
    title: "برنامه‌ی بدنسازی",
    hook: "برنامه‌ای به اندازه‌ی بدن و تجهیزاتِ خودت",
    bullets: [
      "برنامه‌ی تمرینی با هوش مصنوعی یا دستی؛ حرکتی که تجهیزاتش را نداری، جایگزین می‌شود",
      "شروع تمرین با کرنومتر و ثبت ست‌به‌ست، و کاتالوگ 149 حرکت با آموزش و سطح سختی",
      "روزی را جا انداختی؟ «رد شدن» یا «ماندن» — انتخاب با خودت است",
    ],
    cta: "برنامه‌ام را بگیرم",
  },
  {
    key: "calorie", tab: "کالری", icon: UtensilsCrossed, href: "/calorie-counter",
    title: "کالری‌شمار و ماکروها",
    hook: "بدون حساب‌وکتاب دستی بدان چه می‌خوری",
    bullets: [
      "کالری و درشت‌مغذیِ روزانه بر اساس قد، وزن، سن و هدفت محاسبه می‌شود",
      "264 خوراکیِ ایرانی و جهانی آماده است؛ هر وعده را با گرم ثبت کن و ماکروهای روز را ببین",
      "نمودار هفتگی و ماهانه، استریک روزهای موفق و تفکیک هر وعده",
    ],
    cta: "کالری‌شمارم را بسازم",
  },
  {
    key: "trade", tab: "ژورنال ترید", icon: TrendingUp, href: "/trading-journal",
    title: "ژورنال ترید حساب‌محور",
    hook: "معامله‌ای که مرور نشود، تکرار می‌شود",
    bullets: [
      "هر حساب جدا: بالانس، سود و زیان، نرخ برد و هدف؛ حذف حساب یعنی آرشیو، نه پاک‌شدن تاریخچه",
      "همگام‌سازی خودکار با متاتریدر 4 و 5 با اکسپرت و کد اتصال — رمز حساب هرگز خواسته نمی‌شود",
      "چک‌لیست ورود که وضعیتش لحظه‌ی ثبت معامله ذخیره می‌شود، به‌علاوه‌ی یادداشت و برچسب",
    ],
    cta: "ژورنالم را بسازم",
  },
  {
    key: "market", tab: "تقویم و ساعت فارکس", icon: CalendarClock, href: "/economic-calendar",
    title: "تقویم اقتصادی و ساعت فارکس",
    hook: "خبر و سشن را پیش از ورود ببین",
    bullets: [
      "تقویم اقتصادی 9 ارز اصلی با Actual، Forecast و Previous و فیلتر تأثیر و ارز",
      "هشدار با نوتیفیکیشن برای خبرهایی که زیر نظر گرفته‌ای",
      "سشن‌های سیدنی، توکیو، فرانکفورت، لندن و نیویورک به وقت خودت، با ساعت تابستانی واقعی",
    ],
    cta: "تقویمم را ببینم",
  },
  {
    key: "roadmap", tab: "رودمپ", icon: Route, href: "/learning-roadmap",
    title: "رودمپ یادگیری با AI",
    hook: "از صفر تا تسلط، قدم‌به‌قدم",
    bullets: [
      "موضوع و سطحت را بگو؛ مسیر مرحله‌به‌مرحله با هدف، کارهای عملی و منابع ساخته می‌شود",
      "هر مرحله پروژه‌ی جمع‌بندی و ابزارهای لازمش را دارد",
      "کارهای هر مرحله را تیک بزن و پیشرفت کل مسیر را ببین",
    ],
    cta: "مسیرم را بچینم",
  },
  {
    key: "mentor", tab: "مربی‌ها", icon: GraduationCap, href: "/mentors",
    title: "مربی‌ها",
    hook: "یک همراه واقعی کنار مسیرت",
    bullets: [
      "مربی روتین، بدنسازی یا تغذیه پیدا کن؛ رتبه‌بندی بر اساس شایستگی است، نه تبلیغ",
      "گفت‌وگو رمزگذاری سرتاسری دارد؛ نه سرور و نه هیچ ادمینی متنش را نمی‌بیند",
      "پیشرفتت خودکار از تیک‌های روتینت به مربی می‌رسد؛ اگر ظرفیتش پر بود، در صف انتظار بمان",
    ],
    cta: "مربی‌ام را پیدا کنم",
  },
];

const AUTOPLAY_MS = 7000;

const PREVIEWS: Record<ModKey, (p: PreviewProps) => JSX.Element> = {
  routine: PreviewRoutine,
  streak: PreviewStreak,
  analysis: PreviewAnalysis,
  numo: PreviewNumo,
  fitness: PreviewFitness,
  calorie: PreviewCalorie,
  trade: PreviewTrade,
  market: PreviewMarket,
  roadmap: PreviewRoadmap,
  mentor: PreviewMentor,
};

export function LandingShowcase() {
  const t = useThemeTokens();
  const [active, setActive] = useState<ModKey>("routine");
  const [hover, setHover] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [inView, setInView] = useState(false);
  const [autoplayOk, setAutoplayOk] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setAutoplayOk(!reduce);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // تبِ فعال رو داخلِ اسکرولرِ افقی (فقط خودِ اسکرولر، نه کلِ صفحه) به دید بیار
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const btn = sc.querySelectorAll<HTMLElement>(".auth-tab")[MODS.findIndex((m) => m.key === active)];
    if (!btn) return;
    if (sc.scrollWidth <= sc.clientWidth + 1) return;
    const target = btn.offsetLeft - (sc.clientWidth - btn.offsetWidth) / 2;
    sc.scrollTo({ left: target, behavior: autoplayOk ? "smooth" : "auto" });
  }, [active, autoplayOk]);

  const next = useCallback(() => {
    setActive((k) => MODS[(MODS.findIndex((m) => m.key === k) + 1) % MODS.length].key);
  }, []);

  const playing = autoplayOk && !stopped;
  const paused = hover || !inView;
  const idx = MODS.findIndex((m) => m.key === active);
  const mod = MODS[idx];
  const Preview = PREVIEWS[active];
  const Icon = mod.icon;

  return (
    <section
      id="sec-landing-features"
      ref={rootRef}
      className={`lsc${inView ? "" : " is-paused"}`}
      aria-labelledby="lsc-title"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
    >
      <div className="lsc-head">
        <span className="lh-eyebrow"><span className="lh-eyebrow-dot" aria-hidden="true" /> برش‌هایی از خودِ اپ</span>
        <h2 id="lsc-title" className={`lsc-title ${t.heading}`}>
          به‌جای چند اپ و یک دفترچه، <span className="lh-brand">فقط آریون</span>
        </h2>
      </div>

      <div className="lsc-tabs-scroll no-scrollbar" ref={scrollerRef}>
        <SegmentedTabs
          options={MODS.map((m) => {
            const I = m.icon;
            return { value: m.key, label: <span className="lsc-tab-label"><I size={14} />{m.tab}</span> };
          })}
          active={active}
          onChange={(v) => { setStopped(true); setActive(v); }}
        />
      </div>

      <div className={`lsc-card border ${t.cardBorder} ${t.cardBg} ${t.shadow}`}>
        {playing ? (
          <div className="lsc-progress" aria-hidden="true">
            <span
              key={active}
              className="lsc-progress-fill"
              style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
              onAnimationEnd={next}
            />
          </div>
        ) : null}

        <div className="lsc-body">
          <div className="lsc-stage" aria-hidden="true" {...INERT}>
            <div className="lsc-stage-glow" />
            <div key={active} className="lsc-stage-in">
              <Preview live={inView} />
            </div>
          </div>

          <div key={`t-${active}`} className="lsc-text" aria-live={playing ? "off" : "polite"}>
            <div className="lsc-text-top">
              <span className="lsc-icon"><Icon size={20} /></span>
              <span className={`lsc-count ${t.muted}`}>{faNum(String(idx + 1).padStart(2, "0"))} / {faNum(String(MODS.length).padStart(2, "0"))}</span>
            </div>
            <h3 className={`lsc-mod-title ${t.heading}`}>{mod.title}</h3>
            <p className="lsc-hook">{mod.hook}</p>
            <ul className="lsc-bullets">
              {mod.bullets.map((b) => (
                <li key={b} className={t.heading}>
                  <span className="lsc-bullet-ic"><Check size={12} strokeWidth={3} /></span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="lsc-actions">
              <Link
                href="/auth/signup"
                className={`lsc-cta inline-flex items-center gap-1.5 rounded-[18px] px-5 py-3 text-[14px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] ${t.accentBg} ${t.accentShadow}`}
              >
                {mod.cta} <ArrowLeft size={16} />
              </Link>
              {mod.href !== "/auth/signup" && (
                <Link href={mod.href} className="lh-link lsc-more">بیشتر بخوانید</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
