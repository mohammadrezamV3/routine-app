"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Sparkles, TrendingDown, TrendingUp, Waves } from "lucide-react";
import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { GradientRing } from "./GradientRing";
import { CONFIDENCE_LABELS, DeltaChip, Num, V_WK_CARD, scoreGrad, toneColor, useMounted, WK_EASE } from "./WeeklyAnalysisKit";

const RING = 184;
const STROKE = 15;
const RING_COMPACT = 112; // پیش‌نمایش لندینگ
const STROKE_COMPACT = 10;

// جمله‌ی پیش‌فرض وقتی موتور هنوز تیتر قطعی نداده
function fallbackHeadline(a: WeeklyAnalysis): string {
  const s = a.overall.score;
  if (s === null) return "برای این هفته هنوز داده‌ای ثبت نشده";
  return `امتیاز کل این هفته ${Math.round(s)} از 100 شد`;
}

function MiniStat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="wk-mini-stat">
      <div className="wk-mini-label">{icon}{label}</div>
      <div className="wk-mini-value">{children}</div>
    </div>
  );
}

// نوار پیش‌بینی: بازه‌ی low تا high روی خط 0 تا 100 با نشانگر امتیاز پیش‌بینی
// و نشانگر امتیاز فعلی. محور عددی همیشه چپ‌به‌راست (0 چپ).
function PredictionBand({ projected, low, high, now }: { projected: number; low: number; high: number; now: number | null }) {
  const ready = useMounted();
  const pos = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  return (
    <div className="wk-band" dir="ltr" aria-hidden="true">
      <div className="wk-band-track">
        <span
          className={`wk-band-range${ready ? " on" : ""}`}
          style={{ left: pos(low), width: `${Math.max(2, Math.min(100, high) - Math.max(0, low))}%` }}
        />
        {now !== null && <span className="wk-band-now" style={{ left: pos(now) }} />}
        <span className={`wk-band-pin${ready ? " on" : ""}`} style={{ left: pos(projected) }} />
      </div>
      <div className="wk-band-scale"><span>0</span><span>50</span><span>100</span></div>
    </div>
  );
}

// کارت اصلی بالای صفحه: امتیاز کل هفته + تیپ هفته + تیتر قطعی + سه آمار
// کوچک + پیش‌بینی پایان هفته. حلقه همیشه سرجاشه و امتیاز تازه رو از مقدار
// قبلی می‌کشه (نه از صفر).
export function WeeklyAnalysisHero({ analysis, compact = false }: { analysis: WeeklyAnalysis; compact?: boolean }) {
  const o = analysis.overall;
  const arche = analysis.archetype;
  const daysBase = analysis.isCurrentWeek ? analysis.daysElapsed : 7;
  const pct = o.score === null ? 0 : Math.min(100, Math.max(0, o.score)) / 100;
  const pred = analysis.isCurrentWeek ? analysis.prediction : null;
  const headline = analysis.headline || fallbackHeadline(analysis);
  const grad = scoreGrad(o.score);
  const ring = compact ? RING_COMPACT : RING;
  const stroke = compact ? STROKE_COMPACT : STROKE;

  return (
    <motion.section className={`wk-card wk-hero${compact ? " is-compact" : ""}`} variants={V_WK_CARD} aria-label="خلاصه‌ی هفته">
      <div className="wk-hero-main">
        <div className="wk-hero-ring" style={{ width: ring, height: ring }}>
          <GradientRing value={pct} size={ring} stroke={stroke} grad={grad} delay={0.15}>
            <div className="wk-hero-center">
              <span className="wk-hero-score"><Num value={o.score === null ? null : Math.round(o.score)} duration={1.1} empty="—" /></span>
              <span className="wk-hero-of">{o.score === null ? "بدون داده" : "از 100"}</span>
            </div>
          </GradientRing>
        </div>

        <div className="wk-hero-body">
          <div className="wk-hero-eyebrow">
            <span>امتیاز کل هفته</span>
            {o.grade && (
              <motion.span
                key={o.grade}
                className="wk-grade"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.5, ease: WK_EASE }}
                aria-label={`نمره ${o.grade}`}
              >
                {o.grade}
              </motion.span>
            )}
            {arche && (
              <span className="wk-chip" style={{ color: toneColor(arche.tone), borderColor: arche.tone === "neutral" ? undefined : toneColor(arche.tone) }}>
                {arche.title}
              </span>
            )}
          </div>
          <h2 className="wk-hero-headline">{headline}</h2>
          {arche?.description && <p className="wk-hero-desc">{arche.description}</p>}

          <div className="wk-hero-delta">
            <DeltaChip delta={o.delta} size="lg" />
            <span className="wk-muted">
              {o.prevScore === null ? (analysis.isCurrentWeek && analysis.daysElapsed < 3 ? "مقایسه با هفته‌ی قبل از روز سوم" : "هفته‌ی قبل داده نداشت") : <>نسبت به هفته‌ی قبل (<span className="wk-num">{Math.round(o.prevScore)}</span>)</>}
            </span>
          </div>
        </div>
      </div>

      <div className="wk-mini-grid">
        <MiniStat icon={<CalendarCheck size={13} />} label="روزهای فعال">
          <span className="wk-num">{o.activeDays}/{daysBase}</span>
        </MiniStat>
        <MiniStat icon={<Waves size={13} />} label="ثبات">
          {o.consistency === null ? "—" : <><Num value={Math.round(o.consistency)} />%</>}
          <small className="wk-muted-sm"> · اطمینان {CONFIDENCE_LABELS[o.confidence]}</small>
        </MiniStat>
        <MiniStat icon={<TrendingUp size={13} style={{ color: "var(--pnl-win)" }} />} label="بهترین روز">
          {o.bestDay && o.bestDay.score !== null ? (
            <>{o.bestDay.weekday} <span className="wk-num wk-good">{Math.round(o.bestDay.score)}</span></>
          ) : "—"}
        </MiniStat>
        <MiniStat icon={<TrendingDown size={13} style={{ color: "var(--pnl-loss)" }} />} label="ضعیف‌ترین روز">
          {o.worstDay && o.worstDay.score !== null ? (
            <>{o.worstDay.weekday} <span className="wk-num wk-bad">{Math.round(o.worstDay.score)}</span></>
          ) : "—"}
        </MiniStat>
      </div>

      {pred && (
        <div className="wk-prediction">
          <div className="wk-prediction-text">
            <span className="wk-prediction-title"><Sparkles size={14} />پیش‌بینی پایان هفته</span>
            <span className="wk-prediction-main">
              حدود <b className="wk-num">{Math.round(pred.projectedScore)}</b>
              <span className="wk-muted"> (بین <span className="wk-num">{Math.round(pred.low)}</span> تا <span className="wk-num">{Math.round(pred.high)}</span>)</span>
            </span>
            {pred.message && <span className="wk-muted-sm">{pred.message}</span>}
          </div>
          <PredictionBand projected={pred.projectedScore} low={pred.low} high={pred.high} now={o.score} />
        </div>
      )}
    </motion.section>
  );
}
