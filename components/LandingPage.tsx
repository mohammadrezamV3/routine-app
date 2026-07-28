"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate } from "animejs";
import { staggerFieldsIn, revealOnScroll } from "@/lib/uiAnim";
import { ICONS } from "@/components/NavDrawer";
import { getSiteMarket } from "@/lib/market";

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

function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      className="landing-carousel"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="landing-carousel-box" ref={boxRef} key={index}>
        <button type="button" className="landing-carousel-arrow prev" aria-label="قابلیت قبلی" onClick={() => go(-1)}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="landing-feature-icon">{f.icon}</span>
        <div className="landing-feature-title">{f.title}</div>
        <div className="landing-feature-hook">{f.hook}</div>
        <div className="landing-feature-body">{f.body}</div>
        <button type="button" className="landing-carousel-arrow next" aria-label="قابلیت بعدی" onClick={() => go(1)}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function PlanCardView({ p, isIntl }: { p: PlanCard; isIntl: boolean }) {
  const [duration, setDuration] = useState<Duration>("1");
  const labels = isIntl ? DURATION_LABELS_INTL : DURATION_LABELS;

  return (
    <div className={`landing-plan-card${p.highlight ? " highlight" : ""}`} data-reveal>
      {p.highlight && <span className="landing-plan-badge">محبوب‌ترین</span>}
      <div className="landing-plan-name">{p.nameFa}</div>

      <ul className="landing-plan-lines">
        {p.blurb.map((line) => (
          <li key={line}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {line}
          </li>
        ))}
      </ul>

      {p.free ? (
        <>
          <div className="landing-plan-price">رایگان</div>
          <Link href="/auth/signup" className="landing-cta-primary" style={{ width: "100%", marginTop: 14 }}>
            شروع رایگان
          </Link>
        </>
      ) : (
        <>
          <div className="landing-plan-price">
            {p.prices![duration]}<span>/ {labels[duration]}</span>
          </div>
          <div className="landing-plan-duration-row">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`landing-plan-duration${d === duration ? " on" : ""}`}
                onClick={() => setDuration(d)}
              >
                {labels[d]}
              </button>
            ))}
          </div>
          <Link
            href={`/auth/signup?plan=${p.key}&duration=${duration}`}
            className={p.highlight ? "landing-cta-primary" : "landing-cta-secondary"}
            style={{ width: "100%", marginTop: 14 }}
          >
            فعال‌سازی این پلن
          </Link>
        </>
      )}
    </div>
  );
}

export function LandingPage({ onGuestContinue }: { onGuestContinue: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const isIntl = getSiteMarket() === "INTERNATIONAL";
  const plans = isIntl ? PLANS_INTL : PLANS_IRAN;
  const compareRows = isIntl ? COMPARE_ROWS_INTL : COMPARE_ROWS_IRAN;

  useEffect(() => { staggerFieldsIn(heroRef.current); }, []);
  useEffect(() => revealOnScroll(plansRef.current), []);

  return (
    <>
      <section id="sec-landing-hero" style={{ textAlign: "center", paddingTop: 18 }}>
        <div ref={heroRef}>
          <div className="eyebrow" data-anim-field>روتین من</div>
          <h1 className="landing-h1" data-anim-field>همه‌ی نظم زندگی‌ات، توی یک اپ</h1>
          <p className="landing-sub" data-anim-field>
            روتین روزانه، خواب، بدنسازی، ژورنال ترید و مسیر یادگیری —
            هرکدوم دقیق، ساده و بدون شلوغی. همه‌چیز یک‌جا، همه‌چیز به‌موقع.
          </p>
          <div className="landing-cta-row" data-anim-field>
            <Link href="/auth/signup" className="landing-cta-primary">شروع رایگان ←</Link>
            <Link href="/auth/login" className="landing-cta-secondary">ورود</Link>
          </div>
          <button type="button" className="landing-guest-link" data-anim-field onClick={onGuestContinue}>
            ادامه بدون ثبت‌نام، فقط نگاه کن ←
          </button>
        </div>
      </section>

      <section id="sec-landing-features" style={{ paddingTop: 20 }}>
        <FeatureCarousel />
      </section>

      <section id="sec-landing-trust" style={{ paddingTop: 8 }}>
        <div className="landing-trust">
          {TRUST_POINTS.map((t) => (
            <div key={t} className="landing-trust-item">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="sec-landing-plans" style={{ paddingTop: 8 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 className="landing-section-title">پلن‌ها</h2>
        </div>
        <div ref={plansRef} className="landing-plans">
          {plans.map((p) => <PlanCardView key={p.key} p={p} isIntl={isIntl} />)}
        </div>

        <div className="landing-compare-wrap" data-reveal>
          <table className="landing-compare-table">
            <thead>
              <tr>
                <th></th>
                {plans.map((p) => <th key={p.key}>{p.nameFa}</th>)}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label}>
                  <td className="landing-compare-label">{row.label}</td>
                  {plans.map((p) => (
                    <td key={p.key} className={row.included[p.key] ? "compare-yes" : "compare-no"}>
                      {row.included[p.key] ? CHECK_ICON : X_ICON}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
