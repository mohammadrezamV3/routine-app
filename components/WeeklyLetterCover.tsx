"use client";

// جلد هفته‌نامه: سرصفحه‌ی مجله‌ای (شماره / عنوان / هفته)، حلقه‌ی بزرگ امتیاز،
// تیتر کلمه‌به‌کلمه، تیپ هفته، سلام و مقدمه. ورود پله‌ای فقط با transform/opacity.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { m as motion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  Activity, Anchor, Crown, Feather, Flame, Hammer, Play, Scale, Trophy, TrendingDown, TrendingUp, Undo2, Zap, CalendarCheck, type LucideIcon,
} from "lucide-react";
import type { WeekArchetypeKey } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { CountText, DOMAIN_ICONS, DOM_GRAD, WL_EASE, useLite } from "./WeeklyLetterShared";
import { tr, iso } from "@/lib/i18n";
import { ANALYSIS_DOMAIN_LABELS } from "@/lib/weeklyAnalysis/types";
import { CAL_WEEK_ORDER, weekdayShort } from "@/lib/jalali";
import { GradientRing } from "./GradientRing";
import { scoreIntensity } from "./WeeklyLetterUtils";
import "./wl-hero.css";

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

const GOOD_DAY = 60;

/** هفته‌نامه: جلد «شماره‌ی مجله» با اسکوربورد (حلقه‌ی امتیاز، سه بخش برتر، اکولایزر 7 روز) */
export function WeeklyLetterCover({
  letter, isCurrent = false, storyCount = 0, onPlayStory, prediction,
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
  // شماره‌ی بزرگ توخالی با اسکرول کمی بالا می‌ره (فقط transform)
  const { scrollY } = useScroll();
  const markY = useTransform(scrollY, [0, 800], [0, lite ? 0 : -60]);
  const o = letter.overall;
  const score = o.score;
  const pct = score === null ? 0 : Math.min(100, Math.max(0, score)) / 100;
  const Arch = letter.archetype ? ARCH_ICONS[letter.archetype.key] ?? Activity : null;
  const words = letter.headline.trim().split(/\s+/).filter(Boolean);
  const top = letter.domains
    .filter((d) => d.hasData && d.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number))
    .slice(0, 3);
  const dayInitials = CAL_WEEK_ORDER.map(weekdayShort);
  const days = Array.from({ length: 7 }, (_, i) => letter.days[i] ?? null);

  const y = lite ? 0 : 16;
  const item: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: lite ? 0.25 : 0.7, ease: WL_EASE as never } },
  };
  const group: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: lite ? 0 : 0.08, delayChildren: 0.05 } },
  };
  const wordGroup: Variants = { hidden: {}, show: { transition: { staggerChildren: lite ? 0 : 0.05, delayChildren: lite ? 0 : 0.3 } } };
  const word: Variants = {
    hidden: { opacity: 0, y: lite ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: lite ? 0.2 : 0.6, ease: WL_EASE as never } },
  };
  const grow = (i: number): Variants => ({
    hidden: { scaleY: lite ? 1 : 0 },
    show: { scaleY: 1, transition: { duration: lite ? 0.2 : 0.7, ease: WL_EASE as never, delay: lite ? 0 : 0.55 + i * 0.05 } },
  });
  const growX = (i: number): Variants => ({
    hidden: { scaleX: lite ? 1 : 0 },
    show: { scaleX: 1, transition: { duration: lite ? 0.2 : 0.8, ease: WL_EASE as never, delay: lite ? 0 : 0.5 + i * 0.1 } },
  });

  const delta = o.delta;
  const deltaUp = (delta ?? 0) > 0;
  const deltaDown = (delta ?? 0) < 0;
  const kicker = isCurrent ? "WEEKLY · LIVE" : letter.issueNo ? `WEEKLY · No. ${letter.issueNo}` : "WEEKLY";

  return (
    <motion.header className="wlh" initial="hidden" animate="show" variants={group} aria-labelledby="wl-headline" style={{ "--wl-k": scoreIntensity(score) } as CSSProperties}>
      {!isCurrent && !!letter.issueNo && (
        <div className="wlh-mark" aria-hidden="true">
          <motion.span style={{ y: markY }}>{letter.issueNo}</motion.span>
        </div>
      )}

      <motion.div className="wlh-top" variants={item}>
        <div className="wlh-meta">
          <span className="wlh-kicker" dir="ltr"><BrandMark />{kicker}</span>
          <span className="wlh-week">
            {isCurrent && <b className="wlh-live"><i className="wl-live-dot" aria-hidden="true" />{tr("در جریان", "In progress")}</b>}
            {!isCurrent && letter.issueNo ? tr(`هفته‌ی ${letter.issueNo} · `, `Week ${letter.issueNo} · `) : ""}{letter.weekLabel}
          </span>
        </div>
        {letter.archetype && Arch && (
          <span className={`wlh-arch is-${letter.archetype.tone}`}>
            <Arch size={15} />{letter.archetype.title}
          </span>
        )}
      </motion.div>

      <div className="wlh-body">
        <div className="wlh-text">
          <motion.h1 id="wl-headline" className="wlh-headline" variants={wordGroup}>
            {words.length ? words.map((w, i) => (
              <Fragment key={i}>
                <motion.span className="wlh-word" variants={word}>{w}</motion.span>{" "}
              </Fragment>
            )) : tr("هفته‌ی تو", "Your week")}
          </motion.h1>
          <motion.div className="wlh-intro" variants={item}>
            <p className="wlh-greet">{letter.greetingName ? tr(`سلام ${letter.greetingName}`, `Hi ${iso(letter.greetingName)}`) : tr("سلام", "Hi")}</p>
            {letter.intro && <p className="wlh-intro-text">{letter.intro}</p>}
            {letter.archetype?.description && <p className="wlh-arch-desc">{letter.archetype.description}</p>}
          </motion.div>
        </div>

        <div className="wlh-side">
          <motion.div className="wlh-board" variants={item}>
            <div className="wlh-board-main">
              <GradientRing value={pct} size={132} stroke={11} delay={0.35} grad={DOM_GRAD}>
                <span className="wlh-score">
                  {score === null ? (
                    <span className="wlh-none">{tr("بدون داده", "No data")}</span>
                  ) : (
                    <CountText value={String(Math.round(score))} className="wlh-score-num" duration={1.4} />
                  )}
                </span>
              </GradientRing>
              <div className="wlh-board-info">
                <p className="wlh-board-k">
                  {tr("امتیاز هفته", "Week score")}
                  {o.grade && <b className="wlh-grade" dir="ltr">{o.grade}</b>}
                </p>
                {o.rank && (
                  <p className={`wlh-rank${o.rank.position === 1 ? " is-gold" : ""}`}>
                    <Trophy size={12} />
                    {o.rank.position === 1 ? tr(`بهترین از ${o.rank.of} هفته‌ی اخیر`, `Best of last ${o.rank.of} weeks`) : tr(`رتبه ${o.rank.position} از ${o.rank.of}`, `Rank ${o.rank.position} of ${o.rank.of}`)}
                  </p>
                )}
                {top.length > 0 && (
                  <ul className="wlh-doms">
                    {top.map((d, i) => {
                      const Icon = DOMAIN_ICONS[d.domain];
                      return (
                        <li key={d.domain}>
                          <span className="wlh-dom-row">
                            <Icon size={13} /><span className="wlh-dom-name">{ANALYSIS_DOMAIN_LABELS[d.domain]}</span>
                            <b>{Math.round(d.score as number)}</b>
                          </span>
                          <span className="wlh-dom-track" aria-hidden="true">
                            <motion.i variants={growX(i)} style={{ width: `${Math.max(4, Math.min(100, d.score as number))}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="wlh-eq" role="img" aria-label={tr("امتیاز هر روز هفته", "Score for each day of the week")}>
              {days.map((d, i) => {
                const v = d && !d.isFuture && typeof d.score === "number" ? Math.max(0, Math.min(100, d.score)) : null;
                return (
                  <div key={i} className={`wlh-eq-col${v !== null && v >= GOOD_DAY ? " is-good" : ""}${d?.isToday ? " is-today" : ""}`}>
                    <span className="wlh-eq-slot">
                      {v !== null && <motion.i variants={grow(i)} style={{ height: `${Math.max(6, v)}%` }} />}
                    </span>
                    <span className="wlh-eq-lbl">{dayInitials[i]}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="wlh-stats" variants={item}>
            <div className="wlh-stat">
              <CalendarCheck size={14} />
              <b dir="ltr">{o.activeDays}<small>/7</small></b>
              <span>{tr("روز فعال", "Active days")}</span>
            </div>
            <div className="wlh-stat">
              <Flame size={14} />
              <b dir="ltr">{letter.streak ? letter.streak.days : 0}</b>
              <span>{tr("استریک", "Streak")}</span>
            </div>
            <div className={`wlh-stat${deltaUp ? " is-good" : deltaDown ? " is-bad" : ""}`}>
              {deltaDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <b dir="ltr">{delta === null ? "–" : `${deltaUp ? "+" : deltaDown ? "−" : ""}${Math.abs(Math.round(delta))}`}</b>
              <span>{tr("نسبت به قبل", "vs last week")}</span>
            </div>
          </motion.div>

          {onPlayStory && storyCount >= 3 && (
            <motion.div variants={item}>
              <button type="button" className="btn btn-primary btn-lg wlh-play" onClick={onPlayStory}>
                <Play size={16} fill="currentColor" />{tr(`داستان هفته · ${storyCount} اسلاید`, `Week story · ${storyCount} slides`)}
              </button>
            </motion.div>
          )}
        </div>
      </div>
      {prediction && <motion.div className="wlh-pred" variants={item}>{prediction}</motion.div>}
    </motion.header>
  );
}
