"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, Bell, Bot, Camera, Check, ChevronDown, Flame, Lock, Quote,
  ShieldCheck, TrendingUp, Headset, Lightbulb, Smartphone, BarChart3, Zap,
  Users, Sparkles, Trophy, RefreshCw, UserPlus, LayoutGrid, CalendarCheck,
} from "lucide-react";
import "@/components/landing-sections.css";
import { FAQ_ITEMS } from "@/lib/landingFaq";

const EASE = [0.22, 1, 0.36, 1] as const;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function fa(n: number) {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ title, accent }: { title: string; accent?: string }) {
  return (
    <Reveal className="ls-head">
      <h2 className="landing-section-title ls-title">
        {title} {accent && <span className="ls-title-accent">{accent}</span>}
      </h2>
    </Reveal>
  );
}

/* ───────────────────────── 1) Stats ───────────────────────── */

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  // پیش‌فرض = مقدار نهایی (همون چیزی که سرور رندر می‌کنه)؛ فقط بعد از mount و
  // اگه حرکت مجازه، روی صفر می‌ره تا دیده‌شدن، بدون mismatch.
  const [val, setVal] = useState(to);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (reduce) return;
    setVal(0);
    setArmed(true);
  }, [reduce]);

  useEffect(() => {
    if (!armed || !inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, inView, to]);

  return <span ref={ref}>{fa(val)}{suffix}</span>;
}

const STATS: { to?: number; suffix?: string; text?: string; label: string }[] = [
  { to: 8, label: "بخش در یک اپ" },
  { to: 365, label: "روز سطح استریک" },
  { to: 100, suffix: "٪", label: "فارسی و راست‌به‌چپ" },
  { text: "MT4·MT5", label: "همگام با متاتریدر ۴ و ۵" },
];

export function LandingStats() {
  return (
    <Reveal>
      <div className="ls-stats" role="list">
        {STATS.map((s) => (
          <div key={s.label} className="ls-stat" role="listitem">
            <div className="ls-stat-num">
              {s.to !== undefined ? <CountUp to={s.to} suffix={s.suffix} /> : <span dir="ltr" className="ls-stat-text">{s.text}</span>}
            </div>
            <div className="ls-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ───────────────────────── 2) How it works ───────────────────────── */

const STEPS = [
  { icon: UserPlus, title: "ثبت‌نام رایگان", body: "در چند ثانیه حساب بساز؛ بدون کارت بانکی و بدون تعهد." },
  { icon: LayoutGrid, title: "بخش‌هایت را انتخاب کن", body: "روتین، ورزش، ترید، رودمپ… هرچه لازم داری را روشن کن یا با «نومو» برنامه‌ات را بچین." },
  { icon: CalendarCheck, title: "هر روز تیک بزن", body: "کارهای امروز را انجام بده، استریک بساز و پیشرفتت را ببین." },
];

export function LandingHowItWorks() {
  const reduce = useReducedMotion();
  return (
    <div>
      <SectionHead title="چطور" accent="کار می‌کند؟" />
      <div className="ls-steps">
        <div className="ls-steps-line" aria-hidden="true">
          <motion.span
            className="ls-steps-line-fill"
            initial={reduce ? false : { scaleX: 0, scaleY: 0 }}
            whileInView={{ scaleX: 1, scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.6, ease: EASE }}
          />
        </div>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.title} delay={0.12 * i} className="ls-step">
              <div className="ls-step-badge">
                <Icon size={22} />
                <span className="ls-step-n">{fa(i + 1)}</span>
              </div>
              <h3 className="ls-step-title">{s.title}</h3>
              <p className="ls-step-body">{s.body}</p>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 3) Bento ───────────────────────── */

function VisE2EE() {
  return (
    <div className="ls-vis ls-vis-chat" aria-hidden="true">
      <div className="ls-bubble ls-bubble-in"><span className="ls-scramble">●●●● ●●● ●●●●●</span></div>
      <div className="ls-bubble ls-bubble-out"><span className="ls-scramble">●●● ●●●●</span></div>
      <div className="ls-bubble ls-bubble-in ls-bubble-short"><span className="ls-scramble">●●● ●●</span></div>
      <span className="ls-lock"><Lock size={16} /></span>
    </div>
  );
}

function VisPwa() {
  return (
    <div className="ls-vis ls-vis-phone" aria-hidden="true">
      <div className="ls-phone">
        <span className="ls-phone-notch" />
        <div className="ls-toast">
          <span className="ls-toast-ic"><Bell size={11} /></span>
          <span className="ls-toast-tx">یادآور: ورزش امروز</span>
        </div>
        <div className="ls-phone-row" /><div className="ls-phone-row ls-w70" /><div className="ls-phone-row ls-w50" />
      </div>
    </div>
  );
}

const TIERS = [1, 3, 7, 30, 60, 90, 180, 365];

function VisStreak() {
  return (
    <div className="ls-vis ls-vis-streak" aria-hidden="true">
      {TIERS.map((d, i) => (
        <div key={d} className="ls-tier" style={{ ["--i" as string]: i, ["--lvl" as string]: (i + 1) / TIERS.length }}>
          <Flame size={14 + i * 2.6} className="ls-flame" />
          <span className="ls-tier-d">{fa(d)}</span>
        </div>
      ))}
    </div>
  );
}

function VisFriends() {
  const rows = [{ w: 92, n: "س" }, { w: 74, n: "م" }, { w: 58, n: "ن" }];
  return (
    <div className="ls-vis ls-vis-friends" aria-hidden="true">
      {rows.map((r, i) => (
        <div key={r.n} className="ls-lb-row">
          <span className="ls-avatar">{r.n}</span>
          <span className="ls-lb-bar"><span style={{ width: `${r.w}%`, ["--i" as string]: i }} /></span>
          {i === 0 && <Trophy size={13} className="ls-lb-trophy" />}
        </div>
      ))}
    </div>
  );
}

function VisMeta() {
  const rows = [{ s: "EURUSD", p: "+۱۲۰" }, { s: "XAUUSD", p: "+۸۵" }, { s: "GBPJPY", p: "−۴۰" }];
  return (
    <div className="ls-vis ls-vis-meta" aria-hidden="true">
      <div className="ls-meta-head"><RefreshCw size={12} className="ls-spin" /><span dir="ltr">MT4 · MT5</span></div>
      {rows.map((r, i) => (
        <div key={r.s} className="ls-trade" style={{ ["--i" as string]: i }}>
          <span dir="ltr">{r.s}</span>
          <span className={r.p.startsWith("−") ? "ls-neg" : "ls-pos"}>{r.p}</span>
        </div>
      ))}
    </div>
  );
}

function VisFood() {
  return (
    <div className="ls-vis ls-vis-food" aria-hidden="true">
      <div className="ls-plate">
        <span className="ls-plate-in" />
        <span className="ls-scan" />
        <Camera size={18} className="ls-plate-cam" />
      </div>
      <div className="ls-macros">
        <span>پروتئین</span><span>کربوهیدرات</span><span>چربی</span>
      </div>
    </div>
  );
}

const BENTO = [
  { key: "e2ee", cls: "ls-b-e2ee", icon: ShieldCheck, title: "خصوصی و رمزگذاری سرتاسری", body: "گفت‌وگو با مربی‌ها روی دستگاه رمز می‌شود؛ نه سرور و نه هیچ ادمینی متن پیام‌ها را نمی‌بیند.", vis: VisE2EE },
  { key: "pwa", cls: "ls-b-pwa", icon: Smartphone, title: "همه‌جا، مثل یک اپ", body: "روی گوشی نصب کن و یادآور بگیر.", vis: VisPwa },
  { key: "streak", cls: "ls-b-streak", icon: Flame, title: "استریک با ۸ سطح", body: "از یک روز تا یک سال؛ هر سطح شعله‌ی تازه‌ای دارد.", vis: VisStreak },
  { key: "friends", cls: "ls-b-friends", icon: Users, title: "دوستان و رقابت", body: "با دوستانت رقابت دوستانه کن.", vis: VisFriends },
  { key: "meta", cls: "ls-b-meta", icon: TrendingUp, title: "همگام‌سازی خودکار متاتریدر", body: "معاملات وارد ژورنال می‌شوند؛ رمز حساب معاملاتی هرگز خواسته نمی‌شود.", vis: VisMeta },
  { key: "food", cls: "ls-b-food", icon: Camera, title: "اسکن غذا با هوش مصنوعی", body: "عکس بگیر، کالری و ماکروها را ببین.", vis: VisFood },
];

export function LandingBento() {
  return (
    <div>
      <SectionHead title="کوچک‌ترین جزئیات،" accent="با دقت طراحی شده" />
      <div className="ls-bento">
        {BENTO.map((b, i) => {
          const Icon = b.icon;
          const Vis = b.vis;
          return (
            <Reveal key={b.key} delay={0.06 * (i % 3)} className={`ls-card ${b.cls}`}>
              <div className="ls-card-inner">
                <div className="ls-card-text">
                  <span className="ls-card-ic"><Icon size={18} /></span>
                  <h3 className="ls-card-title">{b.title}</h3>
                  <p className="ls-card-body">{b.body}</p>
                </div>
                <Vis />
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 4) Why us ───────────────────────── */

const WHY_US = [
  { icon: ShieldCheck, color: "#22C55E", title: "امن و خصوصی", body: "اطلاعات تو محفوظ می‌مونه" },
  { icon: TrendingUp, color: "#A855F7", title: "برنامه‌های شخصی", body: "متناسب با هدف‌ها و سبک زندگی تو" },
  { icon: Headset, color: "#3B82F6", title: "پشتیبانی واقعی", body: "ما کنار توایم، هر زمان که نیاز داری" },
  { icon: Lightbulb, color: "#F59E0B", title: "ابزارهای کاربردی", body: "همه‌چیز برای رشد در یک اپلیکیشن" },
  { icon: Smartphone, color: "#EC4899", title: "همه‌جا در دسترس", body: "موبایل، تبلت یا دسکتاپ" },
  { icon: BarChart3, color: "#06B6D4", title: "پیشرفت قابل‌مشاهده", body: "آمار و گزارش دقیق از مسیرت" },
  { icon: Zap, color: "#F97316", title: "سریع و ساده", body: "بدون شلوغی، فقط چیزی که لازم داری" },
  { icon: Users, color: "#14B8A6", title: "برای همه سبک‌ها", body: "از مبتدی تا حرفه‌ای" },
  { icon: Sparkles, color: "#8B5CF6", title: "همیشه در حال بهتر شدن", body: "فیچرهای جدید مرتب اضافه می‌شن" },
];

export function LandingWhyUs() {
  return (
    <div>
      <SectionHead title="چرا" accent="آریون؟" />
      <div className="ls-why">
        {WHY_US.map((w, i) => {
          const Icon = w.icon;
          return (
            <Reveal key={w.title} delay={0.04 * (i % 3)} className="ls-why-item">
              <span className="ls-why-ic" style={{ ["--c" as string]: w.color }}><Icon size={18} /></span>
              <div className="ls-why-txt">
                <div className="ls-why-title">{w.title}</div>
                <div className="ls-why-body">{w.body}</div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 5) Quote ───────────────────────── */

const QUOTES = [
  { text: "موفقیت مجموعه‌ای از انتخاب‌های کوچک و مهربانانه با خودته، روز از پی روز.", author: "برایان تریسی" },
  { text: "هر قدم کوچیک هم یه قدمه؛ لازم نیست همیشه بزرگ باشه.", author: "ضرب‌المثل" },
  { text: "به خودت زمان بده؛ رشد آروم هم رشده.", author: "ضرب‌المثل" },
  { text: "امروز فقط کافیه یه‌کم بهتر از دیروز باشی.", author: "ضرب‌المثل" },
  { text: "هر سفر بلندی، با یه قدم آروم شروع می‌شه.", author: "لائوتزو" },
  { text: "نظم یعنی مهربونی با آینده‌ی خودت.", author: "ضرب‌المثل" },
  { text: "عادت‌های کوچیک و ملایم، آروم‌آروم زندگی رو می‌سازن.", author: "جیمز کلییر" },
  { text: "لازم نیست عجله کنی؛ فقط ادامه بده.", author: "ضرب‌المثل" },
  { text: "هر روز یک فرصت تازه‌ست، بدون قضاوت دیروز.", author: "ضرب‌المثل" },
  { text: "کیفیت روزهات، از جنس همون عادت‌های کوچیک و آرومته.", author: "جیمز کلییر" },
  { text: "همیشه می‌شه دوباره شروع کرد، آروم و بدون از دست دادن امید.", author: "وینستون چرچیل" },
  { text: "بهترین نسخه‌ی خودت، همونیه که با خودش مهربونه.", author: "ضرب‌المثل" },
];

export function LandingTestimonialQuote() {
  // رندر اول ثابت (QUOTES[0]) تا hydration mismatch نداشته باشیم؛ انتخاب
  // تصادفی و چرخش فقط بعد از mount.
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setI(Math.floor(Math.random() * QUOTES.length));
  }, []);

  useEffect(() => {
    if (reduce) return;
    let swap: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setShown(false);
      swap = setTimeout(() => {
        setI((c) => (c + 1) % QUOTES.length);
        setShown(true);
      }, 350);
    }, 9000);
    return () => { clearInterval(id); clearTimeout(swap); };
  }, [reduce]);

  const q = QUOTES[i];
  return (
    <Reveal>
      <figure className="ls-quote">
        <Quote size={28} className="ls-quote-ic" />
        <div className={`ls-quote-body${shown ? "" : " is-out"}`}>
          <blockquote className="ls-quote-text">{q.text}</blockquote>
          <figcaption className="ls-quote-by">— {q.author}</figcaption>
        </div>
      </figure>
    </Reveal>
  );
}

/* ───────────────────────── 6) FAQ ───────────────────────── */

export function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      <SectionHead title="سؤال‌های" accent="پرتکرار" />
      <Reveal>
        <div className="ls-faq">
          {FAQ_ITEMS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={`ls-faq-item${isOpen ? " is-open" : ""}`}>
                <h3 className="ls-faq-h">
                  <button
                    type="button"
                    className="ls-faq-btn"
                    aria-expanded={isOpen}
                    aria-controls={`ls-faq-p-${i}`}
                    id={`ls-faq-b-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{f.q}</span>
                    <ChevronDown size={18} className="ls-faq-chev" />
                  </button>
                </h3>
                <div id={`ls-faq-p-${i}`} role="region" aria-labelledby={`ls-faq-b-${i}`} className="ls-faq-panel">
                  <div className="ls-faq-panel-in"><p>{f.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}

/* ───────────────────────── 7) Final CTA ───────────────────────── */

export function LandingFinalCTA() {
  return (
    <Reveal>
      <div className="ls-cta">
        <span className="ls-cta-glow" aria-hidden="true" />
        <span className="ls-cta-glow ls-cta-glow-2" aria-hidden="true" />
        <div className="ls-cta-in">
          <span className="ls-cta-chip"><Bot size={14} /> رایگان شروع کن، هر وقت خواستی ارتقا بده</span>
          <h2 className="ls-cta-title">همین امروز شروع کن</h2>
          <p className="ls-cta-sub">یک روتین ساده، یک تیک، یک روز بهتر.</p>
          <div className="ls-cta-actions">
            <Link href="/auth/signup" className="ls-btn ls-btn-primary">
              شروع رایگان <ArrowLeft size={16} />
            </Link>
            <Link href="/auth/login" className="ls-btn ls-btn-ghost">ورود</Link>
          </div>
          <div className="ls-cta-note"><Check size={13} /> بدون کارت بانکی</div>
        </div>
      </div>
    </Reveal>
  );
}
