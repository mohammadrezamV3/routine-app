"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { staggerFieldsIn, revealOnScroll } from "@/lib/uiAnim";
import { ICONS } from "@/components/NavDrawer";
import { getSiteMarket } from "@/lib/market";

const SLEEP_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const CALORIE_ICON = (
  <svg viewBox="0 0 24 24" fill="none"><path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.5-1-2-1-3 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 3-6 5-10Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
    title: "ورزش",
    hook: "برنامه‌ای که واقعاً مالِ توئه",
    body: "بر اساس هدفت — حجم، کات، قدرت یا استقامت — یه برنامه واقعی می‌سازیم، نه یه قالب عمومی.",
  },
  {
    icon: CALORIE_ICON,
    title: "کالری",
    hook: "بدون حساب‌کتاب دستی",
    body: "غذاتو جستجو کن یا دستی وارد کن، هدف روزانه‌ات رو دنبال کن.",
  },
  {
    icon: ICONS.trade,
    title: "ژورنال ترید",
    hook: "شفاف، بدون توصیه",
    body: "فقط آمار خام معاملاتت و یادآوری؛ هیچ پیشنهاد خرید/فروشی نمی‌دیم — تصمیم همیشه با خودته.",
  },
  {
    icon: ICONS.roadmaps,
    title: "رودمپ‌ساز (AI Mapping)",
    hook: "بهترین مسیر رو برات می‌چینیم",
    body: "با هوش مصنوعی، یکی از بهترین راه‌ها برای رسیدن به هدفت رو طراحی می‌کنیم — از گیتار تا اسپانیایی تا فتوشاپ، هر چیزی بخوای یاد بگیری، یک نقطه شروع مشخص داری.",
  },
];

const TRUST_POINTS = [
  "داده‌های تو فقط مال خودته",
  "بدون توصیه مالی یا پزشکی — فقط ابزار",
  "فارسی، سریع، بدون شلوغی",
];

type PlanCard = { key: string; nameFa: string; price: string; modules: string[]; highlight?: boolean };

const PLANS_IRAN: PlanCard[] = [
  { key: "basic", nameFa: "پایه", price: "۴۹,۰۰۰ تومان", modules: ["روتین روزانه", "خواب", "کارهای روزمره"] },
  { key: "exercise", nameFa: "ورزش", price: "۹۹,۰۰۰ تومان", modules: ["همه‌ی پایه", "ورزش"] },
  { key: "trade", nameFa: "ترید", price: "۱۲۹,۰۰۰ تومان", modules: ["همه‌ی پایه", "ژورنال ترید"] },
  { key: "max", nameFa: "مکس", price: "۱۹۹,۰۰۰ تومان", modules: ["همه‌ی ماژول‌ها", "کالری", "رودمپ‌ساز AI", "تحلیل هوشمند"], highlight: true },
];

const PLANS_INTL: PlanCard[] = [
  { key: "basic", nameFa: "Basic", price: "$3.99", modules: ["Daily routine", "Sleep", "Daily tasks"] },
  { key: "exercise", nameFa: "Exercise", price: "$7.99", modules: ["Everything in Basic", "Exercise"] },
  { key: "trade", nameFa: "Trade", price: "$12.99", modules: ["Everything in Basic", "Trade journal"] },
  { key: "max", nameFa: "Max", price: "$17.99", modules: ["Every module", "Calorie tracking", "AI Roadmaps", "Smart insights"], highlight: true },
];

export function LandingPage({ onGuestContinue }: { onGuestContinue: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const plans = getSiteMarket() === "INTERNATIONAL" ? PLANS_INTL : PLANS_IRAN;

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
            روتین روزانه، خواب، ورزش، کالری، ژورنال ترید و مسیر یادگیری —
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
              <ul className="landing-plan-modules">
                {p.modules.map((m) => (
                  <li key={m}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9.5 18 20 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {m}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className={p.highlight ? "landing-cta-primary" : "landing-cta-secondary"} style={{ width: "100%", marginTop: 14 }}>
                شروع کن
              </Link>
            </div>
          ))}
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
