"use client";

// کمک‌ابزارهای مشترک خواننده و آرشیو هفته‌نامه: آیکون/رنگ هر دامنه، فچ،
// ورودی‌های حرکتی (reveal، شمارنده، حلقه‌ی تنبل) و گیت صفحه. همه‌ی حرکت‌ها
// فقط transform/opacity و روی «کاهش حرکت» و html[data-perf="low"] ساده می‌شن.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Apple, CandlestickChart, CheckCheck, Dumbbell, GraduationCap, Moon, Repeat, type LucideIcon,
} from "lucide-react";
import type { AnalysisDomain, Grade } from "@/lib/weeklyAnalysis/types";
import { AuthGate } from "@/components/AuthGate";
import { FeatureGate } from "@/components/FeatureGate";
import { ModuleGate } from "@/components/ModuleGate";
import { GradientRing, RING_GREEN } from "@/components/GradientRing";
import { parseCountable } from "./WeeklyLetterUtils";
import "./weekly-letter.css";

export const WL_EASE = [0.22, 1, 0.36, 1] as const;

export const DOMAIN_ICONS: Record<AnalysisDomain, LucideIcon> = {
  routine: Repeat,
  sleep: Moon,
  tasks: CheckCheck,
  fitness: Dumbbell,
  nutrition: Apple,
  trading: CandlestickChart,
  learning: GraduationCap,
};

// مقصد «برو ثبت کن» هر دامنه — همون روت‌های واقعی NavDrawer
export const DOMAIN_HREFS: Record<AnalysisDomain, string> = {
  routine: "/weekly",
  sleep: "/sleep",
  tasks: "/weekly",
  fitness: "/exercise",
  nutrition: "/exercise?tab=calorie",
  trading: "/trade",
  learning: "/roadmaps",
};

// v3: فقط یک رنگ داده (گرادیان حلقه‌ی برند) — حلقه‌های خواننده و داستان همیشه همین
export const DOM_GRAD = RING_GREEN;

// ---- فچ ----
export class WlError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function wlFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    throw new WlError("ارتباط با سرور برقرار نشد", 0);
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* بدنه‌ی خالی */ }
  if (!res.ok) throw new WlError((data as { error?: string } | null)?.error || "مشکلی پیش اومد", res.status);
  return data as T;
}

// ---- حرکت ----
/** کاهش حرکت کاربر یا دستگاه کم‌توان: ورودی‌ها فقط محو می‌شن، بدون جابه‌جایی. */
export function useLite(): boolean {
  const reduce = useReducedMotion();
  const [low, setLow] = useState(false);
  useEffect(() => {
    setLow(document.documentElement.getAttribute("data-perf") === "low");
  }, []);
  return !!reduce || low;
}

/** false تا ms میلی‌ثانیه بعد از mount، بعدش true (برای شروع انیمیشن‌های CSS داخل اسلاید بعد از ورودش). */
export function useOnAfter(ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return on;
}

export function Reveal({ children, className, delay = 0, y = 18, as = "div", style, id }: { children: ReactNode; className?: string; delay?: number; y?: number; as?: "div" | "li" | "section" | "article"; style?: CSSProperties; id?: string }) {
  const lite = useLite();
  const Cmp = as === "li" ? motion.li : as === "section" ? motion.section : as === "article" ? motion.article : motion.div;
  return (
    <Cmp
      id={id}
      className={className}
      style={style}
      initial={{ opacity: 0, y: lite ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: lite ? 0.25 : 0.6, ease: WL_EASE as never, delay: lite ? 0 : delay }}
    >
      {children}
    </Cmp>
  );
}

/** عدد با شمارش از صفر وقتی وارد دید شد؛ مقدار نهایی دقیقا همون رشته‌ی اصلیه. */
export function CountText({ value, className, duration = 1.1 }: { value: string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const lite = useLite();
  const parsed = parseCountable(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || !parsed || lite || !inView) return;
    const ctrl = animate(0, parsed.num, {
      duration,
      ease: WL_EASE as never,
      onUpdate: (v) => { el.textContent = `${parsed.prefix}${v.toFixed(parsed.decimals)}${parsed.suffix}`; },
      onComplete: () => { el.textContent = value; },
    });
    return () => { ctrl.stop(); el.textContent = value; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, lite, value]);
  // رندر اول (قبل از دیدن) صفر نشون می‌ده تا پرش نباشه؛ SSR/بدون جاوا مقدار واقعی
  const initial = parsed && !lite ? `${parsed.prefix}${(0).toFixed(parsed.decimals)}${parsed.suffix}` : value;
  return <span ref={ref} className={className} dir="auto">{initial}</span>;
}

/** نوار پیشرفت باریک؛ پر شدنش با دیده‌شدن خود ردیف (نه خود فرزند صفرمقیاس) شروع می‌شه. */
export function MeterBar({ ratio }: { ratio: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const lite = useLite();
  const r = Math.min(1, Math.max(0, ratio));
  return (
    <span ref={ref} className="wl-meter" aria-hidden="true">
      <motion.i
        initial={{ scaleX: lite ? r : 0 }}
        animate={{ scaleX: inView || lite ? r : 0 }}
        transition={{ duration: lite ? 0.2 : 0.9, ease: WL_EASE as never, delay: 0.15 }}
      />
    </span>
  );
}

/** GradientRing که تا وارد دید نشده خالیه و بعدش پر می‌شه (انیمیشن پر شدن دیده بشه). */
export function LazyRing({
  value, size, stroke, grad, delay = 0, children, className,
}: { value: number; size: number; stroke: number; grad?: [string, string]; delay?: number; children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  return (
    <span ref={ref} className={`wl-ring${className ? ` ${className}` : ""}`} style={{ width: size, height: size }}>
      <GradientRing value={inView ? value : 0} size={size} stroke={stroke} grad={grad} delay={delay}>
        {children}
      </GradientRing>
    </span>
  );
}

/** سرفصل یک فصل: آیکون در حلقه + شماره‌ی کوچک، «فصل 03»، عنوان بزرگ و خط گرادیانی که با دیده‌شدن کشیده می‌شه. id هدف لنگر فهرست چسبانه. */
export function Chapter({ id, no, title, icon: Icon, children }: { id: string; no: number; title: string; icon?: LucideIcon; children: ReactNode }) {
  const lite = useLite();
  return (
    <section id={id} className="wl-ch">
      <Reveal className="wl-ch-head">
        <span className="wl-ch-badge" aria-hidden="true">
          {Icon ? <Icon size={19} /> : <b>{String(no).padStart(2, "0")}</b>}
        </span>
        <span className="wl-ch-txt">
          <span className="wl-ch-k" aria-hidden="true">فصل {String(no).padStart(2, "0")}</span>
          <h2 className="wl-ch-title">{title}</h2>
        </span>
        <motion.span
          className="wl-ch-line"
          aria-hidden="true"
          initial={{ scaleX: lite ? 1 : 0, opacity: lite ? 0 : 1 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: lite ? 0.25 : 1.1, ease: WL_EASE as never, delay: lite ? 0 : 0.25 }}
        />
      </Reveal>
      {children}
    </section>
  );
}

/** مهر درجه: حلقه‌ی دوخطی با متن دور دایره و حرف درجه؛ یک بار با ضربه (بزرگ‌تر + چرخش) می‌نشینه. */
export function GradeStamp({ grade, size = 84, delay = 1, className }: { grade: Grade; size?: number; delay?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const lite = useLite();
  return (
    <motion.span
      className={`wl-stamp${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`درجه ${grade}`}
      initial={lite ? { opacity: 0, rotate: -12 } : { opacity: 0, scale: 1.6, rotate: -36 }}
      animate={{ opacity: 1, scale: 1, rotate: -12 }}
      transition={lite ? { duration: 0.3, delay } : { delay, type: "spring", stiffness: 240, damping: 13, mass: 0.9 }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <path id={`sp${uid}`} d="M50 50 m-36.5 0 a36.5 36.5 0 1 1 73 0 a36.5 36.5 0 1 1 -73 0" />
        </defs>
        <circle className="wl-stamp-face" cx="50" cy="50" r="47" />
        <circle className="wl-stamp-hair" cx="50" cy="50" r="42" />
        <text className="wl-stamp-ring">
          <textPath href={`#sp${uid}`} textLength="228" lengthAdjust="spacing">ARION • WEEKLY • ARION • WEEKLY •</textPath>
        </text>
        <circle className="wl-stamp-hair" cx="50" cy="50" r="29" />
        <text className="wl-stamp-g" x="50" y="51" textAnchor="middle" dominantBaseline="central">{grade}</text>
      </svg>
    </motion.span>
  );
}

// ---- گیت صفحه (هم‌قاعده‌ی /analysis/weekly) ----
export function WeeklyLetterGate({ children, skeleton }: { children: ReactNode; skeleton: ReactNode }) {
  const { status } = useSession();
  if (status === "authenticated") {
    return (
      <FeatureGate feature="weeklyAnalysis">
        <ModuleGate module="AI_INSIGHT">{children}</ModuleGate>
      </FeatureGate>
    );
  }
  if (status === "loading") return <>{skeleton}</>;
  return (
    <section className="wl-root wl-page">
      <AuthGate message="برای دیدن هفته‌نامه وارد شوید" />
    </section>
  );
}
