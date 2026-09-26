"use client";

import { Check, Dumbbell, EyeOff, Flame, X } from "lucide-react";
import { AccountBlock } from "./AccountUI";
import { MentorDashEmpty, fa } from "./MentorDashKit";
import { fmtDate, fmtWeekday } from "@/lib/mentorFormat";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/exercisePlans";
import { CALORIE_GOAL_LABELS } from "@/lib/calorieCalc";
import type { StudentView } from "./MentorStudentTypes";

const PHASE_LABELS: Record<string, string> = { bulk: "حجم", cut: "کات", maintenance: "حفظ", none: "بدون فاز" };

function label(map: Record<string, string>, key: string | null | undefined): string | null {
  if (!key) return null;
  return map[key] ?? key;
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] text-dash-muted">{k}</div>
      <div className="truncate text-[12.5px] font-bold text-dash-text">{v}</div>
    </div>
  );
}

/**
 * خلاصه‌ی ماژول‌های بدنسازی/کالریِ شاگرد — فقط وقتی شاگرد اون ماژول رو برای
 * همین منتور باز کرده. محتوای برنامه/اسم غذاها هیچ‌وقت از سرور نمیاد.
 */
export function MentorStudentModules({ modules }: { modules: StudentView["modules"] }) {
  const { exercise, calorie } = modules;
  if (!exercise && !calorie) return null;

  return (
    <>
      {exercise && (
        <AccountBlock title="بدنسازی" icon={<Dumbbell size={15} />} index={2}>
          {!exercise.hasPlan ? (
            <MentorDashEmpty>شاگرد برنامه‌ی تمرینی فعالی در آریون نداره.</MentorDashEmpty>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fact k="سطح" v={label(LEVEL_LABELS, exercise.level) ?? "—"} />
                <Fact k="هدف" v={label(GOAL_LABELS, exercise.goal) ?? "—"} />
                <Fact k="فاز" v={label(PHASE_LABELS, exercise.trainingPhase) ?? "—"} />
                <Fact k="شروع" v={fmtDate(exercise.startDate) || "—"} />
              </div>
              <div className="mt-3 text-[11.5px] leading-6 text-dash-muted">
                {exercise.gymDays === null ? (
                  <span className="flex items-center gap-1.5"><EyeOff size={13} /> روزهای تمرین مخفی است</span>
                ) : exercise.gymDays.length ? (
                  <>روزهای تمرین: <span className="text-dash-text">{exercise.gymDays.join("، ")}</span></>
                ) : "روز تمرینی مشخص نشده"}
              </div>
              {exercise.progress === null ? (
                <p className="mb-0 mt-2 flex items-center gap-1.5 text-[11.5px] text-dash-muted"><EyeOff size={13} /> اجرای تمرین‌ها مخفی است</p>
              ) : (
                <div className="mt-3 border-t border-dash-border pt-3">
                  <div className="text-[12px] font-bold text-dash-text">
                    {fa(exercise.progress.completed)} از {fa(exercise.progress.planned)} جلسه‌ی برنامه‌ریزی‌شده انجام شد
                  </div>
                  {exercise.progress.days.length > 0 && (
                    <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                      {exercise.progress.days.map((d) => (
                        <li key={d.date} className="flex items-center gap-2 text-[11.5px] text-dash-muted">
                          {d.completed ? <Check size={13} style={{ color: "var(--accent)" }} /> : <X size={13} style={{ color: "#E05252" }} />}
                          <span className="text-dash-text">{fmtWeekday(d.date)}</span>
                          <span>· {fa(d.itemsDone)} حرکت</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </AccountBlock>
      )}

      {calorie && (
        <AccountBlock title="کالری" icon={<Flame size={15} />} index={2}>
          {!calorie.hasTarget ? (
            <MentorDashEmpty>شاگرد هدف کالری تعیین نکرده.</MentorDashEmpty>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact k="هدف روزانه" v={calorie.dailyTargetKcal != null ? `${fa(calorie.dailyTargetKcal)} کالری` : "—"} />
              <Fact k="هدف" v={label(CALORIE_GOAL_LABELS, calorie.goal) ?? "—"} />
              {calorie.macros ? (
                <>
                  <Fact k="پروتئین / کربو" v={`${calorie.macros.proteinG != null ? fa(calorie.macros.proteinG) : "—"} / ${calorie.macros.carbsG != null ? fa(calorie.macros.carbsG) : "—"} گرم`} />
                  <Fact k="چربی" v={calorie.macros.fatG != null ? `${fa(calorie.macros.fatG)} گرم` : "—"} />
                </>
              ) : (
                <Fact k="درشت‌مغذی‌ها" v={<span className="flex items-center gap-1 font-normal text-dash-muted"><EyeOff size={12} /> مخفی</span>} />
              )}
            </div>
          )}
          {calorie.progress === null ? (
            <p className="mb-0 mt-3 flex items-center gap-1.5 text-[11.5px] text-dash-muted"><EyeOff size={13} /> ثبت‌های روزانه مخفی است</p>
          ) : (
            <div className="mt-3 border-t border-dash-border pt-3">
              <div className="text-[12px] font-bold text-dash-text">
                {calorie.hasTarget ? `${fa(calorie.progress.successDays)} روز در محدوده‌ی هدف` : "ثبت‌های روزانه"}
              </div>
              {calorie.progress.days.length === 0 ? (
                <MentorDashEmpty>در این بازه چیزی ثبت نشده.</MentorDashEmpty>
              ) : (
                <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                  {calorie.progress.days.map((d) => {
                    const over = calorie.dailyTargetKcal != null && d.kcal > calorie.dailyTargetKcal;
                    return (
                      <li key={d.date} className="flex items-center justify-between gap-2 text-[11.5px]">
                        <span className="text-dash-text">{fmtWeekday(d.date)}</span>
                        <span style={{ color: over ? "#E05252" : "var(--muted)" }}>{fa(d.kcal)} کالری</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </AccountBlock>
      )}
    </>
  );
}
