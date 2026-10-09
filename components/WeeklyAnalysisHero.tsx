"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { GradientRing, RING_GREEN } from "./GradientRing";
import {
  DeltaChip, Num, V_WK_CARD, gradeOfScore, useMounted, WK_EASE,
} from "./WeeklyAnalysisKit";
import "./wa-shell.css";

const RING_OPEN = 280;
const STROKE_OPEN = 18;
const RING_COMPACT = 112; // پیش‌نمایش لندینگ
const STROKE_COMPACT = 10;

// جمله‌ی پیش‌فرض وقتی موتور هنوز تیتر قطعی نداده
function fallbackHeadline(a: WeeklyAnalysis): string {
  const s = a.overall.score;
  if (s === null) return tr("برای این هفته هنوز داده‌ای ثبت نشده", "No data has been logged for this week yet");
  return tr(`امتیاز کل این هفته ${Math.round(s)} از 100 شد`, `This week's overall score is ${Math.round(s)} out of 100`);
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

// ---- مهر نمره ----
// دایره‌ی دوخطه‌ی خنثی، فقط حرف با رنگ accent، و یک بار برق عبوری (انیمیشن CSS یک‌باره)
function GradeSeal({ grade, compact }: { grade: string; compact: boolean }) {
  return (
    <motion.span
      key={grade}
      className={`wk-seal${compact ? " is-compact" : ""}`}
      initial={{ scale: 0.4, opacity: 0, rotate: -14 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.55, delay: compact ? 0.3 : 0.95, ease: WK_EASE }}
      aria-label={tr(`نمره ${grade}`, `Grade ${grade}`)}
    >
      <span className="wk-seal-letter">{grade}</span>
    </motion.span>
  );
}

function Prediction({ analysis, inline = false }: { analysis: WeeklyAnalysis; inline?: boolean }) {
  const pred = analysis.isCurrentWeek ? analysis.prediction : null;
  if (!pred) return null;
  if (inline) {
    return (
      <div className="wa-pred-inline">
        <span className="wa-pred-line">
          <Sparkles size={13} />
          <span>{tr("پیش‌بینی پایان هفته: حدود", "End-of-week forecast: about")} <b className="wk-num">{Math.round(pred.projectedScore)}</b></span>
          <span className="wk-muted-sm">(<span className="wk-num">{Math.round(pred.low)}</span> {tr("تا", "to")} <span className="wk-num">{Math.round(pred.high)}</span>)</span>
        </span>
        <PredictionBand projected={pred.projectedScore} low={pred.low} high={pred.high} now={analysis.overall.score} />
        {pred.message && <span className="wk-muted-sm">{pred.message}</span>}
      </div>
    );
  }
  return (
    <div className="wk-prediction wa-pred">
      <div className="wk-prediction-text">
        <span className="wk-prediction-title"><Sparkles size={14} />{tr("پیش‌بینی پایان هفته", "End-of-week forecast")}</span>
        <span className="wk-prediction-main">
          {tr("حدود", "About")} <b className="wk-num">{Math.round(pred.projectedScore)}</b>
          <span className="wk-muted"> ({tr("بین", "between")} <span className="wk-num">{Math.round(pred.low)}</span> {tr("تا", "and")} <span className="wk-num">{Math.round(pred.high)}</span>)</span>
        </span>
        {pred.message && <span className="wk-muted-sm">{pred.message}</span>}
      </div>
      <PredictionBand projected={pred.projectedScore} low={pred.low} high={pred.high} now={analysis.overall.score} />
    </div>
  );
}

// پیش‌بینی پایان هفته (فقط هفته‌ی جاری): برچسب + نوار بازه
function Forecast({ analysis }: { analysis: WeeklyAnalysis }) {
  const pred = analysis.isCurrentWeek ? analysis.prediction : null;
  if (!pred) return null;
  return (
    <div className="wa-forecast">
      <div className="wa-forecast-row">
        <span>{tr("پیش‌بینی پایان هفته", "End-of-week forecast")}</span>
        <b>{tr("حدود", "About")} <span className="wk-num">{Math.round(pred.projectedScore)}</span></b>
      </div>
      <PredictionBand projected={pred.projectedScore} low={pred.low} high={pred.high} now={analysis.overall.score} />
    </div>
  );
}

function deltaText(analysis: WeeklyAnalysis) {
  const o = analysis.overall;
  if (o.prevScore === null) return analysis.isCurrentWeek && analysis.daysElapsed < 3 ? tr("مقایسه با هفته‌ی قبل از روز سوم", "Comparison with last week starts on day three") : tr("هفته‌ی قبل داده نداشت", "No data last week");
  return <>{tr("نسبت به هفته‌ی قبل", "vs last week")} (<span className="wk-num">{Math.round(o.prevScore)}</span>)</>;
}

// پیش‌نمایش فشرده‌ی لندینگ (compact) همون کارت قبلیه؛ نسخه‌ی کامل بدون قاب
// و دو ناحیه‌ایه: حلقه‌ی بزرگ امتیاز در یک سمت، تیتر/تیپ/روزها در سمت دیگه.
export function WeeklyAnalysisHero({
  analysis, compact = false,
}: { analysis: WeeklyAnalysis; compact?: boolean; onPickDay?: (i: number) => void }) {
  const o = analysis.overall;
  const arche = analysis.archetype;
  const pct = o.score === null ? 0 : Math.min(100, Math.max(0, o.score)) / 100;
  const headline = analysis.headline || fallbackHeadline(analysis);
  const grade = o.grade ?? gradeOfScore(o.score) ?? undefined;

  if (compact) {
    return (
      <motion.section className="wk-card wk-hero is-compact" data-grade={grade} variants={V_WK_CARD} aria-label={tr("خلاصه‌ی هفته", "Week summary")}>
        <div className="wk-hero-main">
          <div className="wk-hero-dial" style={{ width: RING_COMPACT, height: RING_COMPACT }}>
            <div className="wk-hero-ring" style={{ width: RING_COMPACT, height: RING_COMPACT }}>
              <GradientRing value={pct} size={RING_COMPACT} stroke={STROKE_COMPACT} grad={RING_GREEN} delay={0.3}>
                <div className="wk-hero-center">
                  <span className="wk-hero-score"><Num value={o.score === null ? null : Math.round(o.score)} duration={1.2} delay={0.3} empty="—" /></span>
                  <span className="wk-hero-of">{o.score === null ? tr("بدون داده", "No data") : tr("از 100", "out of 100")}</span>
                </div>
              </GradientRing>
            </div>
          </div>
          <div className="wk-hero-body">
            <div className="wk-hero-eyebrow">
              <span>{tr("امتیاز کل هفته", "Overall week score")}</span>
              {o.grade && <GradeSeal grade={o.grade} compact />}
              {arche && <span className="wk-chip">{arche.title}</span>}
            </div>
            <h2 className="wk-hero-headline">{headline}</h2>
            {arche?.description && <p className="wk-hero-desc">{arche.description}</p>}
            <div className="wk-hero-delta">
              <DeltaChip delta={o.delta} size="lg" />
              <span className="wk-muted">{deltaText(analysis)}</span>
            </div>
          </div>
        </div>
        <Prediction analysis={analysis} />
      </motion.section>
    );
  }

  const best = o.bestDay;
  return (
    <motion.section className="wa-hero" data-grade={grade} variants={V_WK_CARD} aria-label={tr("خلاصه‌ی هفته", "Week summary")}>
      <div className="wa-hero-text">
        {arche && <span className="wa-kicker">{tr("تیپ این هفته", "This week's type")} · {arche.title}</span>}
        <h2 className="wa-headline">{headline}</h2>
        {arche?.description && <p className="wa-summary">{arche.description}</p>}
        <dl className="wa-kpis">
          <div className="wa-kpi">
            <dt>{tr("روزهای فعال", "Active days")}</dt>
            <dd><span className="wk-num">{o.activeDays}</span><small>/7</small></dd>
          </div>
          <div className="wa-kpi">
            <dt>{tr("ثبات", "Consistency")}</dt>
            <dd>{o.consistency === null ? <span className="wk-num">—</span> : <><span className="wk-num">{Math.round(o.consistency)}</span><small>%</small></>}</dd>
          </div>
          <div className="wa-kpi">
            <dt>{tr("بهترین روز", "Best day")}</dt>
            <dd>
              {best && best.score !== null
                ? <><span className="wa-kpi-day">{best.weekday}</span><small className="is-good wk-num">{Math.round(best.score)}</small></>
                : <span className="wk-num">—</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="wa-hero-visual">
        <div className="wa-ring-box">
          <div className="wa-ring-in">
            <GradientRing value={pct} size={RING_OPEN} stroke={STROKE_OPEN} grad={RING_GREEN} delay={0.3}>
              <div className="wa-ring-center">
                <span className="wa-score"><Num value={o.score === null ? null : Math.round(o.score)} duration={1.3} delay={0.3} empty="—" /></span>
                <span className="wa-of">{o.score === null ? tr("بدون داده", "No data") : tr("از 100", "out of 100")}</span>
              </div>
            </GradientRing>
            {o.grade && <span className="wa-grade-badge" aria-label={tr(`نمره ${o.grade}`, `Grade ${o.grade}`)}>{o.grade}</span>}
          </div>
        </div>
        <div className="wa-delta-row">
          <DeltaChip delta={o.delta} size="lg" />
          <span className="wa-delta-note">{deltaText(analysis)}</span>
        </div>
        <Forecast analysis={analysis} />
      </div>
    </motion.section>
  );
}
