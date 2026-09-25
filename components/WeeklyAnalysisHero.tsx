"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Gauge, Sparkles, TrendingDown, TrendingUp, Waves } from "lucide-react";
import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { DashCard } from "./DashCard";
import { CONFIDENCE_LABELS, DeltaBadge, useCountUp } from "./WeeklyAnalysisShared";

const RING = 148;
const STROKE = 11;

// حلقه‌ی بزرگِ امتیازِ کل — همون الگوی DashProgressCircle (مسیرِ کم‌رنگ +
// پرشدنِ نرم از صفر)، فقط بزرگ‌تر و با حرفِ رتبه وسطش.
function ScoreRing({ score, grade }: { score: number | null; grade: string | null }) {
  const reduce = useReducedMotion();
  const shown = useCountUp(score);
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.min(100, Math.max(0, score)) / 100;
  const center = RING / 2;
  return (
    <div className="wa-hero-ring" style={{ width: RING, height: RING }}>
      <svg viewBox={`0 0 ${RING} ${RING}`} width={RING} height={RING} className="-rotate-90 overflow-visible" aria-hidden="true">
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(var(--accent-rgb),.16)" strokeWidth={STROKE} />
        <motion.circle
          cx={center} cy={center} r={r} fill="none"
          stroke="var(--accent)" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct) : c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: reduce ? 0 : 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="wa-hero-ring-center">
        {grade ? (
          <motion.span
            className="wa-hero-grade"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: "backOut" }}
          >
            {grade}
          </motion.span>
        ) : (
          <span className="wa-hero-grade muted">—</span>
        )}
        <span className="wa-hero-score mono">
          {shown === null ? "بدون داده" : <>{shown}<small>/100</small></>}
        </span>
      </div>
    </div>
  );
}

function StatTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="wa-stat-tile">
      <div className="wa-stat-label">{icon}{label}</div>
      <div className="wa-stat-value">{children}</div>
    </div>
  );
}

// کارتِ اصلیِ بالای صفحه: امتیازِ کلِ هفته + خلاصه‌ی عددی + پیش‌بینیِ پایانِ هفته
export function WeeklyAnalysisHero({ analysis }: { analysis: WeeklyAnalysis }) {
  const o = analysis.overall;
  const daysBase = analysis.isCurrentWeek ? analysis.daysElapsed : 7;
  const confDots = o.confidence === "high" ? 3 : o.confidence === "medium" ? 2 : 1;

  return (
    <DashCard className="wa-hero">
      <div className="wa-hero-top">
        <ScoreRing score={o.score} grade={o.grade} />

        <div className="wa-hero-side">
          <div className="wa-hero-eyebrow">امتیاز کل هفته</div>
          <div className="wa-hero-delta-row">
            <DeltaBadge delta={o.delta} className="lg" />
            <span className="wa-hero-delta-caption">
              {o.prevScore === null ? "هفته‌ی قبل داده نداشت" : <>نسبت به هفته‌ی قبل (<span className="mono">{Math.round(o.prevScore)}</span>)</>}
            </span>
          </div>

          <div className="wa-stat-grid">
            <StatTile icon={<Gauge size={13} />} label="اطمینان">
              <span className="wa-conf-dots" aria-hidden="true">
                {[1, 2, 3].map((i) => <i key={i} className={i <= confDots ? "on" : ""} />)}
              </span>
              {CONFIDENCE_LABELS[o.confidence]}
            </StatTile>
            <StatTile icon={<Waves size={13} />} label="ثبات">
              {o.consistency === null ? "—" : <span className="mono">{Math.round(o.consistency)}%</span>}
            </StatTile>
            <StatTile icon={<CalendarCheck size={13} />} label="روزهای فعال">
              <span className="mono">{o.activeDays}/{daysBase}</span>
            </StatTile>
            <StatTile icon={<TrendingUp size={13} style={{ color: "var(--pnl-win)" }} />} label="بهترین روز">
              {o.bestDay && o.bestDay.score !== null ? (
                <>{o.bestDay.weekday} <span className="mono wa-good">{Math.round(o.bestDay.score)}</span></>
              ) : "—"}
            </StatTile>
            <StatTile icon={<TrendingDown size={13} style={{ color: "var(--pnl-loss)" }} />} label="ضعیف‌ترین روز">
              {o.worstDay && o.worstDay.score !== null ? (
                <>{o.worstDay.weekday} <span className="mono wa-bad">{Math.round(o.worstDay.score)}</span></>
              ) : "—"}
            </StatTile>
          </div>
        </div>
      </div>

      {analysis.isCurrentWeek && analysis.prediction && (
        <motion.div
          className="wa-prediction"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Sparkles size={15} className="shrink-0" />
          <div className="min-w-0">
            <div>
              با این روند، پایان هفته حدود <b className="mono">{Math.round(analysis.prediction.projectedScore)}</b>
              <span className="wa-prediction-range"> (بین <span className="mono">{Math.round(analysis.prediction.low)}</span> تا <span className="mono">{Math.round(analysis.prediction.high)}</span>)</span>
            </div>
            {analysis.prediction.message && <div className="wa-prediction-msg">{analysis.prediction.message}</div>}
          </div>
        </motion.div>
      )}
    </DashCard>
  );
}
