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
import { tr, trv } from "@/lib/i18n";
import { faNum } from "@/components/LandingHero";
import { INERT } from "@/components/LandingMockups";
import {
  PreviewRoutine, PreviewStreak, PreviewAnalysis, PreviewNumo, PreviewFitness, PreviewCalorie,
  PreviewTrade, PreviewMarket, PreviewRoadmap, PreviewMentor, type PreviewProps,
} from "@/components/LandingPreviews";
import "./landing-hero.css";

// ─── ویترین تعاملی قابلیت‌ها ─────────────────────────────────────────────
// انتخاب بخش با همون SegmentedTabs ـ سایت (قانون «انتخاب تکی فقط با
// SegmentedTabs»)، داخل یک اسکرولر افقی برای موبایل. پخش خودکار با یک نوار
// پیشرفت CSS انجام می‌شه: پایان انیمیشنش (animationend) تب بعدی رو باز
// می‌کنه، پس «مکث» یعنی فقط animation-play-state: paused — بدون تایمر JS.
// روی هاور/فوکوس مکث، بعد از انتخاب دستی کلا متوقف، بیرون دید متوقف، و با
// prefers-reduced-motion اصلا پخش خودکار نداره. هر پیش‌نمایش یک برش از
// صفحه‌ی واقعی همون بخشه (LandingPreviews)، و هر ادعای متن با کد اپ چک شده.

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

const mods = (): Mod[] => [
  {
    key: "routine", tab: tr("روتین", "Routine"), icon: CalendarDays, href: "/routine",
    title: tr("برنامه‌ای که واقعا اجرا شود", "A plan that actually gets done"),
    hook: tr("روتینت را برای روز و هفته بچین، کارها را انجام بده و روند پایبندی‌ات را ببین.", "Lay out your routine for the day and week, do the tasks and watch your consistency."),
    bullets: [
      tr("برنامه‌ریزی و یادآوری — کارهایت را برای زمان مناسب تنظیم کن تا چیزی از قلم نیفتد.", "Planning and reminders: set your tasks for the right time so nothing is missed."),
      tr("پیوستگی — ببین چند روز پشت سر هم به برنامه‌ات عمل کرده‌ای.", "Consistency: see how many days in a row you have followed your plan."),
      tr("تاریخچه — به روزهای گذشته برگرد و عملکردت را بررسی کن.", "History: go back to past days and review your performance."),
    ],
    cta: tr("ساخت روتین", "Build a routine"),
  },
  {
    key: "streak", tab: tr("استریک و دوستان", "Streaks and friends"), icon: Flame, href: "/habit-tracker",
    title: tr("پیوستگی، خودش یک دستاورد است.", "Consistency is an achievement in itself."),
    hook: tr("روزهایی را که به برنامه‌ات عمل کرده‌ای ثبت کن و زنجیره پیشرفتت را ببین.", "Log the days you followed your plan and watch your chain of progress grow."),
    bullets: [
      tr("8 سطح استریک از 1 تا 365 روز؛ هر سطح رنگ و شعله‌ی خودش را دارد", "8 streak levels from 1 to 365 days; each level has its own colour and flame"),
      tr("با هم جلو بروید — پیشرفت دوستانت را ببین و مسیرت را در کنار آنها ادامه بده.", "Move forward together: see your friends' progress and keep going alongside them."),
      tr("در بدنسازی و کالری هم جلسه‌ها و روزهای موفق دوستانت را ببین", "See your friends' successful sessions and days in workouts and calories too"),
    ],
    cta: tr("شروع زنجیره", "Start a streak"),
  },
  {
    key: "analysis", tab: tr("آنالیز هفتگی", "Weekly review"), icon: BarChart3, href: "/auth/signup",
    title: tr("فقط انجام نده؛ بررسی کن.", "Do not just do; review."),
    hook: tr("در پایان هفته ببین چه چیزی خوب پیش رفته، کجا عقب مانده‌ای و هفته بعد روی چه چیزی باید تمرکز کنی.", "At the end of the week, see what went well, where you fell behind and what to focus on next week."),
    bullets: [
      tr("امتیاز و نمره‌ی کل هفته، به‌تفکیک هر بخش از برنامه‌هایت", "Your overall weekly score, broken down by each part of your plans"),
      tr("بینش از داده‌ی خودت — مثل اثر خواب روی روتین — و پیش‌بینی پایان هفته", "Insights from your own data, such as the effect of sleep on routine, plus an end-of-week forecast"),
      tr("مقایسه با هفته‌ی قبل، هدف هفتگی و دستاوردها", "Comparison with last week, a weekly goal and achievements"),
    ],
    cta: tr("مشاهده عملکرد", "View performance"),
  },
  {
    key: "numo", tab: tr("نومو", "Nomo"), icon: Sparkles, href: "/ai-planner",
    title: tr("برنامه‌ریزی، بدون دردسر", "Planning without the hassle"),
    hook: tr("به نومو، مدیر برنامه هوشمند، بگو چه می‌خواهی؛ برای ساختن و مدیریت برنامه‌هایت از او کمک بگیر.", "Tell Nomo, the smart plan manager, what you want; get help from it to build and manage your plans."),
    bullets: [
      tr("به فارسی ساده بنویس؛ نومو برنامه‌ی روتینت را می‌سازد، جابه‌جا می‌کند یا حذف می‌کند", "Write in plain language; Nomo creates, moves or deletes your routine plans"),
      tr("روز و ساعت را از جمله‌ات درمی‌آورد و تداخل با برنامه‌های دیگرت را بررسی می‌کند", "It works out the day and time from your sentence and checks for conflicts with your other plans"),
      tr("هر تغییر همان لحظه در «روتین من» و بقیه‌ی دستگاه‌هایت دیده می‌شود", "Every change shows up instantly in My Routine and on your other devices"),
    ],
    cta: tr("امتحانش کن", "Try it"),
  },
  {
    key: "fitness", tab: tr("بدنسازی", "Workouts"), icon: Dumbbell, href: "/bodybuilding-program",
    title: tr("تمرینت را از برنامه تا نتیجه دنبال کن", "Follow your training from plan to result"),
    hook: tr("برنامه تمرینی، حرکات و عملکردت را یک‌جا مدیریت کن و بدان امروز دقیقا چه کاری باید انجام دهی.", "Manage your training plan, exercises and performance in one place and know exactly what to do today."),
    bullets: [
      tr("برنامه‌ی تمرینی با هوش مصنوعی یا دستی؛ حرکتی که تجهیزاتش را نداری، جایگزین می‌شود", "A training plan built with AI or by hand; an exercise you lack the equipment for gets replaced"),
      tr("شروع تمرین با کرنومتر و ثبت ست‌به‌ست، و کاتالوگ 149 حرکت با آموزش و سطح سختی", "Start a workout with a timer and log set by set, plus a catalogue of 149 exercises with tutorials and difficulty levels"),
      tr("روزی را جا انداختی؟ «رد شدن» یا «ماندن» — انتخاب با خودت است", "Missed a day? Skip or Stay: the choice is yours"),
    ],
    cta: tr("برنامه‌ام را بگیرم", "Get my plan"),
  },
  {
    key: "calorie", tab: tr("کالری", "Calories"), icon: UtensilsCrossed, href: "/calorie-counter",
    title: tr("تغذیه‌ات را هم اندازه‌گیری کن", "Measure your nutrition too"),
    hook: tr("کالری و ماکروهای روزانه‌ات را ثبت کن و ببین چقدر به هدف تغذیه‌ای خودت نزدیک شده‌ای.", "Log your daily calories and macros and see how close you are to your nutrition goal."),
    bullets: [
      tr("هدف کالری و درشت‌مغذی‌های روزانه بر اساس قد، وزن، سن و هدف خودت محاسبه می‌شود", "Your daily calorie and macro goals are calculated from your height, weight, age and goal"),
      tr("264 خوراکی ایرانی و جهانی آماده است؛ هر وعده را با گرم ثبت کن و ماکروهای روز را ببین", "264 Iranian and international foods are ready; log each meal in grams and see the day's macros"),
      tr("نمودار هفتگی و ماهانه، استریک روزهای موفق و تفکیک هر وعده", "Weekly and monthly charts, a streak of successful days and a breakdown of each meal"),
    ],
    cta: tr("شروع ثبت تغذیه", "Start logging nutrition"),
  },
  {
    key: "trade", tab: tr("ژورنال ترید", "Trading journal"), icon: TrendingUp, href: "/trading-journal",
    title: tr("هر معامله، بخشی از مسیر توست.", "Every trade is part of your journey."),
    hook: tr("معاملاتت را ثبت کن، چک‌لیستت را اجرا کن و عملکردت را در ژورنال ترید بررسی کن.", "Log your trades, run your checklist and review your performance in the trading journal."),
    bullets: [
      tr("هر حساب جدا: بالانس، سود و زیان، نرخ برد و هدف؛ حذف حساب یعنی آرشیو، نه پاک‌شدن تاریخچه", "Each account separately: balance, profit and loss, win rate and goal; deleting an account means archiving it, not erasing its history"),
      tr("با اتصال MT4 و MT5 (اکسپرت و کد اتصال)، معاملاتت مستقیما وارد ژورنال می‌شود؛ رمز حساب معاملاتی هرگز خواسته نمی‌شود", "With MT4 and MT5 connected (Expert Advisor and connection code), your trades go straight into the journal; your trading account password is never requested"),
      tr("چک‌لیست ورود که وضعیتش لحظه‌ی ثبت معامله ذخیره می‌شود، به‌علاوه‌ی یادداشت و برچسب", "An entry checklist whose state is saved at the moment you log a trade, plus notes and tags"),
    ],
    cta: tr("ژورنالم را بسازم", "Create my journal"),
  },
  {
    key: "market", tab: tr("تقویم و ساعت فارکس", "Calendar and forex hours"), icon: CalendarClock, href: "/economic-calendar",
    title: tr("تقویم اقتصادی و ساعت فارکس", "Economic calendar and forex hours"),
    hook: tr("خبر و سشن را پیش از معامله ببین", "See the news and sessions before you trade"),
    bullets: [
      tr("تقویم اقتصادی 9 ارز اصلی با Actual، Forecast و Previous و فیلتر تاثیر و ارز", "Economic calendar for 9 major currencies with Actual, Forecast and Previous, and filters for impact and currency"),
      tr("هشدار با نوتیفیکیشن برای خبرهایی که زیر نظر گرفته‌ای", "Notification alerts for the news events you are watching"),
      tr("سشن‌های سیدنی، توکیو، فرانکفورت، لندن و نیویورک به وقت خودت، با ساعت تابستانی واقعی", "Sydney, Tokyo, Frankfurt, London and New York sessions in your own time, with real daylight saving"),
    ],
    cta: tr("تقویمم را ببینم", "See my calendar"),
  },
  {
    key: "roadmap", tab: tr("رودمپ", "Roadmap"), icon: Route, href: "/learning-roadmap",
    title: tr("بدان قدم بعدی چیست.", "Know what the next step is."),
    hook: tr("هدف بزرگت را به مسیرهای کوچک‌تر تبدیل کن و پیشرفتت را مرحله‌به‌مرحله دنبال کن.", "Turn your big goal into smaller paths and follow your progress stage by stage."),
    bullets: [
      tr("موضوع و سطحت را بگو؛ مسیر مرحله‌به‌مرحله با هدف، کارهای عملی و منابع ساخته می‌شود", "Tell it your topic and level; a stage-by-stage path is built with goals, practical tasks and resources"),
      tr("هر مرحله پروژه‌ی جمع‌بندی و ابزارهای لازمش را دارد", "Each stage has a wrap-up project and the tools it needs"),
      tr("کارهای هر مرحله را تیک بزن و پیشرفت کل مسیر را ببین", "Tick off each stage's tasks and see the progress of the whole path"),
    ],
    cta: tr("ساخت مسیر یادگیری", "Build a learning path"),
  },
  {
    key: "mentor", tab: tr("مربی‌ها", "Mentors"), icon: GraduationCap, href: "/mentors",
    title: tr("تنها جلو نرو.", "Do not go it alone."),
    hook: tr("مربی موردنظرت را پیدا کن، برنامه بگیر و روند همکاری‌تان را در آریون مدیریت کن.", "Find the mentor you want, get a plan and manage your collaboration in Arion."),
    bullets: [
      tr("پیدا کردن مربی، دریافت برنامه و تایید یا درخواست تغییر؛ رتبه‌بندی بر اساس شایستگی است", "Find a mentor, get a plan and approve it or ask for changes; ranking is merit-based"),
      tr("چت‌های سرتاسر رمزنگاری‌شده؛ متنشان را جز خودتان کسی نمی‌بیند", "End-to-end encrypted chats; nobody but you can see their text"),
      tr("پیگیری روند پیشرفت خودکار از تیک‌های روتینت انجام می‌شود؛ اگر ظرفیت مربی پر بود، در صف انتظار بمان", "Progress tracking is automatic from your routine ticks; if a mentor is at capacity, stay on the waiting list"),
    ],
    cta: tr("مشاهده مربی‌ها", "See mentors"),
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
  const MODS = mods();
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

  // تب فعال رو داخل اسکرولر افقی (فقط خود اسکرولر، نه کل صفحه) به دید بیار
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
        <span className="lh-eyebrow"><span className="lh-eyebrow-dot" aria-hidden="true" /> {tr("برش‌هایی از خود اپ", "Snapshots from the app itself")}</span>
        <h2 id="lsc-title" className={`lsc-title ${t.heading}`}>
          {trv(<>همه‌چیز وقتی <span className="lh-brand">کنار هم</span> باشد، ساده‌تر می‌شود.</>, <>Everything gets simpler when it is <span className="lh-brand">together</span>.</>)}
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
                {mod.cta} <ArrowLeft size={16} className="dir-flip" />
              </Link>
              {mod.href !== "/auth/signup" && (
                <Link href={mod.href} className="lh-link lsc-more">{tr("بیشتر بخوانید", "Read more")}</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
