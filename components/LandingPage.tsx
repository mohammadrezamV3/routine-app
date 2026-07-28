"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Quote, X,
  Heart, ClipboardList, Clock, ShieldCheck, TrendingUp, Headset, Lightbulb,
} from "lucide-react";
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
  { label: "نوشیدن آب", done: false },
  { label: "یادداشت روزانه", done: false },
];
const TODAY_ITEMS_INTL = [
  { label: "Meditation", done: true },
  { label: "Workout", done: true },
  { label: "Reading", done: true },
  { label: "Drink water", done: false },
  { label: "Daily journal", done: false },
];

const WHY_US = [
  { icon: ShieldCheck, color: "#22C55E", title: "امن و خصوصی", body: "اطلاعات تو ۱۰۰٪ محفوظ می‌مونه" },
  { icon: TrendingUp, color: "#A855F7", title: "برنامه‌های شخصی", body: "متناسب با هدف‌ها و سبک زندگی تو" },
  { icon: Headset, color: "#3B82F6", title: "پشتیبانی واقعی", body: "ما کنار توایم، هر زمان که نیاز داری" },
  { icon: Lightbulb, color: "#F59E0B", title: "ابزارهای کاربردی", body: "همه‌چیز برای رشد در یک اپلیکیشن" },
];
const WHY_US_INTL = [
  { icon: ShieldCheck, color: "#22C55E", title: "Private & secure", body: "Your data stays 100% protected" },
  { icon: TrendingUp, color: "#A855F7", title: "Personalized plans", body: "Matched to your goals & lifestyle" },
  { icon: Headset, color: "#3B82F6", title: "Real support", body: "We're with you whenever you need us" },
  { icon: Lightbulb, color: "#F59E0B", title: "Practical tools", body: "Everything to grow, in one app" },
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

// ردیف‌های جدول مقایسه یک ستون لیبل (اسم قابلیت) دارن، ولی خودِ کارت‌های
// پلن نه — یه ستون خالیِ هم‌عرض برای هم‌ترازی می‌ذاشتیم، ولی چون کارت‌ها و
// جدول دیگه توی یک باکس مشترک نیستن، اون ستون خالی فقط باعث می‌شد کارت‌ها
// یه‌طرفه/نامتقارن به‌نظر برسن، نه وسط‌چین. برای همین دو تمپلیت جدا داریم.
const PLANS_GRID_COLS = "grid-cols-[repeat(4,minmax(250px,1fr))] md:grid-cols-[repeat(4,1fr)]";
const COMPARE_GRID_COLS = "grid-cols-[minmax(160px,1.4fr)_repeat(4,minmax(200px,1fr))] md:grid-cols-[300px_repeat(4,211px)]";
// روی دسکتاپ (md+) از ستون باریک ۶۲۰px سایت بیرون می‌زنه تا هر ۴ پلن بدون
// اسکرول کنار هم جا بشن؛ margin-right ثابته (نه بر پایه‌ی vw) چون توی RTL،
// margin-left در تعارض نادیده گرفته می‌شه و فقط margin-right اثر می‌کنه —
// مقدار از (عرض ستون ۶۲۰px - عرض هدف ۱۲۴۰px)/۲ به دست اومده.
const BREAKOUT = "md:w-screen md:max-w-[1240px] md:mr-[-310px]";

// روز = نارنجی (طبق طرح جدید)، شب = همون هویت رنگی قبلیِ سایت (سبز اصلی +
// آبی برای تراز ویژه‌ی پلن مکس) — یکی‌شدن دو تم فقط قالب/چیدمانه، نه رنگ.
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

    accentText: isLight ? "text-[#D97706]" : "text-[#00A86B]",
    accentHoverText: isLight ? "hover:text-[#D97706]" : "hover:text-[#00A86B]",
    accentBg: isLight ? "bg-[#D97706]" : "bg-[#00A86B]",
    accentBgSoft: isLight ? "bg-[#D97706]/10" : "bg-[#00A86B]/10",
    accentBgSofter: isLight ? "bg-[#D97706]/12" : "bg-[#00A86B]/12",
    accentBorder: isLight ? "border-[#D97706]" : "border-[#00A86B]",
    accentHoverBorder: isLight ? "hover:border-[#D97706]" : "hover:border-[#00A86B]",
    accentShadow: isLight ? "shadow-[0_12px_30px_rgba(217,119,6,0.28)]" : "shadow-[0_12px_30px_rgba(0,168,107,0.28)]",

    // پلن برجسته (Max) رنگ دوم رو می‌گیره — روز همون نارنجی، شب آبی؛ تا معنای
    // «تراز ویژه» از رنگ اصلی جدا بمونه (دقیقاً هویت قبلیِ سایت)
    secondaryText: isLight ? "text-[#D97706]" : "text-[#3E7BFA]",
    secondaryBg: isLight ? "bg-[#D97706]" : "bg-[#3E7BFA]",
    secondaryBgSoft: isLight ? "bg-[#D97706]/10" : "bg-[#3E7BFA]/10",
    secondaryBorderSoft: isLight ? "border-[#D97706]/50" : "border-[#3E7BFA]/50",
    secondaryCardShadow: isLight ? "shadow-[0_18px_45px_rgba(217,119,6,0.16)]" : "shadow-[0_18px_45px_rgba(62,123,250,0.18)]",
    secondaryBadgeShadow: isLight ? "shadow-[0_8px_20px_rgba(217,119,6,0.35)]" : "shadow-[0_8px_20px_rgba(62,123,250,0.35)]",

    // ستون sticky جدول مقایسه: زیر md باید تقریباً کدر باشه تا چک/ضربدرِ
    // درحال‌اسکرول زیرش دیده نشه؛ از md به بعد که اصلاً اسکرول لازم نیست،
    // برمی‌گرده به همون شیشه‌ای نیم‌شفافِ بقیه‌ی باکس تا لکه‌ی یک‌دست نشه.
    stickyCellBg: isLight ? "bg-[var(--bg)] md:bg-white/40 md:backdrop-blur-2xl" : "bg-[var(--bg)] md:bg-white/[0.05] md:backdrop-blur-2xl",
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
          className={`absolute left-3 top-1/2 hidden -translate-y-1/2 transition md:flex ${t.muted} ${t.accentHoverText}`}
          aria-label="قابلیت قبلی"
          onClick={() => go(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full ${t.accentBgSofter} ${t.accentText}`}>{f.icon}</span>
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
    <div className={`overflow-hidden rounded-[24px] border ${t.cardBorder} ${t.cardBg} ${t.shadow} backdrop-blur-xl`}>
      <div className="relative h-24 w-full sm:h-32">
        <Image src="/images/quote-banner.png" alt="" fill sizes="620px" className="object-cover" priority={false} />
      </div>
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <Quote size={26} className={t.accentText} />
        <p className={`text-[15px] font-medium leading-8 ${t.heading}`}>{quote.text}</p>
        <span className={`text-[12.5px] font-bold ${t.muted}`}>— {quote.author}</span>
      </div>
    </div>
  );
}

// عکسِ گلدون (public/images/plant-*.png) به‌جای SVG دستی — کیفیت تصویرِ
// رستر با گرادیان/سایه، سمت چپِ هیرو، پشتِ متن، مطابق تصویرِ مرجع.
function PlantIllustration() {
  const t = useThemeTokens();
  return (
    <div className="relative h-[108px] w-[74px] shrink-0 sm:h-[140px] sm:w-[96px]" data-anim-field>
      <div className={`absolute inset-0 -z-10 rounded-full blur-xl ${t.isLight ? "bg-[#D97706]/15" : "bg-[#00A86B]/12"}`} />
      <Image
        src={t.isLight ? "/images/plant-light.png" : "/images/plant-dark.png"}
        alt=""
        fill
        sizes="96px"
        className="object-contain"
      />
      <span className={`absolute -top-1 left-0 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg sm:h-9 sm:w-9 ${t.accentBg}`}>
        <Heart size={15} strokeWidth={2.3} />
      </span>
    </div>
  );
}

function RingProgress({ pct, label }: { pct: number; label: string }) {
  const t = useThemeTokens();
  const r = 29;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative flex h-[72px] w-[72px] shrink-0 items-center justify-center ${t.accentText}`}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="opacity-[0.15]" />
        <circle
          cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className={`absolute text-[15px] font-extrabold ${t.heading}`}>{label}</span>
    </div>
  );
}

function TodayProgressCard({ isIntl }: { isIntl: boolean }) {
  const t = useThemeTokens();
  const items = isIntl ? TODAY_ITEMS_INTL : TODAY_ITEMS;
  const done = items.filter((i) => i.done).length;

  return (
    <div>
      <div className="text-right">
        <h2 className={`text-xl font-extrabold ${t.heading}`}>{isIntl ? "Today's progress" : "امروز چی داریم؟"}</h2>
        <p className={`mt-1 text-[13px] ${t.muted}`}>{isIntl ? "A quick look at what matters today" : "یک نگاه سریع به کارهای مهم امروزت"}</p>
      </div>

      <div className={`mt-4 rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-5 ${t.shadow} backdrop-blur-xl sm:p-6`}>
        <div className="flex items-center gap-4">
          <RingProgress pct={done / items.length} label={`${done}/${items.length}`} />
          <div className="min-w-0 flex-1 text-right">
            <div className={`text-[15px] font-extrabold ${t.heading}`}>{isIntl ? "You're off to a great start!" : "روزت رو عالی شروع کردی!"}</div>
            <div className={`mt-1 text-[12.5px] ${t.muted}`}>
              {isIntl ? `${done} of ${items.length} tasks done today` : `${done} مورد از ${items.length} کار امروز انجام شده`}
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
          {items.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${item.done ? `border-transparent text-white ${t.accentBg}` : `${t.line} ${t.muted}`}`}>
                {item.done && <Check size={13} strokeWidth={2.6} />}
              </span>
              <span className={`text-[10.5px] leading-4 ${t.muted}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhyUsSection({ isIntl }: { isIntl: boolean }) {
  const t = useThemeTokens();
  const items = isIntl ? WHY_US_INTL : WHY_US;

  return (
    <div>
      <h2 className={`text-right text-xl font-extrabold ${t.heading}`}>{isIntl ? "Why us?" : "چرا ما؟"}</h2>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className={`flex flex-col items-center rounded-2xl border ${t.cardBorder} ${t.cardBg} p-3 text-center ${t.shadow} backdrop-blur-xl sm:p-4`}>
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

function PlanCardView({ p, isIntl }: { p: PlanCard; isIntl: boolean }) {
  const t = useThemeTokens();
  const [duration, setDuration] = useState<Duration>("1");
  const labels = isIntl ? DURATION_LABELS_INTL : DURATION_LABELS;

  const cardClass = p.highlight
    ? `relative flex flex-col snap-center rounded-[28px] border ${t.secondaryBorderSoft} ${t.secondaryBgSoft} p-6 backdrop-blur-xl ${t.secondaryCardShadow}`
    : `relative flex flex-col snap-center rounded-[28px] border ${t.cardBorder} ${t.cardBg} p-6 backdrop-blur-xl ${t.shadow}`;

  return (
    <motion.div className={cardClass} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      {p.highlight && (
        <span className={`absolute -top-3 right-6 rounded-full px-3 py-1 text-[10.5px] font-extrabold text-white ${t.secondaryBg}`}>
          محبوب‌ترین
        </span>
      )}
      <div className={`text-left text-lg font-extrabold ${t.accentText}`}>{p.nameFa}</div>

      <ul className="mt-3 flex flex-1 flex-col gap-1.5">
        {p.blurb.map((line) => (
          <li key={line} className={`flex items-start gap-2 text-[12.5px] leading-6 ${t.muted}`}>
            <Check size={14} className={`mt-0.5 shrink-0 ${t.accentText}`} />
            {line}
          </li>
        ))}
      </ul>

      {p.free ? (
        <>
          <div className={`mt-3.5 text-lg font-extrabold ${t.heading}`}>رایگان</div>
          <Link href="/auth/signup" className={`mt-3.5 block w-full rounded-2xl py-3 text-center text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98] ${t.accentBg}`}>
            شروع رایگان
          </Link>
        </>
      ) : (
        <>
          <div className={`mt-3.5 text-lg font-extrabold ${t.heading}`}>
            {p.prices![duration]}
            <span className={`mr-1 text-[11px] font-semibold ${t.muted}`}>/ {labels[duration]}</span>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`rounded-lg border py-2 text-[10.5px] font-bold transition ${d === duration ? `${t.accentBorder} ${t.accentBgSoft} ${t.accentText}` : `${t.line} ${t.muted} ${t.accentHoverBorder}`}`}
                onClick={() => setDuration(d)}
              >
                {labels[d]}
              </button>
            ))}
          </div>
          <Link
            href={`/auth/signup?plan=${p.key}&duration=${duration}`}
            className={`mt-3.5 block w-full rounded-2xl py-3 text-center text-[13.5px] font-bold transition active:scale-[0.98] ${p.highlight ? `text-white hover:brightness-105 ${t.secondaryBg}` : `border ${t.line} ${t.secondaryBtnBg} ${t.heading} ${t.accentHoverBorder}`}`}
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
      <section id="sec-landing-hero" style={{ paddingTop: 18 }}>
        <div ref={heroRef} className="flex items-start gap-4 sm:gap-6">
          <PlantIllustration />
          <div className="min-w-0 flex-1 text-right">
            <h1 className={`text-[1.7rem] font-extrabold leading-[1.35] sm:text-[2.3rem] ${t.heading}`} data-anim-field>
              همه‌ی نظم زندگی‌ات، توی <span className={t.accentText}>Arion</span>
            </h1>
            <p className={`mt-4 text-[13.5px] leading-7 sm:text-[15px] sm:leading-8 ${t.muted}`} data-anim-field>
              روتین روزانه، خواب، بدنسازی، ژورنال ترید و مسیر یادگیری —
              هرکدوم دقیق، ساده و بدون شلوغی. همه‌چیز یک‌جا، همه‌چیز به‌موقع.
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
            <div className={`mt-4 flex items-center justify-end gap-1.5 text-[11.5px] ${t.muted}`} data-anim-field>
              اطلاعات شما امن و محرمانه نگه‌داری می‌شود <ShieldCheck size={14} />
            </div>
          </div>
        </div>
      </section>

      <section id="sec-landing-features" style={{ paddingTop: 24 }}>
        <FeatureCarousel />
      </section>

      <section id="sec-landing-today" style={{ paddingTop: 28 }}>
        <TodayProgressCard isIntl={isIntl} />
      </section>

      <section id="sec-landing-trust" style={{ paddingTop: 8 }}>
        <QuoteCard />
      </section>

      <section id="sec-landing-whyus" style={{ paddingTop: 8 }}>
        <WhyUsSection isIntl={isIntl} />
      </section>

      <section id="sec-landing-plans" style={{ paddingTop: 8 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 className={`text-2xl font-extrabold ${t.heading}`}>پلن‌ها</h2>
        </div>

        <div className={`grid snap-x snap-mandatory gap-6 overflow-x-auto pt-5 ${PLANS_GRID_COLS} ${BREAKOUT}`}>
          {plans.map((p) => <PlanCardView key={p.key} p={p} isIntl={isIntl} />)}
        </div>

        {/* یک جدول HTML واقعی (نه گرید) — چون sticky روی th یک جدول واقعی
            دقیقاً همون الگوی استانداردِ «فریز کردن ستون اول» هست و قابل‌اعتماده؛
            گرید تو در تو (row-grid داخل row-grid) این رفتار رو نمی‌داد. ستون
            لیبل روی موبایل ثابت می‌مونه تا کاربر هنگام اسکرول افقی بین پلن‌ها،
            همیشه بدونه داره چه قابلیتی رو می‌بینه. */}
        <div className="relative">
          <div className={`mt-6 overflow-x-auto rounded-[24px] border ${t.cardBorder} ${t.cardBg} p-6 ${t.shadow} backdrop-blur-2xl ${BREAKOUT}`}>
            <table className="w-full border-collapse" style={{ tableLayout: "fixed", minWidth: 780 }} aria-label={isIntl ? "Plan comparison" : "مقایسه پلن‌ها"}>
              <colgroup>
                <col style={{ width: "24%" }} />
                {plans.map((p) => <col key={p.key} style={{ width: "19%" }} />)}
              </colgroup>
              <thead>
                <tr className={`border-b ${t.line}`}>
                  <th className={`sticky right-0 ${t.stickyCellBg} pb-3 text-right text-[12.5px] font-bold ${t.heading}`} />
                  {plans.map((p) => (
                    <th key={p.key} className={`pb-3 text-center text-[12.5px] font-bold ${t.heading}`}>{p.nameFa}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mainRows.map((row) => (
                  <tr key={row.label} className={`border-b ${t.line} last:border-none`}>
                    <th scope="row" className={`sticky right-0 ${t.stickyCellBg} py-3.5 text-right text-[12.5px] font-normal ${t.muted}`}>{row.label}</th>
                    {plans.map((p) => (
                      <td key={p.key} className="py-3.5">
                        <div className="flex justify-center">
                          {row.included[p.key] ? <Check size={17} className={t.accentText} /> : <X size={17} className="text-[#C9524B]/60" />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* اشاره‌ی محو به این‌که جدول قابل‌اسکرول‌کردنه — فقط زیر md، چون
              دسکتاپ با BREAKOUT کل عرض رو بدون اسکرول نشون می‌ده */}
          <div
            className="pointer-events-none absolute bottom-6 left-0 top-6 w-8 rounded-l-[24px] md:hidden"
            style={{ background: "linear-gradient(to right, var(--bg), transparent)" }}
          />
        </div>

        {upcomingRows.length > 0 && (
          <div className={`relative mt-4 overflow-x-auto rounded-[20px] border ${t.cardBorder} ${t.cardBg} p-5 ${t.shadow} backdrop-blur-2xl ${BREAKOUT}`} aria-hidden="true">
            <div className="pointer-events-none select-none blur-md">
              {upcomingRows.map((row) => (
                <div key={row.label} className={`grid ${COMPARE_GRID_COLS} items-center gap-4 border-b ${t.line} py-3 last:border-none`}>
                  <div className={`text-right text-[12.5px] ${t.muted}`}>{row.label}</div>
                  {plans.map((p) => (
                    <div key={p.key} className="flex justify-center">
                      {row.included[p.key] ? <Check size={17} className={t.accentText} /> : <X size={17} className="text-[#C9524B]/60" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`rounded-full px-4 py-1.5 text-xs font-extrabold text-white ${t.accentBg} ${t.accentShadow}`}>
                به‌زودی
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
