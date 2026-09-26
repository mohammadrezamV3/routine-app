"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import {
  Apple, CandlestickChart, CheckCheck, Dumbbell, GraduationCap, Moon, Repeat, type LucideIcon,
} from "lucide-react";
import type { AnalysisDomain, Insight } from "@/lib/weeklyAnalysis/types";
import { J_MONTHS, toJalali } from "@/lib/jalali";

// کمک‌ابزارهای مشترکِ همه‌ی کامپوننت‌های «آنالیز هفتگی» — یک جا تا آیکون/
// رنگ/لینکِ هر دامنه بینِ کارت‌ها، نقشه‌ی حرارتی، نمودار و تصویرِ اشتراک
// هیچ‌وقت از هم واگرا نشن.

// دقیقا همون کلاس‌های DashCard (رادیوس/بوردر/سطحِ کارت‌های داشبورد) — برای
// جاهایی که کارت خودش باید motion.div با layout یا کلیک‌پذیر باشه و خودِ
// DashCard این propها رو نمی‌گیره. سطحِ جدیدی ساخته نمی‌شه.
export const WA_CARD_CLASS = "rounded-dash border border-dash-border bg-dash-card p-3.5 backdrop-blur-xl sm:p-5";

export const DOMAIN_ICONS: Record<AnalysisDomain, LucideIcon> = {
  routine: Repeat,
  sleep: Moon,
  tasks: CheckCheck,
  fitness: Dumbbell,
  nutrition: Apple,
  trading: CandlestickChart,
  learning: GraduationCap,
};

// مقصدِ «برو ثبت کن» برای هر دامنه — همون روت‌های واقعیِ NavDrawer
export const DOMAIN_HREFS: Record<AnalysisDomain, string> = {
  routine: "/weekly",
  sleep: "/weekly",
  tasks: "/weekly",
  fitness: "/exercise",
  nutrition: "/exercise?tab=calorie",
  trading: "/trade",
  learning: "/roadmaps",
};

// خوب/بد با همون قراردادِ جهانیِ سود/زیان (بیرونِ پالتِ تم) — توی تمِ روشن
// هم سبز و قرمز می‌مونن و معنی‌شون رو از دست نمی‌دن.
export function toneColor(tone: Insight["tone"] | undefined): string {
  if (tone === "good") return "var(--pnl-win)";
  if (tone === "bad") return "var(--pnl-loss)";
  return "var(--muted)";
}

// شدتِ رنگِ یک امتیاز (۰..۱۰۰) — مقیاسِ شفافیتِ accent، از کم‌رنگ تا پر.
export function scoreAlpha(score: number): number {
  const s = Math.min(100, Math.max(0, score));
  return 0.14 + (s / 100) * 0.86;
}

export function scoreFill(score: number): string {
  return `rgba(var(--accent-rgb),${scoreAlpha(score).toFixed(2)})`;
}

// «۲ مهر» با ارقام لاتین (قراردادِ اپ) از روی کلیدِ YYYY-MM-DD
export function jalaliShort(iso: string): string {
  const [gy, gm, gd] = iso.slice(0, 10).split("-").map(Number);
  if (!gy || !gm || !gd) return iso;
  const [, jm, jd] = toJalali(gy, gm, gd);
  return `${jd} ${J_MONTHS[jm - 1]}`;
}

// حرفِ اولِ نامِ روز («سه‌شنبه» → «س») — برای ستون‌های باریکِ نمودارها
export function weekdayLetter(weekday: string): string {
  return weekday.trim().charAt(0);
}

export const CONFIDENCE_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "کم",
  medium: "متوسط",
  high: "بالا",
};

// نمایشِ تغییر نسبت به هفته‌ی قبل: ▲ سبز / ▼ قرمز / بدون تغییر خاکستری.
// null یعنی «هفته‌ی قبل داده نداشت» — نه صفر، پس اصلا عددی نشون نمی‌دیم.
export function DeltaBadge({ delta, className, suffix }: { delta: number | null; className?: string; suffix?: string }) {
  if (delta === null) return <span className={`wa-delta neutral ${className ?? ""}`}>—</span>;
  const d = Math.round(delta);
  const cls = d > 0 ? "up" : d < 0 ? "down" : "neutral";
  const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "•";
  return (
    <span className={`wa-delta ${cls} ${className ?? ""}`} dir="ltr">
      <span aria-hidden="true">{arrow}</span>
      <span className="mono">{d > 0 ? `+${d}` : d}</span>
      {suffix && <span className="wa-delta-suffix">{suffix}</span>}
    </span>
  );
}

// عددی که از صفر تا مقدار نهایی می‌شمره — با حرکتِ کاهش‌یافته‌ی سیستم،
// بلافاصله مقدار نهایی.
export function useCountUp(target: number | null, duration = 1.1): number | null {
  const reduce = useReducedMotion();
  const [value, setValue] = useState<number | null>(target === null ? null : reduce ? target : 0);
  useEffect(() => {
    if (target === null) { setValue(null); return; }
    if (reduce) { setValue(target); return; }
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration, reduce]);
  return value;
}

// درخواستِ JSON با خطای یکدست — API همیشه { error } برمی‌گردونه
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
