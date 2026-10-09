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
import { friends, INERT, MockMentorChat, MockStreakTiers } from "@/components/LandingMockups";
import "@/components/landing-sections.css";
import "@/components/landing-dashboard.css";
import { getFaqItems } from "@/lib/landingFaq";
import { brandName } from "@/lib/brand";
import { jMonthName, weekdayName } from "@/lib/jalali";
import { fillPriceCopy } from "@/lib/planPricing";
import { usePlanPricing } from "@/lib/usePlanPricing";
import { STATS_BASE, type PublicStats } from "@/lib/publicStatsBase";
import { tr } from "@/lib/i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

function fa(n: number) {
  // ارقام انگلیسی؛ جداکننده‌ی هزارگان برای عددهای بزرگ (مثل تعداد کاربران)
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

  // بی‌حرکت: عدد تازه (پاسخ /api/public/stats) مستقیم نشون داده می‌شه
  useEffect(() => { if (reduce) setVal(to); }, [reduce, to]);

  useEffect(() => {
    if (!armed || !inView) return;
    let raf = 0;
    // از همون عدد فعلی (اگه پاسخ API بعد از شمارش رسید، دوباره از صفر شروع نمی‌کنه)
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

// عددها = واقعی + پایه (lib/publicStatsBase.ts)؛ تا پاسخ /api/public/stats برسه خود
// پایه‌ها نشون داده می‌شن.
const stats_ = (): { key: keyof PublicStats; label: string }[] => [
  { key: "users", label: tr("کاربر فعال", "active users") },
  { key: "routinePrograms", label: tr("روتین ساخته‌شده", "routines created") },
  { key: "exercisePlans", label: tr("برنامه تمرینی", "workout plans") },
  { key: "journalEntries", label: tr("معامله ثبت‌شده", "trades logged") },
];

export function LandingStats() {
  const STATS = stats_();
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

const steps = () => [
  { icon: UserPlus, title: tr("برنامه‌ات را بساز", "Build your plan"), body: tr("ثبت‌نام کن و روتینت را بچین؛ یا به «نومو» بگو چه می‌خواهی. «روتین من» 14 روز رایگان است.", "Sign up and lay out your routine, or tell Nomo what you want. My Routine is free for 14 days.") },
  { icon: LayoutGrid, title: tr("اجرا کن", "Do it"), body: tr("کارهای امروزت را انجام بده و همان لحظه تیک بزن.", "Do today's tasks and tick them off the moment you finish.") },
  { icon: CalendarCheck, title: tr("پیشرفتت را ببین", "See your progress"), body: tr("استریک، تاریخچه و آنالیز هفتگی نشان می‌دهند مسیرت چطور پیش می‌رود.", "Your streak, history and weekly review show how your journey is going.") },
];

export function LandingHowItWorks() {
  const reduce = useReducedMotion();
  const STEPS = steps();
  return (
    <div>
      <SectionHead title={tr("برنامه، اجرا،", "Plan, do,")} accent={tr("پیشرفت", "progress")} />
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
// معرفی داشبورد (/dashboard) — ماکت ساده‌شده‌ی خود صفحه (حلقه‌های پیشرفت،
// کارهای سریع، خط زمانی امروز، ترید) و یک پاپ‌آپ «ثبت غذا» روی همون صفحه،
// چون نکته‌ی اصلیش همینه: ثبت‌کردن بدون رفتن به صفحه‌ی دیگه. همه‌ی ادعاها با
// کد DashboardClient/DashboardActions/DashboardCommand چک شده. تصویر inert.

const dashRings = () => [
  { label: tr("روتین", "Routine"), v: 0.78, a: "var(--ring-1a)", b: "var(--ring-1b)" },
  { label: tr("تمرین", "Workout"), v: 0.6, a: "var(--ring-2a)", b: "var(--ring-2b)" },
  { label: tr("کالری", "Calories"), v: 0.46, a: "var(--ring-3a)", b: "var(--ring-3b)" },
];

const dashPoints = (): { icon: LucideIcon; title: string; body: string }[] => [
  { icon: LayoutGrid, title: tr("امروزت را ببین", "See your day"), body: tr("برنامه‌های امروز، وضعیت انجام‌شدن و اولویت‌هایت را یک‌جا دنبال کن.", "Follow today's plans, their completion status and your priorities in one place.") },
  { icon: Zap, title: tr("سریع ثبت کن", "Log quickly"), body: tr("کاری که انجام داده‌ای را همان لحظه ثبت کن و ادامه بده.", "Log what you have done the moment you do it, and move on.") },
  { icon: RefreshCw, title: tr("پیشرفتت را دنبال کن", "Follow your progress"), body: tr("عملکردت فقط یک لیست نیست؛ روندی است که می‌بینی. هر تیک همان لحظه در برنامه هفتگی، استریک و دستگاه‌های دیگرت هم دیده می‌شود.", "Your performance is not just a list; it is a trend you can see. Every tick shows up instantly in the weekly plan, your streak and your other devices.") },
  { icon: Sparkles, title: tr("جست‌وجوی سریع", "Quick search"), body: tr("با Ctrl/⌘ + K و چند حرف به هر بخش برس.", "Press Ctrl/⌘ + K and type a few letters to reach any section.") },
];

function DashRings() {
  const DASH_RINGS = dashRings();
  return (
    <svg viewBox="0 0 120 120" className="ls-dash-rings" aria-hidden="true" style={{ overflow: "visible" }}>
      {DASH_RINGS.map((r, i) => (
        <GradientArc key={r.label} c={60} r={52 - i * 13} stroke={9} value={r.v} from={r.a} to={r.b} delay={0.25 + i * 0.15} trackOpacity={8} />
      ))}
    </svg>
  );
}

function DashMock() {
  const DASH_RINGS = dashRings();
  return (
    <div className="ls-dash-mock" aria-hidden="true" {...INERT}>
      <div className="ls-dash-hero">
        <div className="ls-dash-hello">
          <span className="ls-dash-date">{tr("سه‌شنبه، 8 مهر", `${weekdayName(2)}, ${jMonthName(6)} 8`)}</span>
          <b>{tr("صبح بخیر، سارا", "Good morning, Sara")}</b>
          <span className="ls-dash-chip"><Flame size={12} /> {tr("23 روز استریک", "23-day streak")}</span>
          <ul className="ls-dash-legend">
            {DASH_RINGS.map((r) => (
              <li key={r.label}><i style={{ background: r.a }} />{r.label}<b>{fa(Math.round(r.v * 100))}{tr("٪", "%")}</b></li>
            ))}
          </ul>
        </div>
        <DashRings />
      </div>

      <div className="ls-dash-quick">
        {[
          { l: tr("برنامه‌ی جدید", "New plan"), I: CalendarCheck, c: "var(--accent)" },
          { l: tr("ثبت غذا", "Log food"), I: Apple, c: "#FFB547", on: true },
          { l: tr("ثبت معامله", "Log trade"), I: CandlestickChart, c: "#00C98D" },
          { l: tr("شروع تمرین", "Start workout"), I: Dumbbell, c: "#3D7DFF" },
        ].map(({ l, I, c, on }) => (
          <span key={l} className={`ls-dash-q${on ? " is-on" : ""}`} style={{ ["--c" as string]: c }}>
            <span className="ls-dash-q-ic"><I size={15} /></span>{l}
          </span>
        ))}
      </div>

      <div className="ls-dash-row">
        <div className="ls-dash-card">
          <div className="ls-dash-card-h"><CalendarDays size={13} /> {tr("برنامه‌های امروز", "Today's plans")}</div>
          {[
            { t: "07:00", n: tr("مدیتیشن صبحگاهی", "Morning meditation"), d: true },
            { t: "11:00", n: tr("جلسه‌ی کاری", "Work meeting"), d: true },
            { t: "21:30", n: tr("مطالعه‌ی کتاب", "Reading a book"), d: false },
          ].map((x) => (
            <div key={x.n} className={`ls-dash-tl${x.d ? " is-done" : ""}`}>
              <span className="mono">{x.t}</span>
              <span className="ls-dash-tl-n">{x.n}</span>
              <i>{x.d && <Check size={10} strokeWidth={3} />}</i>
            </div>
          ))}
        </div>
        <div className="ls-dash-card">
          <div className="ls-dash-card-h"><TrendingUp size={13} /> {tr("عملکرد ترید", "Trading performance")}</div>
          <div className="ls-dash-pnl mono" dir="ltr">+1,242$</div>
          <svg viewBox="0 0 100 34" className="ls-dash-spark" preserveAspectRatio="none">
            <path d="M0 28 L12 24 L22 26 L34 18 L46 20 L58 12 L70 14 L82 7 L100 4" fill="none" stroke="var(--pnl-win, #00C98D)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="ls-dash-sub">{tr(`نرخ برد ${fa(62)}٪ · ${fa(24)} معامله`, `Win rate ${fa(62)}% · ${fa(24)} trades`)}</div>
        </div>
      </div>

      {/* پاپ‌آپ «ثبت غذا» — روی خود داشبورد، نه صفحه‌ی جدید */}
      <div className="ls-dash-pop">
        <div className="ls-dash-pop-h"><Apple size={14} /> {tr("افزودن غذا", "Add food")}</div>
        <div className="ls-dash-pop-f">{tr("جوجه‌کباب", "Chicken kebab")} <span className="mono">{tr("200 گرم", "200 g")}</span></div>
        <div className="ls-dash-pop-btn">{tr("افزودن", "Add")}</div>
      </div>
    </div>
  );
}

export function LandingDashboard() {
  const DASH_POINTS = dashPoints();
  return (
    <div>
      <SectionHead title={tr("کل روزت،", "Your whole day,")} accent={tr("یک‌جا", "in one place")} />
      <Reveal>
        <p className="ls-dash-intro">
          {tr("از برنامه امروز تا میزان پیشرفتت؛ مهم‌ترین چیزها را بدون جابه‌جایی بین چند ابزار ببین.", "From today's plan to how far you have come; see the most important things without switching between several tools.")}
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
// هر تصویر کوچک یک برش از خود اپ است (MentorChat، اعلان پوش reminderPlan،
// StreakFlame، DashFriendsCard، TradeMtLinkPanel، CalorieMacrosCard) — نه
// شکل نمادین. کل بخش تصویر aria-hidden و inert است.

function VisE2EE() {
  return (
    <div className="ls-vis ls-vis-chat dash-scope" aria-hidden="true" {...INERT}>
      <MockMentorChat
        peer={tr("مربی", "your mentor")}
        msgs={[
          { text: tr("برنامه‌ی این هفته‌ت رو فرستادم.", "I sent you this week's plan."), time: "09:12" },
          { mine: true, text: tr("دیدم، از امروز شروع می‌کنم.", "Got it, I will start today."), time: "09:15" },
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
          <span className="ls-toast-tx"><b>{tr("یادآوری برنامه", "Plan reminder")}</b>{tr("تا 15 دقیقه دیگه وقت «پیاده‌روی عصر» می‌رسه.", "Evening walk is due in 15 minutes.")}</span>
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
  const FRIENDS = friends();
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
              <span className="mt-0.5 block text-[9.5px] text-dash-muted">{tr(`${f.done} از ${f.total} برنامه`, `${f.done} of ${f.total} plans`)}</span>
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
        <span>{tr("وضعیت اتصال", "Connection status")}</span>
        <span className="ls-meta-on"><span className="ls-live" /> {tr("فعال", "Active")}</span>
      </div>
      <div className="ls-meta-cells">
        <div className="trade-detail-cell"><span>{tr("نسخه", "Version")}</span><b>MT5</b></div>
        <div className="trade-detail-cell"><span>{tr("اکوئیتی", "Equity")}</span><b className="mono">10842.50</b></div>
        <div className="trade-detail-cell"><span>{tr("آخرین همگام‌سازی", "Last sync")}</span><b>{tr("امروز 14:05", "Today 14:05")}</b></div>
      </div>
    </div>
  );
}

function VisFood() {
  return (
    <div className="ls-vis ls-vis-food dash-scope" aria-hidden="true" {...INERT}>
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-dash-text">
        <Target className="h-4 w-4 text-dash-green" /> {tr("هدف روزانه‌ی تو", "Your daily goal")}
      </div>
      <div className="ls-food-grid">
        {[
          { l: tr("کالری", "Calories"), v: "2100" }, { l: tr("پروتئین (گرم)", "Protein (g)"), v: "140" },
          { l: tr("کربوهیدرات (گرم)", "Carbs (g)"), v: "220" }, { l: tr("چربی (گرم)", "Fat (g)"), v: "70" },
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

const bento = () => [
  { key: "e2ee", cls: "ls-b-e2ee", icon: ShieldCheck, title: tr("حریم خصوصی، از ابتدا", "Privacy, from the start"), body: tr("چت‌ها سرتاسر رمزنگاری‌شده‌اند؛ متنشان را جز خودتان کسی نمی‌بیند.", "Chats are end-to-end encrypted; nobody but you can see their text."), vis: VisE2EE },
  { key: "pwa", cls: "ls-b-pwa", icon: Smartphone, title: tr("چیزی از قلم نیفتد", "Never miss a thing"), body: tr("آریون را روی گوشی نصب کن و برای کارها و برنامه‌های مهمت یادآوری داشته باش.", `Install ${brandName()} on your phone and get reminders for your important tasks and plans.`), vis: VisPwa },
  { key: "streak", cls: "ls-b-streak", icon: Flame, title: tr("پیوستگی، خودش یک دستاورد است", "Consistency is an achievement in itself"), body: tr("روزهایی را که به برنامه‌ات عمل کرده‌ای ثبت کن و زنجیره پیشرفتت را ببین.", "Log the days you followed your plan and watch your chain of progress grow."), vis: VisStreak },
  { key: "friends", cls: "ls-b-friends", icon: Users, title: tr("با هم جلو بروید", "Move forward together"), body: tr("پیشرفت دوستانت را ببین و مسیرت را در کنار آن‌ها ادامه بده.", "See your friends' progress and keep going alongside them."), vis: VisFriends },
  { key: "meta", cls: "ls-b-meta", icon: TrendingUp, title: tr("کمتر ثبت کن، بیشتر تحلیل کن", "Log less, analyze more"), body: tr("با اتصال MT4 و MT5، معاملاتت را مستقیما وارد ژورنال کن؛ رمز حساب معاملاتی هرگز خواسته نمی‌شود.", "Connect MT4 and MT5 to bring your trades straight into the journal; your trading account password is never requested."), vis: VisMeta },
  { key: "food", cls: "ls-b-food", icon: Target, title: tr("تغذیه‌ات را هم اندازه‌گیری کن", "Measure your nutrition too"), body: tr("کالری و ماکروهای روزانه‌ات را ثبت کن و ببین چقدر به هدفت نزدیک شده‌ای.", "Log your daily calories and macros and see how close you are to your goal."), vis: VisFood },
];

export function LandingBento() {
  const BENTO = bento();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "80px" });
  return (
    <div>
      <SectionHead title={tr("جزئیاتی که", "The details that")} accent={tr("فرق را می‌سازند", "make the difference")} />
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
// فهرست فشرده‌ی همه‌ی قابلیت‌ها — هر مورد با کد اپ چک شده و هرجا صفحه‌ی
// توضیحی اختصاصی هست، به همان لینک می‌دهد (لینک داخلی برای سئو).

const features = (): { icon: LucideIcon; title: string; body: string; href?: string }[] => [
  { icon: LayoutGrid, title: tr("داشبورد", "Dashboard"), body: tr("کل روزت را در یک صفحه ببین و سریع ثبت کن.", "See your whole day on one page and log quickly.") },
  { icon: CalendarCheck, title: tr("روتین روزانه", "Daily routine"), body: tr("کارهای هر روز را با ساعت و اولویت بچین و تیک بزن.", "Lay out each day's tasks with a time and priority, and tick them off."), href: "/routine" },
  { icon: CalendarDays, title: tr("برنامه هفتگی و تاریخچه", "Weekly plan and history"), body: tr("کل هفته در یک نگاه؛ به روزهای گذشته برگرد و بررسی کن.", "The whole week at a glance; go back to past days and review them."), href: "/daily-planner" },
  { icon: Flame, title: tr("پیگیری عادت و استریک", "Habit tracking and streaks"), body: tr("زنجیره روزهای پیوسته‌ات را ببین؛ 8 سطح، از 1 تا 365 روز.", "See your chain of consecutive days; 8 levels, from 1 to 365 days."), href: "/habit-tracker" },
  { icon: Bell, title: tr("یادآوری برنامه و دارو", "Plan and medication reminders"), body: tr("برای کارها و برنامه‌های مهمت و هر نوبت دارو یادآوری داشته باش.", "Get reminders for your important tasks and plans and for every medication dose.") },
  { icon: Bot, title: tr("مدیر برنامه هوشمند «نومو»", "Nomo, the smart plan manager"), body: tr("به فارسی بگو چه می‌خواهی؛ نومو برنامه‌هایت را می‌سازد و جابه‌جا می‌کند.", "Say what you want in plain language; Nomo creates and moves your plans."), href: "/ai-planner" },
  { icon: BarChart3, title: tr("آنالیز هفتگی", "Weekly review"), body: tr("ببین کجا جلو رفته‌ای، کجا عقب مانده‌ای و هفته بعد روی چه چیزی تمرکز کنی.", "See where you moved ahead, where you fell behind and what to focus on next week.") },
  { icon: Dumbbell, title: tr("برنامه بدنسازی", "Workout plan"), body: tr("برنامه AI یا دستی، کرنومتر تمرین و 149 حرکت آماده.", "An AI or manual plan, a workout timer and 149 ready-made exercises."), href: "/bodybuilding-program" },
  { icon: Apple, title: tr("کالری‌شمار", "Calorie counter"), body: tr("کالری و ماکروهایت را با 264 خوراکی آماده ثبت کن و نمودار هفتگی را ببین.", "Log your calories and macros with 264 ready-made foods and see the weekly chart."), href: "/calorie-counter" },
  { icon: CandlestickChart, title: tr("ژورنال ترید", "Trading journal"), body: tr("معاملات هر حساب را با آمار، چک‌لیست و یادداشت بررسی کن.", "Review each account's trades with statistics, a checklist and notes."), href: "/trading-journal" },
  { icon: RefreshCw, title: tr("همگام‌سازی متاتریدر", "MetaTrader sync"), body: tr("MT4 و MT5 با اکسپرت و کد اتصال؛ بدون رمز حساب.", "MT4 and MT5 with an Expert Advisor and connection code; no account password."), href: "/trading-journal" },
  { icon: CalendarClock, title: tr("تقویم اقتصادی", "Economic calendar"), body: tr("رویدادهای 9 ارز اصلی با Actual، Forecast، Previous و هشدار خبر.", "Events for 9 major currencies with Actual, Forecast, Previous and news alerts."), href: "/economic-calendar" },
  { icon: Clock, title: tr("ساعت سشن‌های فارکس", "Forex session hours"), body: tr("پنج سشن اصلی به وقت خودت، با ساعت تابستانی واقعی.", "The five main sessions in your own time, with real daylight saving."), href: "/forex-sessions" },
  { icon: Route, title: tr("رودمپ یادگیری", "Learning roadmap"), body: tr("هدف بزرگت را با هوش مصنوعی به مسیر مرحله‌به‌مرحله تبدیل کن.", "Turn your big goal into a step-by-step path with AI."), href: "/learning-roadmap" },
  { icon: GraduationCap, title: tr("مربی‌ها", "Mentors"), body: tr("مربی احراز هویت‌شده، دریافت برنامه و چت‌های سرتاسر رمزنگاری‌شده.", "Identity-verified mentors, plans delivered to you and end-to-end encrypted chats."), href: "/mentors" },
  { icon: Users, title: tr("دوستان", "Friends"), body: tr("پیشرفت و استریک دوستانت را ببین و کنار هم ادامه بده.", "See your friends' progress and streaks and keep going together.") },
  { icon: Megaphone, title: tr("اعلان‌ها و اطلاعیه‌ها", "Notifications and announcements"), body: tr("اطلاعیه‌های آریون و اعلان‌هایت در یک پنل.", `${brandName()} announcements and your notifications in one panel.`) },
  { icon: Smartphone, title: tr("نصب روی گوشی", "Install on your phone"), body: tr("وب‌اپ PWA؛ با «افزودن به صفحه‌ی اصلی» مثل یک اپ نصب می‌شود.", "A PWA web app; with Add to Home Screen it installs like an app.") },
  { icon: SunMoon, title: tr("تم روشن و تیره", "Light and dark themes"), body: tr("هر دو تم، با ظاهری یکدست در همه بخش‌ها.", "Both themes, with a consistent look across every section.") },
];

export function LandingFeatureGrid() {
  const FEATURES = features();
  return (
    <div>
      <SectionHead title={tr("هر چیزی که برای مدیریت", "Everything you need to manage")} accent={tr("مسیرت لازم داری", "your journey")} />
      <Reveal>
      <ul className="ls-feat">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const inner = (
            <>
              <span className="ls-feat-ic"><Icon size={17} /></span>
              <span className="ls-feat-txt">
                <span className="ls-feat-title">{f.title}{f.href && <ArrowLeft size={13} className="ls-feat-arrow dir-flip" />}</span>
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

const whyUs = () => [
  { icon: ShieldCheck, color: "#22C55E", title: tr("امن و خصوصی", "Safe and private"), body: tr("رمز عبور با bcrypt ذخیره می‌شود، اطلاعاتت فروخته نمی‌شود و چت‌ها سرتاسر رمزنگاری‌شده‌اند.", "Passwords are stored with bcrypt, your data is never sold and chats are end-to-end encrypted.") },
  { icon: TrendingUp, color: "#A855F7", title: tr("ساخته‌شده برای اجرا", "Built for doing"), body: tr("آریون فقط برای برنامه‌ریزی نیست؛ اجرای روزانه و پیشرفتت را هم دنبال می‌کند.", `${brandName()} is not only for planning; it also follows your daily execution and progress.`) },
  { icon: Headset, color: "#3B82F6", title: tr("پشتیبانی واقعی", "Real support"), body: tr("پیامت را خود تیم آریون پاسخ می‌دهد.", `The ${brandName()} team itself answers your message.`) },
  { icon: Lightbulb, color: "#F59E0B", title: tr("همه‌چیز کنار هم", "Everything together"), body: tr("به‌جای پراکندگی بین چند ابزار، برنامه‌هایت را در یک سیستم مدیریت کن.", "Instead of scattering across several tools, manage your plans in one system.") },
  { icon: Smartphone, color: "#EC4899", title: tr("همراه تو", "Always with you"), body: tr("از دستگاه‌های مختلف به برنامه‌ها و اطلاعاتت دسترسی داشته باش.", "Access your plans and data from different devices.") },
  { icon: BarChart3, color: "#06B6D4", title: tr("تصویر واضح‌تر", "A clearer picture"), body: tr("وقتی اطلاعاتت یک‌جا باشد، بهتر می‌توانی عملکردت را ببینی.", "When your data is in one place, you can see your performance better.") },
  { icon: Zap, color: "#F97316", title: tr("ساده و فارسی", "Simple and clear"), body: tr("یک تجربه فارسی و منظم، بدون پیچیدگی اضافه.", "A tidy, straightforward experience without extra complexity.") },
  { icon: Users, color: "#14B8A6", title: tr("متناسب با تو", "Fits you"), body: tr("برنامه‌ها را با هدف و سبک زندگی خودت تنظیم کن.", "Adjust your plans to your own goals and lifestyle.") },
  { icon: Sparkles, color: "#8B5CF6", title: tr("قابل توسعه", "Expandable"), body: tr("از روتین شروع کن و هر زمان نیاز داشتی بخش‌های دیگر را اضافه کن.", "Start with routine and add other sections whenever you need them.") },
];

export function LandingWhyUs() {
  const WHY_US = whyUs();
  return (
    <div>
      <SectionHead title={tr("چرا", "Why")} accent={`${brandName()}${tr("؟", "?")}`} />
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

// فقط جمله‌هایی با گوینده‌ی مشخص و قابل‌استناد (یا ضرب‌المثل واقعی فارسی)
const quotes = () => [
  { text: tr("ما همان چیزی هستیم که بارها و بارها انجامش می‌دهیم.", "We are what we repeatedly do."), author: tr("ویل دورانت", "Will Durant") },
  { text: tr("به سطح هدف‌هایت بالا نمی‌روی؛ به سطح سیستم‌هایت سقوط می‌کنی.", "You do not rise to the level of your goals; you fall to the level of your systems."), author: tr("جیمز کلیر", "James Clear") },
  { text: tr("سفر هزار فرسنگی با یک قدم آغاز می‌شود.", "A journey of a thousand miles begins with a single step."), author: tr("لائوتزو", "Lao Tzu") },
  { text: tr("هر کاری که انجام می‌دهی، رایی است به آدمی که می‌خواهی باشی.", "Every action you take is a vote for the type of person you wish to become."), author: tr("جیمز کلیر", "James Clear") },
  { text: tr("قطره قطره جمع گردد، وانگهی دریا شود.", "Drop by drop, a sea is made."), author: tr("ضرب‌المثل فارسی", "Persian proverb") },
  { text: tr("انگیزه شروعت می‌کند؛ عادت ادامه‌ات می‌دهد.", "Motivation is what gets you started; habit is what keeps you going."), author: tr("جیم رایون", "Jim Rohn") },
  { text: tr("کامیابی جمع تلاش‌های کوچکی است که روز به روز تکرار می‌شوند.", "Success is the sum of small efforts, repeated day in and day out."), author: tr("رابرت کالیر", "Robert Collier") },
  { text: tr("کار نیکو کردن از پر کردن است.", "Good work comes from doing it fully."), author: tr("ضرب‌المثل فارسی", "Persian proverb") },
  { text: tr("برنامه‌ها هیچ‌اند؛ برنامه‌ریزی همه‌چیز است.", "Plans are nothing; planning is everything."), author: tr("دوایت آیزنهاور", "Dwight D. Eisenhower") },
];

export function LandingTestimonialQuote() {
  const QUOTES = quotes();
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
  const { pricing } = usePlanPricing();
  const faqItems = fillPriceCopy(getFaqItems(), pricing);
  return (
    <div>
      <SectionHead title={tr("پرسش‌های", "Frequently asked")} accent={tr("پرتکرار", "questions")} />
      <Reveal>
        <div className="ls-faq">
          {faqItems.map((f, i) => {
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
          <span className="ls-cta-chip"><Sparkles size={14} /> {tr("14 روز رایگان", "14 days free")}</span>
          <h2 className="ls-cta-title">{tr("شروعش کن.", "Get started.")}</h2>
          <p className="ls-cta-sub">{tr("مسیرت را مشخص کن، برنامه‌ات را بساز و از امروز اجرا کن.", "Set your direction, build your plan and start today.")}</p>
          <div className="ls-cta-actions">
            <Link href="/auth/signup" className="ls-btn ls-btn-primary">
              {tr("شروع رایگان", "Start free")} <ArrowLeft size={16} className="dir-flip" />
            </Link>
            <Link href="/auth/login" className="ls-btn ls-btn-ghost">{tr("ورود", "Log in")}</Link>
          </div>
          <div className="ls-cta-note"><Check size={13} /> {tr("ثبت‌نام در کمتر از یک دقیقه", "Sign up in under a minute")}</div>
        </div>
      </div>
    </Reveal>
  );
}
