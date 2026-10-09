"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Filter, History, Lock, ShieldCheck, Sparkles, UtensilsCrossed, Hash, Percent, ArrowUp,
} from "lucide-react";
import { brandName } from "@/lib/brand";
import { useThemeTokens } from "@/components/PlanShowcase";
import { DashProgressCircle } from "@/components/DashProgressCircle";
import { StreakFlame } from "@/components/StreakFlame";
import SiriOrb from "@/components/smoothui/components/siri-orb";
import {
  INERT, MockDateStrip, MockFilterButton, MockMedicationCard, MockMentorCard, MockTaskList, type MockTask,
} from "@/components/LandingMockups";
import "./landing-hero.css";
import { tr } from "@/lib/i18n";

// ─── هیروی لندینگ (کاربر واردنشده) ────────────────────────────────────────
// همه‌ی تصویر سمت چپ (گوشی + کارت‌های شناور) با JSX/CSS خالص ساخته شده —
// نه اسکرین‌شات — و فقط یک پیش‌نمایش نمونه است، نه دیتای واقعی کاربر.
// حلقه‌های انیمیشن فقط وقتی هیرو در دید است اجرا می‌شوند (IntersectionObserver)
// و با prefers-reduced-motion کاملا ساکن می‌مانند. هیچ Math.random/Date در
// رندر نیست؛ حالت اولیه‌ی سرور و کلاینت یکی است (بدون hydration mismatch).

// ارقام در کل سایت انگلیسی‌اند (مثل faNum  lib/jalali.ts)
export function faNum(n: number | string) {
  return String(n);
}

// خط چرخان تیتر: «تمام روتینت یک‌جا / روتین، خواب، تمرین، ترید» (متن صاحب
// محصول)؛ انیمیشن همونه. اولین کلمه («روتین») متن h1 برای سئو/صفحه‌خوان هم هست.
const rotWords = () => [tr("روتین", "Routine"), tr("خواب", "Sleep"), tr("تمرین", "Workouts"), tr("ترید", "Trading")];

// «روتین من» (app/weekly) همون‌طور که روی گوشی دیده می‌شه — ردیف‌ها آینه‌ی
// DashTaskRow ـن، ردیف آخر همون ردیف سنتتیک «برنامه تمرینی امروز» با دکمه‌ی
// «شروع». چرخه فقط تیک‌خوردن پشت‌سرهم همین ردیف‌هاست.
const phoneTasks = (): MockTask[] => [
  { name: tr("مدیتیشن صبحگاهی", "Morning meditation"), time: "07:00", importance: "medium", tag: tr("سلامتی", "Health") },
  { name: tr("مطالعه", "Reading"), time: "13:30", importance: "high", tag: tr("یادگیری", "Learning") },
  { name: tr("پیاده‌روی عصر", "Evening walk"), time: "18:00" },
  { name: tr("برنامه تمرینی امروز", "Today's workout plan"), exercise: true },
];

const seoLinks = () => [
  { href: "/routine", label: tr("روتین", "Routine") },
  { href: "/habit-tracker", label: tr("پیگیری عادت", "Habit tracking") },
  { href: "/bodybuilding-program", label: tr("تمرین", "Workouts") },
  { href: "/trading-journal", label: tr("ترید", "Trading") },
  { href: "/calorie-counter", label: tr("تغذیه", "Nutrition") },
  { href: "/ai-planner", label: tr("مدیر برنامه هوشمند", "Smart plan manager") },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingHero() {
  const ROT_WORDS = rotWords();
  const PHONE_TASKS = phoneTasks();
  const SEO_LINKS = seoLinks();
  const t = useThemeTokens();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [word, setWord] = useState(0);
  // شمارنده‌ی چرخه‌ی تیک‌ها: ۰..۵ تیک‌خوردن، ۶..۸ مکث روی «همه انجام شد»، بعد از نو.
  const [step, setStep] = useState(2);
  const [reduced, setReduced] = useState(false);
  // گو «نومو» (SiriOrb) انیمیشن فریمری دارد؛ فقط بعد از mount و وقتی هیرو
  // در دید است سوار می‌شود — بیرون دید یک دایره‌ی ساکن هم‌اندازه جایش است.
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setReduced(prefersReducedMotion()); setMounted(true); }, []);

  // حلقه‌ها فقط وقتی هیرو واقعا دیده می‌شه
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = setInterval(() => setWord((w) => (w + 1) % ROT_WORDS.length), 2600);
    return () => clearInterval(id);
  }, [inView, reduced]);

  useEffect(() => {
    if (!inView || reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % 8), 1150);
    return () => clearInterval(id);
  }, [inView, reduced]);

  // حرکت لایه‌ها (پارالاکس نشانگر + شناوری آرام کارت‌ها) — با JS، نه
  // transition/animation ـ CSS: هر فریم مقدار نهایی روی پیکسل کامل دستگاه
  // گرد می‌شه (با حساب zoom ـ صحنه و devicePixelRatio) و فقط وقتی عوض شده
  // نوشته می‌شه. پس لایه هیچ‌وقت کامپوزیت/راستر جدا نمی‌شه و متن همیشه تیزه.
  // پارالاکس فقط دسکتاپ واقعی (hover+pointer:fine)؛ با حرکت‌کاهی هیچ‌کدوم.
  useEffect(() => {
    const sec = sectionRef.current;
    const stage = stageRef.current;
    if (!sec || !stage || reduced || !inView) return;
    const layers = Array.from(stage.querySelectorAll<HTMLElement>(".lh-layer")).map((el) => ({
      el,
      d: Number(el.dataset.d || 0),
      f: el.dataset.f !== undefined ? Number(el.dataset.f) : null,
      tx: 0, ty: 0, bx: 0, by: 0,
    }));
    const parallax = !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    let k = 1;
    let dpr = window.devicePixelRatio || 1;
    // موقعیت پایه‌ی هر لایه (بدون جابه‌جایی فعلی) به پیکسل واقعی
    const measure = () => {
      dpr = window.devicePixelRatio || 1;
      k = parseFloat(getComputedStyle(stage).getPropertyValue("--k")) || 1;
      for (const L of layers) {
        const r = L.el.getBoundingClientRect();
        L.bx = r.left - L.tx * k;
        L.by = r.top - L.ty * k;
      }
    };
    // مقدار دلخواه (px ـ داخل صحنه) → نزدیک‌ترین مقداری که لبه‌ی لایه رو
    // روی پیکسل کامل دستگاه می‌نشونه
    const snap = (base: number, v: number) => (Math.round((base + v * k) * dpr) / dpr - base) / k;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf = 0;
    let t0 = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      for (const L of layers) {
        const fy = L.f === null ? 0 : -5 + 5 * Math.cos(((t + L.f) / 6.5) * Math.PI * 2);
        const x = snap(L.bx, -cx * L.d);
        const y = snap(L.by, -cy * L.d + fy);
        if (Math.abs(x - L.tx) > 0.001 || Math.abs(y - L.ty) > 0.001) {
          L.tx = x; L.ty = y;
          L.el.style.translate = `${x.toFixed(3)}px ${y.toFixed(3)}px`;
        }
      }
    };
    const onMove = (e: PointerEvent) => {
      const r = sec.getBoundingClientRect();
      tx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      ty = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
    };
    const onLeave = () => { tx = 0; ty = 0; };
    // جابه‌جایی اسکرول موقعیت نسبی لایه‌ها به پیکسل رو عوض نمی‌کنه (اسکرول
    // همیشه عدد صحیح پیکسل دستگاهه)، ولی تغییر اندازه چرا
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(stage);
    window.addEventListener("resize", measure);
    measure();
    if (parallax) {
      sec.addEventListener("pointermove", onMove, { passive: true });
      sec.addEventListener("pointerleave", onLeave);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, inView]);

  const ticked = Math.min(step, PHONE_TASKS.length);
  const tasks = PHONE_TASKS.map((t, i) => ({ ...t, done: i < ticked }));
  const pct = Math.round((ticked / PHONE_TASKS.length) * 100);
  const orbLive = mounted && inView;

  return (
    <section
      id="sec-landing-hero"
      ref={sectionRef}
      className={`lh${inView ? "" : " is-paused"}`}
      aria-labelledby="lh-title"
    >
      <div className="lh-aurora" aria-hidden="true">
        <span className="lh-aurora-a" />
        <span className="lh-aurora-b" />
        <span className="lh-aurora-c" />
      </div>

      <div className="lh-grid">
        {/* ── متن ── */}
        <div className="lh-copy">
          <span className="lh-eyebrow lh-rise" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="lh-eyebrow-dot" aria-hidden="true" />
            {tr("یک سیستم برای پیشرفت روزانه", "One system for daily progress")}
          </span>

          {/* SEO: «روتین اپ» و «آریون» هر دو داخل خود h1 هستند (نه فقط متادیتا). */}
          <h1 id="lh-title" className={`lh-title lh-rise ${t.heading}`} style={{ "--i": 1 } as React.CSSProperties}>
            <span className="lh-title-kicker">
              {tr("روتین اپ", "Routine app")} <span className="lh-brand">{brandName()}</span>
            </span>
            <span className="lh-title-main">{tr("تمام روتینت یک‌جا", "Everything in one place")}</span>
            <span className="lh-title-main lh-title-rot">
              <span className="lh-rot" aria-hidden="true">
                {ROT_WORDS.map((w, i) => (
                  <span
                    key={w}
                    className={`lh-rot-word${i === word ? " is-on" : ""}${i === (word + ROT_WORDS.length - 1) % ROT_WORDS.length ? " is-out" : ""}`}
                  >
                    {w}
                  </span>
                ))}
              </span>
              <span className="lh-sr">{tr("روتین", "Routine")}</span>
            </span>
          </h1>

          <p className={`lh-sub lh-rise ${t.muted}`} style={{ "--i": 2 } as React.CSSProperties}>
            {tr(`روتین، خواب، تمرین، تغذیه و ترید را یک‌جا پیش ببر؛ آریون از همین تیک‌های ساده
            استریک، نقشه‌ی ثبات و دستاوردهایت را می‌سازد.`, `Keep your routine, sleep, workouts, nutrition and trading moving in one place; ${brandName()} turns those simple ticks into streaks, a consistency map and achievements.`)}
          </p>

          <div className="lh-ctas lh-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <Link
              href="/auth/signup"
              className={`lh-cta-primary inline-flex items-center gap-1.5 rounded-[20px] px-6 py-3.5 text-[14.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-8 sm:text-[15.5px] ${t.accentBg} ${t.accentShadow}`}
            >
              {tr("شروع رایگان", "Start free")} <span className="dir-flip inline-flex"><ArrowLeft size={17} className="lh-cta-arrow" /></span>
            </Link>
            <Link
              href="/auth/login"
              className={`inline-flex items-center rounded-[20px] border ${t.line} ${t.secondaryBtnBg} px-6 py-3.5 text-[14.5px] font-bold ${t.heading} backdrop-blur-md transition active:scale-[0.97] sm:px-8 sm:text-[15.5px]`}
            >
              {tr("ورود", "Log in")}
            </Link>
          </div>

          <ul className={`lh-trust lh-rise ${t.muted}`} style={{ "--i": 4 } as React.CSSProperties}>
            <li><Sparkles size={14} aria-hidden="true" /> {tr("14 روز رایگان", "14 days free")}</li>
            <li><Sparkles size={14} aria-hidden="true" /> {tr("3 روز بدنسازی، کالری‌شمار و ژورنال ترید", "3 days of workouts, calorie counter and trading journal")}</li>
            <li><ShieldCheck size={15} aria-hidden="true" /> {tr("روی گوشی و کامپیوتر", "On phone and desktop")}</li>
            <li><Lock size={14} aria-hidden="true" /> {tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats")}</li>
          </ul>

          {/* لینک‌های داخلی به صفحه‌های دسته — هم برای بازدیدکننده، هم انتقال اعتبار صفحه‌ی اصلی */}
          <nav className="lh-links lh-rise" style={{ "--i": 5 } as React.CSSProperties} aria-label={tr("بیشتر بخوانید", "Read more")}>
            <span className={`lh-links-label ${t.muted}`}>{tr("بیشتر بخوانید:", "Read more:")}</span>
            {SEO_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="lh-link">{l.label}</Link>
            ))}
          </nav>
        </div>

        {/* ── تصویر: گوشی + کارت‌های شناور — همه از روی خود اپ ── */}
        <div className="lh-stage" ref={stageRef} aria-hidden="true" {...INERT}>
          <div className="lh-stage-inner">
            <div className="lh-halo" />

            <div className="lh-layer lh-layer-phone" data-d="10">
              <div className="lh-phone">
                <div className="lh-phone-screen">
                  <span className="lh-ph-bg" aria-hidden="true"><i /><i /><i /></span>
                  {/* بوم 360پیکسلی = عرض واقعی یک گوشی؛ کوچک‌نمایی با transform.
                      پس کلاس‌های موبایل خود اپ همون اندازه‌ای رو دارن که روی گوشی. */}
                  <div className="lh-canvas dash-scope text-dash-text">
                    <div className="lh-ph-status">
                      <span className="lh-ph-clock">9:41</span>
                      <span className="lh-ph-notch" />
                      <span className="lh-ph-icons" aria-hidden="true">
                        <span className="lh-ph-sig"><i /><i /><i /><i /></span>
                        <svg className="lh-ph-wifi" viewBox="0 0 15 11" fill="currentColor">
                          <path d="M7.5 9.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z" transform="translate(0 -1.3)" />
                          <path d="M3.9 6.3a5.1 5.1 0 0 1 7.2 0l-.9.9a3.8 3.8 0 0 0-5.4 0z" />
                          <path d="M1.3 3.7a8.8 8.8 0 0 1 12.4 0l-.9.9a7.5 7.5 0 0 0-10.6 0z" />
                        </svg>
                        <span className="lh-ph-batt"><span className="lh-ph-batt-body" /><span className="lh-ph-batt-cap" /></span>
                      </span>
                    </div>

                    <div className="lh-ph-top">
                      <span className="lh-ph-top-actions">
                        <span className="lh-ph-burger"><i /><i /><i /></span>
                        <span className="lh-ph-streak"><StreakFlame streak={42} compact /></span>
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/logo-lockup-dark-theme.png" alt="" width={110} height={27} className="lh-ph-logo lh-ph-logo-dark" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/logo-lockup-light-theme.webp" alt="" width={110} height={27} className="lh-ph-logo lh-ph-logo-light" />
                    </div>

                    <div className="lh-ph-body">
                      {/* DashHeader */}
                      <div className="flex flex-row items-center justify-start gap-3 text-start">
                        <div className="flex flex-col items-center gap-1">
                          <DashProgressCircle value={pct} size={52} strokeWidth={4.5} />
                          <span className="whitespace-nowrap text-[9px] text-dash-muted">{tr("پیشرفت امروز", "Today's progress")}</span>
                        </div>
                        <div>
                          <div className="text-[19px] font-bold text-dash-text">{tr("روتین من", "My Routine")}</div>
                          <div className="mt-1 text-[11px] text-dash-muted">{tr("برنامه‌های روزانه خود را مدیریت و پیگیری کنید.", "Manage and track your daily plans.")}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <MockDateStrip />
                        <div className="flex flex-wrap items-center gap-2">
                          <MockFilterButton label={tr("تاریخچه", "History")} icon={<History size={15} />} />
                          <MockFilterButton label={tr("امروز", "Today")} icon={<Calendar size={15} />} active />
                          <MockFilterButton label={tr("فیلتر", "Filter")} icon={<Filter size={15} />} />
                        </div>
                      </div>

                      <MockTaskList tasks={tasks} />

                      <MockMedicationCard meds={[{ name: tr("ویتامین D", "Vitamin D"), every: tr("هر 24 ساعت", "Every 24 hours"), times: "22:00", left: tr("12 روز مونده", "12 days left") }]} />
                    </div>

                    {/* گو «نومو» — همون جای routine-ai-fab روی صفحه‌ی روتین */}
                    <span className="lh-ph-fab">
                      {orbLive ? <SiriOrb size="52px" /> : <span className="lh-orb-still" />}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ژورنال ترید — کارت یک حساب (TradeAccountsPanel) */}
            <div className="lh-layer lh-pos-trade" data-d="34" data-f="0">
              <div className="lh-float lh-card lh-card-trade">
                <div className="lh-trade-name">
                  <span className="trade-account-name">{tr("حساب پراپ", "Prop account")}</span>
                  <span className="trade-account-dot" style={{ background: "#3E7BFA" }} />
                </div>
                <div className="lh-trade-bal mono" dir="ltr">
                  10842$<span className="trade-account-pnl-pct">8.4%</span><ArrowUp size={13} />
                </div>
                <div className="lh-trade-facts">
                  <span><Hash size={11} /> {tr("24 معامله", "24 trades")}</span>
                  <span><Percent size={11} /> {tr("62% برد", "62% win")}</span>
                  <span className="lh-trade-mt">{tr("متاتریدر", "MetaTrader")}</span>
                </div>
              </div>
            </div>

            {/* کالری‌شمار — سر CalorieFoodPlanCard */}
            <div className="lh-layer lh-pos-cal" data-d="26" data-f="-2.2">
              <div className="lh-float lh-card lh-card-cal dash-scope">
                <div className="mono text-[15px] font-extrabold" style={{ color: "var(--accent)" }}>
                  1420<span className="mx-1 text-dash-muted">/</span>2100
                  <span className="ms-1.5 text-[10.5px] font-semibold text-dash-muted">{tr("کالری", "kcal")}</span>
                </div>
                <div className="lh-cal-bar"><i /></div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-bold text-dash-text">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-dash-green" /> {tr("کالری‌شمار", "Calorie counter")}
                </div>
                <div className="calorie-glass-field lh-cal-entry">
                  <span className="truncate text-[10.5px] font-bold text-dash-text">{tr("جوجه‌کباب", "Chicken kebab")}</span>
                  <span className="mono rounded-lg px-1.5 py-0.5 text-[11px] font-extrabold" style={{ background: "rgba(var(--accent-rgb),.10)", color: "var(--accent)" }}>
                    <span className="text-[8px] font-semibold" style={{ opacity: 0.75 }}>kcal</span>330
                  </span>
                </div>
              </div>
            </div>

            {/* نومو — پنل RoutineAiFab */}
            <div className="lh-layer lh-pos-ai" data-d="42" data-f="-4.1">
              <div className="lh-float lh-card lh-card-ai">
                <div className="routine-ai-title lh-ai-title">
                  {orbLive ? <SiriOrb size="20px" /> : <span className="lh-orb-still lh-orb-sm" />}
                  {tr("نومو", "Nomo")}
                </div>
                <div className="routine-ai-bubble-user lh-ai-bubble lh-ai-user">{tr("فردا ساعت 7 عصر باشگاه", "Gym tomorrow at 7 pm")}</div>
                <div className="routine-ai-bubble-bot lh-ai-bubble lh-ai-bot">{tr("«باشگاه» سه‌شنبه ساعت 19:00 اضافه شد.", "Gym added for Tuesday at 19:00.")}</div>
              </div>
            </div>

            {/* مربی — MentorCard + خط رمزگذاری گفت‌وگو */}
            <div className="lh-layer lh-pos-mentor" data-d="30" data-f="-1.2">
              <div className="lh-float lh-card-mentor">
                <MockMentorCard name={tr("سارا رحیمی", "Sara Rahimi")} line={tr("مربی تغذیه", "Nutrition mentor")} rating="4.9" count="38" since={tr("فروردین 1404", "Mar 2025")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
