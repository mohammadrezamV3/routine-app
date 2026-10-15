"use client";

import "./mentor.css";
import { Check, Minus } from "lucide-react";
import { fa } from "./MentorDashKit";
import type { StudentPrivacySummary, StudentView } from "./MentorStudentTypes";
import { tr } from "@/lib/i18n";

const ICON = { size: 16, strokeWidth: 2, "aria-hidden": true } as const;

/**
 * «چیزهایی که با تو به اشتراک گذاشته»: فهرست ساده؛ هر خط با علامت و متن
 * (دیده می‌شه / خصوصی). تنظیمات رو خود شاگرد تعیین می‌کنه.
 */
export function MentorStudentPrivacy({
  privacy: p, modules, scheduleHidden,
}: { privacy: StudentPrivacySummary; modules: StudentView["modules"]; scheduleHidden: boolean }) {
  const programsText = p.shareAllPrograms ? tr("همه‌ی برنامه‌ها", "All programs") : p.sharedCount > 0 ? tr(`${fa(p.sharedCount)} برنامه`, `${fa(p.sharedCount)} ${p.sharedCount === 1 ? "program" : "programs"}`) : tr("برنامه‌های روتین", "Routine programs");
  const lines: { key: string; label: string; on: boolean }[] = [
    { key: "programs", label: programsText, on: p.shareAllPrograms || p.sharedCount > 0 },
    { key: "schedule", label: tr("زمان‌بندی", "Schedule"), on: !scheduleHidden && p.showSchedule },
    { key: "programName", label: tr("نام برنامه‌ها", "Program names"), on: p.showProgramName },
    { key: "taskName", label: tr("عنوان کارها", "Task titles"), on: p.showTaskName },
    { key: "taskDetails", label: tr("جزئیات کارها", "Task details"), on: p.showTaskDetails },
    { key: "progress", label: tr("پیشرفت روزانه", "Daily progress"), on: p.showProgress },
    { key: "exercise", label: tr("بدنسازی", "Workout"), on: modules.exercise !== null },
    { key: "calorie", label: tr("کالری", "Calories"), on: modules.calorie !== null },
  ];
  return (
    <ul className="mv2-st-shared">
      {lines.map((l) => (
        <li key={l.key} className={l.on ? "is-on" : "is-off"}>
          {l.on ? <Check {...ICON} /> : <Minus {...ICON} />}
          <span>{l.label}</span>
          {!l.on && <span className="mv2-st-shared-note">{tr("خصوصیه", "Private")}</span>}
        </li>
      ))}
    </ul>
  );
}
