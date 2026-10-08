"use client";

import "./mentor.css";
import { Check, Minus } from "lucide-react";
import { fa } from "./MentorDashKit";
import type { StudentPrivacySummary, StudentView } from "./MentorStudentTypes";

const ICON = { size: 16, strokeWidth: 2, "aria-hidden": true } as const;

/**
 * «چیزهایی که با تو به اشتراک گذاشته»: فهرست ساده؛ هر خط با علامت و متن
 * (دیده می‌شه / خصوصی). تنظیمات رو خود شاگرد تعیین می‌کنه.
 */
export function MentorStudentPrivacy({
  privacy: p, modules, scheduleHidden,
}: { privacy: StudentPrivacySummary; modules: StudentView["modules"]; scheduleHidden: boolean }) {
  const programsText = p.shareAllPrograms ? "همه‌ی برنامه‌ها" : p.sharedCount > 0 ? `${fa(p.sharedCount)} برنامه` : "برنامه‌های روتین";
  const lines: { key: string; label: string; on: boolean }[] = [
    { key: "programs", label: programsText, on: p.shareAllPrograms || p.sharedCount > 0 },
    { key: "schedule", label: "زمان‌بندی", on: !scheduleHidden && p.showSchedule },
    { key: "programName", label: "نام برنامه‌ها", on: p.showProgramName },
    { key: "taskName", label: "عنوان کارها", on: p.showTaskName },
    { key: "taskDetails", label: "جزئیات کارها", on: p.showTaskDetails },
    { key: "progress", label: "پیشرفت روزانه", on: p.showProgress },
    { key: "exercise", label: "بدنسازی", on: modules.exercise !== null },
    { key: "calorie", label: "کالری", on: modules.calorie !== null },
  ];
  return (
    <ul className="mv2-st-shared">
      {lines.map((l) => (
        <li key={l.key} className={l.on ? "is-on" : "is-off"}>
          {l.on ? <Check {...ICON} /> : <Minus {...ICON} />}
          <span>{l.label}</span>
          {!l.on && <span className="mv2-st-shared-note">خصوصیه</span>}
        </li>
      ))}
    </ul>
  );
}
