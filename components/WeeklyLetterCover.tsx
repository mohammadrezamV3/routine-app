"use client";

// جلد هفته‌نامه: سرصفحه‌ی مجله‌ای (شماره / عنوان / هفته)، حلقه‌ی بزرگ امتیاز،
// تیتر کلمه‌به‌کلمه، تیپ هفته، سلام و مقدمه. ورود پله‌ای فقط با transform/opacity.
import { Fragment } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Activity, Anchor, Crown, Feather, Hammer, Scale, Trophy, TrendingDown, TrendingUp, Undo2, Zap, type LucideIcon,
} from "lucide-react";
import type { WeekArchetypeKey } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { CountText, WL_EASE, useLite } from "./WeeklyLetterShared";
import { GradientRing } from "./GradientRing";
import { letterYear } from "./WeeklyLetterUtils";

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

function BrandMark() {
  return (
    <span className="wl-brand" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-icon-dark-theme.png" alt="" className="wl-logo is-dark" width={22} height={19} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-icon-light-theme.webp" alt="" className="wl-logo is-light" width={22} height={19} />
    </span>
  );
}

export function WeeklyLetterCover({ letter }: { letter: WeeklyLetterData }) {
  const lite = useLite();
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
        <span>{letter.issueNo || ""}</span>
      </div>

      <motion.div className="wl-mast" variants={item}>
        <div className="wl-mast-side">
          <span className="wl-mast-k">شماره</span>
          <b className="wl-mast-no">{letter.issueNo || "—"}</b>
        </div>
        <div className="wl-mast-center">
          <BrandMark />
          <p className="wl-mast-title">هفته‌نامه</p>
        </div>
        <div className="wl-mast-side is-end">
          <span className="wl-mast-k">{letter.weekLabel}</span>
          <b className="wl-mast-year">{letterYear(letter.weekEnd)}</b>
        </div>
      </motion.div>
      <motion.span className="wl-rule" variants={{ hidden: { scaleX: lite ? 1 : 0, opacity: 0 }, show: { scaleX: 1, opacity: 1, transition: { duration: lite ? 0.2 : 0.9, ease: WL_EASE as never } } }} aria-hidden="true" />

      <div className="wl-cover-body">
        <motion.div className="wl-cover-score" variants={item}>
          <div className="wl-score-ring">
            <GradientRing value={pct} size={176} stroke={13} delay={0.35}>
              <span className="wl-score-center">
                {score === null ? (
                  <span className="wl-score-none">بدون داده</span>
                ) : (
                  <>
                    <CountText value={String(Math.round(score))} className="wl-score-num" duration={1.4} />
                    <span className="wl-score-of">از 100</span>
                  </>
                )}
              </span>
            </GradientRing>
            {o.grade && (
              <motion.span
                className="wl-grade"
                initial={lite ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: lite ? 0 : 1.1, type: "spring", stiffness: 320, damping: 18 }}
                aria-label={`درجه ${o.grade}`}
              >
                {o.grade}
              </motion.span>
            )}
          </div>
          <div className="wl-chips">
            {o.delta !== null && (
              <span className={`wl-chip ${deltaUp ? "is-good" : deltaDown ? "is-bad" : ""}`}>
                {deltaUp ? <TrendingUp size={14} /> : deltaDown ? <TrendingDown size={14} /> : null}
                <b dir="ltr">{deltaUp ? "+" : deltaDown ? "−" : ""}{Math.abs(Math.round(o.delta))}</b>
                {o.prevScore !== null ? `نسبت به هفته‌ی قبل (${Math.round(o.prevScore)})` : "نسبت به هفته‌ی قبل"}
              </span>
            )}
            {o.rank && (
              <span className={`wl-chip ${o.rank.position === 1 ? "is-gold" : ""}`}>
                <Trophy size={14} />
                {o.rank.position === 1 ? `بهترین هفته از ${o.rank.of} هفته‌ی اخیر` : `رتبه ${o.rank.position} از ${o.rank.of} هفته‌ی اخیر`}
              </span>
            )}
            <span className="wl-chip">
              <b>{o.activeDays}</b> از 7 روز فعال
            </span>
          </div>
        </motion.div>

        <div className="wl-cover-text">
          <motion.h1 id="wl-headline" className="wl-headline" variants={wordGroup}>
            {words.length ? words.map((w, i) => (
              <Fragment key={i}>
                <motion.span className="wl-word" variants={word}>{w}</motion.span>{" "}
              </Fragment>
            )) : "هفته‌ی تو"}
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
            <p className="wl-greet">{letter.greetingName ? `سلام ${letter.greetingName}` : "سلام"}</p>
            {letter.intro && <p className="wl-intro-text">{letter.intro}</p>}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
