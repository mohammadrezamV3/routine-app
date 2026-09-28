"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, Bell, Bot, Check, ChevronDown, Flame, Quote,
  ShieldCheck, TrendingUp, Headset, Lightbulb, Smartphone, BarChart3, Zap,
  Users, Sparkles, RefreshCw, UserPlus, LayoutGrid, CalendarCheck,
  CalendarDays, Dumbbell, Apple, CandlestickChart, CalendarClock, Clock, Route, GraduationCap, Megaphone, SunMoon, Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { DashProgressCircle } from "@/components/DashProgressCircle";
import { StreakFlame } from "@/components/StreakFlame";
import { FRIENDS, INERT, MockMentorChat, MockStreakTiers } from "@/components/LandingMockups";
import "@/components/landing-sections.css";
import { FAQ_ITEMS } from "@/lib/landingFaq";

const EASE = [0.22, 1, 0.36, 1] as const;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function fa(n: number) {
  // جداکننده‌ی هزارگان برای عددهای بزرگ (مثلِ تعدادِ کاربران)
  const str = n >= 1000 ? n.toLocaleString("en-US") : String(n);
  return str.replace(/\d/g, (d) => FA_DIGITS[Number(d)]).replace(/,/g, "٬");
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

// پایه‌ی شمارنده‌ی کاربران = همون USER_COUNT_BASE در lib/publicStats.ts (سرور)؛
// تا پاسخِ /api/public/stats برسه همین نشون داده می‌شه.
const USERS_FALLBACK = 1312;

const STATS: { to?: number; suffix?: string; text?: string; label: string }[] = [
  { to: 8, label: "بخش در یک اپ" },
  { to: 365, label: "روز سطح استریک" },
  { text: "MT4·MT5", label: "همگام با متاتریدر ۴ و ۵" },
];

export function LandingStats() {
  // تعدادِ کاربران: واقعی + پایه، از روتِ عمومیِ کش‌شده.
  const [users, setUsers] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && typeof d?.users === "number") setUsers(d.users); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const items = [{ to: users ?? USERS_FALLBACK, suffix: "+", label: "کاربر" }, ...STATS];

  return (
    <Reveal>
      <div className="ls-stats" role="list">
        {items.map((s) => (
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
// هر تصویرِ کوچک یک برش از خودِ اپ است (MentorChat، اعلانِ پوشِ reminderPlan،
// StreakFlame، DashFriendsCard، TradeMtLinkPanel، CalorieMacrosCard) — نه
// شکلِ نمادین. کلِ بخشِ تصویر aria-hidden و inert است.

function VisE2EE() {
  return (
    <div className="ls-vis ls-vis-chat dash-scope" aria-hidden="true" {...INERT}>
      <MockMentorChat
        peer="مربی"
        msgs={[
          { text: "برنامه‌ی این هفته‌ت رو فرستادم.", time: "09:12" },
          { mine: true, text: "دیدم، از امروز شروع می‌کنم.", time: "09:15" },
        ]}
      />
    </div>
  );
}

function VisPwa() {
  return (
    <div className="ls-vis ls-vis-phone" aria-hidden="true" {...INERT}>
      <div className="ls-phone">
        <span className="ls-phone-notch" />
        <div className="ls-toast">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-icon-dark-theme.png" alt="" width={18} height={18} className="ls-toast-ic" />
          <span className="ls-toast-tx"><b>یادآوری برنامه</b>تا ۱۵ دقیقه دیگه وقت «پیاده‌روی عصر» می‌رسه.</span>
        </div>
        <div className="ls-phone-row" /><div className="ls-phone-row ls-w70" /><div className="ls-phone-row ls-w50" />
      </div>
    </div>
  );
}

function VisStreak() {
  return (
    <div className="ls-vis ls-vis-streak dash-scope" aria-hidden="true" {...INERT}>
      <MockStreakTiers labels={false} />
    </div>
  );
}

function VisFriends() {
  return (
    <div className="ls-vis ls-vis-friends dash-scope" aria-hidden="true" {...INERT}>
      {FRIENDS.slice(0, 2).map((f) => (
        <div key={f.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <AgentAvatar seed={f.name} size={30} animated={false} className="shrink-0" />
            <span>
              <span className="flex items-center gap-1.5">
                <span className="text-[11.5px] font-semibold text-dash-text">{f.name}</span>
                <StreakFlame streak={f.streak} className="text-[10px]" />
              </span>
              <span className="mt-0.5 block text-[9.5px] text-dash-muted">{f.done} از {f.total} برنامه</span>
            </span>
          </span>
          <DashProgressCircle value={Math.round((f.done / f.total) * 100)} size={34} strokeWidth={3.5} />
        </div>
      ))}
    </div>
  );
}

function VisMeta() {
  return (
    <div className="ls-vis ls-vis-meta" aria-hidden="true" {...INERT}>
      <div className="ls-meta-head">
        <span>وضعیت اتصال</span>
        <span className="ls-meta-on"><span className="ls-live" /> فعال</span>
      </div>
      <div className="ls-meta-cells">
        <div className="trade-detail-cell"><span>نسخه</span><b>MT5</b></div>
        <div className="trade-detail-cell"><span>اکوئیتی</span><b className="mono">۱۰۸۴۲٫۵۰</b></div>
        <div className="trade-detail-cell"><span>آخرین همگام‌سازی</span><b>امروز ۱۴:۰۵</b></div>
      </div>
    </div>
  );
}

function VisFood() {
  return (
    <div className="ls-vis ls-vis-food dash-scope" aria-hidden="true" {...INERT}>
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-dash-text">
        <Target className="h-4 w-4 text-dash-green" /> هدفِ روزانه‌ی تو
      </div>
      <div className="ls-food-grid">
        {[
          { l: "کالری", v: "۲۱۰۰" }, { l: "پروتئین (گرم)", v: "۱۴۰" },
          { l: "کربوهیدرات (گرم)", v: "۲۲۰" }, { l: "چربی (گرم)", v: "۷۰" },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-dash-border bg-white/[0.02] px-2 py-1.5 text-center">
            <div className="mono text-[12px] font-bold text-dash-text">{x.v}</div>
            <div className="mt-0.5 text-[8.5px] text-dash-muted">{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BENTO = [
  { key: "e2ee", cls: "ls-b-e2ee", icon: ShieldCheck, title: "خصوصی و رمزگذاری سرتاسری", body: "گفت‌وگو و یادداشتِ خصوصیِ مربی‌ها روی دستگاه رمز می‌شود؛ نه سرور و نه هیچ ادمینی متن پیام‌ها را نمی‌بیند.", vis: VisE2EE },
  { key: "pwa", cls: "ls-b-pwa", icon: Smartphone, title: "همه‌جا، مثل یک اپ", body: "روی گوشی نصب کن و یادآوری‌ها را با نوتیفیکیشن بگیر.", vis: VisPwa },
  { key: "streak", cls: "ls-b-streak", icon: Flame, title: "استریک با ۸ سطح", body: "از یک روز تا یک سال؛ هر سطح شعله‌ی خودش را دارد.", vis: VisStreak },
  { key: "friends", cls: "ls-b-friends", icon: Users, title: "دوستان", body: "پیشرفتِ امروز و استریکِ دوستانت را کنار خودت ببین.", vis: VisFriends },
  { key: "meta", cls: "ls-b-meta", icon: TrendingUp, title: "همگام‌سازی خودکار متاتریدر", body: "با اکسپرت و کدِ اتصال، معاملات بدونِ تکرار وارد ژورنال می‌شوند؛ رمز حساب معاملاتی هرگز خواسته نمی‌شود.", vis: VisMeta },
  { key: "food", cls: "ls-b-food", icon: Target, title: "هدفِ کالری و ماکروی شخصی", body: "از قد، وزن، سن، روزهای تمرین و هدفت، کالری و درشت‌مغذیِ روزانه‌ات حساب می‌شود.", vis: VisFood },
];

export function LandingBento() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "80px" });
  return (
    <div>
      <SectionHead title="کوچک‌ترین جزئیات،" accent="با دقت طراحی شده" />
      <div ref={ref} className={`ls-bento${inView ? "" : " is-paused"}`}>
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

/* ───────────────────────── 3.5) All features ───────────────────────── */
// فهرستِ فشرده‌ی همه‌ی قابلیت‌ها — هر مورد با کدِ اپ چک شده و هرجا صفحه‌ی
// توضیحیِ اختصاصی هست، به همان لینک می‌دهد (لینکِ داخلی برای سئو).

const FEATURES: { icon: LucideIcon; title: string; body: string; href?: string }[] = [
  { icon: CalendarCheck, title: "روتین روزانه", body: "برنامه‌های تکرارشونده با ساعت، تگ و اهمیت، و تیکِ هر روز.", href: "/routine" },
  { icon: CalendarDays, title: "برنامه هفتگی و تاریخچه", body: "کل هفته در یک نگاه، و تقویمِ تاریخچه برای هر روزِ گذشته.", href: "/daily-planner" },
  { icon: Flame, title: "پیگیری عادت و استریک", body: "۸ سطحِ استریک از ۱ تا ۳۶۵ روزِ کامل.", href: "/habit-tracker" },
  { icon: Bell, title: "یادآوری و یادآوری دارو", body: "نوتیفیکیشنِ سرِ وقت برای برنامه‌ها و هر نوبتِ دارو." },
  { icon: Bot, title: "دستیار «نومو»", body: "برنامه‌ات را با زبانِ خودت بساز، جابه‌جا کن یا پاک کن.", href: "/ai-planner" },
  { icon: BarChart3, title: "آنالیز هفتگی", body: "امتیاز، نمره، بینش و پیش‌بینیِ پایانِ هفته از داده‌ی خودت." },
  { icon: Dumbbell, title: "برنامه بدنسازی", body: "برنامه‌ی AI یا دستی، شروعِ تمرین با کرنومتر و کاتالوگِ حرکات.", href: "/bodybuilding-program" },
  { icon: Apple, title: "کالری‌شمار", body: "هدفِ کالری و درشت‌مغذیِ شخصی، ثبتِ وعده‌ها و نمودارِ هفتگی.", href: "/calorie-counter" },
  { icon: CandlestickChart, title: "ژورنال ترید", body: "حساب‌محور، با آمار، چک‌لیستِ ورود، یادداشت و برچسب.", href: "/trading-journal" },
  { icon: RefreshCw, title: "همگام‌سازی متاتریدر", body: "MT4 و MT5 با اکسپرت و کدِ اتصال، بدونِ رمزِ حساب.", href: "/trading-journal" },
  { icon: CalendarClock, title: "تقویم اقتصادی", body: "Actual/Forecast/Previous، فیلترِ تأثیر و ارز و هشدارِ خبر.", href: "/economic-calendar" },
  { icon: Clock, title: "ساعت سشن‌های فارکس", body: "پنج سشنِ اصلی به وقتِ خودت، با ساعتِ تابستانیِ واقعی.", href: "/forex-sessions" },
  { icon: Route, title: "رودمپ یادگیری", body: "مسیرِ مرحله‌به‌مرحله با هوش مصنوعی برای هر مهارتی.", href: "/learning-roadmap" },
  { icon: GraduationCap, title: "مربی‌ها", body: "مربیِ احرازِ هویت‌شده، چتِ رمزگذاری‌شده و صفِ انتظار.", href: "/mentors" },
  { icon: Users, title: "دوستان", body: "پیشرفت و استریکِ دوستانت در روتین، تمرین و کالری." },
  { icon: Megaphone, title: "اعلان‌ها و اطلاعیه‌ها", body: "اطلاعیه‌های آریون و اعلان‌هایت در یک پنل." },
  { icon: Smartphone, title: "نصب روی گوشی", body: "وب‌اپ پیش‌رونده؛ مثلِ یک اپ با آیکونِ خودش." },
  { icon: SunMoon, title: "تمِ روشن و تیره", body: "هر دو تم، با همان ظاهرِ دقیق در همه‌ی بخش‌ها." },
];

export function LandingFeatureGrid() {
  return (
    <div>
      <SectionHead title="همه‌ی قابلیت‌ها،" accent="در یک نگاه" />
      <Reveal>
      <ul className="ls-feat">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const inner = (
            <>
              <span className="ls-feat-ic"><Icon size={17} /></span>
              <span className="ls-feat-txt">
                <span className="ls-feat-title">{f.title}{f.href && <ArrowLeft size={13} className="ls-feat-arrow" />}</span>
                <span className="ls-feat-body">{f.body}</span>
              </span>
            </>
          );
          return (
            <li key={f.title}>
              {f.href ? <Link href={f.href} className="ls-feat-item is-link">{inner}</Link> : <div className="ls-feat-item">{inner}</div>}
            </li>
          );
        })}
      </ul>
      </Reveal>
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
