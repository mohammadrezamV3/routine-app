"use client";

import { CheckCircle2, EyeOff, Minus, XCircle } from "lucide-react";
import { MI, MI_STROKE, MentorChip, MentorEmpty } from "./MentorUI";
import { fmtWeekday } from "@/lib/mentorFormat";
import { isoLocal } from "@/lib/jalali";
import { toFaDigits } from "@/lib/schedule";
import { IMPORTANCE_LABELS, type Importance } from "@/lib/storage";
import type { MentorRoutineSlot } from "@/lib/mentorTypes";
import type { StudentPrivacySummary } from "./MentorStudentTypes";

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (d <= end && out.length < 31) {
    out.push(isoLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const STATE_ICON = { size: MI.row, strokeWidth: MI_STROKE } as const;

/**
 * هفته‌ی روتین شاگرد از خروجی `projectRoutineForMentor`.
 * عنوان «مشغول» و program=null یعنی شاگرد نام را مخفی کرده؛ done=null یعنی
 * پیشرفت مخفی است (هیچ علامت انجام/عدم انجامی نشان داده نمی‌شود).
 */
export function MentorStudentWeek({
  from, to, routine, privacy,
}: { from: string; to: string; routine: { scheduleHidden: boolean; slots: MentorRoutineSlot[] }; privacy: StudentPrivacySummary }) {
  if (routine.scheduleHidden) {
    return <MentorEmpty icon={<EyeOff size={MI.chip} strokeWidth={MI_STROKE} aria-hidden />}>برنامه‌ی زمانی مخفی است</MentorEmpty>;
  }
  if (routine.slots.length === 0) {
    return (
      <MentorEmpty>
        {!privacy.shareAllPrograms && privacy.sharedCount === 0
          ? "شاگرد هنوز برنامه‌ای با تو به اشتراک نگذاشته است"
          : "برنامه‌ی روتینی برای نمایش نیست"}
      </MentorEmpty>
    );
  }

  const today = isoLocal(new Date());
  const days = daysBetween(from, to);

  return (
    <div>
      {!privacy.showProgress && (
        <p className="mentor-muted flex items-center gap-1.5">
          <EyeOff size={MI.chip} strokeWidth={MI_STROKE} aria-hidden /> پیشرفت روزانه مخفی است؛ فقط زمان‌بندی نمایش داده می‌شود
        </p>
      )}
      {days.map((day) => {
        const js = new Date(day + "T12:00:00").getDay();
        const slots = routine.slots.filter((s) => s.jsDay === js);
        const future = day > today;
        return (
          <div key={day} className="mentor-item">
            <div className="mentor-item-head" style={{ alignItems: "center" }}>
              <span className="mentor-item-title">{fmtWeekday(day)}</span>
              {day === today && <MentorChip tone="accent">امروز</MentorChip>}
            </div>
            {slots.length === 0 ? (
              <div className="mentor-item-meta"><span>بدون برنامه</span></div>
            ) : (
              <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
                {slots.map((s, i) => {
                  const state = s.done === null ? null : Object.prototype.hasOwnProperty.call(s.done, day) ? (s.done[day] ? "done" : future ? "none" : "missed") : "none";
                  const imp = s.details?.importance as Importance | undefined;
                  const impLabel = imp && IMPORTANCE_LABELS[imp] ? `اهمیت ${IMPORTANCE_LABELS[imp]}` : null;
                  const masked = s.title === "مشغول" && !privacy.showTaskName;
                  return (
                    <li key={`${s.time}-${i}`} className="flex items-start gap-2.5 text-[12px] leading-6">
                      <span className="mono min-w-[44px] shrink-0 whitespace-nowrap text-dash-muted" dir="ltr">{toFaDigits(s.time).replace(/\s*[-–—]\s*/, " – ")}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block ${masked ? "text-dash-muted" : "text-dash-text"}`}>{s.title}</span>
                        {(s.program || impLabel) && (
                          <span className="mentor-row-sub">
                            {s.program && <span>{s.program}</span>}
                            {impLabel && <span>{impLabel}</span>}
                          </span>
                        )}
                      </span>
                      {state === "done" && <CheckCircle2 {...STATE_ICON} className="mt-1 shrink-0 text-[color:var(--m-ok)]" aria-label="انجام شد" />}
                      {state === "missed" && <XCircle {...STATE_ICON} className="mt-1 shrink-0 text-[color:var(--m-danger)]" aria-label="انجام نشد" />}
                      {state === "none" && <Minus {...STATE_ICON} className="mt-1 shrink-0 text-dash-muted" aria-label="ثبت نشده" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
