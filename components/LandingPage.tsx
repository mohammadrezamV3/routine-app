"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Quote, X } from "lucide-react";
import { staggerFieldsIn } from "@/lib/uiAnim";
import { ICONS } from "@/components/NavDrawer";
import { getSiteMarket } from "@/lib/market";
import { useTheme } from "@/components/ThemeProvider";

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
  { text: "موفقیت مجموعه‌ای از انتخاب‌های کوچک درست در هر روزه.", author: "برایان تریسی" },
  { text: "همیشه به نظر غیرممکن می‌رسه، تا وقتی که انجامش بدی.", author: "نلسون ماندلا" },
  { text: "بهترین زمان برای کاشتن یک درخت، بیست سال پیش بود؛ زمان بعدی، همین حالاست.", author: "ضرب‌المثل چینی" },
  { text: "ما همون چیزی هستیم که مدام تکرار می‌کنیم؛ پس برتری، یک عمل نیست، یک عادته.", author: "ارسطو" },
  { text: "هر سفر هزار مایلی، با یک قدم شروع می‌شه.", author: "لائوتزو" },
  { text: "نظم، پُلیه بین هدف و دستاورد.", author: "جیم ران" },
  { text: "انگیزه باعث می‌شه شروع کنی؛ عادت باعث می‌شه ادامه بدی.", author: "جیم ریان" },
  { text: "هدف بدون برنامه، فقط یک آرزوئه.", author: "آنتوان دو سنت‌اگزوپری" },
  { text: "هر روز یک فرصت جدیده برای بهتر شدن نسبت به دیروز.", author: "ضرب‌المثل" },
  { text: "مسیر هزار قدمی، با تصمیم امروز شروع می‌شه، نه فردا.", author: "ضرب‌المثل" },
  { text: "کیفیت زندگی‌ات، نتیجه‌ی کیفیت عادت‌های روزانه‌ته.", author: "جیمز کلییر" },
  { text: "صبر و پشتکار تلخه، ولی میوه‌ش شیرینه.", author: "ژان ژاک روسو" },
  { text: "تغییر بزرگ، همیشه از یک تصمیم کوچیک شروع می‌شه.", author: "ضرب‌المثل" },
  { text: "هیچ باد موافقی برای کسی که نمی‌دونه به کدوم بندر می‌ره، نمی‌وزه.", author: "سنکا" },
  { text: "نظم یعنی انتخاب بین چیزی که الان می‌خوای و چیزی که واقعاً می‌خوای.", author: "ضرب‌المثل" },
  { text: "هر روزت رو طوری بساز که فردا بهش افتخار کنی.", author: "ضرب‌المثل" },
  { text: "رشد، بیرون از منطقه‌ی راحتیه که اتفاق می‌افته.", author: "ضرب‌المثل" },
  { text: "کاری که امروز می‌تونی بکنی رو به فردا موکول نکن.", author: "بنجامین فرانکلین" },
  { text: "موفقیت یعنی از شکستی به شکست دیگه رفتن، بدون از دست دادن اشتیاق.", author: "وینستون چرچیل" },
  { text: "بهترین نسخه‌ی خودت، همونیه که هر روز کمی بیشتر تلاش می‌کنه.", author: "ضرب‌المثل" },
];

type Duration = "1" | "3" | "6" | "12";
const DURATIONS: Duration[] = ["1", "3", "6", "12"];
const DURATION_LABELS: Record<Duration, string> = { "1": "۱ ماهه", "3": "۳ ماهه", "6": "۶ ماهه", "12": "۱۲ ماهه" };
const DURATION_LABELS_INTL: Record<Duration, string> = { "1": "1 mo", "3": "3 mo", "6": "6 mo", "12": "12 mo" };

type PlanCard = {
  key: string; nameFa: string; blurb: string[]; highlight?: boolean;
  free?: boolean; prices?: Record<Duration, string>;
};

// ترتیب: Base Plan و Plan Max جامون رو با هم عوض کردن (نسبت به قبل)
const PLANS_IRAN: PlanCard[] = [
  {
    key: "max", nameFa: "Plan Max", highlight: true,
    blurb: ["همه‌ی ماژول‌ها، بدون محدودیت", "بدنسازی + کالری، ژورنال ترید، ai mapping", "تحلیل هوشمند اختصاصی"],
    prices: { "1": "۱۹۹,۰۰۰ تومان", "3": "۵۳۵,۰۰۰ تومان", "6": "۹۵۵,۰۰۰ تومان", "12": "۱,۶۷۰,۰۰۰ تومان" },
  },
  {
    key: "exercise", nameFa: "Plan Gym",
    blurb: ["همه‌ی Base Plan", "برنامه بدنسازی بر اساس هدفت (حجم، کات، قدرت یا استقامت)", "شمارش کالری و ماکرو", "ai mapping"],
    prices: { "1": "۹۹,۰۰۰ تومان", "3": "۲۶۵,۰۰۰ تومان", "6": "۴۷۵,۰۰۰ تومان", "12": "۸۳۰,۰۰۰ تومان" },
  },
  {
    key: "trade", nameFa: "Plan Trader",
    blurb: ["همه‌ی Base Plan", "ژورنال ماهانه و آنالیز، پنل ترید و آمار", "ai mapping"],
    prices: { "1": "۱۲۹,۰۰۰ تومان", "3": "۳۴۵,۰۰۰ تومان", "6": "۶۲۰,۰۰۰ تومان", "12": "۱,۰۸۰,۰۰۰ تومان" },
  },
  {
    key: "basic", nameFa: "Base Plan", free: true,
    blurb: ["روتین روزانه", "خواب", "کارهای روزمره"],
  },
];

const PLANS_INTL: PlanCard[] = [
  {
    key: "max", nameFa: "Plan Max", highlight: true,
    blurb: ["Every module, unlimited", "Bodybuilding + calories, trade journal, ai mapping", "Dedicated smart insights"],
    prices: { "1": "$17.99", "3": "$47.99", "6": "$85.99", "12": "$149.99" },
  },
  {
    key: "exercise", nameFa: "Plan Gym",
    blurb: ["Everything in Basic", "Goal-based bodybuilding program (bulk, cut, strength, endurance)", "Calorie & macro tracking", "ai mapping"],
    prices: { "1": "$7.99", "3": "$21.99", "6": "$38.99", "12": "$67.99" },
  },
  {
    key: "trade", nameFa: "Plan Trader",
    blurb: ["Everything in Basic", "Monthly journal & analysis, trade panel and stats", "ai mapping"],
    prices: { "1": "$12.99", "3": "$34.99", "6": "$62.99", "12": "$109.99" },
  },
  {
    key: "basic", nameFa: "Basic", free: true,
    blurb: ["Daily routine", "Sleep", "Daily tasks"],
  },
];

type CompareRow = { label: string; included: Record<string, boolean>; upcoming?: boolean };

const COMPARE_ROWS_IRAN: CompareRow[] = [
  { label: "روتین روزانه، خواب و کارهای روزمره", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "برنامه بدنسازی", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "شمارش کالری", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "ژورنال ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "چک‌لیست ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "تحلیل هوشمند", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "اپلیکیشن موبایل", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "یکپارچه‌سازی با ساعت هوشمند", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "گزارش هفتگی هوش مصنوعی", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "اشتراک‌گذاری با مربی یا دوستان", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "ردیابی کدنویسی", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
];

const COMPARE_ROWS_INTL: CompareRow[] = [
  { label: "Daily routine, sleep & tasks", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "Bodybuilding program", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Calorie tracking", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Trade journal", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "Trade checklist", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "Smart insights", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "Mobile app", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "Smartwatch integration", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "AI weekly report", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "Share with a coach or friends", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
  { label: "Coding tracker", included: { basic: false, exercise: false, trade: false, max: true }, upcoming: true },
];

// کارت‌های پلن و ردیف‌های جدول مقایسه باید عیناً یک grid-template-columns رو
// به اشتراک بذارن، وگرنه تیک هر پلن زیر کارت خودش نمی‌افته.
const COMPARE_GRID_COLS = "grid-cols-[minmax(180px,1.4fr)_repeat(4,minmax(220px,1fr))]";
// روی دسکتاپ (md+) از ستون باریک ۶۲۰px سایت بیرون می‌زنه تا هر ۴ پلن بدون
// اسکرول کنار هم جا بشن؛ margin-right ثابته (نه بر پایه‌ی vw) چون توی RTL،
// margin-left در تعارض نادیده گرفته می‌شه و فقط margin-right اثر می‌کنه —
// مقدار از (عرض ستون ۶۲۰px - عرض هدف ۱۲۴۰px)/۲ به دست اومده.
const BREAKOUT = "md:w-screen md:max-w-[1240px] md:mr-[-310px]";

function useThemeTokens() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    cardBg: isLight ? "bg-white/40" : "bg-white/[0.05]",
    cardBorder: isLight ? "border-white/60" : "border-white/10",
    shadow: isLight ? "shadow-[0_15px_45px_rgba(0,0,0,0.06)]" : "shadow-[0_15px_45px_rgba(0,0,0,0.35)]",
    heading: isLight ? "text-[#2B2118]" : "text-[#F3EADD]",
    muted: isLight ? "text-[#6B5D4D]" : "text-[#A79A8A]",
    line: isLight ? "border-[#E7DCC8]" : "border-white/10",
    secondaryBtnBg: isLight ? "bg-white/70 hover:bg-white" : "bg-white/5 hover:bg-white/10",
  };
}

function FeatureCarousel() {
  const t = useThemeTokens();
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => (i + 1) % FEATURES.length);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const f = FEATURES[index];
  const go = (delta: number) => setIndex((i) => (i + delta + FEATURES.length) % FEATURES.length);

  // زیر md فلش‌ها مخفی‌ن و به‌جاش با سوایپ انگشت جابه‌جا می‌شه
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? 1 : -1);
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        ref={boxRef}
        className={`relative rounded-[28px] border ${t.cardBorder} ${t.cardBg} px-8 py-9 text-center ${t.shadow} backdrop-blur-xl sm:px-14`}
      >
        <button
          type="button"
          className={`absolute left-3 top-1/2 hidden -translate-y-1/2 transition hover:text-[#D97706] md:flex ${t.muted}`}
          aria-label="قابلیت قبلی"
          onClick={() => go(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#D97706]/12 text-[#D97706]">{f.icon}</span>
        <div className={`text-[11px] font-bold uppercase tracking-[0.12em] ${t.muted}`}>{f.title}</div>
        <div className={`mt-1.5 text-[17px] font-extrabold ${t.heading}`}>{f.hook}</div>
        <div className={`mt-1.5 text-[13.5px] leading-7 ${t.muted}`}>{f.body}</div>
        <button
          type="button"
          className={`absolute right-3 top-1/2 hidden -translate-y-1/2 transition hover:text-[#D97706] md:flex ${t.muted}`}
          aria-label="قابلیت بعدی"
          onClick={() => go(1)}
        >
          <ChevronRight size={18} />
        </button>
      </motion.div>
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
    <div className={`flex flex-col items-center gap-3 rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-8 text-center ${t.shadow} backdrop-blur-xl`}>
      <Quote size={26} className="text-[#D97706]" />
      <p className={`text-[15px] font-medium leading-8 ${t.heading}`}>{quote.text}</p>
      <span className={`text-[12.5px] font-bold ${t.muted}`}>— {quote.author}</span>
    </div>
  );
}

function PlanCardView({ p, isIntl }: { p: PlanCard; isIntl: boolean }) {
  const t = useThemeTokens();
  const [duration, setDuration] = useState<Duration>("1");
  const labels = isIntl ? DURATION_LABELS_INTL : DURATION_LABELS;

  const cardClass = p.highlight
    ? `relative flex flex-col rounded-[28px] border border-[#D97706]/50 bg-[#D97706]/10 p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(217,119,6,0.16)]`
    : `relative flex flex-col rounded-[28px] border ${t.cardBorder} ${t.cardBg} p-6 backdrop-blur-xl ${t.shadow}`;

  return (
    <motion.div className={cardClass} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      {p.highlight && (
        <span className="absolute -top-3 right-6 rounded-full bg-[#D97706] px-3 py-1 text-[10.5px] font-extrabold text-white">
          محبوب‌ترین
        </span>
      )}
      <div className="text-left text-lg font-extrabold text-[#D97706]">{p.nameFa}</div>

      <ul className="mt-3 flex flex-1 flex-col gap-1.5">
        {p.blurb.map((line) => (
          <li key={line} className={`flex items-start gap-2 text-[12.5px] leading-6 ${t.muted}`}>
            <Check size={15} className="mt-0.5 shrink-0 text-[#D97706]" />
            {line}
          </li>
        ))}
      </ul>

      {p.free ? (
        <>
          <div className={`mt-3.5 text-lg font-extrabold ${t.heading}`}>رایگان</div>
          <Link href="/auth/signup" className="mt-3.5 block w-full rounded-2xl bg-[#D97706] py-2.5 text-center text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98]">
            شروع رایگان
          </Link>
        </>
      ) : (
        <>
          <div className={`mt-3.5 text-lg font-extrabold ${t.heading}`}>
            {p.prices![duration]}
            <span className={`mr-1 text-[11px] font-semibold ${t.muted}`}>/ {labels[duration]}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`flex-1 min-w-[58px] rounded-lg border py-1.5 text-[11.5px] font-bold transition ${d === duration ? "border-[#D97706] bg-[#D97706]/10 text-[#D97706]" : `${t.line} ${t.muted} hover:border-[#D97706]`}`}
                onClick={() => setDuration(d)}
              >
                {labels[d]}
              </button>
            ))}
          </div>
          <Link
            href={`/auth/signup?plan=${p.key}&duration=${duration}`}
            className={`mt-3.5 block w-full rounded-2xl py-2.5 text-center text-[13.5px] font-bold transition active:scale-[0.98] ${p.highlight ? "bg-[#D97706] text-white hover:brightness-105" : `border ${t.line} ${t.secondaryBtnBg} ${t.heading} hover:border-[#D97706]`}`}
          >
            فعال‌سازی این پلن
          </Link>
        </>
      )}
    </motion.div>
  );
}

export function LandingPage() {
  const t = useThemeTokens();
  const heroRef = useRef<HTMLDivElement>(null);
  const isIntl = getSiteMarket() === "INTERNATIONAL";
  const plans = isIntl ? PLANS_INTL : PLANS_IRAN;
  const compareRows = isIntl ? COMPARE_ROWS_INTL : COMPARE_ROWS_IRAN;
  const mainRows = compareRows.filter((r) => !r.upcoming);
  const upcomingRows = compareRows.filter((r) => r.upcoming);

  useEffect(() => { staggerFieldsIn(heroRef.current); }, []);

  return (
    <>
      <section id="sec-landing-hero" style={{ textAlign: "center", paddingTop: 18 }}>
        <div ref={heroRef}>
          <div className="inline-block text-xs font-extrabold uppercase tracking-[0.22em] text-[#D97706]" data-anim-field>Arion</div>
          <h1 className={`mt-2 text-[2.15rem] font-extrabold leading-[1.35] sm:text-[2.6rem] ${t.heading}`} data-anim-field>
            همه‌ی نظم زندگی‌ات، توی <span className="text-[#D97706]">یک اپ</span>
          </h1>
          <p className={`mx-auto mt-4 max-w-md text-[15px] leading-8 ${t.muted}`} data-anim-field>
            روتین روزانه، خواب، بدنسازی، ژورنال ترید و مسیر یادگیری —
            هرکدوم دقیق، ساده و بدون شلوغی. همه‌چیز یک‌جا، همه‌چیز به‌موقع.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3" data-anim-field>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-[20px] bg-[#D97706] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(217,119,6,0.28)] transition hover:brightness-105 active:scale-[0.97]"
            >
              شروع رایگان <ArrowLeft size={16} />
            </Link>
            <Link
              href="/auth/login"
              className={`inline-flex items-center rounded-[20px] border ${t.line} ${t.secondaryBtnBg} px-7 py-3.5 text-[15px] font-bold ${t.heading} backdrop-blur-md transition active:scale-[0.97]`}
            >
              ورود
            </Link>
          </div>
        </div>
      </section>

      <section id="sec-landing-features" style={{ paddingTop: 20 }}>
        <FeatureCarousel />
      </section>

      <section id="sec-landing-trust" style={{ paddingTop: 8 }}>
        <QuoteCard />
      </section>

      <section id="sec-landing-plans" style={{ paddingTop: 8 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 className={`text-2xl font-extrabold ${t.heading}`}>پلن‌ها</h2>
        </div>

        <div className={`grid gap-6 overflow-x-auto ${COMPARE_GRID_COLS} ${BREAKOUT}`}>
          <div aria-hidden="true" />
          {plans.map((p) => <PlanCardView key={p.key} p={p} isIntl={isIntl} />)}
        </div>

        <div className={`mt-6 overflow-x-auto rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-6 ${t.shadow} backdrop-blur-xl ${BREAKOUT}`}>
          <div role="table" aria-label={isIntl ? "Plan comparison" : "مقایسه پلن‌ها"}>
            <div className={`grid ${COMPARE_GRID_COLS} items-center gap-4 border-b ${t.line} pb-3`} role="row">
              <div className={`text-right text-[12.5px] font-bold ${t.heading}`} role="columnheader" />
              {plans.map((p) => (
                <div key={p.key} className={`text-center text-[12.5px] font-bold ${t.heading}`} role="columnheader">{p.nameFa}</div>
              ))}
            </div>
            {mainRows.map((row) => (
              <div key={row.label} className={`grid ${COMPARE_GRID_COLS} items-center gap-4 border-b ${t.line} py-3.5 last:border-none`} role="row">
                <div className={`text-right text-[12.5px] ${t.muted}`} role="rowheader">{row.label}</div>
                {plans.map((p) => (
                  <div key={p.key} className="flex justify-center" role="cell">
                    {row.included[p.key] ? <Check size={17} className="text-[#D97706]" /> : <X size={17} className="text-[#C9524B]/60" />}
                  </div>
                ))}
              </div>
            ))}

            {upcomingRows.length > 0 && (
              <div className="relative mt-1">
                <div className="pointer-events-none select-none blur-sm">
                  {upcomingRows.map((row) => (
                    <div key={row.label} className={`grid ${COMPARE_GRID_COLS} items-center gap-4 border-b ${t.line} py-3.5 last:border-none`} role="row">
                      <div className={`text-right text-[12.5px] ${t.muted}`} role="rowheader">{row.label}</div>
                      {plans.map((p) => (
                        <div key={p.key} className="flex justify-center" role="cell">
                          {row.included[p.key] ? <Check size={17} className="text-[#D97706]" /> : <X size={17} className="text-[#C9524B]/60" />}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-[#D97706] px-4 py-1.5 text-xs font-extrabold text-white shadow-[0_8px_20px_rgba(217,119,6,0.35)]">
                    به‌زودی
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
