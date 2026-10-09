"use client";

// جلد هفته‌نامه: سرصفحه‌ی مجله‌ای (شماره / عنوان / هفته)، حلقه‌ی بزرگ امتیاز،
// تیتر کلمه‌به‌کلمه، تیپ هفته، سلام و مقدمه. ورود پله‌ای فقط با transform/opacity.
import { Fragment, type ReactNode } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  Activity, Anchor, Crown, Feather, Hammer, Play, Scale, Trophy, TrendingDown, TrendingUp, Undo2, Zap, type LucideIcon,
} from "lucide-react";
import type { WeekArchetypeKey } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { CountText, DOM_GRAD, GradeStamp, WL_EASE, useLite } from "./WeeklyLetterShared";
import { tr } from "@/lib/i18n";
import { GradientRing } from "./GradientRing";
import { letterYear, scoreIntensity } from "./WeeklyLetterUtils";

export const ARCH_ICONS: Record<WeekArchetypeKey, LucideIcon> = {
  perfect: Crown,
  steady: Anchor,
  comeback: Undo2,
  fast_start: Zap,
  rollercoaster: Activity,
  rising: TrendingUp,
  quiet: Feather,
  balanced: Scale,
  building: Hammer,
};

export function BrandMark() {
  return (
    <span className="wl-brand" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-icon-dark-theme.png" alt="" className="wl-logo is-dark" width={22} height={19} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-icon-light-theme.webp" alt="" className="wl-logo is-light" width={22} height={19} />
    </span>
  );
}

export function WeeklyLetterCover({
  letter, isCurrent = false, storyCount = 0, storySeconds = 0, onPlayStory, prediction,
}: {
  letter: WeeklyLetterData;
  /** هفته هنوز تموم نشده: به‌جای شماره، نشان «در جریان» */
  isCurrent?: boolean;
  storyCount?: number;
  storySeconds?: number;
  onPlayStory?: () => void;
  /** باند پیش‌بینی (فقط هفته‌ی جاری)؛ زیر بدنه‌ی جلد، تمام‌عرض */
  prediction?: ReactNode;
}) {
  const lite = useLite();
  // شماره‌ی بزرگ پشت جلد با اسکرول کمی بالا می‌ره (فقط transform)
  const { scrollY } = useScroll();
  const markY = useTransform(scrollY, [0, 800], [0, lite ? 0 : -70]);
  const o = letter.overall;
  const score = o.score;
  const pct = score === null ? 0 : Math.min(100, Math.max(0, score)) / 100;
  const Arch = letter.archetype ? ARCH_ICONS[letter.archetype.key] ?? Activity : null;
  const words = letter.headline.trim().split(/\s+/).filter(Boolean);

  const y = lite ? 0 : 16;
  const item: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: lite ? 0.25 : 0.7, ease: WL_EASE as never } },
  };
  const group: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: lite ? 0 : 0.09, delayChildren: 0.08 } },
  };
  const wordGroup: Variants = { hidden: {}, show: { transition: { staggerChildren: lite ? 0 : 0.05, delayChildren: lite ? 0 : 0.35 } } };
  const word: Variants = {
    hidden: { opacity: 0, y: lite ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: lite ? 0.2 : 0.6, ease: WL_EASE as never } },
  };

  const deltaUp = (o.delta ?? 0) > 0;
  const deltaDown = (o.delta ?? 0) < 0;

  return (
    <motion.header className="wl-cover" initial="hidden" animate="show" variants={group} aria-labelledby="wl-headline">
      <span className="wl-cover-edge" aria-hidden="true" />
      <div className="wl-cover-watermark" aria-hidden="true">
        <motion.span style={{ y: markY }}>{isCurrent ? "" : letter.issueNo || ""}</motion.span>
      </div>

      <motion.div className="wl-mast" variants={item}>
        <div className="wl-mast-side">
          {isCurrent ? (
            <>
              <span className="wl-mast-k">{tr("این هفته", "This week")}</span>
              <b className="wl-mast-live"><i className="wl-live-dot" aria-hidden="true" />{tr("در جریان", "In progress")}</b>
            </>
          ) : letter.issueNo ? (
            <>
              <span className="wl-mast-k">{tr("شماره", "Issue")}</span>
              <b className="wl-mast-no">{letter.issueNo}</b>
            </>
          ) : null}
        </div>
        <div className="wl-mast-center">
          <BrandMark />
          <p className="wl-mast-title">{tr("آنالیز هفتگی", "Weekly review")}</p>
        </div>
        <div className="wl-mast-side is-end">
          <span className="wl-mast-k">{letter.weekLabel}</span>
          <b className="wl-mast-year">{letterYear(letter.weekEnd)}</b>
        </div>
      </motion.div>
      <motion.span className="wl-rule" variants={{ hidden: { scaleX: lite ? 1 : 0, opacity: 0 }, show: { scaleX: 1, opacity: 1, transition: { duration: lite ? 0.2 : 0.9, ease: WL_EASE as never } } }} aria-hidden="true" />

      <div className="wl-cover-body">
        <motion.div className="wl-cover-score" variants={item}>
          <div className="wl-score-ring" style={{ "--wl-k": scoreIntensity(score) } as React.CSSProperties}>
            <span className="wl-cover-aura" aria-hidden="true" />
            <GradientRing value={pct} size={176} stroke={13} delay={0.35} grad={DOM_GRAD}>
              <span className="wl-score-center">
                {score === null ? (
                  <span className="wl-score-none">{tr("بدون داده", "No data")}</span>
                ) : (
                  <>
                    <CountText value={String(Math.round(score))} className="wl-score-num wl-grad-text" duration={1.4} />
                    <span className="wl-score-of">{tr("از 100", "out of 100")}</span>
                  </>
                )}
              </span>
            </GradientRing>
            {o.grade && <GradeStamp grade={o.grade} size={86} delay={lite ? 0 : 1.15} className="wl-cover-stamp" />}
          </div>
          <div className="wl-chips">
            {o.delta !== null && (
              <span className={`wl-chip ${deltaUp ? "is-good" : deltaDown ? "is-bad" : ""}`}>
                {deltaUp ? <TrendingUp size={14} /> : deltaDown ? <TrendingDown size={14} /> : null}
                <b dir="ltr">{deltaUp ? "+" : deltaDown ? "−" : ""}{Math.abs(Math.round(o.delta))}</b>
                {o.prevScore !== null ? tr(`نسبت به هفته‌ی قبل (${Math.round(o.prevScore)})`, `vs last week (${Math.round(o.prevScore)})`) : tr("نسبت به هفته‌ی قبل", "vs last week")}
              </span>
            )}
            {o.rank && (
              <span className={`wl-chip ${o.rank.position === 1 ? "is-gold" : ""}`}>
                <Trophy size={14} />
                {o.rank.position === 1 ? tr(`بهترین هفته از ${o.rank.of} هفته‌ی اخیر`, `Best of the last ${o.rank.of} weeks`) : tr(`رتبه ${o.rank.position} از ${o.rank.of} هفته‌ی اخیر`, `Rank ${o.rank.position} of the last ${o.rank.of} weeks`)}
              </span>
            )}
            <span className="wl-chip">
              <b>{o.activeDays}</b> {tr("از 7 روز فعال", "of 7 days active")}
            </span>
          </div>
          {onPlayStory && storyCount >= 3 && (
            <motion.div className="wl-story-cta" variants={item}>
              <button type="button" className="trade-primary-btn wl-cta-btn wl-story-play" onClick={onPlayStory}>
                <Play size={16} fill="currentColor" />{tr("پخش داستان هفته", "Play the week story")}
              </button>
              <span className="wl-story-meta">{tr(`${storyCount} اسلاید، `, `${storyCount} slides, `)}{storySeconds > 0 && storySeconds < 60 ? tr(`حدود ${storySeconds} ثانیه`, `about ${storySeconds} seconds`) : tr("حدود یک دقیقه", "about a minute")}</span>
            </motion.div>
          )}
        </motion.div>

        <div className="wl-cover-text">
          <motion.h1 id="wl-headline" className="wl-headline" variants={wordGroup}>
            {words.length ? words.map((w, i) => (
              <Fragment key={i}>
                <motion.span className="wl-word" variants={word}>{w}</motion.span>{" "}
              </Fragment>
            )) : tr("هفته‌ی تو", "Your week")}
          </motion.h1>

          {letter.archetype && Arch && (
            <motion.div className={`wl-arch is-${letter.archetype.tone}`} variants={item}>
              <span className="wl-arch-ico"><Arch size={20} /></span>
              <span className="wl-arch-txt">
                <b>{letter.archetype.title}</b>
                {letter.archetype.description && <small>{letter.archetype.description}</small>}
              </span>
            </motion.div>
          )}

          <motion.div className="wl-intro" variants={item}>
            <p className="wl-greet">{letter.greetingName ? tr(`سلام ${letter.greetingName}`, `Hi ${letter.greetingName}`) : tr("سلام", "Hi")}</p>
            {letter.intro && <p className="wl-intro-text">{letter.intro}</p>}
          </motion.div>
        </div>
      </div>
      {prediction && <motion.div className="wl-cover-pred" variants={item}>{prediction}</motion.div>}
    </motion.header>
  );
}
