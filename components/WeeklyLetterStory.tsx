"use client";

// فصل‌های روایی هفته‌نامه: بینش‌ها، بردها و جای پیشرفت، اهداف، دستاوردها،
// حرف مربی، یادداشت خودت. همه بدون بک‌گراند اضافه؛ فقط سطح کارت سایت.
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowUpRight, CalendarDays, Check, Flame, Link2, Quote, Sparkles, Target, TrendingDown, TrendingUp, Trophy, X, Zap,
  type LucideIcon,
} from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type Insight } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";
import { goalCtaHref, weekCtaHref } from "./WeeklyLetterStoriesData";
import { CountText, DOMAIN_ICONS, MeterBar, Reveal } from "./WeeklyLetterShared";

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
          <h3><span className="wl-list-ico"><Check size={16} /></span>بردها</h3>
          <ul>
            {wins.map((w, i) => <li key={i}><Check size={15} />{w}</li>)}
          </ul>
        </Reveal>
      )}
      {improve.length > 0 && (
        <Reveal className="wl-card wl-list is-improve" delay={0.08}>
          <h3><span className="wl-list-ico"><ArrowUpRight size={16} /></span>جای پیشرفت</h3>
          <ul>
            {improve.map((w, i) => <li key={i}><ArrowUpRight size={15} />{w}</li>)}
          </ul>
        </Reveal>
      )}
    </div>
  );
}

const GOAL_STATUS = {
  DONE: { label: "انجام شد", Icon: Check, cls: "is-good" },
  MISSED: { label: "نشد", Icon: X, cls: "is-bad" },
  ACTIVE: { label: "در جریان", Icon: Target, cls: "" },
} as const;

export function WeeklyLetterGoals({ goals }: { goals: WeeklyLetterData["goals"] }) {
  return (
    <div className="wl-goals">
      {goals.map((g, i) => {
        const st = GOAL_STATUS[g.status] ?? GOAL_STATUS.ACTIVE;
        const Icon = g.domain ? DOMAIN_ICONS[g.domain] : Target;
        const ratio = g.target && g.achievedScore !== null ? Math.min(1, Math.max(0, g.achievedScore / g.target)) : null;
        return (
          <Reveal key={g.id} className="wl-card wl-goal" delay={(i % 3) * 0.06}>
            <span className="wl-goal-ico"><Icon size={17} /></span>
            <div className="wl-goal-body">
              <h3>{g.title}</h3>
              <div className="wl-goal-meta">
                {g.domain && <span className="wl-tag">{ANALYSIS_DOMAIN_LABELS[g.domain]}</span>}
                {g.target !== null && g.achievedScore !== null && (
                  <span className="wl-goal-prog">رسیدی به <b>{Math.round(g.achievedScore)}</b> از <b>{Math.round(g.target)}</b></span>
                )}
                {g.target !== null && g.achievedScore === null && (
                  <span className="wl-goal-prog">هدف: <b>{Math.round(g.target)}</b></span>
                )}
              </div>
              {ratio !== null && <MeterBar ratio={ratio} />}
            </div>
            <span className={`wl-status ${st.cls}`}><st.Icon size={13} />{st.label}</span>
          </Reveal>
        );
      })}
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
            <span className="wl-streak-cap">روز پیاپی روتین کامل تا پایان این هفته</span>
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
              <span className="wl-tag">{a.source === "global" ? "دستاورد دائمی" : "نشان این هفته"}</span>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

const PRIORITY: Record<string, string> = { high: "اولویت بالا", medium: "اولویت متوسط", low: "اولویت پایین" };

export function WeeklyLetterCoach({ ai }: { ai: NonNullable<WeeklyLetterData["ai"]> }) {
  return (
    <div className="wl-coach">
      <Reveal className="wl-card wl-coach-quote">
        <span className="wl-coach-ico"><Sparkles size={18} /></span>
        <p>{ai.summary}</p>
      </Reveal>
      {ai.recommendations.length > 0 && (
        <ol className="wl-rec-list">
          {ai.recommendations.map((r, i) => (
            <Reveal key={i} as="li" className={`wl-card wl-rec is-${r.priority}`} delay={0.05 * (i % 3)}>
              <span className="wl-rec-no" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
                <div className="wl-rec-meta">
                  <span className="wl-tag">{PRIORITY[r.priority] ?? PRIORITY.medium}</span>
                  {r.domain && <span className="wl-tag">{ANALYSIS_DOMAIN_LABELS[r.domain]}</span>}
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      )}
    </div>
  );
}

export const MOODS = ["😞", "🙁", "😐", "🙂", "😄"];
export const MOOD_LABELS = ["خیلی بد", "بد", "معمولی", "خوب", "عالی"];

export function WeeklyLetterReflection({ reflection }: { reflection: NonNullable<WeeklyLetterData["reflection"]> }) {
  const mood = reflection.mood && reflection.mood >= 1 && reflection.mood <= 5 ? reflection.mood : null;
  return (
    <div className="wl-refl">
      {mood && (
        <Reveal className="wl-mood" >
          <span className="wl-mood-k">حال و هوای هفته</span>
          <span className="wl-mood-row" role="img" aria-label={`حال هفته: ${MOOD_LABELS[mood - 1]}`}>
            {MOODS.map((m, i) => <span key={i} className={i + 1 === mood ? "is-on" : ""} aria-hidden="true">{m}</span>)}
          </span>
          <b>{MOOD_LABELS[mood - 1]}</b>
        </Reveal>
      )}
      <div className="wl-duo">
        {reflection.wentWell && (
          <Reveal as="article" className="wl-card wl-quote is-win">
            <Quote size={26} className="wl-quote-mark" aria-hidden="true" />
            <h3>چی خوب پیش رفت</h3>
            <blockquote>{reflection.wentWell}</blockquote>
          </Reveal>
        )}
        {reflection.improve && (
          <Reveal as="article" className="wl-card wl-quote is-improve" delay={0.08}>
            <Quote size={26} className="wl-quote-mark" aria-hidden="true" />
            <h3>چی بهتر می‌شد</h3>
            <blockquote>{reflection.improve}</blockquote>
          </Reveal>
        )}
      </div>
    </div>
  );
}

// offset فقط برای سازگاری با فراخوان‌های قدیمی؛ لینک‌ها از weekStart ساخته می‌شن
export function WeeklyLetterNext({ letter }: { letter: WeeklyLetterData; offset?: number }) {
  const nw = letter.nextWeek;
  const Icon = nw.focusDomain ? DOMAIN_ICONS[nw.focusDomain] : Target;
  return (
    <Reveal className="wl-card wl-next">
      <div className="wl-next-top">
        <span className="wl-next-ico"><Icon size={22} /></span>
        <div className="wl-next-text">
          <h3>{nw.focusTitle || "هفته‌ی بعد"}</h3>
          {nw.focusText && <p>{nw.focusText}</p>}
        </div>
        {nw.suggestedTarget !== null && (
          <div className="wl-next-target">
            <CountText value={String(Math.round(nw.suggestedTarget))} className="wl-next-num" duration={1.2} />
            <span>هدف پیشنهادی</span>
          </div>
        )}
      </div>
      <div className="wl-cta">
        <Link href={goalCtaHref({ title: nw.focusTitle, domain: nw.focusDomain, target: nw.suggestedTarget })} className="trade-primary-btn wl-cta-btn"><Target size={16} />تعیین هدف</Link>
        <Link href={weekCtaHref(letter.weekStart)} className="account-outline-btn wl-cta-btn">آنالیز کامل این هفته</Link>
      </div>
    </Reveal>
  );
}
