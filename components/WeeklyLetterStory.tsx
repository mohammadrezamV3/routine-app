"use client";

// فصل‌های روایی هفته‌نامه: بینش‌ها، بردها و جای پیشرفت، اهداف، دستاوردها،
// حرف مربی، یادداشت خودت. همه بدون بک‌گراند اضافه؛ فقط سطح کارت سایت.
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowUpRight, CalendarDays, Check, Flame, Link2, Target, TrendingDown, TrendingUp, Trophy, Zap,
  type LucideIcon,
} from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type Insight } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { tr } from "@/lib/i18n";
import { goalCtaHref, weekCtaHref } from "./WeeklyLetterStoriesData";
import { CountText, DOMAIN_ICONS, Reveal } from "./WeeklyLetterShared";

export const INSIGHT_ICONS: Record<Insight["icon"], LucideIcon> = {
  link: Link2, flame: Flame, trophy: Trophy, alert: AlertTriangle, trend_up: TrendingUp, trend_down: TrendingDown, calendar: CalendarDays, zap: Zap,
};

export function WeeklyLetterInsights({ insights }: { insights: Insight[] }) {
  return (
    <div className="wl-ins-grid">
      {insights.map((n, i) => {
        const Icon = INSIGHT_ICONS[n.icon] ?? Zap;
        return (
          <Reveal key={n.id} className={`wl-card wl-ins is-${n.tone}`} delay={(i % 2) * 0.07}>
            <span className="wl-ins-ico"><Icon size={18} /></span>
            <div className="wl-ins-body">
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              {n.domain && <span className="wl-tag">{ANALYSIS_DOMAIN_LABELS[n.domain]}</span>}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

export function WeeklyLetterWins({ wins, improve }: { wins: string[]; improve: string[] }) {
  const both = wins.length > 0 && improve.length > 0;
  return (
    <div className={`wl-duo${both ? "" : " is-single"}`}>
      {wins.length > 0 && (
        <Reveal className="wl-card wl-list is-win">
          <h3><span className="wl-list-ico"><Check size={16} /></span>{tr("بردها", "Wins")}</h3>
          <ul>
            {wins.map((w, i) => <li key={i}><Check size={15} />{w}</li>)}
          </ul>
        </Reveal>
      )}
      {improve.length > 0 && (
        <Reveal className="wl-card wl-list is-improve" delay={0.08}>
          <h3><span className="wl-list-ico"><ArrowUpRight size={16} /></span>{tr("جای پیشرفت", "Room to grow")}</h3>
          <ul>
            {improve.map((w, i) => <li key={i}><ArrowUpRight size={15} />{w}</li>)}
          </ul>
        </Reveal>
      )}
    </div>
  );
}

export function WeeklyLetterAchievements({ achievements, streak }: { achievements: WeeklyLetterData["achievements"]; streak: WeeklyLetterData["streak"] }) {
  return (
    <div className="wl-ach-wrap">
      {streak && (
        <Reveal className="wl-card wl-streak">
          <span className="wl-flame" aria-hidden="true"><Flame size={34} /></span>
          <div>
            <CountText value={String(streak.days)} className="wl-streak-num" duration={1.3} />
            <span className="wl-streak-cap">{tr("روز پیاپی روتین کامل تا پایان این هفته", "days in a row of a complete routine through the end of this week")}</span>
          </div>
        </Reveal>
      )}
      {achievements.length > 0 && (
        <div className="wl-ach-grid">
          {achievements.map((a, i) => (
            <Reveal key={a.key} className="wl-card wl-ach" delay={(i % 3) * 0.07}>
              <motion.span
                className="wl-ach-emoji"
                aria-hidden="true"
                initial={{ scale: 0.6, rotate: -8 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
              >
                {a.emoji}
              </motion.span>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
              <span className="wl-tag">{a.source === "global" ? tr("دستاورد دائمی", "Permanent achievement") : tr("نشان این هفته", "This week's badge")}</span>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

export const MOODS = ["😞", "🙁", "😐", "🙂", "😄"];
export const moodLabels = () => [tr("خیلی بد", "Very bad"), tr("بد", "Bad"), tr("معمولی", "Okay"), tr("خوب", "Good"), tr("عالی", "Great")];

export function WeeklyLetterNext({ letter }: { letter: WeeklyLetterData }) {
  const nw = letter.nextWeek;
  const Icon = nw.focusDomain ? DOMAIN_ICONS[nw.focusDomain] : Target;
  return (
    <Reveal className="wl-card wl-next">
      <div className="wl-next-top">
        <span className="wl-next-ico"><Icon size={22} /></span>
        <div className="wl-next-text">
          <h3>{nw.focusTitle || tr("هفته‌ی بعد", "Next week")}</h3>
          {nw.focusText && <p>{nw.focusText}</p>}
        </div>
        {nw.suggestedTarget !== null && (
          <div className="wl-next-target">
            <CountText value={String(Math.round(nw.suggestedTarget))} className="wl-next-num" duration={1.2} />
            <span>{tr("هدف پیشنهادی", "Suggested target")}</span>
          </div>
        )}
      </div>
      <div className="wl-cta">
        <Link href={goalCtaHref({ title: nw.focusTitle, domain: nw.focusDomain, target: nw.suggestedTarget })} className="trade-primary-btn wl-cta-btn"><Target size={16} />{tr("تعیین هدف", "Set a goal")}</Link>
        <Link href={weekCtaHref(letter.weekStart)} className="account-outline-btn wl-cta-btn">{tr("آنالیز کامل این هفته", "Full analysis of this week")}</Link>
      </div>
    </Reveal>
  );
}
