"use client";

import { Check, EyeOff, Minus, X } from "lucide-react";
import { MentorDashEmpty } from "./MentorDashKit";
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

/**
 * تایم‌لاینِ هفته‌ی روتینِ شاگرد، از خروجیِ `projectRoutineForMentor`.
 * عنوانِ «مشغول» و program=null یعنی شاگرد اسم رو مخفی کرده؛ done=null یعنی
 * پیشرفت مخفیه (هیچ تیک/ضربدری نشون داده نمی‌شه).
 */
export function MentorStudentWeek({
  from, to, routine, privacy,
}: { from: string; to: string; routine: { scheduleHidden: boolean; slots: MentorRoutineSlot[] }; privacy: StudentPrivacySummary }) {
  if (routine.scheduleHidden) {
    return (
      <p className="m-0 flex items-center justify-center gap-1.5 py-3 text-[12px] text-dash-muted">
        <EyeOff size={14} /> برنامه زمانی مخفی است
      </p>
    );
  }
  if (routine.slots.length === 0) {
    return (
      <MentorDashEmpty>
        {!privacy.shareAllPrograms && privacy.sharedCount === 0
          ? "شاگرد هنوز هیچ برنامه‌ای رو باهات به اشتراک نگذاشته."
          : "برنامه‌ی روتینِ قابل نمایشی نیست."}
      </MentorDashEmpty>
    );
  }

  const today = isoLocal(new Date());
  const days = daysBetween(from, to);

  return (
    <div className="flex flex-col">
      {!privacy.showProgress && (
        <p className="mb-2 mt-0 flex items-center gap-1.5 text-[11px] text-dash-muted"><EyeOff size={12} /> پیشرفت روزانه مخفی است — فقط زمان‌بندی نمایش داده می‌شه.</p>
      )}
      {days.map((day) => {
        const js = new Date(day + "T12:00:00").getDay();
        const slots = routine.slots.filter((s) => s.jsDay === js);
        const future = day > today;
        return (
          <div key={day} className="border-b border-dash-border py-2.5 last:border-b-0">
            <div className="mb-1.5 flex items-center gap-2 text-[12px] font-bold" style={{ color: day === today ? "var(--accent)" : "var(--text)" }}>
              {fmtWeekday(day)}
              {day === today && <span className="text-[10.5px] font-semibold">(امروز)</span>}
            </div>
            {slots.length === 0 ? (
              <div className="text-[11px] text-dash-muted">—</div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {slots.map((s, i) => {
                  const state = s.done === null ? null : Object.prototype.hasOwnProperty.call(s.done, day) ? (s.done[day] ? "done" : future ? "none" : "missed") : "none";
                  const imp = s.details?.importance as Importance | undefined;
                  return (
                    <li key={`${s.time}-${i}`} className="flex items-start gap-2.5 text-[12px] leading-6">
                      <span className="mono w-[44px] shrink-0 text-dash-muted" dir="ltr">{toFaDigits(s.time)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block" style={{ color: s.title === "مشغول" && !privacy.showTaskName ? "var(--muted)" : "var(--text)" }}>{s.title}</span>
                        {(s.program || (imp && IMPORTANCE_LABELS[imp])) && (
                          <span className="block text-[10.5px] text-dash-muted">
                            {s.program ?? ""}
                            {s.program && imp && IMPORTANCE_LABELS[imp] ? " · " : ""}
                            {imp && IMPORTANCE_LABELS[imp] ? `اهمیت ${IMPORTANCE_LABELS[imp]}` : ""}
                          </span>
                        )}
                      </span>
                      {state === "done" && <Check size={15} className="mt-1 shrink-0" style={{ color: "var(--accent)" }} aria-label="انجام شد" />}
                      {state === "missed" && <X size={15} className="mt-1 shrink-0" style={{ color: "#E05252" }} aria-label="انجام نشد" />}
                      {state === "none" && <Minus size={15} className="mt-1 shrink-0 text-dash-muted" aria-label="ثبت نشده" />}
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
