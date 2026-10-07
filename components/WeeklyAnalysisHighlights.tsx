"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { CalendarCheck, Flame, Waves, Medal, Trophy, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { CONFIDENCE_LABELS, CountText, Num, WK_EASE, jalaliShort, useCalmMotion } from "./WeeklyAnalysisKit";
import "./wa-shell.css";

type Spot = {
  key: string;
  icon: LucideIcon;
  label: string;
  // یا عدد قابل‌شمارش (value)، یا متن آماده (text — با CountText شمرده می‌شه اگه الگوش بخوره)
  value?: number;
  signed?: boolean;
  text?: string;
  unit?: string;
  sub: string;
  sub2?: string;
  tone?: "good" | "bad"; // فقط رنگ آیکون کوچک (عدد همیشه خنثیه)
  spark?: (number | null)[]; // نقاط خط ریز کنار عدد (اگه داده باشه)
};

const V_STRIP: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const V_TILE: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: WK_EASE } },
};

// خط ریز: فقط نقطه‌های دارای داده، کشیده‌شدن با pathLength؛ بدون داده کافی (کمتر از 2) هیچ
function Spark({ points, delay }: { points: (number | null)[]; delay: number }) {
  const calm = useCalmMotion();
  const pts = points.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 3 || pts.every((p) => p.v === pts[0].v)) return null;
  const W = 100, H = 30, PAD = 3;
  const lo = Math.min(...pts.map((p) => p.v));
  const hi = Math.max(...pts.map((p) => p.v));
  const span = hi - lo || 1;
  const n = Math.max(1, points.length - 1);
  const xy = pts.map((p) => [(p.i / n) * W, H - PAD - ((p.v - lo) / span) * (H - PAD * 2)] as const);
  const d = xy.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  return (
    <svg className="wa-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={calm ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay, ease: WK_EASE }}
      />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// رکورد هفته: اولین چیز قابل‌افتخار که از «اعداد هفته» پیدا بشه — روزهای کامل
// روتین، بعد میانگین خواب، بعد جلسه‌های تمرین؛ وگرنه روزهای فعال.
function pickRecord(a: WeeklyAnalysis): Spot | null {
  const spark = a.days.map((d) => (d.isFuture ? null : d.score));
  const byKey = (k: string) => a.numbers.find((n) => n.key === k);
  const perfect = byKey("routine_perfect");
  if (perfect && Number(perfect.value) > 0) {
    return {
      key: "record", icon: Medal, label: "روزهای کامل روتین",
      text: perfect.value, unit: perfect.unit ?? "روز", sub: perfect.hint ?? "همه‌ی برنامه‌ها انجام شد", spark,
    };
  }
  const sleep = byKey("sleep_avg");
  if (sleep) {
    return {
      key: "record", icon: Medal, label: "میانگین خواب",
      text: sleep.value, unit: sleep.unit ?? "ساعت", sub: sleep.hint ?? "در شب‌های ثبت‌شده", spark,
    };
  }
  const fit = byKey("fitness_sessions");
  if (fit) {
    return {
      key: "record", icon: Medal, label: "جلسه‌های تمرین",
      text: fit.value, unit: fit.unit, sub: fit.hint ?? "طبق برنامه‌ی این هفته", spark,
    };
  }
  const days = a.isCurrentWeek ? a.daysElapsed : 7;
  if (a.overall.activeDays > 0) {
    return {
      key: "record", icon: CalendarCheck, label: "روزهای فعال",
      text: `${a.overall.activeDays}/${days}`, sub: "روزهایی که چیزی ثبت کردی", spark,
    };
  }
  return null;
}

function buildSpots(a: WeeklyAnalysis): Spot[] {
  const out: Spot[] = [];

  // ۱) بهترین روز
  const best = a.overall.bestDay;
  if (best && best.score !== null) {
    const idx = a.days.findIndex((d) => d.date === best.date);
    let top: { domain: AnalysisDomain; v: number } | null = null;
    if (idx >= 0) {
      for (const d of a.domains) {
        const v = d.daily[idx];
        if (v !== null && v !== undefined && (!top || v > top.v)) top = { domain: d.domain, v };
      }
    }
    out.push({
      key: "best", icon: Trophy, label: "بهترین روز هفته",
      value: Math.round(best.score), spark: a.days.map((d) => (d.isFuture ? null : d.score)),
      sub: `${best.weekday}${best.date ? ` · ${jalaliShort(best.date)}` : ""}`,
      sub2: top ? `بهترین بخش: ${ANALYSIS_DOMAIN_LABELS[top.domain]} ${Math.round(top.v)}` : undefined,
    });
  }

  // ۱.۵) ضعیف‌ترین روز (فقط وقتی با بهترین روز یکی نیست)
  const worst = a.overall.worstDay;
  if (worst && worst.score !== null && (!best || worst.date !== best.date)) {
    out.push({
      key: "worst", icon: TrendingDown, label: "ضعیف‌ترین روز هفته", value: Math.round(worst.score), tone: "bad",
      spark: a.days.map((d) => (d.isFuture ? null : d.score)),
      sub: `${worst.weekday}${worst.date ? ` · ${jalaliShort(worst.date)}` : ""}`,
    });
  }

  // ۲) بیشترین تغییر نسبت به هفته‌ی قبل (یا قوی‌ترین بخش اگه تغییری نبود)
  const movers = a.domains.filter((d) => d.hasData && d.delta !== null && Math.abs(Math.round(d.delta)) >= 1);
  if (movers.length) {
    // هایلایت جای جشنه: اول بزرگ‌ترین پیشرفت؛ افت فقط وقتی هیچ بخشی بهتر نشده
    const ups = movers.filter((d) => (d.delta as number) > 0);
    const pool = ups.length ? ups : movers;
    const m = pool.reduce((x, y) => (Math.abs(y.delta as number) > Math.abs(x.delta as number) ? y : x));
    const up = (m.delta as number) > 0;
    out.push({
      key: "mover", icon: up ? TrendingUp : TrendingDown,
      label: up ? "بیشترین پیشرفت" : "بیشترین افت",
      value: Math.round(m.delta as number), signed: true, tone: up ? "good" : "bad", spark: m.daily,
      sub: ANALYSIS_DOMAIN_LABELS[m.domain],
      sub2: m.prevScore !== null && m.score !== null ? `از ${Math.round(m.prevScore)} به ${Math.round(m.score)}` : undefined,
    });
  } else {
    const strong = a.domains.filter((d) => d.hasData && d.score !== null);
    if (strong.length) {
      const m = strong.reduce((x, y) => ((y.score as number) > (x.score as number) ? y : x));
      out.push({
        key: "mover", icon: Flame, label: "قوی‌ترین بخش", value: Math.round(m.score as number), spark: m.daily,
        sub: ANALYSIS_DOMAIN_LABELS[m.domain], sub2: `${m.daysWithData} روز داده`,
      });
    }
  }

  // ۲.۵) ثبات
  const cons = a.overall.consistency;
  if (cons !== null) {
    out.push({
      key: "consistency", icon: Waves, label: "ثبات هفته", value: Math.round(cons), unit: "%",
      sub: `اطمینان ${CONFIDENCE_LABELS[a.overall.confidence]}`,
    });
  }

  // ۳) رکورد
  const rec = pickRecord(a);
  if (rec) out.push(rec);
  return out;
}

// «ریبون آمار هفته»: ردیف باز (بدون قاب) از آمارهای کوچک، همه از همون داده‌ی
// صفحه. دسکتاپ یک ردیف تمام‌عرض با خط جداکننده، موبایل نوار افقی با snap
// (data-noswipe تا کشیدنش هفته رو عوض نکنه).
export function WeeklyAnalysisHighlights({ analysis }: { analysis: WeeklyAnalysis }) {
  const spots = useMemo(() => buildSpots(analysis), [analysis]);
  if (spots.length === 0) return null;
  return (
    <motion.div className="wa-ribbon" variants={V_STRIP} data-noswipe role="list" aria-label="هایلایت‌های هفته">
      {spots.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.article key={s.key} role="listitem" variants={V_TILE} className={`wa-stat${s.tone === "bad" ? " is-down" : ""}`}>
            <div className="wa-stat-top">
              <span className="wa-stat-ic" aria-hidden="true"><Icon size={15} /></span>
              <span className="wa-stat-label">{s.label}</span>
            </div>
            <div className="wa-stat-main">
              <div className="wa-stat-value">
                {s.value !== undefined ? (
                  <Num value={s.value} signed={s.signed} duration={1.1} delay={0.5 + i * 0.1} />
                ) : (
                  <CountText text={s.text ?? "—"} />
                )}
                {s.unit && <small>{s.unit}</small>}
              </div>
              {s.spark && <Spark points={s.spark} delay={0.6 + i * 0.1} />}
            </div>
            <div className="wa-stat-sub">
              <b>{s.sub}</b>
              {s.sub2 && <span>{s.sub2}</span>}
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}
