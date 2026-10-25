"use client";

import "./coach.css";
import { ChevronLeft } from "lucide-react";
import type { CoachWeekReport } from "@/lib/coachTypes";
import { GradientRing, RING_AMBER, RING_GREEN } from "./GradientRing";
import { SmartLink } from "./SmartLink";
import { tr } from "@/lib/i18n";

export function coachSleepText(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** خط عددهای گزارش هفته: «روتین 86% · تمرین 4 از 4 · خواب 7:20» (بخش‌های پنهان نمی‌آیند) */
export function coachWeekLine(r: { routineRate: number | null; workoutsDone: number | null; workoutsPlanned?: number | null; sleepAvgMinutes: number | null }): string {
  const parts: string[] = [];
  if (r.routineRate != null) parts.push(tr(`روتین ${Math.round(r.routineRate)}%`, `Routine ${Math.round(r.routineRate)}%`));
  if (r.workoutsDone != null) parts.push(r.workoutsPlanned ? tr(`تمرین ${r.workoutsDone} از ${r.workoutsPlanned}`, `Workouts ${r.workoutsDone} of ${r.workoutsPlanned}`) : tr(`تمرین ${r.workoutsDone}`, `Workouts ${r.workoutsDone}`));
  if (r.sleepAvgMinutes != null) parts.push(tr(`خواب ${coachSleepText(r.sleepAvgMinutes)}`, `Sleep ${coachSleepText(r.sleepAvgMinutes)}`));
  return parts.join(" · ") || tr("هنوز داده‌ای نیست", "No data yet");
}

/** کارت گزارش هفته در خط زمانی: حلقه‌ی کوچک + عنوان + عددها + فلش. index = شماره‌ی هفته‌ی همکاری */
export function CoachWeekCard({ index, grade, routineRate, workoutsDone, workoutsPlanned, sleepAvgMinutes, href, title, unseen }: {
  index?: number; grade: CoachWeekReport["grade"]; routineRate: number | null; workoutsDone: number | null; workoutsPlanned?: number | null; sleepAvgMinutes: number | null;
  href: string; title?: string; unseen?: boolean;
}) {
  const heading = title ?? (index != null ? tr(`گزارش هفته‌ی ${index}`, `Week ${index} report`) : tr("گزارش هفته", "Week report"));
  return (
    <SmartLink href={href} className="ch-card ch-week-card">
      <GradientRing value={(routineRate ?? 0) / 100} size={52} stroke={7} grad={grade === "low" ? RING_AMBER : RING_GREEN} />
      <span className="ch-week-card-body">
        <span className="ch-week-card-title">{heading}{unseen && <i className="ch-dot" aria-label={tr("جدید", "New")} />}</span>
        <span className="ch-week-card-line">{coachWeekLine({ routineRate, workoutsDone, workoutsPlanned, sleepAvgMinutes })}</span>
      </span>
      <ChevronLeft size={18} className="ch-chev dir-flip" aria-hidden="true" />
    </SmartLink>
  );
}
