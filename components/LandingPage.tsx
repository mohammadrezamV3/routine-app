"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Quote,
  ClipboardList, Clock, ShieldCheck, TrendingUp, Headset, Lightbulb,
  Smartphone, BarChart3, Zap, Users, Sparkles,
} from "lucide-react";
import { staggerFieldsIn } from "@/lib/uiAnim";
import { ICONS } from "@/components/NavDrawer";
import { getSiteMarket } from "@/lib/market";
import { useThemeTokens, PlansSection } from "@/components/PlanShowcase";
import { EnamadBadge } from "@/components/EnamadBadge";

const SLEEP_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const FEATURES = [
  {
    icon: ICONS.weekly,
    title: "روتین هفتگی",
    hook: "هیچ‌چیزی از قلم نمی‌افته",
    body: "برنامه‌ی هفتگی‌ات رو بچین، هر روز رو تیک بزن، استریکت رو حفظ کن.",
  },
  {
    icon: SLEEP_ICON,
    title: "خواب",
    hook: "به موقع بیدار شو",
    body: "ساعت بیدارشدنت بخشی از هر روزِ کامله — نظم خواب یعنی نظم همه‌چیز.",
  },
  {
    icon: ICONS.exercise,
    title: "بدنسازی",
    hook: "بدنتو بساز",
    body: "لیفتینگ، حجم، کات یا استقامت — بر اساس هدفت یه برنامه واقعی می‌سازیم، نه یه قالب عمومی. شمارش کالری و ماکروها هم همراهشه، توی همون یه بخش.",
  },
  {
    icon: ICONS.trade,
    title: "ژورنال ترید",
    hook: "بنویس، آنالیز کن، بهتر شو",
    body: "پنل ترید و آمار کامل: سود/زیان، نرخ برد، میانگین سود و ضرر و تقویم معاملاتت — همه در یک نگاه، دقیق و منظم.",
  },
  {
    icon: ICONS.roadmaps,
    title: "ai mapping",
    hook: "بهترین مسیر رو برات می‌چینیم",
    body: "با هوش مصنوعی، یکی از بهترین راه‌ها برای رسیدن به هدفت رو طراحی می‌کنیم — از گیتار تا اسپانیایی تا فتوشاپ، هر چیزی بخوای یاد بگیری، یک نقطه شروع مشخص داری.",
  },
];

// ۲۰ نقل‌قول — یکی‌شون تصادفی (بعد از mount، برای جلوگیری از hydration
// mismatch) به‌جای باکس اعتمادسازی قبلی نشون داده می‌شه.
const QUOTES = [
  { text: "موفقیت مجموعه‌ای از انتخاب‌های کوچک و مهربانانه با خودته، روز از پی روز.", author: "برایان تریسی" },
  { text: "هر قدم کوچیک هم یه قدمه؛ لازم نیست همیشه بزرگ باشه.", author: "ضرب‌المثل" },
  { text: "به خودت زمان بده؛ رشد آروم هم رشدِه.", author: "ضرب‌المثل" },
  { text: "امروز فقط کافیه یه‌کم بهتر از دیروز باشی.", author: "ضرب‌المثل" },
  { text: "هر سفر بلندی، با یه قدم آروم شروع می‌شه.", author: "لائوتزو" },
  { text: "نظم یعنی مهربونی با آینده‌ی خودت.", author: "ضرب‌المثل" },
  { text: "عادت‌های کوچیک و ملایم، آروم‌آروم زندگی رو می‌سازن.", author: "جیمز کلییر" },
  { text: "لازم نیست عجله کنی؛ فقط ادامه بده.", author: "ضرب‌المثل" },
  { text: "هر روز یک فرصت تازه‌ست، بدون قضاوت دیروز.", author: "ضرب‌المثل" },
  { text: "کافیه امروز رو خوب زندگی کنی؛ فردا خودش میاد.", author: "ضرب‌المثل" },
  { text: "کیفیت روزهات، از جنس همون عادت‌های کوچیک و آرومته.", author: "جیمز کلییر" },
  { text: "صبر داشتن با خودت هم بخشی از مسیره.", author: "ضرب‌المثل" },
  { text: "هر تغییر بزرگ، از یه تصمیم ساده و آروم شروع می‌شه.", author: "ضرب‌المثل" },
  { text: "وقتی مسیرت روشنه، هر قدم راحت‌تر برداشته می‌شه.", author: "ضرب‌المثل" },
  { text: "نظم یعنی گاهی با مهربونی به خودت «نه» گفتن.", author: "ضرب‌المثل" },
  { text: "هر روزت رو با آرامش بساز، نه با فشار.", author: "ضرب‌المثل" },
  { text: "رشد لازم نیست سخت باشه؛ گاهی فقط یعنی یه قدم بیرون از عادت.", author: "ضرب‌المثل" },
  { text: "کاری که می‌تونی امروز با آرامش انجام بدی رو به فردا نسپار.", author: "بنجامین فرانکلین" },
  { text: "همیشه می‌شه دوباره شروع کرد، آروم و بدون از دست دادن امید.", author: "وینستون چرچیل" },
  { text: "بهترین نسخه‌ی خودت، همونیه که با خودش مهربونه.", author: "ضرب‌المثل" },
];

// نمونه‌ی تصویریِ «امروز چی داریم» — دیتای واقعیِ کاربر نیست (این بخش قبل از
// لاگین دیده می‌شه)، فقط یک پیش‌نمایشِ نمونه از شکلِ واقعیِ چک‌لیستِ روزانه.
const TODAY_ITEMS = [
  { label: "مدیتیشن", done: true },
  { label: "ورزش", done: true },
  { label: "مطالعه", done: true },
  { label: "نوشیدن آب", done: true },
  { label: "یادداشت روزانه", done: true },
];
const TODAY_ITEMS_INTL = [
  { label: "Meditation", done: true },
  { label: "Workout", done: true },
  { label: "Reading", done: true },
  { label: "Drink water", done: true },
  { label: "Daily journal", done: true },
];

const WHY_US = [
  { icon: ShieldCheck, color: "#22C55E", title: "امن و خصوصی", body: "اطلاعات تو 100٪ محفوظ می‌مونه" },
  { icon: TrendingUp, color: "#A855F7", title: "برنامه‌های شخصی", body: "متناسب با هدف‌ها و سبک زندگی تو" },
  { icon: Headset, color: "#3B82F6", title: "پشتیبانی واقعی", body: "ما کنار توایم، هر زمان که نیاز داری" },
  { icon: Lightbulb, color: "#F59E0B", title: "ابزارهای کاربردی", body: "همه‌چیز برای رشد در یک اپلیکیشن" },
  { icon: Smartphone, color: "#EC4899", title: "همه‌جا در دسترس", body: "موبایل، تبلت یا دسکتاپ — همیشه همراهته" },
  { icon: BarChart3, color: "#06B6D4", title: "پیشرفت قابل‌مشاهده", body: "آمار و گزارش دقیق از مسیر پیشرفتت" },
  { icon: Zap, color: "#F97316", title: "سریع و ساده", body: "بدون شلوغی، فقط چیزی که واقعاً لازم داری" },
  { icon: Users, color: "#14B8A6", title: "برای همه سبک‌ها", body: "از مبتدی تا حرفه‌ای، متناسب با روال خودت" },
  { icon: Sparkles, color: "#8B5CF6", title: "همیشه در حال بهتر شدن", body: "فیچرهای جدید مرتب اضافه می‌شن" },
];
const WHY_US_INTL = [
  { icon: ShieldCheck, color: "#22C55E", title: "Private & secure", body: "Your data stays 100% protected" },
  { icon: TrendingUp, color: "#A855F7", title: "Personalized plans", body: "Matched to your goals & lifestyle" },
  { icon: Headset, color: "#3B82F6", title: "Real support", body: "We're with you whenever you need us" },
  { icon: Lightbulb, color: "#F59E0B", title: "Practical tools", body: "Everything to grow, in one app" },
  { icon: Smartphone, color: "#EC4899", title: "Access anywhere", body: "Mobile, tablet or desktop — always with you" },
  { icon: BarChart3, color: "#06B6D4", title: "Visible progress", body: "Clear stats and reports on your journey" },
  { icon: Zap, color: "#F97316", title: "Fast & simple", body: "No clutter, just what you actually need" },
  { icon: Users, color: "#14B8A6", title: "For every style", body: "Beginner to pro, fits your own routine" },
  { icon: Sparkles, color: "#8B5CF6", title: "Always improving", body: "New features shipped regularly" },
];

function FeatureCarousel() {
  const t = useThemeTokens();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const pausedRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setDir(1);
        setIndex((i) => (i + 1) % FEATURES.length);
      }
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const f = FEATURES[index];
  const go = (delta: number) => {
    setDir(delta);
    setIndex((i) => (i + delta + FEATURES.length) % FEATURES.length);
  };

  // زیر md فلش‌ها مخفی‌ن و به‌جاش با سوایپ انگشت جابه‌جا می‌شه —
  // کشیدن به چپ باید عقب ببره (اسلایدِ قبلی)، کشیدن به راست باید جلو ببره (اسلایدِ بعدی)
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? -1 : 1);
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={`relative overflow-hidden rounded-[28px] border ${t.cardBorder} ${t.cardBg} ${t.shadow} backdrop-blur-xl`}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            initial={{ opacity: 0, x: dir * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -36 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            ref={boxRef}
            className={`relative flex min-h-[236px] flex-col items-center justify-center px-8 py-9 text-center sm:min-h-[208px] sm:px-14`}
          >
            <button
              type="button"
              className={`absolute left-3 top-1/2 hidden -translate-y-1/2 transition md:flex ${t.muted} ${t.accentHoverText}`}
              aria-label="قابلیت قبلی"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className={`mx-auto mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${t.accentBgSofter} ${t.accentText}`}>{f.icon}</span>
            <div className={`text-[11px] font-bold uppercase tracking-[0.12em] ${t.muted}`}>{f.title}</div>
            <div className={`mt-1.5 text-[17px] font-extrabold ${t.heading}`}>{f.hook}</div>
            <div className={`mt-1.5 text-[13.5px] leading-7 ${t.muted}`}>{f.body}</div>
            <button
              type="button"
              className={`absolute right-3 top-1/2 hidden -translate-y-1/2 transition md:flex ${t.muted} ${t.accentHoverText}`}
              aria-label="قابلیت بعدی"
              onClick={() => go(1)}
            >
              <ChevronRight size={18} />
            </button>

            {/* دقیقاً هم‌کلاسِ نقطه‌های ویزاردِ برنامه‌ی هوشمند (AiExercisePlanWizard) —
                همون سایز/رنگ/حالتِ فعال، این‌بار برای شماره‌ی اسلایدِ قابلیت‌ها */}
            <div className="exercise-wizard-dots">
              {FEATURES.map((feat, i) => (
                <span key={feat.title} className={`exercise-wizard-dot${i === index ? " on" : ""}`} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function QuoteCard() {
  const t = useThemeTokens();
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <div className={`overflow-hidden rounded-[24px] border ${t.cardBorder} ${t.cardBg} ${t.shadow} backdrop-blur-xl`}>
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <Quote size={26} className={t.accentText} />
        <p className={`text-[15px] font-medium leading-8 ${t.heading}`}>{quote.text}</p>
        <span className={`text-[12.5px] font-bold ${t.muted}`}>— {quote.author}</span>
      </div>
    </div>
  );
}

function RingProgress({ pct, label, pulse }: { pct: number; label: string; pulse?: boolean }) {
  const t = useThemeTokens();
  const r = 29;
  const c = 2 * Math.PI * r;
  return (
    <motion.div
      className={`relative flex h-[72px] w-[72px] shrink-0 items-center justify-center ${t.accentText}`}
      animate={pulse ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="opacity-[0.15]" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </svg>
      <span className={`absolute text-[15px] font-extrabold ${t.heading}`}>{label}</span>
    </motion.div>
  );
}

function TodayProgressCard({ isIntl }: { isIntl: boolean }) {
  const t = useThemeTokens();
  const items = isIntl ? TODAY_ITEMS_INTL : TODAY_ITEMS;
  const cardRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<"down" | "up" | null>(null);
  const lastYRef = useRef<number | null>(null);

  // پیش‌فرض «همه‌چیز از قبل تیک‌خورده»ست — دقیقاً همون چیزی که سرور رندر
  // می‌کنه (بدون ریسکِ hydration mismatch). با هر اسکرولِ رو‌به‌پایین که
  // کارت وارد دید بشه، صفر می‌شه و دونه‌دونه دوباره پر می‌شه؛ با اسکرولِ
  // رو‌به‌بالا که کارت از دید خارج بشه (رفته بالاتر از صفحه)، بی‌صدا
  // ریست می‌شه تا دفعه‌ی بعد که دوباره پایین بیاد، انیمیشن از نو پخش بشه —
  // این «حالتِ ریورس» ه، بدونِ نیاز به دیدنِ یه انیمیشنِ معکوس روی چیزی که
  // خودش دیگه بیرونِ صفحه‌ست.
  const [revealed, setRevealed] = useState(items.length);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (lastYRef.current !== null) {
        const delta = y - lastYRef.current;
        if (Math.abs(delta) > 2) dirRef.current = delta > 0 ? "down" : "up";
      }
      lastYRef.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const obs = new IntersectionObserver(([entry]) => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      if (entry.isIntersecting) {
        if (dirRef.current === "up") {
          // از پایینِ صفحه اومده بالا و دوباره به این کارت رسیده — مستقیم
          // حالتِ کامل رو نشون بده، نیازی به پخشِ دوباره‌ی انیمیشن نیست.
          setRevealed(items.length);
          setPulse(false);
          return;
        }
        setRevealed(0);
        items.forEach((_, i) => {
          timeouts.push(setTimeout(() => setRevealed(i + 1), 260 * (i + 1)));
        });
        timeouts.push(
          setTimeout(() => {
            setPulse(true);
            timeouts.push(setTimeout(() => setPulse(false), 650));
          }, 260 * items.length + 200)
        );
      } else if (dirRef.current === "up") {
        // با اسکرولِ رو‌به‌بالا از دید خارج شده — ریست بی‌صدا (خودِ کارت
        // دیگه دیده نمی‌شه)، تا دفعه‌ی بعد که دوباره پایین بیاد از نو پر بشه.
        setRevealed(0);
        setPulse(false);
      }
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => { obs.disconnect(); timeouts.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneSoFar = items.reduce((acc, item, i) => acc + (i < revealed && item.done ? 1 : 0), 0);

  return (
    <div ref={cardRef}>
      <div className="text-right">
        <h2 className={`text-xl font-extrabold ${t.heading}`}>{isIntl ? "Today's progress" : "امروز چی داریم؟"}</h2>
        <p className={`mt-1 text-[13px] ${t.muted}`}>{isIntl ? "A quick look at what matters today" : "یک نگاه سریع به کارهای مهم امروزت"}</p>
      </div>

      <div className={`mt-4 rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 ${t.shadow} backdrop-blur-xl sm:p-6`}>
        <div className="flex items-center gap-4">
          <RingProgress pct={doneSoFar / items.length} label={`${doneSoFar}/${items.length}`} pulse={pulse} />
          <div className="min-w-0 flex-1 text-right">
            <div className={`text-[15px] font-extrabold ${t.heading}`}>{isIntl ? "You're off to a great start!" : "روزت رو عالی شروع کردی!"}</div>
            <div className={`mt-1 text-[12.5px] ${t.muted}`}>
              {isIntl ? `${doneSoFar} of ${items.length} tasks done today` : `${doneSoFar} مورد از ${items.length} کار امروز انجام شده`}
            </div>
          </div>
          <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${t.accentBgSofter} ${t.accentText}`}>
            <ClipboardList size={19} className="sm:hidden" />
            <ClipboardList size={22} className="hidden sm:block" />
            <span className={`absolute -bottom-1 -left-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-white sm:h-5 sm:w-5 ${t.accentBg}`}>
              <Clock size={10} />
            </span>
          </span>
        </div>

        <div className={`mt-5 grid grid-cols-5 gap-1.5 border-t pt-4 ${t.line}`}>
          {items.map((item, i) => {
            const ticked = i < revealed && item.done;
            return (
              <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-300 ${ticked ? `border-transparent text-white ${t.accentBg}` : `${t.line} ${t.muted}`}`}>
                  <AnimatePresence>
                    {ticked && (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 24 }}
                        className="flex items-center justify-center"
                      >
                        <Check size={13} strokeWidth={2.6} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={`text-[10.5px] leading-4 ${t.muted}`}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// عمداً ثابته، بدون هیچ اسکرول/چرخشی — نسخه‌ی قبلی یه مارکیِ بی‌پایان بود
// (useSeamlessMarquee)؛ کاربر خواسته بود این بخش «یه‌جا ثابت وایسه»، پس
// کارت‌ها با یه گریدِ ساده‌ی چندستونه (بدونِ تکرار/duplicate برای چرخش)
// نشون داده می‌شن.
function WhyUsSection({ isIntl }: { isIntl: boolean }) {
  const t = useThemeTokens();
  const items = isIntl ? WHY_US_INTL : WHY_US;

  return (
    <div>
      <h2 className={`text-right text-xl font-extrabold ${t.heading}`}>{isIntl ? "Why us?" : "چرا ما؟"}</h2>
      <div className="whyus-grid mt-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={`${item.title}-${i}`} className={`whyus-card flex flex-col items-center rounded-2xl border ${t.cardBorder} ${t.cardBg} p-3 text-center ${t.shadow} backdrop-blur-xl sm:p-4`}>
              <span className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11" style={{ background: `${item.color}1F`, color: item.color }}>
                <Icon size={18} />
              </span>
              <div className={`text-[11px] font-extrabold leading-4 sm:text-[12.5px] ${t.heading}`}>{item.title}</div>
              <div className={`mt-1 text-[9.5px] leading-[14px] sm:text-[11px] sm:leading-[17px] ${t.muted}`}>{item.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LandingPage() {
  const t = useThemeTokens();
  const heroRef = useRef<HTMLDivElement>(null);
  const isIntl = getSiteMarket() === "INTERNATIONAL";

  useEffect(() => { staggerFieldsIn(heroRef.current); }, []);

  return (
    <>
      <section id="sec-landing-hero" style={{ paddingTop: 18 }}>
        <div ref={heroRef} className={`rounded-[28px] border ${t.cardBorder} ${t.cardBg} p-6 text-right ${t.shadow} backdrop-blur-xl sm:p-9`}>
          {/* نامِ فارسیِ برند عمداً در خودِ h1 است، نه فقط در متادیتا: تطابقِ
              متنیِ گوگل روی محتوای واقعیِ صفحه انجام می‌شه. قبل از این،
              «آریون» صفر بار در کلِ متنِ صفحه بود و جست‌وجوی فارسیِ برند
              هیچ تطابقی پیدا نمی‌کرد. ظاهر تغییری نمی‌کنه — «آریون» با همون
              رنگِ اکسنت کنارِ لوگوتایپِ لاتین می‌شینه. */}
          <h1 className={`text-[1.7rem] font-extrabold leading-[1.35] sm:text-[2.3rem] ${t.heading}`} data-anim-field>
            همه‌ی نظم زندگی‌ات، توی{" "}
            <span className={t.accentText}>آریون</span>{" "}
            <span className={t.accentText}>(Arion)</span>
          </h1>
          <p className={`mt-4 text-right text-[13.5px] leading-7 sm:text-[15px] sm:leading-8 ${t.muted}`} data-anim-field>
            آریون (Arion) یک اپ فارسیه برای روتین روزانه، خواب، بدنسازی،
            ژورنال ترید و مسیر یادگیری — هرکدوم دقیق، ساده و بدون شلوغی.
            همه‌چیز یک‌جا، همه‌چیز به‌موقع.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5" data-anim-field>
            <Link
              href="/auth/signup"
              className={`inline-flex items-center gap-1.5 rounded-[20px] px-5 py-3 text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-7 sm:py-3.5 sm:text-[15px] ${t.accentBg} ${t.accentShadow}`}
            >
              شروع رایگان <ArrowLeft size={16} />
            </Link>
            <Link
              href="/auth/login"
              className={`inline-flex items-center rounded-[20px] border ${t.line} ${t.secondaryBtnBg} px-5 py-3 text-[13.5px] font-bold ${t.heading} backdrop-blur-md transition active:scale-[0.97] sm:px-7 sm:py-3.5 sm:text-[15px]`}
            >
              ورود
            </Link>
          </div>
          <div className={`mt-4 flex items-center justify-start gap-1.5 text-[11.5px] ${t.muted}`} data-anim-field>
            <ShieldCheck size={14} className="shrink-0" /> اطلاعات شما امن و محرمانه نگه‌داری می‌شود
          </div>
        </div>
      </section>

      <section id="sec-landing-features" style={{ paddingTop: 32 }}>
        <FeatureCarousel />
      </section>

      <section id="sec-landing-whyus" style={{ paddingTop: 32 }}>
        <WhyUsSection isIntl={isIntl} />
      </section>

      <section id="sec-landing-trust" style={{ paddingTop: 32 }}>
        <QuoteCard />
      </section>

      <section id="sec-landing-today" style={{ paddingTop: 32 }}>
        <TodayProgressCard isIntl={isIntl} />
      </section>

      <section id="sec-landing-plans" style={{ paddingTop: 32 }}>
        <PlansSection isIntl={isIntl} mode="landing" />
      </section>

      {/* بدونِ این فوتر، /about و /faq و /terms هیچ لینکِ HTMLای از صفحه‌ی
          اصلی نداشتن — یعنی برای کراولرها عملاً صفحاتِ ایزوله بودن (فقط با
          دونستنِ آدرسِ دقیق پیدا می‌شدن، نه با دنبال‌کردنِ لینک). */}
      <footer className={`mt-10 border-t ${t.line} px-4 py-6 text-center text-[11.5px] ${t.muted}`}>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:underline">درباره ما</Link>
          <Link href="/faq" className="hover:underline">سوالات متداول</Link>
          <Link href="/terms" className="hover:underline">قوانین و مقررات</Link>
        </nav>
        <div className="mt-4 flex justify-center">
          <EnamadBadge />
        </div>
      </footer>
    </>
  );
}
