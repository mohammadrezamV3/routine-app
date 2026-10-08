"use client";

import { CheckCircle2, Dumbbell, EyeOff, Flame, XCircle, AlertCircle } from "lucide-react";
import { fa } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorRow, MentorSection } from "./MentorUI";
import { fmtDate, fmtWeekday } from "@/lib/mentorFormat";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/exercisePlans";
import { CALORIE_GOAL_LABELS } from "@/lib/calorieCalc";
import type { StudentView } from "./MentorStudentTypes";

const PHASE_LABELS: Record<string, string> = { bulk: "افزایش حجم", cut: "کم‌کردن وزن", maintenance: "حفظ وزن", none: "بدون مرحله" };

const ic = (Icon: typeof Flame, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

function label(map: Record<string, string>, key: string | null | undefined): string | null {
  if (!key) return null;
  return map[key] ?? key;
}

/** ردیف واقعیت‌های کوتاه: برچسب کوچک بالا، مقدار زیرش */
function Facts({ items }: { items: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((f) => (
        <div key={f.k} className="min-w-0">
          <dt className="mentor-field-hint">{f.k}</dt>
          <dd className="m-0 mentor-row-title">{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** یک خط «مخفی است» — بخش مخفی صریح گفته می‌شود تا با «ثبت نشده» اشتباه نشود */
function Hidden({ children }: { children: React.ReactNode }) {
  return <MentorEmpty icon={ic(EyeOff, MI.chip)}>{children}</MentorEmpty>;
}

/**
 * خلاصه‌ی ماژول‌های بدنسازی و کالری شاگرد؛ فقط وقتی شاگرد آن ماژول را برای
 * همین منتور باز کرده. محتوای برنامه و نام غذاها هیچ‌وقت از سرور نمی‌آید.
 */
export function MentorStudentModules({ modules }: { modules: StudentView["modules"] }) {
  const { exercise, calorie } = modules;
  if (!exercise && !calorie) return null;

  return (
    <>
      {exercise && (
        <MentorSection title="بدنسازی" icon={ic(Dumbbell, MI.section)}>
          {!exercise.hasPlan ? (
            <MentorEmpty>شاگرد هنوز برنامه‌ی تمرینی فعالی نداره</MentorEmpty>
          ) : (
            <>
              <Facts
                items={[
                  { k: "سطح", v: label(LEVEL_LABELS, exercise.level) ?? "نامشخص" },
                  { k: "هدف", v: label(GOAL_LABELS, exercise.goal) ?? "نامشخص" },
                  { k: "مرحله", v: label(PHASE_LABELS, exercise.trainingPhase) ?? "نامشخص" },
                  { k: "شروع", v: fmtDate(exercise.startDate) || "نامشخص" },
                ]}
              />
              <div style={{ marginTop: "var(--m-3)" }}>
                {exercise.gymDays === null ? (
                  <Hidden>این بخش رو شاگرد خصوصی نگه داشته</Hidden>
                ) : (
                  <p className="mentor-muted">
                    {exercise.gymDays.length ? `روزهای تمرین: ${exercise.gymDays.join("، ")}` : "روز تمرینی مشخص نشده است"}
                  </p>
                )}
              </div>
              {exercise.progress === null ? (
                <Hidden>این بخش رو شاگرد خصوصی نگه داشته</Hidden>
              ) : (
                <div style={{ marginTop: "var(--m-2)" }}>
                  <p className="mentor-muted">
                    {fa(exercise.progress.completed)} از {fa(exercise.progress.planned)} جلسه‌ی برنامه‌ریزی‌شده انجام شد
                  </p>
                  {exercise.progress.days.map((d) => (
                    <MentorRow
                      key={d.date}
                      title={fmtWeekday(d.date)}
                      sub={<span>{fa(d.itemsDone)} حرکت</span>}
                      end={d.completed
                        ? <MentorChip tone="ok" icon={ic(CheckCircle2, MI.chip)}>انجام شد</MentorChip>
                        : <MentorChip tone="danger" icon={ic(XCircle, MI.chip)}>انجام نشد</MentorChip>}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </MentorSection>
      )}

      {calorie && (
        <MentorSection title="کالری" icon={ic(Flame, MI.section)}>
          {!calorie.hasTarget ? (
            <MentorEmpty>شاگرد هنوز هدف کالری نذاشته</MentorEmpty>
          ) : (
            <Facts
              items={[
                { k: "هدف روزانه", v: calorie.dailyTargetKcal != null ? `${fa(calorie.dailyTargetKcal)} کالری` : "نامشخص" },
                { k: "هدف", v: label(CALORIE_GOAL_LABELS, calorie.goal) ?? "نامشخص" },
                ...(calorie.macros
                  ? [
                      { k: "پروتئین", v: calorie.macros.proteinG != null ? `${fa(calorie.macros.proteinG)} گرم` : "نامشخص" },
                      { k: "کربوهیدرات / چربی", v: `${calorie.macros.carbsG != null ? fa(calorie.macros.carbsG) : "نامشخص"} / ${calorie.macros.fatG != null ? fa(calorie.macros.fatG) : "نامشخص"} گرم` },
                    ]
                  : [{ k: "پروتئین، کربوهیدرات، چربی", v: "خصوصی" }]),
              ]}
            />
          )}
          {calorie.progress === null ? (
            <Hidden>این بخش رو شاگرد خصوصی نگه داشته</Hidden>
          ) : (
            <div style={{ marginTop: "var(--m-3)" }}>
              {calorie.hasTarget && (
                <p className="mentor-muted">{fa(calorie.progress.successDays)} روز در محدوده‌ی هدف</p>
              )}
              {calorie.progress.days.length === 0 ? (
                <MentorEmpty>در این هفته ثبتی نیست</MentorEmpty>
              ) : calorie.progress.days.map((d) => {
                const over = calorie.dailyTargetKcal != null && d.kcal > calorie.dailyTargetKcal;
                return (
                  <MentorRow
                    key={d.date}
                    title={fmtWeekday(d.date)}
                    sub={<span>{fa(d.kcal)} کالری</span>}
                    end={over ? <MentorChip tone="warn" icon={ic(AlertCircle, MI.chip)}>بیش از هدف</MentorChip> : undefined}
                  />
                );
              })}
            </div>
          )}
        </MentorSection>
      )}
    </>
  );
}
