"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import {
  Apple, ArrowLeft, CalendarCheck, CandlestickChart, Dumbbell, GraduationCap, Moon, ShieldCheck, Smartphone, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { brandName } from "@/lib/brand";
import { tr, trv } from "@/lib/i18n";

// ─── هیروی صفحه‌ی «درباره» ─────────────────────────────────────────────
// پس‌زمینه = چند گرادیان شعاعی (بدون filter:blur) که فقط transform می‌گیرند؛
// نشان برند وسط یک مدار گردان از ماژول‌ها، همه با انیمیشن CSS که بیرون دید
// متوقف می‌شود. تیتر کلمه‌به‌کلمه با framer وارد می‌شود و با حرکت‌کاهی
// (MotionTuner → reducedMotion) بی‌حرکت نمایش داده می‌شود.

const EASE = [0.22, 1, 0.36, 1] as const;

const words = () => trv(["همه‌ی", "نظم", "زندگی‌ات،"], ["All", "your", "life", "in"]);

const orbit = (): { label: string; icon: LucideIcon }[] => [
  { label: tr("روتین", "Routine"), icon: CalendarCheck },
  { label: tr("خواب", "Sleep"), icon: Moon },
  { label: tr("بدنسازی", "Workout"), icon: Dumbbell },
  { label: tr("کالری", "Calories"), icon: Apple },
  { label: tr("ترید", "Trading"), icon: CandlestickChart },
  { label: tr("مربی‌ها", "Mentors"), icon: GraduationCap },
];

function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-icon-dark-theme.png" alt="" width={256} height={217} className={`ab-logo-dark ${className ?? ""}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-icon-light-theme.webp" alt="" width={256} height={217} className={`ab-logo-light ${className ?? ""}`} />
    </>
  );
}
export { BrandLogo as AboutBrandLogo };

export function AboutHero() {
  const WORDS = words();
  const ORBIT = orbit();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // انیمیشن‌های بی‌پایان مدار فقط وقتی دیده می‌شوند
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // کج‌شدن سه‌بعدی نشان زیر نشانگر — فقط دسکتاپ با موس
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [9, -9]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-11, 11]), { stiffness: 120, damping: 18 });
  const [fine, setFine] = useState(false);
  useEffect(() => { setFine(!!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches); }, []);
  const tilt = fine && !reduce;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const word = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: "0.55em", rotateX: -40 },
    animate: { opacity: 1, y: 0, rotateX: 0 },
    transition: { duration: 0.8, delay: 0.15 + i * 0.09, ease: EASE },
  });

  return (
    <section className="ab-hero" aria-labelledby="ab-h1">
      <div className="ab-mesh" aria-hidden="true">
        <span className="ab-mesh-a" />
        <span className="ab-mesh-b" />
        <span className="ab-mesh-c" />
        <div className="ab-mesh-dots" />
      </div>

      <div className="ab-hero-grid">
        <div>
          <motion.span
            className="ab-badge"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="ab-badge-dot" aria-hidden="true" />
            {tr("داستان آریون", "The Arion story")}
          </motion.span>

          <h1 id="ab-h1" className="ab-h1" style={{ perspective: 600 }}>
            <motion.span
              className="ab-h1-kicker"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.05 }}
            >
              {tr(`درباره ${brandName()}`, `About ${brandName()}`)}
            </motion.span>
            <span className="ab-h1-line">
              {WORDS.map((w, i) => (
                <motion.span key={w} className="ab-word" {...word(i)}>{w}</motion.span>
              ))}
              <motion.span className="ab-word ab-word-accent" {...word(WORDS.length)}>
                {tr("یک‌جا.", "one place.")}
                <svg className="ab-swash" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                  <motion.path
                    d="M4 14 C 50 4, 120 4, 196 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={5}
                    strokeLinecap="round"
                    initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.55 }}
                    transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
                  />
                </svg>
              </motion.span>
            </span>
          </h1>

          <motion.p
            className="ab-sub"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
          >
            {trv(
              <>
                {brandName()} یک اپلیکیشن فارسی برای نظم‌دادن به زندگی روزمره است. <b>روتین، خواب، ورزش، تغذیه و ترید</b>
                {" "}به‌جای چند اپ جدا، زیر یک حساب کاربری کنار هم‌اند؛ همه‌چیز فارسی، با تقویم شمسی، و روی موبایل و کامپیوتر یکسان.
              </>,
              <>
                {brandName()} is an app for bringing order to everyday life. <b>Routine, sleep, workouts, nutrition and trading</b>
                {" "}live side by side under one account instead of several separate apps, and it works the same on phone and desktop.
              </>,
            )}
          </motion.p>

          <motion.div
            className="ab-ctas"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
          >
            <Link href="/auth/signup" className="ls-btn ls-btn-primary">
              {tr("شروع رایگان", "Start free")} <ArrowLeft size={16} className="dir-flip" />
            </Link>
            <a href="#inside" className="ls-btn ls-btn-ghost">{tr("داخل آریون", "Inside Arion")}</a>
          </motion.div>

          <motion.div
            className="ab-trust"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            <span><Sparkles size={14} /> {tr("«روتین من» 14 روز رایگان", "My Routine free for 14 days")}</span>
            <span><ShieldCheck size={14} /> {tr("چت‌های سرتاسر رمزنگاری‌شده", "End-to-end encrypted chats")}</span>
            <span><Smartphone size={14} /> {tr("نصب روی گوشی (PWA)", "Install on your phone (PWA)")}</span>
          </motion.div>
        </div>

        <div className="ab-stage-wrap" onPointerMove={onMove} onPointerLeave={onLeave}>
          <motion.div
            ref={stageRef}
            className={`ab-stage${paused ? " is-paused" : ""}`}
            style={tilt ? { rotateX: rx, rotateY: ry } : undefined}
            initial={reduce ? false : { opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: EASE }}
            aria-hidden="true"
          >
            <svg className="ab-stage-svg" viewBox="0 0 400 400">
              <g className="ab-orb-dash">
                <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(var(--accent-rgb),.28)" strokeWidth="1" strokeDasharray="2 9" strokeLinecap="round" />
              </g>
              <g className="ab-orb-dash ab-orb-dash-2">
                <circle cx="200" cy="200" r="118" fill="none" stroke="rgba(var(--secondary-rgb),.30)" strokeWidth="1" strokeDasharray="14 10" />
              </g>
            </svg>
            <span className="ab-stage-ring" />
            <div className="ab-core"><BrandLogo /></div>
            <div className="ab-orbit">
              {ORBIT.map((o, i) => {
                const Ic = o.icon;
                return (
                  <div key={o.label} className="ab-orbit-slot" style={{ ["--a" as string]: `${(360 / ORBIT.length) * i}deg` } as React.CSSProperties}>
                    <div className="ab-orbit-chip">
                      <span className="ab-orbit-pill"><Ic size={14} /> {o.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
