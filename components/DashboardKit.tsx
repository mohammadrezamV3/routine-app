"use client";

// اجزای پایه‌ی داشبورد — کارتِ بنتو، عددِ شمارنده، حلقه، اسپارک‌لاین، اسکلت.
// اصولِ کارایی (چون این صفحه قراره صفحه‌ی اصلیِ کاربر بشه):
//   • هیچ کتابخانه‌ی نموداری نیست؛ همه SVGِ دست‌ساز.
//   • شمارنده‌ها مقدار رو مستقیم روی textContent می‌نویسن (نه setState در
//     هر فریم) — صفر رندرِ React حینِ انیمیشن.
//   • نورِ دنبال‌کننده‌ی موسِ کارت‌ها فقط دو متغیرِ CSS رو عوض می‌کنه (بدون
//     state) و فقط روی دستگاهِ hover-دار؛ روی لمسی اصلا لیسنری ثبت نمی‌شه.
//   • همه‌ی حرکت‌ها با MotionConfig reducedMotion="user" (در DashboardClient)
//     برای کسی که «کاهشِ حرکت» رو روشن کرده خاموش می‌شن.

import Link from "next/link";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { sparkPath } from "@/lib/dashboardCompute";
import { DashIcon, type DashIconName } from "./DashboardIcons";
import { cn } from "@/lib/utils";

export const D_EASE = [0.22, 1, 0.36, 1] as const;

export const V_GRID: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
export const V_CARD: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: D_EASE } },
};

// ── کارتِ بنتو ─────────────────────────────────────────────
export function BentoCard({
  children,
  className,
  area,
  as = "section",
  label,
}: {
  children: ReactNode;
  className?: string;
  /** نامِ ناحیه در grid-template-areas (app/dashboard/dashboard.css) */
  area?: string;
  as?: "section" | "div";
  label?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => { el.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const Cmp = as === "div" ? motion.div : motion.section;
  return (
    <Cmp
      ref={ref as any}
      variants={V_CARD}
      className={cn("db-card", className)}
      style={area ? { gridArea: area } : undefined}
      aria-label={label}
    >
      {children}
    </Cmp>
  );
}

/** سرتیترِ کارت: آیکونِ زنده + عنوان + (اختیاری) لینکِ «همه» */
export function CardHead({ icon, title, href, hrefLabel = "مشاهده", extra }: { icon: DashIconName; title: string; href?: string; hrefLabel?: string; extra?: ReactNode }) {
  return (
    <header className="db-card-head">
      <span className="db-card-icon"><DashIcon name={icon} /></span>
      <h2 className="db-card-title">{title}</h2>
      {extra}
      {href && (
        <Link href={href} prefetch className="db-card-more">
          {hrefLabel}
          <DashIcon name="arrow" />
        </Link>
      )}
    </header>
  );
}

// ── عددِ شمارنده ────────────────────────────────────────────
export function CountUp({
  value,
  decimals = 0,
  duration = 1.1,
  prefix = "",
  suffix = "",
  signed = false,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  /** علامتِ + برای مثبت (سود/زیان) */
  signed?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const fmt = (v: number) => {
    const fixed = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const sign = v < 0 ? "−" : signed && v > 0 ? "+" : "";
    return `${sign}${prefix}${faNum(fixed)}${suffix}`;
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) { el.textContent = fmt(value); from.current = value; return; }
    if (!inView) return;
    const ctrl = animate(from.current, value, {
      duration,
      ease: D_EASE as any,
      onUpdate: (v) => { from.current = v; el.textContent = fmt(v); },
    });
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce]);
  return <span ref={ref} className={cn("db-num", className)}>{fmt(0)}</span>;
}

// ── حلقه‌ی پیشرفت ───────────────────────────────────────────
export function Ring({ value, size = 64, stroke = 6, color = "var(--accent)", track, delay = 0, grad, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; delay?: number; grad?: [string, string]; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const v = Math.max(0, Math.min(1, value));
  if (grad) {
    return (
      <span className="db-ring" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: "visible" }}>
          <GradientArc c={size / 2} r={r} stroke={stroke} value={v} from={grad[0]} to={grad[1]} delay={delay} />
        </svg>
        {children && <span className="db-ring-center">{children}</span>}
      </span>
    );
  }
  return (
    <span className="db-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? "rgba(var(--accent-rgb),.14)"} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: v || 0.0001 }}
          transition={{ duration: 1.2, ease: D_EASE, delay }}
        />
      </svg>
      {children && <span className="db-ring-center">{children}</span>}
    </span>
  );
}

// ── قوسِ گرادیانی (شبه‌conic) ───────────────────────────────
/**
 * یک حلقه‌ی پیشرفت با گرادیانی که *دورِ* قوس می‌چرخه (نه خطی از بالا به
 * پایین): دو نیم‌دایره، هرکدوم گرادیانِ خودش (from→mid و mid→to)، که با یک
 * motion value پر می‌شن؛ سرِ قوس یک دایره‌ی درخشان داره که هم‌زمان جلو می‌ره
 * و رنگش همون رنگِ همون نقطه‌ی قوسه. رنگ‌ها می‌تونن var(--...) باشن.
 */
export function GradientArc({ c, r, stroke, value, from, to, delay = 0, trackOpacity = 16 }: { c: number; r: number; stroke: number; value: number; from: string; to: string; delay?: number; trackOpacity?: number }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  useEffect(() => {
    const v = Math.max(0, Math.min(1, value));
    if (reduce) { mv.set(v); return; }
    const ctrl = animate(mv, v, { duration: 1.4, ease: D_EASE as any, delay });
    return () => ctrl.stop();
  }, [value, reduce, delay, mv]);
  const a = useTransform(mv, (p) => Math.min(1, p * 2));
  const b = useTransform(mv, (p) => Math.max(0, p * 2 - 1));
  const aOp = useTransform(mv, (p) => (p > 0.004 ? 1 : 0));
  const bOp = useTransform(mv, (p) => (p > 0.5 ? 1 : 0));
  const capX = useTransform(mv, (p) => c + r * Math.sin(p * 2 * Math.PI));
  const capY = useTransform(mv, (p) => c - r * Math.cos(p * 2 * Math.PI));
  const capFill = useTransform(mv, (p) => `color-mix(in srgb, ${to} ${Math.round(p * 100)}%, ${from})`);
  const mid = `color-mix(in srgb, ${to} 50%, ${from})`;
  const top = c - r, bottom = c + r;
  return (
    <g>
      <defs>
        <linearGradient id={`ga${uid}`} gradientUnits="userSpaceOnUse" x1={c} y1={top} x2={c} y2={bottom}>
          <stop offset="0%" style={{ stopColor: from }} />
          <stop offset="100%" style={{ stopColor: mid }} />
        </linearGradient>
        <linearGradient id={`gb${uid}`} gradientUnits="userSpaceOnUse" x1={c} y1={bottom} x2={c} y2={top}>
          <stop offset="0%" style={{ stopColor: mid }} />
          <stop offset="100%" style={{ stopColor: to }} />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} style={{ stroke: `color-mix(in srgb, ${from} ${trackOpacity}%, transparent)` }} />
      <motion.path d={`M${c} ${top} A${r} ${r} 0 0 1 ${c} ${bottom}`} fill="none" stroke={`url(#ga${uid})`} strokeWidth={stroke} strokeLinecap="round" style={{ pathLength: a, opacity: aOp }} />
      <motion.path d={`M${c} ${bottom} A${r} ${r} 0 0 1 ${c} ${top}`} fill="none" stroke={`url(#gb${uid})`} strokeWidth={stroke} strokeLinecap="round" style={{ pathLength: b, opacity: bOp }} />
      <motion.circle r={stroke / 2} className="db-arc-cap" style={{ cx: capX, cy: capY, fill: capFill, opacity: aOp }} />
    </g>
  );
}

// ── اسپارک‌لاین ─────────────────────────────────────────────
// باگِ «یه تیکه‌ی خط می‌افته، یه تیکه نه»: قبلا SVG با preserveAspectRatio="none"
// کش می‌اومد و خط vector-effect:non-scaling-stroke داشت؛ انیمیشنِ pathLength
// طولِ dash رو بر حسبِ واحدِ مسیر می‌ساخت ولی non-scaling-stroke اون رو به
// پیکسلِ صفحه می‌برد — پس فقط بخشی از خط کشیده می‌شد. حالا عرضِ واقعی با
// ResizeObserver اندازه گرفته می‌شه و SVG دقیقا ۱:۱ رسم می‌شه (بدونِ کش‌آمدن).
export function Sparkline({ values, height = 72, tone = "auto", className }: { values: number[]; width?: number; height?: number; tone?: "auto" | "accent" | "win" | "loss"; className?: string }) {
  const id = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const set = () => setW(Math.round(el.getBoundingClientRect().width));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const p = w > 0 ? sparkPath(values, w, height, 6) : null;
  const last = values[values.length - 1] ?? 0;
  const resolved = tone === "auto" ? (last >= (values[0] ?? 0) ? "win" : "loss") : tone;
  const color = resolved === "win" ? "var(--pnl-win)" : resolved === "loss" ? "var(--pnl-loss)" : "var(--accent)";
  return (
    <div ref={box} className={cn("db-spark-box", className)} style={{ height }}>
      {values.length < 2 ? (
        <div className="db-spark-empty" style={{ height }} />
      ) : p ? (
        <svg className="db-spark" width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true">
          <defs>
            <linearGradient id={`sg${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <clipPath id={`sc${id}`}>
              <motion.rect x={0} y={-10} height={height + 20} initial={{ width: 0 }} animate={{ width: w + 10 }} transition={{ duration: 1.3, ease: D_EASE }} />
            </clipPath>
          </defs>
          {p.zeroY !== null && <line x1="0" x2={w} y1={p.zeroY} y2={p.zeroY} className="db-spark-zero" />}
          {/* خط و سایه‌ی زیرش با یک clipِ مشترک از چپ به راست ظاهر می‌شن — همیشه
              هم‌گام و کامل، مستقل از طولِ مسیر */}
          <g clipPath={`url(#sc${id})`}>
            <path d={p.area} fill={`url(#sg${id})`} />
            <path d={p.line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <motion.circle cx={p.last.x} cy={p.last.y} r={3.4} fill={color} className="db-spark-dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 380, damping: 18 }} />
        </svg>
      ) : null}
    </div>
  );
}

// ── نوارِ پیشرفتِ باریک ─────────────────────────────────────
export function Meter({ value, color = "var(--accent)", delay = 0 }: { value: number; color?: string; delay?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="db-meter">
      <motion.span
        className="db-meter-fill"
        style={{ background: color, transformOrigin: "right" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: v }}
        transition={{ duration: 1, ease: D_EASE, delay }}
      />
    </span>
  );
}

// ── اسکلت ───────────────────────────────────────────────────
export function Skel({ w = "100%", h = 12, r = 8, className }: { w?: number | string; h?: number; r?: number; className?: string }) {
  return <span className={cn("db-skel", className)} style={{ width: w, height: h, borderRadius: r }} />;
}

/** حالتِ خالیِ یک کارت (مثلا «هنوز پلن تمرینی نداری») با یک دکمه */
export function EmptyState({ icon, text, href, cta }: { icon: DashIconName; text: string; href?: string; cta?: string }) {
  return (
    <div className="db-empty">
      <span className="db-empty-icon"><DashIcon name={icon} /></span>
      <p>{text}</p>
      {href && cta && (
        <Link href={href} prefetch className="account-outline-btn mentor-btn is-sm db-empty-cta">{cta}</Link>
      )}
    </div>
  );
}
