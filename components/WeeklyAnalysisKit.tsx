"use client";

import "./weekly-analysis.css";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion, type Variants } from "framer-motion";
import {
  Apple, ArrowDownRight, ArrowUpRight, CandlestickChart, CheckCheck, Dumbbell, GraduationCap, Minus, Moon, Repeat,
  type LucideIcon,
} from "lucide-react";
import type { RingGrad } from "./GradientRing";
import type { AnalysisDomain, DayDetails, Insight, WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { J_MONTHS, toJalali } from "@/lib/jalali";

// کمک‌ابزارهای مشترک همه‌ی کامپوننت‌های «آنالیز هفتگی» — یک جا تا آیکون/
// رنگ/لینک هر دامنه، قالب اعداد و منحنی حرکت بین کارت‌ها هیچ‌وقت از هم
// واگرا نشن. استایل همه‌چیز در components/weekly-analysis.css (پیشوند wk-).

export const WK_EASE = [0.22, 1, 0.36, 1] as const;

// ورود پله‌ای کارت‌ها — همون الگوی داشبورد (V_GRID/V_CARD) ولی کوتاه‌تر
export const V_WK_GRID: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
export const V_WK_CARD: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: WK_EASE } },
};

export const DOMAIN_ICONS: Record<AnalysisDomain, LucideIcon> = {
  routine: Repeat,
  sleep: Moon,
  tasks: CheckCheck,
  fitness: Dumbbell,
  nutrition: Apple,
  trading: CandlestickChart,
  learning: GraduationCap,
};

// مقصد «برو ثبت کن» برای هر دامنه — همون روت‌های واقعی NavDrawer
export const DOMAIN_HREFS: Record<AnalysisDomain, string> = {
  routine: "/weekly",
  sleep: "/sleep",
  tasks: "/weekly",
  fitness: "/exercise",
  nutrition: "/exercise?tab=calorie",
  trading: "/trade",
  learning: "/roadmaps",
};

// گرادیان هر دامنه (توکن‌های --wk-d-* در weekly-analysis.css، روشن و تیره)
export function domainGrad(d: AnalysisDomain): RingGrad {
  return [`var(--wk-d-${d}-a)`, `var(--wk-d-${d}-b)`];
}
export const domainColor = (d: AnalysisDomain) => `var(--wk-d-${d}-a)`;

// حلقه‌ی امتیاز کل: بالای 60 سبز، 40 تا 60 کهربایی، پایین‌تر مرجانی/صورتی
export function scoreGrad(score: number | null): RingGrad {
  if (score === null || score >= 60) return ["var(--ring-1a)", "var(--ring-1b)"];
  if (score >= 40) return ["var(--ring-3a)", "var(--ring-3b)"];
  return ["var(--ring-over)", "var(--ring-3b)"];
}

// خوب/بد با همون قرارداد جهانی سود/زیان (بیرون پالت تم)
export function toneColor(tone: Insight["tone"] | undefined): string {
  if (tone === "good") return "var(--pnl-win)";
  if (tone === "bad") return "var(--pnl-loss)";
  return "var(--muted)";
}

// «2 مهر» با ارقام لاتین (قرارداد اپ) از روی کلید YYYY-MM-DD
export function jalaliShort(iso: string): string {
  const [gy, gm, gd] = iso.slice(0, 10).split("-").map(Number);
  if (!gy || !gm || !gd) return iso;
  const [, jm, jd] = toJalali(gy, gm, gd);
  return `${jd} ${J_MONTHS[jm - 1]}`;
}

// حرف اول نام روز («سه‌شنبه» → «س») — برای ستون‌های باریک نمودارها
export function weekdayLetter(weekday: string): string {
  return weekday.trim().charAt(0);
}

export function relativeWeekLabel(offset: number): string {
  if (offset === 0) return "هفته‌ی جاری";
  if (offset === -1) return "هفته‌ی قبل";
  return `${Math.abs(offset)} هفته پیش`;
}

export const CONFIDENCE_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "کم",
  medium: "متوسط",
  high: "بالا",
};

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

// ---- نرمال‌سازی ----
// فیلدهای تازه‌ی قرارداد (headline/archetype/prevDays/numbers/unreadLetter/
// DayCell.details) ممکنه هنوز از پاسخ قدیمی نیومده باشن؛ همه‌ی UI از این
// خروجی می‌خونه تا هیچ‌جا undefined نخوره.
export function normalizeAnalysis(a: WeeklyAnalysis): WeeklyAnalysis {
  const blank7: (number | null)[] = [null, null, null, null, null, null, null];
  return {
    ...a,
    headline: a.headline ?? "",
    archetype: a.archetype ?? null,
    prevDays: Array.isArray(a.prevDays) && a.prevDays.length === 7 ? a.prevDays : blank7,
    numbers: Array.isArray(a.numbers) ? a.numbers : [],
    unreadLetter: a.unreadLetter ?? null,
    days: a.days.map((d) => ({ ...d, details: (d.details ?? {}) as DayDetails })),
    insights: a.insights ?? [],
    achievements: a.achievements ?? [],
    goals: a.goals ?? [],
    nextWeekGoals: a.nextWeekGoals ?? [],
  };
}

// ---- هوک‌ها ----
const isLowPerf = () => typeof document !== "undefined" && document.documentElement.getAttribute("data-perf") === "low";

/** true بعد از اولین فریم — برای شروع transition های CSS ورود (ستون‌ها، سلول‌ها) */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setM(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

/** حرکت کاهش‌یافته‌ی سیستم یا دستگاه ضعیف → بدون انیمیشن عددی */
export function useCalmMotion(): boolean {
  const reduce = useReducedMotion();
  const [low, setLow] = useState(false);
  useEffect(() => setLow(isLowPerf()), []);
  return !!reduce || low;
}

// ---- عدد شمارنده ----
// از مقدار قبلی خودش به مقدار تازه می‌شمره (نه از صفر)، پس عوض‌کردن هفته
// عدد رو نرم تغییر می‌ده. مقدار مستقیم روی textContent نوشته می‌شه (صفر رندر
// React حین انیمیشن). اولین بار تا وقتی کارت دیده نشده صفر می‌مونه.
export function Num({
  value, decimals = 0, className, duration = 0.9, empty = "—", suffix = "", signed = false,
}: {
  value: number | null;
  decimals?: number;
  className?: string;
  duration?: number;
  empty?: string;
  suffix?: string;
  signed?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const cur = useRef(0);
  const started = useRef(false);
  const calm = useCalmMotion();
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const fmt = (v: number) => {
    const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const sign = v < 0 ? "−" : signed && v > 0 ? "+" : "";
    return `${sign}${s}${suffix}`;
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === null) { el.textContent = empty; cur.current = 0; return; }
    if (calm) { el.textContent = fmt(value); cur.current = value; started.current = true; return; }
    if (!started.current && !inView) { el.textContent = fmt(0); return; }
    started.current = true;
    const ctrl = animate(cur.current, value, {
      duration,
      ease: [...WK_EASE],
      onUpdate: (v) => { cur.current = v; el.textContent = fmt(v); },
      onComplete: () => { cur.current = value; el.textContent = fmt(value); },
    });
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, calm, decimals]);
  // متن اولیه (SSR) = مقدار نهایی؛ بدون جاوااسکریپت هم عدد درست دیده می‌شه
  return <span ref={ref} className={`wk-num${className ? ` ${className}` : ""}`}>{value === null ? empty : fmt(value)}</span>;
}

/** «34/40» یا «7.4» → قابل شمارش؛ هر چیز دیگه (مثلا «+45$») ثابت می‌مونه */
export function CountText({ text, className }: { text: string; className?: string }) {
  const m = /^(\d+(?:\.\d+)?)(\/\d+)?$/.exec(text.trim());
  if (!m) return <span dir="ltr" className={`wk-num wk-iso ${className ?? ""}`}>{text}</span>;
  const dec = m[1].includes(".") ? m[1].split(".")[1].length : 0;
  return (
    <span dir="ltr" className={`wk-num wk-iso ${className ?? ""}`}>
      <Num value={Number(m[1])} decimals={dec} />{m[2] ?? ""}
    </span>
  );
}

// ---- نشان تغییر نسبت به هفته‌ی قبل ----
// null یعنی «هفته‌ی قبل داده نداشت» — نه صفر، پس عددی نشون نمی‌دیم.
export function DeltaChip({ delta, size = "md", suffix }: { delta: number | null; size?: "sm" | "md" | "lg"; suffix?: string }) {
  if (delta === null) return <span className={`wk-delta flat ${size}`} aria-label="بدون مقایسه">—</span>;
  const d = Math.round(delta);
  const cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`wk-delta ${cls} ${size}`} dir="ltr">
      <Icon size={size === "lg" ? 17 : size === "sm" ? 11 : 13} strokeWidth={2.6} aria-hidden="true" />
      <span className="wk-num">{d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "0"}</span>
      {suffix && <span className="wk-delta-suffix">{suffix}</span>}
    </span>
  );
}

// ---- ستون «مایع» ----
// کپسول با سطح مایع: پر شدن با translateY (فقط transform، روی کامپوزیتور)
// و بدون اعوجاج گوشه‌ها. pct: 0..100 یا null (خالی)
export function Liquid({
  pct, grad, delay = 0, ready = true, className,
}: { pct: number | null; grad?: [string, string]; delay?: number; ready?: boolean; className?: string }) {
  const p = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const style = {
    ["--lq" as string]: ready ? p : 0,
    ["--lq-d" as string]: `${delay}ms`,
    ...(grad ? { ["--lq-a" as string]: grad[0], ["--lq-b" as string]: grad[1] } : null),
  } as React.CSSProperties;
  return (
    <span className={`wk-liquid${className ? ` ${className}` : ""}${pct === null ? " is-empty" : ""}`} style={style}>
      <i className="wk-liquid-fill" />
    </span>
  );
}

// ---- درخواست JSON با خطای یکدست — API همیشه { error } برمی‌گردونه ----
export async function waFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init?.headers,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new Error("مشکلی در اتصال به سرور پیش اومد");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "خطایی پیش اومد");
  return data as T;
}

// ---- متن انسانی جزئیات هر روز (برگه‌ی روز) ----
const FITNESS_LABELS: Record<NonNullable<DayDetails["fitness"]>["status"], string> = {
  done: "طبق برنامه تمرین کردی",
  extra: "روز استراحت بود ولی تمرین کردی",
  rest: "روز استراحت برنامه",
  missed: "تمرین امروز انجام نشد",
  partial: "تمرین نیمه‌کاره موند",
};

export function formatDayDetail(domain: AnalysisDomain, d: DayDetails): string | null {
  switch (domain) {
    case "routine": {
      const r = d.routine;
      return r ? `${fmtInt(r.done)} از ${fmtInt(r.total)} برنامه انجام شد` : null;
    }
    case "sleep": {
      const s = d.sleep;
      if (!s) return null;
      const parts: string[] = [];
      if (s.hours !== null) parts.push(`${s.hours.toFixed(1)} ساعت`);
      if (s.sleptAt && s.wokeAt) parts.push(`${s.sleptAt} تا ${s.wokeAt}`);
      return parts.length ? parts.join(" · ") : "خواب ثبت شده";
    }
    case "fitness":
      return d.fitness ? FITNESS_LABELS[d.fitness.status] : null;
    case "nutrition": {
      const n = d.nutrition;
      if (!n) return null;
      const base = n.target ? `${fmtInt(n.kcal)} از ${fmtInt(n.target)} کیلوکالری` : `${fmtInt(n.kcal)} کیلوکالری`;
      return n.protein ? `${base} · ${fmtInt(n.protein)} گرم پروتئین` : base;
    }
    case "trading": {
      const t = d.trading;
      if (!t) return null;
      const out = [`${fmtInt(t.count)} معامله`];
      if (t.wins || t.losses) out.push(`${fmtInt(t.wins)} برد، ${fmtInt(t.losses)} باخت`);
      if (t.net !== null) out.push(`${t.net > 0 ? "+" : t.net < 0 ? "−" : ""}${fmtInt(Math.abs(t.net))}${t.currency ? ` ${t.currency}` : ""}`);
      return out.join(" · ");
    }
    case "tasks": {
      const t = d.tasks;
      return t ? `${fmtInt(t.done)} از ${fmtInt(t.due)} کار انجام شد` : null;
    }
    case "learning": {
      const l = d.learning;
      return l ? `${fmtInt(l.steps)} گام رودمپ` : null;
    }
  }
}

/** حلقه‌ی گرادیانی که فقط وقتی دیده شد ساخته (و کشیده) می‌شه — برای فهرست‌های طولانی پایین صفحه */
export function LazyRing({ size, children }: { size: number; children: (mounted: boolean) => React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "80px" });
  return (
    <span ref={ref} className="wk-lazy-ring" style={{ width: size, height: size }}>
      {children(seen)}
    </span>
  );
}
