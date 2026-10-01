"use client";

import "./mentor.css";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { MentorChip, MentorRow, MentorSection } from "./MentorUI";
import { fa } from "./MentorDashKit";
import type { StudentPrivacySummary, StudentView } from "./MentorStudentTypes";

const CHIP_ICON = { size: 13, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * «آنچه می‌بینی» — خلاصه‌ی تنظیمات حریم خصوصی شاگرد برای همین رابطه.
 * هر ردیف یک بخش است با یک چیپ (دیده می‌شود / مخفی) تا منتور خالی‌بودن
 * یک بخش را با «کاری نکرده» اشتباه نگیرد.
 */
export function MentorStudentPrivacy({
  privacy: p, modules, scheduleHidden,
}: { privacy: StudentPrivacySummary; modules: StudentView["modules"]; scheduleHidden: boolean }) {
  const scheduleOn = !scheduleHidden && p.showSchedule;
  const programsText = p.shareAllPrograms ? "همه" : p.sharedCount > 0 ? `${fa(p.sharedCount)} برنامه` : null;

  const lines: { key: string; label: string; on: boolean; onText?: string; sub?: string }[] = [
    { key: "programs", label: "برنامه‌های روتین", on: !!programsText, onText: programsText ?? undefined },
    { key: "schedule", label: "زمان‌بندی", on: scheduleOn },
    { key: "programName", label: "نام برنامه‌ها", on: p.showProgramName },
    { key: "taskName", label: "عنوان کارها", on: p.showTaskName, sub: p.showTaskName ? undefined : "به‌جای عنوان، «مشغول» نمایش داده می‌شود" },
    { key: "taskDetails", label: "جزئیات کارها", on: p.showTaskDetails },
    { key: "progress", label: "پیشرفت روزانه", on: p.showProgress },
    { key: "exercise", label: "بدنسازی", on: modules.exercise !== null },
    { key: "calorie", label: "کالری‌شمار", on: modules.calorie !== null },
  ];

  return (
    <MentorSection
      title="آنچه می‌بینی"
      icon={<ShieldCheck size={15} strokeWidth={1.75} aria-hidden />}
      desc="این تنظیمات را شاگرد تعیین می‌کند. برنامه‌هایی که خودت فرستاده‌ای همیشه دیده می‌شوند."
      flush
    >
      {lines.map((l) => (
        <MentorRow
          key={l.key}
          title={l.label}
          sub={l.sub ? <span>{l.sub}</span> : undefined}
          end={
            l.on ? (
              <MentorChip tone="accent" icon={<Eye {...CHIP_ICON} />}>{l.onText ?? "دیده می‌شود"}</MentorChip>
            ) : (
              <MentorChip tone="neutral" icon={<EyeOff {...CHIP_ICON} />}>مخفی</MentorChip>
            )
          }
        />
      ))}
    </MentorSection>
  );
}
