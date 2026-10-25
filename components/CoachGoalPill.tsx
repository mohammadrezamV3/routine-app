"use client";

import "./coach.css";
import { SmartLink } from "./SmartLink";
import { GradientRing } from "./GradientRing";
import { tr } from "@/lib/i18n";

/** قرص جمع‌وجور هدف: حلقه‌ی کوچک + «هدف 9/12». href یا onClick (یکی از دو) */
export function CoachGoalPill({ weeksMet, weeks, href, onClick }: { weeksMet: number; weeks: number; href?: string; onClick?: () => void }) {
  const label = tr(`هدف ${weeksMet} از ${weeks} هفته`, `Goal: ${weeksMet} of ${weeks} weeks`);
  const body = (
    <>
      <GradientRing value={weeks > 0 ? weeksMet / weeks : 0} size={18} stroke={3} />
      <span>{tr("هدف", "Goal")} {weeksMet}/{weeks}</span>
    </>
  );
  if (href) return <SmartLink href={href} className="btn btn-outline btn-sm ch-goal-pill" aria-label={label}>{body}</SmartLink>;
  return <button type="button" className="btn btn-outline btn-sm ch-goal-pill" aria-label={label} onClick={onClick}>{body}</button>;
}
