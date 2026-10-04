"use client";

import { motion } from "framer-motion";
import {
  Activity, Anchor, CalendarCheck, Crown, Feather, Rocket, Scale, Sparkles, Sprout, TrendingDown, TrendingUp, Undo2, Waves, Zap,
  type LucideIcon,
} from "lucide-react";
import type { DayCell, WeekArchetypeKey, WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { GradientRing, RING_GREEN } from "./GradientRing";
import {
  CONFIDENCE_LABELS, DeltaChip, Num, V_WK_CARD, gradeOfScore, scoreGrad, useMounted, weekdayLetter, WK_EASE,
} from "./WeeklyAnalysisKit";
import "./wa-shell.css";

const RING = 184;
const STROKE = 15;
const RING_OPEN = 212;
const STROKE_OPEN = 17;
const DAY_RING = 46;
const RING_COMPACT = 112; // پیش‌نمایش لندینگ
const STROKE_COMPACT = 10;

// جمله‌ی پیش‌فرض وقتی موتور هنوز تیتر قطعی نداده
function fallbackHeadline(a: WeeklyAnalysis): string {
  const s = a.overall.score;
  if (s === null) return "برای این هفته هنوز داده‌ای ثبت نشده";
  return `امتیاز کل این هفته ${Math.round(s)} از 100 شد`;
}

// هر تیپ هفته یک آیکون داره (داخل حلقه‌ی کارت تیپ)
const ARCHE_ICONS: Record<WeekArchetypeKey, LucideIcon> = {
  perfect: Crown,
  steady: Anchor,
  comeback: Undo2,
  fast_start: Rocket,
  rollercoaster: Activity,
  rising: TrendingUp,
  quiet: Feather,
  balanced: Scale,
  building: Sprout,
};

// لحن تیپ فقط رنگ آیکون کوچک کارت رو تعیین می‌کنه: خوب = رنگ داده، بد = زیان،
// خنثی = رنگ متن. (عنوان تیپ همیشه خنثیه.)
const TONE_COLORS: Record<"good" | "bad" | "neutral", string> = {
  good: "var(--ring-1a)",
  bad: "var(--pnl-loss)",
  neutral: "var(--text)",
};

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
      aria-label={`نمره ${grade}`}
    >
      <span className="wk-seal-letter">{grade}</span>
    </motion.span>
  );
}

// ---- کارت تیپ هفته ----
function ArchetypeCard({ arche }: { arche: NonNullable<WeeklyAnalysis["archetype"]> }) {
  const Icon = ARCHE_ICONS[arche.key] ?? Zap;
  const tone = TONE_COLORS[arche.tone] ?? TONE_COLORS.neutral;
  return (
    <div className="wk-arche" style={{ ["--wk-at" as string]: tone }}>
      <span className="wk-arche-ic" aria-hidden="true"><Icon size={20} /></span>
      <div className="wk-arche-text">
        <span className="wk-arche-kicker">تیپ این هفته</span>
        <b className="wk-arche-title">{arche.title}</b>
        {arche.description && <p className="wk-arche-desc">{arche.description}</p>}
      </div>
    </div>
  );
}

// ردیف هفت حلقه‌ی کوچک روزها: امتیاز هر روز، امروز با خط زیرین، روز آینده کم‌رنگ
function DayRings({ days, onPickDay }: { days: DayCell[]; onPickDay?: (i: number) => void }) {
  return (
    <div className="wa-days" role="group" aria-label="امتیاز روزهای هفته" data-noswipe>
      {days.slice(0, 7).map((d, i) => {
        const has = !d.isFuture && d.score !== null;
        const pickable = !!onPickDay && !d.isFuture;
        const inner = (
          <>
            <GradientRing value={has ? (d.score as number) / 100 : 0} size={DAY_RING} stroke={4.5} grad={scoreGrad(d.score)} delay={0.5 + i * 0.07}>
              <span className="wa-day-score">{has ? Math.round(d.score as number) : ""}</span>
            </GradientRing>
            <span className="wa-day-name">{weekdayLetter(d.weekday)}</span>
          </>
        );
        const cls = `wa-day${d.isToday ? " is-today" : ""}${d.isFuture ? " is-future" : ""}${has ? "" : " is-empty"}`;
        return pickable ? (
          <button
            key={d.date}
            type="button"
            className={`wk-ghost ${cls}`}
            onClick={() => onPickDay?.(i)}
            aria-label={`${d.weekday}: ${has ? Math.round(d.score as number) : "بدون داده"}`}
          >{inner}</button>
        ) : (
          <span key={d.date} className={cls} title={`${d.weekday}: ${d.isFuture ? "هنوز نرسیده" : "بدون داده"}`}>{inner}</span>
        );
      })}
    </div>
  );
}

function HeroFacts({ analysis }: { analysis: WeeklyAnalysis }) {
  const o = analysis.overall;
  const daysBase = analysis.isCurrentWeek ? analysis.daysElapsed : 7;
  return (
    <dl className="wa-facts">
      <div className="wa-fact">
        <dt><CalendarCheck size={13} />روزهای فعال</dt>
        <dd><span className="wk-num">{o.activeDays}/{daysBase}</span></dd>
      </div>
      <div className="wa-fact">
        <dt><Waves size={13} />ثبات</dt>
        <dd>
          {o.consistency === null ? "—" : <><Num value={Math.round(o.consistency)} />%</>}
          <small className="wk-muted-sm"> · اطمینان {CONFIDENCE_LABELS[o.confidence]}</small>
        </dd>
      </div>
      <div className="wa-fact">
        <dt><TrendingUp size={13} style={{ color: "var(--ring-1a)" }} />بهترین روز</dt>
        <dd>{o.bestDay && o.bestDay.score !== null ? <>{o.bestDay.weekday} <span className="wk-num">{Math.round(o.bestDay.score)}</span></> : "—"}</dd>
      </div>
      <div className="wa-fact">
        <dt><TrendingDown size={13} />ضعیف‌ترین روز</dt>
        <dd>{o.worstDay && o.worstDay.score !== null ? <>{o.worstDay.weekday} <span className="wk-num">{Math.round(o.worstDay.score)}</span></> : "—"}</dd>
      </div>
    </dl>
  );
}

function Prediction({ analysis }: { analysis: WeeklyAnalysis }) {
  const pred = analysis.isCurrentWeek ? analysis.prediction : null;
  if (!pred) return null;
  return (
    <div className="wk-prediction wa-pred">
      <div className="wk-prediction-text">
        <span className="wk-prediction-title"><Sparkles size={14} />پیش‌بینی پایان هفته</span>
        <span className="wk-prediction-main">
          حدود <b className="wk-num">{Math.round(pred.projectedScore)}</b>
          <span className="wk-muted"> (بین <span className="wk-num">{Math.round(pred.low)}</span> تا <span className="wk-num">{Math.round(pred.high)}</span>)</span>
        </span>
        {pred.message && <span className="wk-muted-sm">{pred.message}</span>}
      </div>
      <PredictionBand projected={pred.projectedScore} low={pred.low} high={pred.high} now={analysis.overall.score} />
    </div>
  );
}

function deltaText(analysis: WeeklyAnalysis) {
  const o = analysis.overall;
  if (o.prevScore === null) return analysis.isCurrentWeek && analysis.daysElapsed < 3 ? "مقایسه با هفته‌ی قبل از روز سوم" : "هفته‌ی قبل داده نداشت";
  return <>نسبت به هفته‌ی قبل (<span className="wk-num">{Math.round(o.prevScore)}</span>)</>;
}

// پیش‌نمایش فشرده‌ی لندینگ (compact) همون کارت قبلیه؛ نسخه‌ی کامل بدون قاب
// و دو ناحیه‌ایه: حلقه‌ی بزرگ امتیاز در یک سمت، تیتر/تیپ/روزها در سمت دیگه.
export function WeeklyAnalysisHero({
  analysis, compact = false, onPickDay,
}: { analysis: WeeklyAnalysis; compact?: boolean; onPickDay?: (i: number) => void }) {
  const o = analysis.overall;
  const arche = analysis.archetype;
  const pct = o.score === null ? 0 : Math.min(100, Math.max(0, o.score)) / 100;
  const headline = analysis.headline || fallbackHeadline(analysis);
  const grade = o.grade ?? gradeOfScore(o.score) ?? undefined;

  if (compact) {
    return (
      <motion.section className="wk-card wk-hero is-compact" data-grade={grade} variants={V_WK_CARD} aria-label="خلاصه‌ی هفته">
        <div className="wk-hero-main">
          <div className="wk-hero-dial" style={{ width: RING_COMPACT, height: RING_COMPACT }}>
            <div className="wk-hero-ring" style={{ width: RING_COMPACT, height: RING_COMPACT }}>
              <GradientRing value={pct} size={RING_COMPACT} stroke={STROKE_COMPACT} grad={RING_GREEN} delay={0.3}>
                <div className="wk-hero-center">
                  <span className="wk-hero-score"><Num value={o.score === null ? null : Math.round(o.score)} duration={1.2} delay={0.3} empty="—" /></span>
                  <span className="wk-hero-of">{o.score === null ? "بدون داده" : "از 100"}</span>
                </div>
              </GradientRing>
            </div>
          </div>
          <div className="wk-hero-body">
            <div className="wk-hero-eyebrow">
              <span>امتیاز کل هفته</span>
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

  const hasDays = Array.isArray(analysis.days) && analysis.days.length >= 7;
  return (
    <motion.section className="wa-hero" data-grade={grade} variants={V_WK_CARD} aria-label="خلاصه‌ی هفته">
      <div className="wa-hero-visual">
        <div className="wa-ring-wrap">
          <GradientRing value={pct} size={RING_OPEN} stroke={STROKE_OPEN} grad={RING_GREEN} delay={0.3}>
            <div className="wk-hero-center">
              <span className="wk-hero-score wa-score"><Num value={o.score === null ? null : Math.round(o.score)} duration={1.3} delay={0.3} empty="—" /></span>
              <span className="wk-hero-of">{o.score === null ? "بدون داده" : "از 100"}</span>
            </div>
          </GradientRing>
          {o.grade && <span className="wa-grade"><GradeSeal grade={o.grade} compact={false} /></span>}
        </div>
      </div>

      <div className="wa-hero-text">
        <div className="wk-hero-eyebrow wa-eyebrow"><span>امتیاز کل هفته</span></div>
        <h2 className="wa-headline">{headline}</h2>
        {arche && <ArchetypeCard arche={arche} />}
        <div className="wk-hero-delta">
          <DeltaChip delta={o.delta} size="lg" />
          <span className="wk-muted">{deltaText(analysis)}</span>
        </div>
        {hasDays && <DayRings days={analysis.days} onPickDay={onPickDay} />}
      </div>

      <div className="wa-hero-foot">
        <HeroFacts analysis={analysis} />
        <Prediction analysis={analysis} />
      </div>
    </motion.section>
  );
}
