"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
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
    hook: "بیدار شو، نه فقط بخواب",
    body: "ساعت بیدارشدنت بخشی از هر روزِ کامله — نظم خواب یعنی نظم همه‌چیز.",
  },
  {
    icon: ICONS.exercise,
    title: "بدنسازی",
    hook: "برنامه‌ای که واقعاً مالِ توئه",
    body: "لیفتینگ، حجم، کات یا استقامت — بر اساس هدفت یه برنامه واقعی می‌سازیم، نه یه قالب عمومی. شمارش کالری و ماکروها هم همراهشه، توی همون یه بخش.",
  },
  {
    icon: ICONS.trade,
    title: "ژورنال ترید",
    hook: "شفاف و حرفه‌ای",
    body: "سود/زیان، نرخ برد، میانگین سود و ضرر و تقویم کامل معاملاتت — همه در یک نگاه، دقیق و منظم.",
  },
  {
    icon: ICONS.roadmaps,
    title: "ai mapping",
    hook: "بهترین مسیر رو برات می‌چینیم",
    body: "با هوش مصنوعی، یکی از بهترین راه‌ها برای رسیدن به هدفت رو طراحی می‌کنیم — از گیتار تا اسپانیایی تا فتوشاپ، هر چیزی بخوای یاد بگیری، یک نقطه شروع مشخص داری.",
  },
];

const TRUST_POINTS = [
  "داده‌های تو فقط مال خودته",
  "دقیق، حرفه‌ای و همیشه به‌روز",
  "فارسی، سریع، بدون شلوغی",
];

type PlanCard = { key: string; nameFa: string; price: string; blurb: string; highlight?: boolean };

const PLANS_IRAN: PlanCard[] = [
  { key: "basic", nameFa: "پلن پایه", price: "۴۹,۰۰۰ تومان", blurb: "روتین روزانه، خواب و کارهای روزمره" },
  { key: "exercise", nameFa: "پلن پایه بخش بدنسازی", price: "۹۹,۰۰۰ تومان", blurb: "همه‌ی پایه + برنامه بدنسازی و کالری" },
  { key: "trade", nameFa: "پلن پایه پلن ترید", price: "۱۲۹,۰۰۰ تومان", blurb: "همه‌ی پایه + ژورنال حرفه‌ای ترید" },
  { key: "max", nameFa: "پلن مکس", price: "۱۹۹,۰۰۰ تومان", blurb: "همه‌چیز، بدون محدودیت", highlight: true },
];

const PLANS_INTL: PlanCard[] = [
  { key: "basic", nameFa: "Basic", price: "$3.99", blurb: "Daily routine, sleep & tasks" },
  { key: "exercise", nameFa: "Basic + Bodybuilding", price: "$7.99", blurb: "Everything in Basic + workouts & calories" },
  { key: "trade", nameFa: "Basic + Trade", price: "$12.99", blurb: "Everything in Basic + trade journal" },
  { key: "max", nameFa: "Max", price: "$17.99", blurb: "Everything, unlimited", highlight: true },
];

type CompareRow = { label: string; included: Record<string, boolean> };

const COMPARE_ROWS_IRAN: CompareRow[] = [
  { label: "روتین روزانه، خواب و کارهای روزمره", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "برنامه بدنسازی + شمارش کالری", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "ژورنال حرفه‌ای ترید", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "تحلیل هوشمند", included: { basic: false, exercise: false, trade: false, max: true } },
];

const COMPARE_ROWS_INTL: CompareRow[] = [
  { label: "Daily routine, sleep & tasks", included: { basic: true, exercise: true, trade: true, max: true } },
  { label: "Bodybuilding plan + calorie tracking", included: { basic: false, exercise: true, trade: false, max: true } },
  { label: "Professional trade journal", included: { basic: false, exercise: false, trade: true, max: true } },
  { label: "ai mapping", included: { basic: false, exercise: false, trade: false, max: true } },
  { label: "Smart insights", included: { basic: false, exercise: false, trade: false, max: true } },
];

export function LandingPage({ onGuestContinue }: { onGuestContinue: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const isIntl = getSiteMarket() === "INTERNATIONAL";
  const plans = isIntl ? PLANS_INTL : PLANS_IRAN;
  const compareRows = isIntl ? COMPARE_ROWS_INTL : COMPARE_ROWS_IRAN;

  useEffect(() => { staggerFieldsIn(heroRef.current); }, []);
  useEffect(() => revealOnScroll(featuresRef.current), []);
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
        <div ref={featuresRef} className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card" data-reveal>
              <span className="landing-feature-icon">{f.icon}</span>
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-hook">{f.hook}</div>
              <div className="landing-feature-body">{f.body}</div>
            </div>
          ))}
        </div>
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
          <div className="eyebrow" style={{ marginBottom: 0 }}>پلن‌ها</div>
          <h2 style={{ fontSize: 18, marginTop: 4 }}>هر چقدر لازم داری، همون رو بردار</h2>
        </div>
        <div ref={plansRef} className="landing-plans">
          {plans.map((p) => (
            <div key={p.key} className={`landing-plan-card${p.highlight ? " highlight" : ""}`} data-reveal>
              {p.highlight && <span className="landing-plan-badge">محبوب‌ترین</span>}
              <div className="landing-plan-name">{p.nameFa}</div>
              <div className="landing-plan-price">{p.price}<span>/ ماهانه</span></div>
              <div className="landing-plan-blurb">{p.blurb}</div>
              <Link href="/auth/signup" className={p.highlight ? "landing-cta-primary" : "landing-cta-secondary"} style={{ width: "100%", marginTop: 14 }}>
                شروع کن
              </Link>
            </div>
          ))}
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

      <section id="sec-landing-final" style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 16 }}>همین امروز شروع کن</h2>
        <div className="landing-cta-row" style={{ marginTop: 14, justifyContent: "center" }}>
          <Link href="/auth/signup" className="landing-cta-primary">ساخت حساب رایگان</Link>
        </div>
      </section>
    </>
  );
}
