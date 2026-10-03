"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity, Anchor, CalendarCheck, Crown, Feather, Rocket, Scale, Sparkles, Sprout, TrendingDown, TrendingUp, Undo2, Waves, Zap,
  type LucideIcon,
} from "lucide-react";
import type { DayCell, WeekArchetypeKey, WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { GradientRing, type RingGrad } from "./GradientRing";
import {
  CONFIDENCE_LABELS, DeltaChip, Num, V_WK_CARD, gradeOfScore, scoreGrad, useCalmMotion, useMounted, weekdayLetter, WK_EASE,
} from "./WeeklyAnalysisKit";

const RING = 184;
const STROKE = 15;
const DIAL = 268; // قطر کل صفحه‌ی هفته (حلقه‌ی امتیاز + قوس‌های روزها + حرف روزها)
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

// گرادیان لحن تیپ: خوب سبز، بد مرجانی، خنثی آبی-بنفش (پالت حلقه‌ها)
const TONE_GRADS: Record<"good" | "bad" | "neutral", RingGrad> = {
  good: ["var(--ring-1a)", "var(--ring-1b)"],
  bad: ["var(--ring-over)", "var(--ring-3b)"],
  neutral: ["var(--ring-2a)", "var(--ring-2b)"],
};

// فقط بار اول (اولین نمایش صفحه) قوس‌ها با تاخیر مراسم ورود می‌کشن؛ بعدش
// با عوض‌کردن هفته تقریبا فوری دوباره کشیده می‌شن. فقط سمت کلاینت ست می‌شه.
let introPlayed = false;

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

// ---- صفحه‌ی هفته ----
// حلقه‌ی نازک بیرونی با هفت قوس (شنبه از بالا، ساعت‌گرد، هم‌جهت پر شدن حلقه‌ی
// امتیاز). رنگ هر قوس = نمره‌ی همون روز؛ روز آینده خط‌چین، روز بدون داده
// خط‌چین کم‌رنگ و امروز یک نوک ضربان‌دار داره. قوس‌ها یکی‌یکی کشیده می‌شن.
const C = DIAL / 2;
const R_SEG = 112;
const R_LETTER = 126;
const STEP = (Math.PI * 2) / 7;
const GAP = 0.17;
const pt = (r: number, a: number) => ({ x: C + r * Math.sin(a), y: C - r * Math.cos(a) });
const SEGMENTS = Array.from({ length: 7 }, (_, i) => {
  const a0 = i * STEP + GAP / 2;
  const a1 = (i + 1) * STEP - GAP / 2;
  const p0 = pt(R_SEG, a0);
  const p1 = pt(R_SEG, a1);
  return {
    d: `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${R_SEG} ${R_SEG} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    mid: pt(R_SEG, (a0 + a1) / 2),
    letter: pt(R_LETTER, (a0 + a1) / 2),
  };
});

function WeekDial({ days }: { days: DayCell[] }) {
  const calm = useCalmMotion();
  const base = useRef(introPlayed ? 0.05 : 0.6).current;
  return (
    <svg className="wk-dial" viewBox={`0 0 ${DIAL} ${DIAL}`} width={DIAL} height={DIAL} aria-hidden="true">
      {days.slice(0, 7).map((d, i) => {
        const seg = SEGMENTS[i];
        const has = !d.isFuture && d.score !== null;
        const color = has ? scoreGrad(d.score)[0] : "var(--muted2)";
        return (
          <g key={d.date} className={`wk-dial-day${d.isToday ? " is-today" : ""}`}>
            <title>{`${d.weekday}: ${d.isFuture ? "هنوز نرسیده" : d.score === null ? "بدون داده" : Math.round(d.score)}`}</title>
            <path d={seg.d} className="wk-dial-track" fill="none" strokeWidth={8} strokeLinecap="round" />
            {has ? (
              <motion.path
                d={seg.d}
                className="wk-dial-seg"
                fill="none"
                strokeWidth={8}
                strokeLinecap="round"
                style={{ stroke: color, color }}
                initial={calm ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.55, delay: base + i * 0.09, ease: WK_EASE }, opacity: { duration: 0.12, delay: base + i * 0.09 } }}
              />
            ) : (
              <motion.path
                d={seg.d}
                className={`wk-dial-dash${d.isFuture ? " is-future" : ""}`}
                fill="none"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="0.1 8"
                initial={calm ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: base + i * 0.09 }}
              />
            )}
            <text x={seg.letter.x} y={seg.letter.y} className="wk-dial-letter" textAnchor="middle" dominantBaseline="central">
              {weekdayLetter(d.weekday)}
            </text>
            {d.isToday && !d.isFuture && (
              <g className="wk-dial-tip" transform={`translate(${seg.mid.x.toFixed(2)} ${seg.mid.y.toFixed(2)})`}>
                <circle r="4.5" className="wk-dial-pulse" fill="none" strokeWidth="1.6" />
                <circle r="3" className="wk-dial-dot" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---- مهر نمره ----
// دایره‌ی دوخطه با حرف گرادیانی و یک بار برق عبوری (انیمیشن CSS یک‌باره)
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
  const grad = TONE_GRADS[arche.tone] ?? TONE_GRADS.neutral;
  return (
    <div className="wk-arche" style={{ ["--wk-at-a" as string]: grad[0], ["--wk-at-b" as string]: grad[1] }}>
      <span className="wk-arche-ic" aria-hidden="true"><Icon size={20} /></span>
      <div className="wk-arche-text">
        <span className="wk-arche-kicker">تیپ این هفته</span>
        <b className="wk-arche-title">{arche.title}</b>
        {arche.description && <p className="wk-arche-desc">{arche.description}</p>}
      </div>
    </div>
  );
}

// کارت اصلی بالای صفحه: صفحه‌ی هفته (حلقه‌ی امتیاز کل + هفت قوس روزها) روی
// هاله‌ی هم‌رنگ نمره، تیتر قطعی، کارت تیپ هفته، چهار آمار کوچک و پیش‌بینی
// پایان هفته. حلقه همیشه سرجاشه و امتیاز تازه رو از مقدار قبلی می‌کشه.
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
  const showDial = !compact && Array.isArray(analysis.days) && analysis.days.length >= 7;
  const dialKey = useMemo(() => analysis.weekStart ?? "w", [analysis.weekStart]);

  useEffect(() => {
    if (compact) return;
    const t = setTimeout(() => { introPlayed = true; }, 2000);
    return () => clearTimeout(t);
  }, [compact]);

  const box = showDial ? DIAL : ring;
  return (
    <motion.section
      className={`wk-card wk-hero${compact ? " is-compact" : ""}`}
      data-grade={o.grade ?? gradeOfScore(o.score) ?? undefined}
      variants={V_WK_CARD}
      aria-label="خلاصه‌ی هفته"
    >
      <div className="wk-hero-main">
        <div className={`wk-hero-dial${showDial ? " has-dial" : ""}`} style={{ width: box, height: box }}>
          {showDial && <WeekDial key={dialKey} days={analysis.days} />}
          <div className="wk-hero-ring" style={{ width: ring, height: ring }}>
            <GradientRing value={pct} size={ring} stroke={stroke} grad={grad} delay={0.3}>
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
            {o.grade && <GradeSeal grade={o.grade} compact={compact} />}
            {compact && arche && <span className="wk-chip">{arche.title}</span>}
          </div>
          <h2 className="wk-hero-headline">{headline}</h2>
          {!compact && arche && <ArchetypeCard arche={arche} />}
          {compact && arche?.description && <p className="wk-hero-desc">{arche.description}</p>}

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
