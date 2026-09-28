"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bell, Check, Flame, Lock, Pill, ShieldCheck, Sparkles, TrendingUp, BadgeCheck,
} from "lucide-react";
import { useThemeTokens } from "@/components/PlanShowcase";
import "./landing-hero.css";

// ─── هیروی لندینگ (کاربرِ واردنشده) ────────────────────────────────────────
// همه‌ی تصویرِ سمتِ چپ (گوشی + کارت‌های شناور) با JSX/CSS خالص ساخته شده —
// نه اسکرین‌شات — و فقط یک پیش‌نمایشِ نمونه است، نه دیتای واقعی کاربر.
// حلقه‌های انیمیشن فقط وقتی هیرو در دید است اجرا می‌شوند (IntersectionObserver)
// و با prefers-reduced-motion کاملاً ساکن می‌مانند. هیچ Math.random/Date در
// رندر نیست؛ حالتِ اولیه‌ی سرور و کلاینت یکی است (بدون hydration mismatch).

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function faNum(n: number | string) {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

const ROT_WORDS = ["روتین", "تمرین", "معامله", "یادگیری"];

const ROUTINE = [
  { label: "مدیتیشن صبحگاهی", time: "۰۷:۰۰" },
  { label: "۸ لیوان آب", time: "طول روز" },
  { label: "تمرین سینه و پشت‌بازو", time: "۱۸:۳۰" },
  { label: "مطالعه‌ی ۲۰ صفحه", time: "۲۲:۰۰" },
  { label: "قرص ویتامین D", time: "۲۲:۳۰", pill: true },
];

const DAYS = [
  { d: "ش", n: "۵" }, { d: "ی", n: "۶" }, { d: "د", n: "۷" }, { d: "س", n: "۸", on: true },
  { d: "چ", n: "۹" }, { d: "پ", n: "۱۰" }, { d: "ج", n: "۱۱" },
];

const WEEK_BARS = [0.55, 0.8, 0.62, 0.92, 0.7, 0.86, 0.4];

const SEO_LINKS = [
  { href: "/routine", label: "برنامه‌ی روتین روزانه" },
  { href: "/habit-tracker", label: "پیگیری عادت‌ها" },
  { href: "/bodybuilding-program", label: "برنامه‌ی بدنسازی هوشمند" },
  { href: "/trading-journal", label: "ژورنال معاملاتی" },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingHero() {
  const t = useThemeTokens();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [word, setWord] = useState(0);
  // شمارنده‌ی چرخه‌ی تیک‌ها: ۰..۵ تیک‌خوردن، ۶..۸ مکث روی «همه انجام شد»، بعد از نو.
  const [step, setStep] = useState(3);
  const [reduced, setReduced] = useState(false);

  useEffect(() => { setReduced(prefersReducedMotion()); }, []);

  // حلقه‌ها فقط وقتی هیرو واقعاً دیده می‌شه
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
    const id = setInterval(() => setStep((s) => (s + 1) % 9), 1050);
    return () => clearInterval(id);
  }, [inView, reduced]);

  // پارالاکسِ نشانگر: فقط دسکتاپِ واقعی (hover+pointer:fine) و بدون حرکت‌کاهی.
  // فقط دو متغیرِ CSS نوشته می‌شه؛ خودِ جابه‌جایی transform ـه.
  useEffect(() => {
    const sec = sectionRef.current;
    const stage = stageRef.current;
    if (!sec || !stage || !window.matchMedia) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReducedMotion()) return;
    let raf = 0;
    let nx = 0, ny = 0;
    const flush = () => {
      raf = 0;
      stage.style.setProperty("--px", nx.toFixed(3));
      stage.style.setProperty("--py", ny.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      const r = sec.getBoundingClientRect();
      nx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      ny = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onLeave = () => { nx = 0; ny = 0; if (!raf) raf = requestAnimationFrame(flush); };
    sec.addEventListener("pointermove", onMove, { passive: true });
    sec.addEventListener("pointerleave", onLeave);
    return () => {
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const ticked = Math.min(step, ROUTINE.length);
  const pct = ticked / ROUTINE.length;
  const R = 17;
  const C = 2 * Math.PI * R;

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
            روتین، سلامتی، ترید و یادگیری — فارسی و یک‌جا
          </span>

          {/* SEO: «روتین اپ» و «آریون» هر دو داخلِ خودِ h1 هستند (نه فقط متادیتا). */}
          <h1 id="lh-title" className={`lh-title lh-rise ${t.heading}`} style={{ "--i": 1 } as React.CSSProperties}>
            <span className="lh-title-kicker">
              روتین اپ <span className="lh-brand">آریون</span>
            </span>
            <span className="lh-title-main">هر روز یک قدم جلوتر</span>
            <span className="lh-title-main lh-title-rot">
              در{" "}
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
              <span className="lh-sr">روتین، تمرین، معامله و یادگیری</span>
            </span>
          </h1>

          <p className={`lh-sub lh-rise ${t.muted}`} style={{ "--i": 2 } as React.CSSProperties}>
            آریون یک روتین اپ فارسیه: روتین روزانه و هفتگی بساز، عادت‌هات رو با استریک نگه دار،
            و بدنسازی، کالری، ژورنال ترید و مسیر یادگیری‌ت رو هم همون‌جا داشته باش — با دستیار
            هوشمندی که زبون خودت رو می‌فهمه.
          </p>

          <div className="lh-ctas lh-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <Link
              href="/auth/signup"
              className={`lh-cta-primary inline-flex items-center gap-1.5 rounded-[20px] px-6 py-3.5 text-[14.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.97] sm:px-8 sm:text-[15.5px] ${t.accentBg} ${t.accentShadow}`}
            >
              شروع رایگان <ArrowLeft size={17} className="lh-cta-arrow" />
            </Link>
            <Link
              href="/auth/login"
              className={`inline-flex items-center rounded-[20px] border ${t.line} ${t.secondaryBtnBg} px-6 py-3.5 text-[14.5px] font-bold ${t.heading} backdrop-blur-md transition active:scale-[0.97] sm:px-8 sm:text-[15.5px]`}
            >
              ورود
            </Link>
          </div>

          <ul className={`lh-trust lh-rise ${t.muted}`} style={{ "--i": 4 } as React.CSSProperties}>
            <li><ShieldCheck size={15} aria-hidden="true" /> اطلاعاتت امن و محرمانه</li>
            <li><Lock size={14} aria-hidden="true" /> چتِ مربی رمزگذاری‌شده‌ی سرتاسری</li>
            <li><Sparkles size={14} aria-hidden="true" /> دوره‌ی آزمایشی رایگان</li>
          </ul>

          {/* لینک‌های داخلی به صفحه‌های دسته — هم برای بازدیدکننده، هم انتقال اعتبار صفحه‌ی اصلی */}
          <nav className="lh-links lh-rise" style={{ "--i": 5 } as React.CSSProperties} aria-label="بیشتر بخوانید">
            <span className={`lh-links-label ${t.muted}`}>بیشتر بخوانید:</span>
            {SEO_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="lh-link">{l.label}</Link>
            ))}
          </nav>
        </div>

        {/* ── تصویر: گوشی + کارت‌های شناور ── */}
        <div className="lh-stage" ref={stageRef} aria-hidden="true">
          <div className="lh-stage-inner">
            <div className="lh-halo" />

            <div className="lh-layer lh-layer-phone" style={{ "--d": 10 } as React.CSSProperties}>
              <div className="lh-phone">
                <div className="lh-phone-screen">
                  <div className="lh-ph-status">
                    <span>۹:۴۱</span>
                    <span className="lh-ph-notch" />
                    <span className="lh-ph-sig"><i /><i /><i /></span>
                  </div>

                  <div className="lh-ph-head">
                    <div>
                      <div className="lh-ph-hello">امروز</div>
                      <div className="lh-ph-date">سه‌شنبه، ۸ مهر</div>
                    </div>
                    <span className="lh-ph-streak">
                      <Flame size={14} className="lh-flame" />
                      <b>{faNum(21)}</b> روز
                    </span>
                  </div>

                  <div className="lh-ph-days">
                    {DAYS.map((d) => (
                      <span key={d.d} className={`lh-ph-day${d.on ? " on" : ""}`}>
                        <small>{d.d}</small>
                        <b>{d.n}</b>
                      </span>
                    ))}
                  </div>

                  <div className="lh-ph-sum">
                    <svg viewBox="0 0 44 44" className="lh-ph-ring">
                      <circle cx="22" cy="22" r={R} className="lh-ph-ring-bg" />
                      <circle
                        cx="22" cy="22" r={R} className="lh-ph-ring-fg"
                        strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
                      />
                    </svg>
                    <div className="lh-ph-sum-txt">
                      <b>{faNum(ticked)} از {faNum(ROUTINE.length)} انجام شد</b>
                      <small>{ticked === ROUTINE.length ? "روزِ کامل! استریک حفظ شد" : "ادامه بده، داری عالی پیش میری"}</small>
                    </div>
                  </div>

                  <ul className="lh-ph-list">
                    {ROUTINE.map((it, i) => {
                      const done = i < ticked;
                      return (
                        <li key={it.label} className={`lh-ph-item${done ? " done" : ""}`}>
                          <span className="lh-ph-check"><Check size={11} strokeWidth={3} /></span>
                          <span className="lh-ph-label">{it.label}</span>
                          <span className="lh-ph-time">
                            {it.pill ? <Pill size={10} /> : null}
                            {it.time}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="lh-ph-week">
                    <div className="lh-ph-week-head">
                      <span>این هفته</span>
                      <b>{faNum(82)}٪</b>
                    </div>
                    <div className="lh-ph-bars">
                      {WEEK_BARS.map((h, i) => (
                        <span key={i} className={`lh-ph-bar${i === 3 ? " on" : ""}`}>
                          <i style={{ "--h": h, "--i": i } as React.CSSProperties} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* کارت ترید */}
            <div className="lh-layer lh-pos-trade" style={{ "--d": 34 } as React.CSSProperties}>
              <div className="lh-float lh-card" style={{ "--f": "0s" } as React.CSSProperties}>
                <div className="lh-card-top">
                  <span className="lh-ic lh-ic-win"><TrendingUp size={13} /></span>
                  <span className="lh-card-title">ژورنال ترید</span>
                </div>
                <div className="lh-pnl">+۲٫۴٪</div>
                <svg viewBox="0 0 120 34" className="lh-spark" preserveAspectRatio="none">
                  <path d="M0 28 L14 24 L26 26 L38 18 L52 20 L64 12 L78 15 L92 8 L106 10 L120 3" />
                </svg>
                <div className="lh-card-foot">
                  <span className="lh-live" /> همگام با متاتریدر ۵
                </div>
              </div>
            </div>

            {/* کارت کالری */}
            <div className="lh-layer lh-pos-cal" style={{ "--d": 26 } as React.CSSProperties}>
              <div className="lh-float lh-card lh-card-cal" style={{ "--f": "-2.2s" } as React.CSSProperties}>
                <svg viewBox="0 0 48 48" className="lh-cal-ring">
                  <circle cx="24" cy="24" r="19" className="lh-cal-bg" />
                  <circle cx="24" cy="24" r="19" className="lh-cal-fg" pathLength={100} strokeDasharray="68 100" />
                </svg>
                <div>
                  <div className="lh-card-title">کالری امروز</div>
                  <div className="lh-cal-num">۱٬۴۲۰</div>
                  <div className="lh-card-sub">از ۲٬۱۰۰</div>
                </div>
              </div>
            </div>

            {/* نومو */}
            <div className="lh-layer lh-pos-ai" style={{ "--d": 42 } as React.CSSProperties}>
              <div className="lh-float lh-card lh-card-ai" style={{ "--f": "-4.1s" } as React.CSSProperties}>
                <div className="lh-ai-user">فردا ساعت ۷ باشگاه رو برام بذار</div>
                <div className="lh-ai-row">
                  <span className="lh-ai-av"><Sparkles size={12} /></span>
                  <div className="lh-ai-bot">
                    <b>نومو</b>
                    <span>به روتین فردا اضافه شد <Bell size={10} /> ۶:۴۵</span>
                  </div>
                </div>
              </div>
            </div>

            {/* مربی */}
            <div className="lh-layer lh-pos-mentor" style={{ "--d": 30 } as React.CSSProperties}>
              <div className="lh-float lh-card lh-card-mentor" style={{ "--f": "-1.2s" } as React.CSSProperties}>
                <div className="lh-card-top">
                  <span className="lh-mentor-av">م</span>
                  <div className="min-w-0">
                    <div className="lh-card-title lh-mentor-name">مربی شما <BadgeCheck size={12} /></div>
                    <div className="lh-card-sub"><Lock size={9} /> رمزگذاری سرتاسری</div>
                  </div>
                </div>
                <div className="lh-mentor-prog">
                  <span>پیشرفت هفته</span><b>{faNum(86)}٪</b>
                </div>
                <div className="lh-mentor-bar"><i /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
