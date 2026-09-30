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
import { GradientArc } from "@/components/GradientRing";
import { DashProgressCircle } from "@/components/DashProgressCircle";
import { StreakFlame } from "@/components/StreakFlame";
import { FRIENDS, INERT, MockMentorChat, MockStreakTiers } from "@/components/LandingMockups";
import "@/components/landing-sections.css";
import "@/components/landing-dashboard.css";
import { FAQ_ITEMS } from "@/lib/landingFaq";
import { STATS_BASE, type PublicStats } from "@/lib/publicStatsBase";

const EASE = [0.22, 1, 0.36, 1] as const;

function fa(n: number) {
  // ارقامِ انگلیسی؛ جداکننده‌ی هزارگان برای عددهای بزرگ (مثلِ تعدادِ کاربران)
  return n >= 1000 ? n.toLocaleString("en-US") : String(n);
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
  const cur = useRef(to);
  cur.current = val;

  useEffect(() => {
    if (reduce) return;
    setVal(0);
    setArmed(true);
  }, [reduce]);

  // بی‌حرکت: عددِ تازه (پاسخِ /api/public/stats) مستقیم نشون داده می‌شه
  useEffect(() => { if (reduce) setVal(to); }, [reduce, to]);

  useEffect(() => {
    if (!armed || !inView) return;
    let raf = 0;
    // از همون عددِ فعلی (اگه پاسخِ API بعد از شمارش رسید، دوباره از صفر شروع نمی‌کنه)
    const from = cur.current;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setVal(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, inView, to]);

  return <span ref={ref}>{fa(val)}{suffix}</span>;
}

// عددها = واقعی + پایه (lib/publicStatsBase.ts)؛ تا پاسخِ /api/public/stats برسه خودِ
// پایه‌ها نشون داده می‌شن.
const STATS: { key: keyof PublicStats; label: string }[] = [
  { key: "users", label: "کاربر" },
  { key: "routinePrograms", label: "برنامه‌ی روتین" },
  { key: "exercisePlans", label: "برنامه‌ی ورزشی" },
  { key: "journalEntries", label: "معامله‌ی ثبت‌شده در ژورنال" },
];

export function LandingStats() {
  const [stats, setStats] = useState<PublicStats>(STATS_BASE);
  useEffect(() => {
    let alive = true;
    fetch("/api/public/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setStats((prev) => {
          const next = { ...prev };
          for (const { key } of STATS) if (typeof d[key] === "number") next[key] = d[key];
          return next;
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <Reveal>
      <div className="ls-stats" role="list">
        {STATS.map((s) => (
          <div key={s.key} className="ls-stat" role="listitem">
            <div className="ls-stat-num">
              <CountUp to={stats[s.key]} suffix="+" />
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
  { icon: UserPlus, title: "حساب بساز", body: "کمتر از یک دقیقه، بدون کارت بانکی. «روتین من» 14 روز رایگان است و 3 روز هم بدنسازی، کالری‌شمار و ژورنال ترید برایت باز است." },
  { icon: LayoutGrid, title: "برنامه‌ات را بچین", body: "کارهای تکراری، تمرین، هدف کالری یا حساب معاملاتی‌ات را اضافه کن؛ یا فقط به «نومو» بگو چه می‌خواهی." },
  { icon: CalendarCheck, title: "هر روز تیک بزن", body: "کارهای امروز را علامت بزن، استریک را نگه دار و آخر هفته ببین واقعاً چقدر جلو رفته‌ای." },
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

/* ───────────────────────── 2.5) Dashboard ───────────────────────── */
// معرفیِ داشبورد (/dashboard) — ماکتِ ساده‌شده‌ی خودِ صفحه (حلقه‌های پیشرفت،
// کارهای سریع، خطِ زمانیِ امروز، ترید) و یک پاپ‌آپِ «ثبتِ غذا» روی همون صفحه،
// چون نکته‌ی اصلیش همینه: ثبت‌کردن بدونِ رفتن به صفحه‌ی دیگه. همه‌ی ادعاها با
// کدِ DashboardClient/DashboardActions/DashboardCommand چک شده. تصویر inert.

const DASH_RINGS = [
  { label: "روتین", v: 0.78, a: "var(--ring-1a)", b: "var(--ring-1b)" },
  { label: "تمرین", v: 0.6, a: "var(--ring-2a)", b: "var(--ring-2b)" },
  { label: "کالری", v: 0.46, a: "var(--ring-3a)", b: "var(--ring-3b)" },
];

const DASH_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: LayoutGrid, title: "همه‌چیز در یک نگاه", body: "روتینِ امروز، تمرین، کالری، ترید، تقویمِ اقتصادی، مربی‌ها و اعلان‌ها کنارِ هم؛ بخشی که فعال نداری جای خالی نمی‌گذارد." },
  { icon: Zap, title: "ثبت بدون ترکِ صفحه", body: "برنامه‌ی جدید، غذا یا معامله را از همان‌جا ثبت کن؛ پاپ‌آپِ خودِ همان بخش باز می‌شود و داشبورد همان لحظه به‌روز می‌شود." },
  { icon: RefreshCw, title: "زنده و هم‌گام", body: "تیکی که این‌جا می‌زنی همان لحظه در برنامه‌ی هفتگی، استریک و دستگاه‌های دیگرت دیده می‌شود." },
  { icon: Sparkles, title: "دسترسیِ سریع با جست‌وجو", body: "با پالتِ فرمان (Ctrl/⌘ + K) به هر بخش یا کاری فقط با چند حرف برس." },
];

function DashRings() {
  return (
    <svg viewBox="0 0 120 120" className="ls-dash-rings" aria-hidden="true" style={{ overflow: "visible" }}>
      {DASH_RINGS.map((r, i) => (
        <GradientArc key={r.label} c={60} r={52 - i * 13} stroke={9} value={r.v} from={r.a} to={r.b} delay={0.25 + i * 0.15} trackOpacity={8} />
      ))}
    </svg>
  );
}

function DashMock() {
  return (
    <div className="ls-dash-mock" aria-hidden="true" {...INERT}>
      <div className="ls-dash-hero">
        <div className="ls-dash-hello">
          <span className="ls-dash-date">سه‌شنبه، ۸ مهر</span>
          <b>صبح بخیر، سارا</b>
          <span className="ls-dash-chip"><Flame size={12} /> ۲۳ روز استریک</span>
          <ul className="ls-dash-legend">
            {DASH_RINGS.map((r) => (
              <li key={r.label}><i style={{ background: r.a }} />{r.label}<b>{fa(Math.round(r.v * 100))}٪</b></li>
            ))}
          </ul>
        </div>
        <DashRings />
      </div>

      <div className="ls-dash-quick">
        {[
          { l: "برنامه‌ی جدید", I: CalendarCheck, c: "var(--accent)" },
          { l: "ثبتِ غذا", I: Apple, c: "#FFB547", on: true },
          { l: "ثبتِ معامله", I: CandlestickChart, c: "#00C98D" },
          { l: "شروعِ تمرین", I: Dumbbell, c: "#3D7DFF" },
        ].map(({ l, I, c, on }) => (
          <span key={l} className={`ls-dash-q${on ? " is-on" : ""}`} style={{ ["--c" as string]: c }}>
            <span className="ls-dash-q-ic"><I size={15} /></span>{l}
          </span>
        ))}
      </div>

      <div className="ls-dash-row">
        <div className="ls-dash-card">
          <div className="ls-dash-card-h"><CalendarDays size={13} /> برنامه‌های امروز</div>
          {[
            { t: "۰۷:۰۰", n: "مدیتیشن صبحگاهی", d: true },
            { t: "۱۱:۰۰", n: "جلسه‌ی کاری", d: true },
            { t: "۲۱:۳۰", n: "مطالعه‌ی کتاب", d: false },
          ].map((x) => (
            <div key={x.n} className={`ls-dash-tl${x.d ? " is-done" : ""}`}>
              <span className="mono">{x.t}</span>
              <span className="ls-dash-tl-n">{x.n}</span>
              <i>{x.d && <Check size={10} strokeWidth={3} />}</i>
            </div>
          ))}
        </div>
        <div className="ls-dash-card">
          <div className="ls-dash-card-h"><TrendingUp size={13} /> عملکردِ ترید</div>
          <div className="ls-dash-pnl mono" dir="ltr">+1,242$</div>
          <svg viewBox="0 0 100 34" className="ls-dash-spark" preserveAspectRatio="none">
            <path d="M0 28 L12 24 L22 26 L34 18 L46 20 L58 12 L70 14 L82 7 L100 4" fill="none" stroke="var(--pnl-win, #00C98D)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="ls-dash-sub">نرخ برد {fa(62)}٪ · {fa(24)} معامله</div>
        </div>
      </div>

      {/* پاپ‌آپِ «ثبتِ غذا» — روی خودِ داشبورد، نه صفحه‌ی جدید */}
      <div className="ls-dash-pop">
        <div className="ls-dash-pop-h"><Apple size={14} /> افزودن غذا</div>
        <div className="ls-dash-pop-f">جوجه‌کباب <span className="mono">۲۰۰ گرم</span></div>
        <div className="ls-dash-pop-btn">افزودن</div>
      </div>
    </div>
  );
}

export function LandingDashboard() {
  return (
    <div>
      <SectionHead title="داشبورد؛" accent="کلِ روزت در یک صفحه" />
      <Reveal>
        <p className="ls-dash-intro">
          بعد از ورود، اولین چیزی که می‌بینی داشبورد است: پیشرفتِ امروزت در سه حلقه، کارهای بعدی روی خطِ زمان،
          و خلاصه‌ی تمرین، کالری و ترید — بدون این‌که بینِ صفحه‌ها رفت‌وآمد کنی.
        </p>
      </Reveal>
      <div className="ls-dash">
        <Reveal className="ls-dash-stage"><DashMock /></Reveal>
        <ul className="ls-dash-points">
          {DASH_POINTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={0.06 * i} className="ls-dash-point">
                <span className="ls-dash-point-ic"><Icon size={17} /></span>
                <span>
                  <b>{p.title}</b>
                  <span>{p.body}</span>
                </span>
              </Reveal>
            );
          })}
        </ul>
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
          <span className="ls-toast-tx"><b>یادآوری برنامه</b>تا 15 دقیقه دیگه وقت «پیاده‌روی عصر» می‌رسه.</span>
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
        <div className="trade-detail-cell"><span>اکوئیتی</span><b className="mono">10842.50</b></div>
        <div className="trade-detail-cell"><span>آخرین همگام‌سازی</span><b>امروز 14:05</b></div>
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
          { l: "کالری", v: "2100" }, { l: "پروتئین (گرم)", v: "140" },
          { l: "کربوهیدرات (گرم)", v: "220" }, { l: "چربی (گرم)", v: "70" },
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
  { key: "e2ee", cls: "ls-b-e2ee", icon: ShieldCheck, title: "خصوصی، با رمزگذاری سرتاسری", body: "گفت‌وگو و یادداشت خصوصی مربی‌ها روی دستگاه خودت رمز می‌شود؛ نه سرور و نه هیچ ادمینی متن پیام‌ها را نمی‌بیند.", vis: VisE2EE },
  { key: "pwa", cls: "ls-b-pwa", icon: Smartphone, title: "همه‌جا، مثل یک اپ", body: "روی گوشی نصبش کن و یادآوری‌ها را سرِ وقت، با نوتیفیکیشن بگیر.", vis: VisPwa },
  { key: "streak", cls: "ls-b-streak", icon: Flame, title: "استریک با 8 سطح", body: "هر روزِ کامل شعله را بزرگ‌تر می‌کند؛ از روز اول تا یک سال پیوسته.", vis: VisStreak },
  { key: "friends", cls: "ls-b-friends", icon: Users, title: "دوستان", body: "وقتی دوستانت پیشرفتت را می‌بینند، ادامه‌دادن ساده‌تر می‌شود.", vis: VisFriends },
  { key: "meta", cls: "ls-b-meta", icon: TrendingUp, title: "همگام‌سازی خودکار متاتریدر", body: "با اکسپرت و کد اتصال، معاملات بدون تکرار وارد ژورنال می‌شوند؛ رمز حساب معاملاتی هرگز خواسته نمی‌شود.", vis: VisMeta },
  { key: "food", cls: "ls-b-food", icon: Target, title: "هدف کالری و ماکروی شخصی", body: "از قد، وزن، سن، روزهای تمرین و هدفت، کالری و درشت‌مغذی روزانه‌ات محاسبه می‌شود.", vis: VisFood },
];

export function LandingBento() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "80px" });
  return (
    <div>
      <SectionHead title="جزئیاتی که" accent="فرق را می‌سازند" />
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
  { icon: LayoutGrid, title: "داشبورد", body: "همه‌ی بخش‌ها در یک صفحه، با ثبتِ سریعِ برنامه، غذا و معامله بدونِ ترکِ صفحه." },
  { icon: CalendarCheck, title: "روتین روزانه", body: "برنامه‌های تکرارشونده با ساعت، تگ و اهمیت، و تیکِ هر روز.", href: "/routine" },
  { icon: CalendarDays, title: "برنامه هفتگی و تاریخچه", body: "کل هفته در یک نگاه، و تقویمِ تاریخچه برای هر روزِ گذشته.", href: "/daily-planner" },
  { icon: Flame, title: "پیگیری عادت و استریک", body: "8 سطح استریک، از 1 تا 365 روزِ کامل.", href: "/habit-tracker" },
  { icon: Bell, title: "یادآوری و یادآوری دارو", body: "نوتیفیکیشن سرِ وقت برای برنامه‌ها و هر نوبت دارو." },
  { icon: Bot, title: "دستیار «نومو»", body: "به فارسیِ معمولی بنویس؛ برنامه ساخته، جابه‌جا یا حذف می‌شود.", href: "/ai-planner" },
  { icon: BarChart3, title: "آنالیز هفتگی", body: "امتیاز، نمره، بینش و پیش‌بینی پایان هفته از داده‌ی خودت." },
  { icon: Dumbbell, title: "برنامه بدنسازی", body: "برنامه‌ی AI یا دستی، کرنومتر تمرین و کاتالوگ 149 حرکت.", href: "/bodybuilding-program" },
  { icon: Apple, title: "کالری‌شمار", body: "هدف کالری و ماکروی شخصی، 264 خوراکی آماده و نمودار هفتگی.", href: "/calorie-counter" },
  { icon: CandlestickChart, title: "ژورنال ترید", body: "حساب‌محور، با آمار، چک‌لیست ورود، یادداشت و برچسب.", href: "/trading-journal" },
  { icon: RefreshCw, title: "همگام‌سازی متاتریدر", body: "MT4 و MT5 با اکسپرت و کد اتصال، بدون رمز حساب.", href: "/trading-journal" },
  { icon: CalendarClock, title: "تقویم اقتصادی", body: "9 ارز اصلی با Actual، Forecast و Previous، فیلتر تاثیر و هشدار خبر.", href: "/economic-calendar" },
  { icon: Clock, title: "ساعت سشن‌های فارکس", body: "پنج سشن اصلی به وقت خودت، با ساعت تابستانی واقعی.", href: "/forex-sessions" },
  { icon: Route, title: "رودمپ یادگیری", body: "مسیر مرحله‌به‌مرحله با هوش مصنوعی، برای هر مهارتی.", href: "/learning-roadmap" },
  { icon: GraduationCap, title: "مربی‌ها", body: "مربی احراز هویت‌شده، گفت‌وگوی رمزگذاری‌شده و صف انتظار.", href: "/mentors" },
  { icon: Users, title: "دوستان", body: "پیشرفت و استریک دوستانت در روتین، تمرین و کالری." },
  { icon: Megaphone, title: "اعلان‌ها و اطلاعیه‌ها", body: "اطلاعیه‌های آریون و اعلان‌هایت در یک پنل." },
  { icon: Smartphone, title: "نصب روی گوشی", body: "وب‌اپ پیش‌رونده؛ مثل یک اپ، با آیکون خودش." },
  { icon: SunMoon, title: "تمِ روشن و تیره", body: "هر دو تم، با ظاهری یکدست در همه‌ی بخش‌ها." },
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
  { icon: ShieldCheck, color: "#22C55E", title: "امن و خصوصی", body: "اطلاعاتت فروخته نمی‌شود و گفت‌وگوی مربی رمزگذاری سرتاسری دارد." },
  { icon: TrendingUp, color: "#A855F7", title: "برنامه‌ی شخصی", body: "متناسب با هدف، بدن و سبک زندگی خودت." },
  { icon: Headset, color: "#3B82F6", title: "پشتیبانی واقعی", body: "پیامت را تیم آریون جواب می‌دهد، نه یک پاسخ خودکار." },
  { icon: Lightbulb, color: "#F59E0B", title: "یک اپ به‌جای چند اپ", body: "روتین، تمرین، تغذیه، ترید و یادگیری کنار هم." },
  { icon: Smartphone, color: "#EC4899", title: "همه‌جا همگام", body: "گوشی، تبلت یا کامپیوتر؛ هر تغییر همه‌جا دیده می‌شود." },
  { icon: BarChart3, color: "#06B6D4", title: "پیشرفتی که دیده می‌شود", body: "آنالیز هفتگی نشان می‌دهد کجا جلو رفتی و کجا جا ماندی." },
  { icon: Zap, color: "#F97316", title: "سریع و ساده", body: "بی‌شلوغی؛ فقط چیزی که لازم داری." },
  { icon: Users, color: "#14B8A6", title: "برای هر سطحی", body: "چه تازه شروع کرده باشی، چه سال‌ها باشد که ادامه می‌دهی." },
  { icon: Sparkles, color: "#8B5CF6", title: "همیشه در حال بهتر شدن", body: "قابلیت‌های تازه مرتب اضافه می‌شوند." },
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

// فقط جمله‌هایی با گوینده‌ی مشخص و قابل‌استناد (یا ضرب‌المثلِ واقعیِ فارسی)
const QUOTES = [
  { text: "ما همان چیزی هستیم که بارها و بارها انجامش می‌دهیم.", author: "ویل دورانت" },
  { text: "به سطحِ هدف‌هایت بالا نمی‌روی؛ به سطحِ سیستم‌هایت سقوط می‌کنی.", author: "جیمز کلیر" },
  { text: "سفرِ هزار فرسنگی با یک قدم آغاز می‌شود.", author: "لائوتزو" },
  { text: "هر کاری که انجام می‌دهی، رایی است به آدمی که می‌خواهی باشی.", author: "جیمز کلیر" },
  { text: "قطره قطره جمع گردد، وانگهی دریا شود.", author: "ضرب‌المثل فارسی" },
  { text: "انگیزه شروعت می‌کند؛ عادت ادامه‌ات می‌دهد.", author: "جیم رایون" },
  { text: "کامیابی جمعِ تلاش‌های کوچکی است که روز به روز تکرار می‌شوند.", author: "رابرت کالیر" },
  { text: "کار نیکو کردن از پُر کردن است.", author: "ضرب‌المثل فارسی" },
  { text: "برنامه‌ها هیچ‌اند؛ برنامه‌ریزی همه‌چیز است.", author: "دوایت آیزنهاور" },
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
          <span className="ls-cta-chip"><Sparkles size={14} /> 14 روز روتین رایگان</span>
          <h2 className="ls-cta-title">امروز، اولین تیک را بزن</h2>
          <p className="ls-cta-sub">«روتین من» 14 روز رایگان است و بعد ماهانه 99 هزار تومان؛ حساب بساز و 3 روز بدنسازی، کالری‌شمار و ژورنال ترید را هم با استفاده‌ی محدود از هوش مصنوعی امتحان کن.</p>
          <div className="ls-cta-actions">
            <Link href="/auth/signup" className="ls-btn ls-btn-primary">
              رایگان شروع کن <ArrowLeft size={16} />
            </Link>
            <Link href="/auth/login" className="ls-btn ls-btn-ghost">ورود</Link>
          </div>
          <div className="ls-cta-note"><Check size={13} /> بدون کارت بانکی</div>
        </div>
      </div>
    </Reveal>
  );
}
