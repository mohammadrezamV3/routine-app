"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Lock, RefreshCw, Sparkles, Bot } from "lucide-react";
import { TickButton } from "@/components/TickButton";
import { GradientRing, RING_AMBER, RING_BLUE, RING_GREEN } from "@/components/GradientRing";
import { StreakFlame } from "@/components/StreakFlame";

// ─── ماکت‌های کوچک «زنده» صفحه‌ی درباره ───────────────────────────────────
// همه تزئینی‌اند (aria-hidden، بدون فوکوس)، دیتای نمونه‌ی ثابت دارند (بدون
// Date/Math.random در رندر، پس SSR و کلاینت یکی است) و چرخه‌ی حرکتشان فقط
// وقتی کارت در دید است و حرکت‌کاهی خاموش است اجرا می‌شود.

const EASE = [0.22, 1, 0.36, 1] as const;

/** شمارنده‌ی چرخه — فقط در دید و بدون حرکت‌کاهی جلو می‌رود. */
function useLoop(len: number, ms: number, initial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(initial);
  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setStep((s) => (s + 1) % len), ms);
    return () => clearInterval(id);
  }, [inView, reduce, len, ms]);
  return { ref, step, inView, reduce: !!reduce };
}

/* ─── روتین ─── */
const TASKS = [
  { name: "مدیتیشن صبحگاهی", time: "07:00", tag: "سلامتی" },
  { name: "مطالعه", time: "13:30", tag: "یادگیری" },
  { name: "پیاده‌روی عصر", time: "18:00", tag: "ورزش" },
  { name: "برنامه‌ریزی فردا", time: "22:00", tag: "کار" },
];
const WEEK = [
  { d: "ش", n: 5 }, { d: "ی", n: 6 }, { d: "د", n: 7 }, { d: "س", n: 8 }, { d: "چ", n: 9 }, { d: "پ", n: 10 }, { d: "ج", n: 11 },
];

export function AboutMockRoutine() {
  // ۰..۴ تیک‌خوردن پشت‌سرهم، ۵..۶ مکث روی «همه انجام شد»
  const { ref, step } = useLoop(7, 1100, 2);
  const done = Math.min(step, TASKS.length);
  return (
    <div ref={ref} className="ab-mock" aria-hidden="true">
      <div className="ab-week">
        {WEEK.map((w, i) => (
          <span key={w.d} className={i === 4 ? "is-on" : ""}>{w.d}<b className="ab-mono">{w.n}</b></span>
        ))}
      </div>
      <div className="ab-routine-sum">
        <div className="ab-tasks" style={{ flex: 1 }}>
          {TASKS.map((t, i) => (
            <div key={t.name} className={`ab-task${i < done ? " is-done" : ""}`}>
              <TickButton as="span" checked={i < done} size={22} />
              <span className="ab-task-name">{t.name}</span>
              <span className="ab-task-tag">{t.tag}</span>
              <span className="ab-task-time ab-mono" dir="ltr">{t.time}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ab-mock-row" style={{ marginTop: 10 }}>
        <span className="ab-mock-label">پیشرفت امروز</span>
        <GradientRing value={done / TASKS.length} size={44} stroke={5} grad={RING_GREEN}>
          <span className="ab-mono">{done}/{TASKS.length}</span>
        </GradientRing>
      </div>
    </div>
  );
}

/* ─── استریک: نقشه‌ی ثبات ۷×۱۳ ─── */
// الگوی ثابت و قطعی (نه تصادفی) — هفته‌های اخیر پرتر، مثل یک عادت در حال شکل‌گرفتن
const HEAT = Array.from({ length: 91 }, (_, i) => {
  const w = Math.floor(i / 7);
  const v = (i * 37 + w * 11) % 10;
  if (i >= 68) return 3 - (v === 0 ? 1 : 0);
  if (w < 3) return v < 4 ? 0 : v < 7 ? 1 : 2;
  return v < 2 ? 0 : v < 5 ? 1 : v < 8 ? 2 : 3;
});

export function AboutMockStreak() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="ab-mock" aria-hidden="true">
      <div className="ab-streak-top">
        <StreakFlame streak={23} className="ab-streak-flame" />
        <span className="ab-mock-label">روز کامل پشت‌سرهم</span>
      </div>
      <div className="ab-heat">
        {HEAT.map((l, i) => (
          <motion.i
            key={i}
            data-l={l}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={inView || reduce ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.35, delay: Math.floor(i / 7) * 0.045, ease: EASE }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── خواب ─── */
export function AboutMockSleep() {
  return (
    <div className="ab-mock" aria-hidden="true">
      <div className="ab-sleep">
        <GradientRing value={7.5 / 8} size={86} stroke={8} grad={RING_BLUE}>
          <span className="ab-mono">7:30</span>
          <small>از 8 ساعت</small>
        </GradientRing>
        <div className="ab-sleep-times">
          <span>خواب<b className="ab-mono" dir="ltr">23:30</b></span>
          <span>بیداری<b className="ab-mono" dir="ltr">07:00</b></span>
        </div>
      </div>
    </div>
  );
}

/* ─── بدنسازی ─── */
const MOVES = [
  { name: "پرس سینه هالتر", sets: "4×10" },
  { name: "قفسه سینه دمبل", sets: "3×12" },
  { name: "پشت بازو سیم‌کش", sets: "3×12" },
];

export function AboutMockWorkout() {
  const { ref, step } = useLoop(5, 1200, 1);
  const done = Math.min(step, MOVES.length);
  return (
    <div ref={ref} className="ab-mock" aria-hidden="true">
      <div className="ab-mock-row" style={{ marginBottom: 6 }}>
        <span className="ab-mock-strong">روز 1 — سینه و پشت بازو</span>
        <span className="ab-ai-chip"><Sparkles size={11} /> AI</span>
      </div>
      <div className="ab-tasks">
        {MOVES.map((m, i) => (
          <div key={m.name} className={`ab-task${i < done ? " is-done" : ""}`}>
            <TickButton as="span" checked={i < done} size={22} tone="exercise" />
            <span className="ab-task-name">{m.name}</span>
            <span className="ab-sets ab-mono" dir="ltr">{m.sets}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── کالری ─── */
const MACROS = [
  { label: "پروتئین", v: 0.72, c: "var(--ring-1a)" },
  { label: "کربوهیدرات", v: 0.58, c: "var(--ring-2a)" },
  { label: "چربی", v: 0.44, c: "var(--ring-3a)" },
];

export function AboutMockCalorie() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="ab-mock" aria-hidden="true">
      <div className="ab-cal">
        <GradientRing value={1640 / 2200} size={86} stroke={8} grad={RING_AMBER}>
          <span className="ab-mono">1640</span>
          <small>از 2200</small>
        </GradientRing>
        <div className="ab-macros">
          {MACROS.map((m, i) => (
            <div key={m.label} className="ab-macro">
              {m.label}
              <div className="ab-macro-bar">
                <motion.i
                  style={{ background: m.c, width: `${m.v * 100}%` }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={inView || reduce ? { scaleX: 1 } : undefined}
                  transition={{ duration: 1, delay: 0.2 + i * 0.12, ease: EASE }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ab-foods">
        <span>نان سنگک<b className="ab-mono">260</b></span>
        <span>جوجه‌کباب<b className="ab-mono">190</b></span>
        <span>دوغ<b className="ab-mono">30</b></span>
      </div>
    </div>
  );
}

/* ─── ترید ─── */
const EQUITY = "M0 70 L22 64 L44 67 L66 52 L88 56 L110 44 L132 47 L154 34 L176 38 L198 26 L220 30 L242 18 L264 22 L286 10 L300 12";

export function AboutMockTrade() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="ab-trade" aria-hidden="true">
      <div className="ab-mock">
        <div className="ab-mock-row">
          <span className="ab-mock-strong">حساب اصلی</span>
          <span className="ab-sync"><i /> MT5 همگام شد</span>
        </div>
        <div className="ab-mock-row" style={{ marginTop: 6 }}>
          <span className="ab-pnl ab-mono" dir="ltr">+4.8%</span>
          <span className="ab-mock-label">نرخ برد <b className="ab-mono" style={{ color: "var(--text)" }}>62%</b></span>
        </div>
        <svg className="ab-equity" viewBox="0 0 300 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ab-eq-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(var(--pnl-win-rgb),.28)" />
              <stop offset="100%" stopColor="rgba(var(--pnl-win-rgb),0)" />
            </linearGradient>
          </defs>
          <motion.path
            d={`${EQUITY} L300 80 L0 80 Z`}
            fill="url(#ab-eq-fill)"
            initial={reduce ? false : { opacity: 0 }}
            animate={inView || reduce ? { opacity: 1 } : undefined}
            transition={{ duration: 0.8, delay: 0.9 }}
          />
          <motion.path
            d={EQUITY}
            fill="none"
            stroke="var(--pnl-win)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            animate={inView || reduce ? { pathLength: 1 } : undefined}
            transition={{ duration: 1.4, ease: EASE }}
          />
        </svg>
      </div>
      <div className="ab-mock ab-cal-event">
        <div className="ab-cal-ev-head">
          <span className="ab-impact"><i /><i /><i /></span>
          <span className="ab-mono" dir="ltr">USD · CPI</span>
          <span className="ab-mock-label" style={{ marginInlineStart: "auto" }}><RefreshCw size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> تقویم اقتصادی</span>
        </div>
        <div className="ab-cal-nums ab-mono">
          <div className="is-actual">Actual<b>3.1%</b></div>
          <div>Forecast<b>3.2%</b></div>
          <div>Previous<b>3.3%</b></div>
        </div>
      </div>
    </div>
  );
}

/* ─── مربی‌ها: گفت‌وگوی رمزنگاری‌شده ─── */
export function AboutMockMentor() {
  // ۰: پیام مربی، ۱: در حال نوشتن، ۲..۴: پاسخ شاگرد
  const { ref, step, reduce } = useLoop(6, 1300, 3);
  const showTyping = !reduce && step === 1;
  const showReply = reduce || step >= 2;
  return (
    <div ref={ref} className="ab-mock" aria-hidden="true">
      <div className="ab-chat">
        <div className="ab-bubble ab-bubble-peer">برنامه‌ی این هفته‌ت رو فرستادم.<small className="ab-mono">09:12</small></div>
        {showTyping && <span className="ab-typing"><i /><i /><i /></span>}
        {showReply && (
          <motion.div
            key="reply"
            className="ab-bubble ab-bubble-me"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            دیدم، از امروز شروع می‌کنم.<small className="ab-mono">09:15</small>
          </motion.div>
        )}
      </div>
      <div className="ab-e2ee-line"><Lock size={12} /> سرتاسر رمزنگاری‌شده</div>
    </div>
  );
}

/* ─── نومو: تایپ یک درخواست و ساخته‌شدن برنامه ─── */
const NUMO_TEXT = "فردا ساعت 7 صبح پیاده‌روی بذار";

export function AboutMockNumo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(NUMO_TEXT.length + 12);
  useEffect(() => {
    if (!inView || reduce) return;
    // طول متن + مکث روی نتیجه، بعد از نو
    const total = NUMO_TEXT.length + 18;
    const id = setInterval(() => setN((c) => (c + 1) % total), 85);
    return () => clearInterval(id);
  }, [inView, reduce]);
  const typed = reduce ? NUMO_TEXT : NUMO_TEXT.slice(0, Math.min(n, NUMO_TEXT.length));
  const finished = reduce || n > NUMO_TEXT.length + 3;
  return (
    <div ref={ref} className="ab-mock" aria-hidden="true">
      <div className="ab-numo-input">
        <Bot size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span>{typed}{!finished && <span className="ab-caret" />}</span>
      </div>
      <div className="ab-numo-done" style={{ opacity: finished ? 1 : 0, transition: "opacity .3s ease" }}>
        <Check size={14} /> «پیاده‌روی» به برنامه‌ی فردا ساعت <span className="ab-mono">07:00</span> اضافه شد
      </div>
    </div>
  );
}
