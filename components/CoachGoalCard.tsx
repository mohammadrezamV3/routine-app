"use client";

import "./coach.css";
import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import type { CoachGoal } from "@/lib/coachTypes";
import { GradientRing } from "./GradientRing";
import { tr } from "@/lib/i18n";

/** خط «این هفته» از روی هفته‌ی جاری تاریخچه */
export function coachGoalWeekLine(goal: CoachGoal): string | null {
  const cur = goal.history.find((w) => w.current);
  if (!cur || cur.value == null) return null;
  const v = Math.round(cur.value);
  return goal.metric === "WORKOUT_SESSIONS"
    ? tr(`این هفته ${v} از ${goal.target} جلسه`, `This week: ${v} of ${goal.target} sessions`)
    : tr(`این هفته ${v}% از ${goal.target}%`, `This week: ${v}% of ${goal.target}%`);
}

/** کارت بزرگ هدف: حلقه‌ی هفته‌های موفق، عنوان و خط این هفته. onShare دکمه‌ی آیکونی اشتراک می‌ذاره */
export function CoachGoalCard({ goal, weekLine, onShare, footer }: { goal: CoachGoal; weekLine?: string | null; onShare?: () => void; footer?: ReactNode }) {
  const line = weekLine === undefined ? coachGoalWeekLine(goal) : weekLine;
  return (
    <section className="ch-card ch-card-lg ch-goal-card" aria-label={tr("هدف", "Goal")}>
      <GradientRing value={goal.weeks > 0 ? goal.weeksMet / goal.weeks : 0} size={88} stroke={8}>
        <span className="ch-goal-ring-num">{goal.weeksMet}<small>/{goal.weeks}</small></span>
      </GradientRing>
      <div className="ch-goal-body">
        <span className="ch-eyebrow">{tr("هدف", "Goal")}</span>
        <h2 className="ch-goal-title">{goal.title}</h2>
        {line && <p className="ch-goal-line">{line}</p>}
      </div>
      {onShare && (
        <button type="button" className="btn btn-ghost btn-icon ch-goal-share" onClick={onShare} aria-label={tr("اشتراک‌گذاری", "Share")}>
          <Share2 size={18} aria-hidden="true" />
        </button>
      )}
      {footer}
    </section>
  );
}
