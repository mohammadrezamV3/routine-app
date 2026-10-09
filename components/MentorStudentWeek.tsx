"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleDashed, EyeOff, Minus, X } from "lucide-react";
import { Spinner } from "./Spinner";
import { MI, MI_STROKE, MentorChip, MentorEmpty } from "./MentorUI";
import { fa } from "./MentorDashKit";
import { fmtDate, fmtWeekday } from "@/lib/mentorFormat";
import { weekdayShort, isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import { toEnDigits } from "@/lib/schedule";
import type { MentorRoutineSlot } from "@/lib/mentorTypes";
import type { StudentPrivacySummary } from "./MentorStudentTypes";

type Routine = { scheduleHidden: boolean; slots: MentorRoutineSlot[] };
type DayState = "full" | "partial" | "none" | "pending" | "rest" | "hidden";

const privateText = () => tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private");

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

const slotsOf = (routine: Routine, day: string) => routine.slots.filter((s) => s.jsDay === new Date(day + "T12:00:00").getDay());
const isDone = (s: MentorRoutineSlot, day: string) => !!s.done && Object.prototype.hasOwnProperty.call(s.done, day) && !!s.done[day];

function dayState(routine: Routine, day: string, today: string): { state: DayState; done: number; total: number } {
  const slots = slotsOf(routine, day);
  if (slots.length === 0) return { state: "rest", done: 0, total: 0 };
  if (slots.some((s) => s.done === null)) return { state: "hidden", done: 0, total: slots.length };
  const done = slots.filter((s) => isDone(s, day)).length;
  if (day > today) return { state: "pending", done, total: slots.length };
  if (done === slots.length) return { state: "full", done, total: slots.length };
  if (done > 0) return { state: "partial", done, total: slots.length };
  return { state: day === today ? "pending" : "none", done, total: slots.length };
}

/** درصد انجام برنامه‌ی روتین در بازه (روزهای تا امروز)؛ null = پیشرفت یا برنامه خصوصی/خالیه */
export function weekRate(routine: Routine, from: string, to: string): number | null {
  if (routine.scheduleHidden) return null;
  const today = isoLocal(new Date());
  let done = 0, total = 0;
  for (const day of daysBetween(from, to)) {
    if (day > today) continue;
    const slots = slotsOf(routine, day);
    for (const s of slots) {
      if (s.done === null) return null;
      total += 1;
      if (isDone(s, day)) done += 1;
    }
  }
  return total === 0 ? null : done / total;
}

const stateText = (): Record<DayState, string> => ({ full: tr("کامل", "Complete"), partial: tr("نیمه", "Partial"), none: tr("نشده", "Missed"), pending: tr("در راهه", "Pending"), rest: tr("بدون برنامه", "No plan"), hidden: tr("خصوصی", "Private") });
const ICON = { size: 16, strokeWidth: 2, "aria-hidden": true } as const;

function Mark({ state }: { state: DayState }) {
  if (state === "full") return <Check {...ICON} />;
  if (state === "partial") return <CircleDashed {...ICON} />;
  if (state === "none") return <X {...ICON} />;
  if (state === "hidden") return <EyeOff {...ICON} />;
  return <Minus {...ICON} />;
}

/**
 * هفته‌ی روتین شاگرد از خروجی `projectRoutineForMentor`: نوار 7 روزه‌ی درشت
 * با علامت و متن وضعیت هر روز، و فهرست کارهای روز انتخاب‌شده. done=null یعنی
 * شاگرد پیشرفت رو خصوصی کرده؛ عنوان «مشغول» یعنی نام کار پنهونه.
 */
export function MentorStudentWeek({
  from, to, routine, privacy, loading, canPrev, canNext, onPrev, onNext,
}: {
  from: string; to: string; routine: Routine; privacy: StudentPrivacySummary;
  loading?: boolean; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void;
}) {
  const today = isoLocal(new Date());
  const days = useMemo(() => daysBetween(from, to), [from, to]);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(null); }, [from, to]);
  const selected = picked && days.includes(picked) ? picked : days.includes(today) ? today : days[days.length - 1];

  const nav = (
    <div className="mv2-st-weeknav">
      <button type="button" className="trade-icon-btn mv2-st-arrow" aria-label={tr("هفته‌ی قبل", "Previous week")} onClick={onPrev} disabled={!canPrev || loading}>
        <ChevronRight size={18} strokeWidth={MI_STROKE} className="dir-flip" aria-hidden />
      </button>
      <span className="mv2-st-weeklabel" aria-live="polite">
        {loading ? <Spinner size={14} /> : <>{tr(`${fmtDate(from)} تا ${fmtDate(to)}`, `${fmtDate(from)} to ${fmtDate(to)}`)}</>}
      </span>
      <button type="button" className="trade-icon-btn mv2-st-arrow" aria-label={tr("هفته‌ی بعد", "Next week")} onClick={onNext} disabled={!canNext || loading}>
        <ChevronLeft size={18} strokeWidth={MI_STROKE} className="dir-flip" aria-hidden />
      </button>
    </div>
  );

  if (routine.scheduleHidden) {
    return <div>{nav}<MentorEmpty icon={<EyeOff size={MI.chip} strokeWidth={MI_STROKE} aria-hidden />}>{privateText()}</MentorEmpty></div>;
  }
  if (routine.slots.length === 0) {
    return (
      <div>
        {nav}
        <MentorEmpty>
          {!privacy.shareAllPrograms && privacy.sharedCount === 0
            ? tr("شاگرد هنوز برنامه‌ای با تو به اشتراک نذاشته", "The student has not shared any programs with you yet")
            : tr("برنامه‌ای برای نمایش نیست", "No programs to show")}
        </MentorEmpty>
      </div>
    );
  }

  const selSlots = slotsOf(routine, selected).slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div>
      {nav}
      <ul className="mv2-st-strip" aria-label={tr("روزهای هفته", "Days of the week")}>
        {days.map((day) => {
          const st = dayState(routine, day, today);
          const d = new Date(day + "T12:00:00");
          const on = day === selected;
          return (
            <li key={day}>
              <button
                type="button" className={`mv2-st-day mv2-st-s-${st.state}${on ? " is-on" : ""}`} aria-pressed={on}
                aria-label={`${fmtWeekday(day)}: ${stateText()[st.state]}`}
                onClick={() => setPicked(day)}
              >
                <span className="mv2-st-day-name">{weekdayShort(d.getDay())}</span>
                <span className="mv2-st-day-mark"><Mark state={st.state} /></span>
                <span className="mv2-st-day-text">{stateText()[st.state]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!privacy.showProgress && (
        <p className="mentor-muted"><EyeOff size={MI.chip} strokeWidth={MI_STROKE} aria-hidden /> {tr("پیشرفت روزانه رو شاگرد خصوصی نگه داشته؛ فقط زمان‌بندی دیده می‌شه", "The student keeps daily progress private; only the schedule is visible")}</p>
      )}

      <h3 className="mv2-st-dayhead">
        {fmtWeekday(selected)}
        {selected === today && <MentorChip tone="accent">{tr("امروز", "Today")}</MentorChip>}
      </h3>
      {selSlots.length === 0 ? (
        <MentorEmpty>{tr("این روز برنامه‌ای نداره", "Nothing planned for this day")}</MentorEmpty>
      ) : (
        <ul className="mv2-st-items">
          {selSlots.map((s, i) => {
            const future = selected > today;
            const state: DayState = s.done === null ? "hidden" : isDone(s, selected) ? "full" : future ? "pending" : selected === today ? "pending" : "none";
            const masked = (s.title === "مشغول" || s.title === "Busy") && !privacy.showTaskName;
            return (
              <li key={`${s.time}-${i}`} className="mv2-st-item">
                <span className={`mv2-st-item-mark mv2-st-s-${state}`}><Mark state={state} /></span>
                <span className="mv2-st-item-body">
                  <span className={`mv2-st-item-title${masked ? " is-muted" : ""}`}>{masked ? tr("مشغول", "Busy") : s.title}</span>
                  <span className="mv2-st-item-meta">
                    <span dir="ltr">{toEnDigits(s.time).replace(/\s*[-–—]\s*/, " – ")}</span>
                    {s.program && <span>{s.program}</span>}
                  </span>
                </span>
                <span className={`mv2-st-item-state mv2-st-s-${state}`}>{state === "pending" ? (selected === today ? tr("هنوز نشده", "Not yet") : tr("بعدا", "Later")) : stateText()[state]}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mentor-muted">{tr(`${fa(selSlots.filter((s) => isDone(s, selected)).length)} از ${fa(selSlots.length)} کار انجام شده`, `${fa(selSlots.filter((s) => isDone(s, selected)).length)} of ${fa(selSlots.length)} tasks done`)}</p>
    </div>
  );
}
