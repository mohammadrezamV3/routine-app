"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { CalendarCheck, Flame, Medal, Trophy, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import type { RingGrad } from "./GradientRing";
import { CountText, Num, V_WK_CARD, domainGrad, jalaliShort, scoreGrad } from "./WeeklyAnalysisKit";

type Spot = {
  key: string;
  icon: LucideIcon;
  label: string;
  grad: RingGrad;
  // یا عدد قابل‌شمارش (value)، یا متن آماده (text — با CountText شمرده می‌شه اگه الگوش بخوره)
  value?: number;
  signed?: boolean;
  text?: string;
  unit?: string;
  sub: string;
  sub2?: string;
  tone?: "good" | "bad"; // رنگ آیکون (عدد همیشه رنگ دامنه می‌مونه)
};

const V_STRIP: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

// رکورد هفته: اولین چیز قابل‌افتخار که از «اعداد هفته» پیدا بشه — روزهای کامل
// روتین، بعد میانگین خواب، بعد جلسه‌های تمرین؛ وگرنه روزهای فعال.
function pickRecord(a: WeeklyAnalysis): Spot | null {
  const byKey = (k: string) => a.numbers.find((n) => n.key === k);
  const perfect = byKey("routine_perfect");
  if (perfect && Number(perfect.value) > 0) {
    return {
      key: "record", icon: Medal, label: "روزهای کامل روتین", grad: domainGrad("routine"),
      text: perfect.value, unit: perfect.unit ?? "روز", sub: perfect.hint ?? "همه‌ی برنامه‌ها انجام شد",
    };
  }
  const sleep = byKey("sleep_avg");
  if (sleep) {
    return {
      key: "record", icon: Medal, label: "میانگین خواب", grad: domainGrad("sleep"),
      text: sleep.value, unit: sleep.unit ?? "ساعت", sub: sleep.hint ?? "در شب‌های ثبت‌شده",
    };
  }
  const fit = byKey("fitness_sessions");
  if (fit) {
    return {
      key: "record", icon: Medal, label: "جلسه‌های تمرین", grad: domainGrad("fitness"),
      text: fit.value, unit: fit.unit, sub: fit.hint ?? "طبق برنامه‌ی این هفته",
    };
  }
  const days = a.isCurrentWeek ? a.daysElapsed : 7;
  if (a.overall.activeDays > 0) {
    return {
      key: "record", icon: CalendarCheck, label: "روزهای فعال", grad: ["var(--ring-1a)", "var(--ring-1b)"],
      text: `${a.overall.activeDays}/${days}`, sub: "روزهایی که چیزی ثبت کردی",
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
      key: "best", icon: Trophy, label: "بهترین روز هفته", grad: scoreGrad(best.score),
      value: Math.round(best.score),
      sub: `${best.weekday}${best.date ? ` · ${jalaliShort(best.date)}` : ""}`,
      sub2: top ? `بهترین بخش: ${ANALYSIS_DOMAIN_LABELS[top.domain]} ${Math.round(top.v)}` : undefined,
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
      grad: up ? domainGrad(m.domain) : ["var(--pnl-loss)", "var(--ring-over)"], value: Math.round(m.delta as number), signed: true, tone: up ? "good" : "bad",
      sub: ANALYSIS_DOMAIN_LABELS[m.domain],
      sub2: m.prevScore !== null && m.score !== null ? `از ${Math.round(m.prevScore)} به ${Math.round(m.score)}` : undefined,
    });
  } else {
    const strong = a.domains.filter((d) => d.hasData && d.score !== null);
    if (strong.length) {
      const m = strong.reduce((x, y) => ((y.score as number) > (x.score as number) ? y : x));
      out.push({
        key: "mover", icon: Flame, label: "قوی‌ترین بخش", grad: domainGrad(m.domain), value: Math.round(m.score as number),
        sub: ANALYSIS_DOMAIN_LABELS[m.domain], sub2: `${m.daysWithData} روز داده`,
      });
    }
  }

  // ۳) رکورد
  const rec = pickRecord(a);
  if (rec) out.push(rec);
  return out;
}

// «هایلایت‌های هفته»: سه کاشی بزرگ، همه از همون داده‌ی صفحه (بدون API تازه).
// روی دسکتاپ سه ستون، روی موبایل نوار افقی با snap (data-noswipe تا کشیدنش
// هفته رو عوض نکنه).
export function WeeklyAnalysisHighlights({ analysis }: { analysis: WeeklyAnalysis }) {
  const spots = useMemo(() => buildSpots(analysis), [analysis]);
  if (spots.length === 0) return null;
  return (
    <motion.div className="wk-spot-strip" variants={V_STRIP} data-noswipe role="list" aria-label="هایلایت‌های هفته">
      {spots.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.article
            key={s.key}
            role="listitem"
            variants={V_WK_CARD}
            className="wk-card wk-spot"
            style={{ ["--wk-dc" as string]: s.grad[0], ["--wk-dc2" as string]: s.grad[1] }}
          >
            <span className="wk-spot-shine" aria-hidden="true" />
            <div className="wk-spot-top">
              <span className="wk-spot-ic" aria-hidden="true" style={s.tone ? { ["--wk-ic" as string]: s.tone === "good" ? "var(--pnl-win)" : "var(--pnl-loss)" } : undefined}><Icon size={17} /></span>
              <span className="wk-spot-label">{s.label}</span>
            </div>
            <div className="wk-spot-value">
              {s.value !== undefined ? (
                <Num value={s.value} signed={s.signed} duration={1.1} delay={0.5 + i * 0.1} />
              ) : (
                <CountText text={s.text ?? "—"} />
              )}
              {s.unit && <small>{s.unit}</small>}
            </div>
            <div className="wk-spot-sub">
              <b>{s.sub}</b>
              {s.sub2 && <span>{s.sub2}</span>}
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}
