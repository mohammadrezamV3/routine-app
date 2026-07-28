"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { animate } from "animejs";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { staggerFieldsIn, revealOnScroll } from "@/lib/uiAnim";
import { ICONS } from "@/components/NavDrawer";
import { getSiteMarket } from "@/lib/market";
import { useTheme } from "@/components/ThemeProvider";

const SLEEP_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const X_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

const TRUST_POINTS = [
  "تمام داده‌ها رمزنگاری شدن",
  "دقیق، حرفه‌ای و همیشه به‌روز",
  "بدون توقف!",
];

type Duration = "1" | "3" | "6" | "12";
const DURATIONS: Duration[] = ["1", "3", "6", "12"];
const DURATION_LABELS: Record<Duration, string> = { "1": "۱ ماهه", "3": "۳ ماهه", "6": "۶ ماهه", "12": "۱۲ ماهه" };
const DURATION_LABELS_INTL: Record<Duration, string> = { "1": "1 mo", "3": "3 mo", "6": "6 mo", "12": "12 mo" };

type PlanCard = {
  key: string; nameFa: string; blurb: string[]; highlight?: boolean;
  free?: boolean; prices?: Record<Duration, string>;
};

const PLANS_IRAN: PlanCard[] = [
  {
    key: "basic", nameFa: "Base Plan", free: true,
    blurb: ["روتین روزانه", "خواب", "کارهای روزمره"],
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
    key: "max", nameFa: "Plan Max", highlight: true,
    blurb: ["همه‌ی ماژول‌ها، بدون محدودیت", "بدنسازی + کالری، ژورنال ترید، ai mapping", "تحلیل هوشمند اختصاصی"],
    prices: { "1": "۱۹۹,۰۰۰ تومان", "3": "۵۳۵,۰۰۰ تومان", "6": "۹۵۵,۰۰۰ تومان", "12": "۱,۶۷۰,۰۰۰ تومان" },
  },
];

const PLANS_INTL: PlanCard[] = [
  {
    key: "basic", nameFa: "Basic", free: true,
    blurb: ["Daily routine", "Sleep", "Daily tasks"],
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
    key: "max", nameFa: "Plan Max", highlight: true,
    blurb: ["Every module, unlimited", "Bodybuilding + calories, trade journal, ai mapping", "Dedicated smart insights"],
    prices: { "1": "$17.99", "3": "$47.99", "6": "$85.99", "12": "$149.99" },
  },
];

type CompareRow = { label: string; included: Record<string, boolean> };

const COMPARE_ROWS_IRAN: CompareRow[] = [
  { label: "روتین روزانه، خواب و کارهای روزمره", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "برنامه بدنسازی", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "شمارش کالری", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "ژورنال ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "چک‌لیست ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "تحلیل هوشمند", included: { basic: false, exercise: false, trade: false, max: true } },
];

const COMPARE_ROWS_INTL: CompareRow[] = [
  { label: "Daily routine, sleep & tasks", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "Bodybuilding program", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Calorie tracking", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Trade journal", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "Trade checklist", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: true, trade: true, max: true } },
  { label: "Smart insights", included: { basic: false, exercise: false, trade: false, max: true } },
];

// ستون‌های کارت‌های پلن و ردیف‌های جدول مقایسه (حالت روشن) باید عیناً یک
// grid-template-columns رو به اشتراک بذارن، وگرنه تیک هر پلن زیر کارت خودش
// نمی‌افته — همون منطقی که نسخه‌ی حالت تاریک (globals.css) هم داره.
const LIGHT_GRID_COLS = "grid-cols-[minmax(180px,1.4fr)_repeat(4,minmax(220px,1fr))]";

function FeatureCarousel() {
  const { theme } = useTheme();
  const isLight = theme === "light";
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

  useEffect(() => {
    if (!boxRef.current) return;
    animate(boxRef.current, { opacity: [0, 1], translateY: [10, 0], duration: 420, ease: "outQuad" });
  }, [index]);

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
      className={isLight ? "relative" : "landing-carousel"}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={isLight
          ? "relative rounded-[28px] border border-white/60 bg-white/70 px-8 py-9 text-center shadow-[0_15px_45px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:px-14"
          : "landing-carousel-box"}
        ref={boxRef}
        key={index}
      >
        <button
          type="button"
          className={isLight ? "absolute left-3 top-1/2 hidden -translate-y-1/2 text-[#B08968] transition hover:text-[#D97706] md:flex" : "landing-carousel-arrow prev"}
          aria-label="قابلیت قبلی"
          onClick={() => go(-1)}
        >
          {isLight ? <ChevronLeft size={18} /> : (
            <svg viewBox="0 0 24 24" fill="none"><path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </button>
        <span className={isLight ? "mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FCEEDD] text-[#D97706]" : "landing-feature-icon"}>{f.icon}</span>
        <div className={isLight ? "text-[11px] font-bold uppercase tracking-[0.12em] text-[#B08968]" : "landing-feature-title"}>{f.title}</div>
        <div className={isLight ? "mt-1.5 text-[17px] font-extrabold text-[#2B2118]" : "landing-feature-hook"}>{f.hook}</div>
        <div className={isLight ? "mt-1.5 text-[13.5px] leading-7 text-[#6B5D4D]" : "landing-feature-body"}>{f.body}</div>
        <button
          type="button"
          className={isLight ? "absolute right-3 top-1/2 hidden -translate-y-1/2 text-[#B08968] transition hover:text-[#D97706] md:flex" : "landing-carousel-arrow next"}
          aria-label="قابلیت بعدی"
          onClick={() => go(1)}
        >
          {isLight ? <ChevronRight size={18} /> : (
            <svg viewBox="0 0 24 24" fill="none"><path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

function PlanCardView({ p, isIntl }: { p: PlanCard; isIntl: boolean }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [duration, setDuration] = useState<Duration>("1");
  const labels = isIntl ? DURATION_LABELS_INTL : DURATION_LABELS;

  const cardClass = isLight
    ? `relative flex flex-col rounded-[28px] border p-6 backdrop-blur-xl ${p.highlight
      ? "border-[#D97706]/60 bg-gradient-to-b from-[#FFF4E2] to-white shadow-[0_18px_45px_rgba(217,119,6,0.16)]"
      : "border-white/60 bg-white/70 shadow-[0_15px_45px_rgba(0,0,0,0.06)]"}`
    : `landing-plan-card${p.highlight ? " highlight" : ""}`;

  return (
    <motion.div className={cardClass} data-reveal whileHover={isLight ? { scale: 1.02 } : undefined} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      {p.highlight && (
        <span className={isLight ? "absolute -top-3 right-6 rounded-full bg-[#D97706] px-3 py-1 text-[10.5px] font-extrabold text-white" : "landing-plan-badge"}>
          محبوب‌ترین
        </span>
      )}
      <div className={isLight ? "text-lg font-extrabold text-[#D97706]" : "landing-plan-name"}>{p.nameFa}</div>

      <ul className={isLight ? "mt-3 flex flex-1 flex-col gap-1.5" : "landing-plan-lines"}>
        {p.blurb.map((line) => (
          <li key={line} className={isLight ? "flex items-start gap-2 text-[12.5px] leading-6 text-[#4A3D2F]" : undefined}>
            {isLight ? <Check size={15} className="mt-0.5 shrink-0 text-[#D97706]" /> : (
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            {line}
          </li>
        ))}
      </ul>

      {p.free ? (
        <>
          <div className={isLight ? "mt-3.5 text-lg font-extrabold text-[#2B2118]" : "landing-plan-price"}>رایگان</div>
          <Link
            href="/auth/signup"
            className={isLight ? "mt-3.5 block w-full rounded-2xl bg-[#D97706] py-2.5 text-center text-[13.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98]" : "landing-cta-primary"}
            style={isLight ? undefined : { width: "100%", marginTop: 14 }}
          >
            شروع رایگان
          </Link>
        </>
      ) : (
        <>
          <div className={isLight ? "mt-3.5 text-lg font-extrabold text-[#2B2118]" : "landing-plan-price"}>
            {p.prices![duration]}
            <span className={isLight ? "mr-1 text-[11px] font-semibold text-[#9C8770]" : undefined}>/ {labels[duration]}</span>
          </div>
          <div className={isLight ? "mt-2.5 flex flex-wrap gap-1.5" : "landing-plan-duration-row"}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={isLight
                  ? `flex-1 min-w-[58px] rounded-lg border py-1.5 text-[11.5px] font-bold transition ${d === duration ? "border-[#D97706] bg-[#FCEEDD] text-[#D97706]" : "border-[#E7DCC8] text-[#9C8770] hover:border-[#D97706]"}`
                  : `landing-plan-duration${d === duration ? " on" : ""}`}
                onClick={() => setDuration(d)}
              >
                {labels[d]}
              </button>
            ))}
          </div>
          <Link
            href={`/auth/signup?plan=${p.key}&duration=${duration}`}
            className={isLight
              ? `mt-3.5 block w-full rounded-2xl py-2.5 text-center text-[13.5px] font-bold transition active:scale-[0.98] ${p.highlight ? "bg-[#D97706] text-white hover:brightness-105" : "border border-[#E7DCC8] bg-white text-[#2B2118] hover:border-[#D97706]"}`
              : (p.highlight ? "landing-cta-primary" : "landing-cta-secondary")}
            style={isLight ? undefined : { width: "100%", marginTop: 14 }}
          >
            فعال‌سازی این پلن
          </Link>
        </>
      )}
    </motion.div>
  );
}

export function LandingPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const heroRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const isIntl = getSiteMarket() === "INTERNATIONAL";
  const plans = isIntl ? PLANS_INTL : PLANS_IRAN;
  const compareRows = isIntl ? COMPARE_ROWS_INTL : COMPARE_ROWS_IRAN;

  useEffect(() => { staggerFieldsIn(heroRef.current); }, []);
  useEffect(() => revealOnScroll(plansRef.current), []);

  return (
    <>
      <section id="sec-landing-hero" style={{ textAlign: "center", paddingTop: 18 }}>
        <div ref={heroRef}>
          <div className={isLight ? "inline-block text-xs font-extrabold uppercase tracking-[0.22em] text-[#D97706]" : "eyebrow"} data-anim-field>Arion</div>
          <h1 className={isLight ? "mt-2 text-[2.15rem] font-extrabold leading-[1.35] text-[#2B2118] sm:text-[2.6rem]" : "landing-h1"} data-anim-field>
            {isLight ? <>همه‌ی نظم زندگی‌ات، توی <span className="text-[#D97706]">یک اپ</span></> : "همه‌ی نظم زندگی‌ات، توی یک اپ"}
          </h1>
          <p className={isLight ? "mx-auto mt-4 max-w-md text-[15px] leading-8 text-[#6B5D4D]" : "landing-sub"} data-anim-field>
            روتین روزانه، خواب، بدنسازی، ژورنال ترید و مسیر یادگیری —
            هرکدوم دقیق، ساده و بدون شلوغی. همه‌چیز یک‌جا، همه‌چیز به‌موقع.
          </p>
          <div className={isLight ? "mt-8 flex items-center justify-center gap-3" : "landing-cta-row"} data-anim-field>
            <Link
              href="/auth/signup"
              className={isLight
                ? "inline-flex items-center gap-1.5 rounded-[20px] bg-[#D97706] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(217,119,6,0.28)] transition hover:brightness-105 active:scale-[0.97]"
                : "landing-cta-primary"}
            >
              {isLight ? <>شروع رایگان <ArrowLeft size={16} /></> : "شروع رایگان ←"}
            </Link>
            <Link
              href="/auth/login"
              className={isLight
                ? "inline-flex items-center rounded-[20px] border border-[#E7DCC8] bg-white/70 px-7 py-3.5 text-[15px] font-bold text-[#2B2118] backdrop-blur-md transition hover:bg-white active:scale-[0.97]"
                : "landing-cta-secondary"}
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
        <div className={isLight ? "flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/70 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.06)] backdrop-blur-xl" : "landing-trust"}>
          {TRUST_POINTS.map((t) => (
            <div key={t} className={isLight ? "flex items-center gap-2.5 text-[13.5px] font-medium text-[#2B2118]" : "landing-trust-item"}>
              {isLight ? <Check size={17} className="shrink-0 text-[#D97706]" /> : (
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="sec-landing-plans" ref={plansRef} style={{ paddingTop: 8 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 className={isLight ? "text-2xl font-extrabold text-[#2B2118]" : "landing-section-title"}>پلن‌ها</h2>
        </div>

        <div className={isLight ? "overflow-x-auto rounded-[28px] border border-white/60 bg-white/50 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.06)] backdrop-blur-xl md:w-screen md:max-w-[1240px] md:mr-[-310px]" : "landing-plans-wrap"}>
          <div className={isLight ? `grid gap-4 ${LIGHT_GRID_COLS}` : "landing-plans"}>
            <div aria-hidden="true" />
            {plans.map((p) => <PlanCardView key={p.key} p={p} isIntl={isIntl} />)}
          </div>
        </div>

        <div
          className={isLight ? "mt-6 overflow-x-auto rounded-[24px] border border-white/60 bg-white/70 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.06)] backdrop-blur-xl md:w-screen md:max-w-[1240px] md:mr-[-310px]" : "landing-compare-wrap"}
          data-reveal
        >
          <div className={isLight ? "" : "landing-compare"} role="table" aria-label={isIntl ? "Plan comparison" : "مقایسه پلن‌ها"}>
            <div className={isLight ? `grid ${LIGHT_GRID_COLS} items-center gap-4 border-b border-[#F0E6D6] pb-3` : "landing-compare-row landing-compare-head"} role="row">
              <div className={isLight ? "text-right text-[12.5px] font-bold text-[#2B2118]" : "landing-compare-cell landing-compare-label"} role="columnheader" />
              {plans.map((p) => (
                <div key={p.key} className={isLight ? "text-center text-[12.5px] font-bold text-[#2B2118]" : "landing-compare-cell"} role="columnheader">{p.nameFa}</div>
              ))}
            </div>
            {compareRows.map((row) => (
              <div key={row.label} className={isLight ? `grid ${LIGHT_GRID_COLS} items-center gap-4 border-b border-[#F0E6D6] py-3.5 last:border-none` : "landing-compare-row"} role="row">
                <div className={isLight ? "text-right text-[12.5px] text-[#6B5D4D]" : "landing-compare-cell landing-compare-label"} role="rowheader">{row.label}</div>
                {plans.map((p) => (
                  <div
                    key={p.key}
                    className={isLight ? "flex justify-center" : `landing-compare-cell ${row.included[p.key] ? "compare-yes" : "compare-no"}`}
                    role="cell"
                  >
                    {isLight
                      ? (row.included[p.key] ? <Check size={17} className="text-[#D97706]" /> : <X size={17} className="text-[#C9524B]/60" />)
                      : (row.included[p.key] ? CHECK_ICON : X_ICON)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
