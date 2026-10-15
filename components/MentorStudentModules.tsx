"use client";

import { CheckCircle2, Dumbbell, EyeOff, Flame, XCircle, AlertCircle } from "lucide-react";
import { fa } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorRow, MentorSection } from "./MentorUI";
import { fmtDate, fmtWeekday } from "@/lib/mentorFormat";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/exercisePlans";
import { CALORIE_GOAL_LABELS } from "@/lib/calorieCalc";
import type { StudentView } from "./MentorStudentTypes";
import { tr } from "@/lib/i18n";

const phaseLabels = (): Record<string, string> => ({ bulk: tr("افزایش حجم", "Muscle gain"), cut: tr("کم‌کردن وزن", "Weight loss"), maintenance: tr("حفظ وزن", "Maintenance"), none: tr("بدون مرحله", "No phase") });

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
        <MentorSection title={tr("بدنسازی", "Workout")} icon={ic(Dumbbell, MI.section)}>
          {!exercise.hasPlan ? (
            <MentorEmpty>{tr("شاگرد هنوز برنامه‌ی تمرینی فعالی نداره", "The student has no active workout plan yet")}</MentorEmpty>
          ) : (
            <>
              <Facts
                items={[
                  { k: tr("سطح", "Level"), v: label(LEVEL_LABELS, exercise.level) ?? tr("نامشخص", "Unknown") },
                  { k: tr("هدف", "Goal"), v: label(GOAL_LABELS, exercise.goal) ?? tr("نامشخص", "Unknown") },
                  { k: tr("مرحله", "Phase"), v: label(phaseLabels(), exercise.trainingPhase) ?? tr("نامشخص", "Unknown") },
                  { k: tr("شروع", "Start"), v: fmtDate(exercise.startDate) || tr("نامشخص", "Unknown") },
                ]}
              />
              <div style={{ marginTop: "var(--m-3)" }}>
                {exercise.gymDays === null ? (
                  <Hidden>{tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private")}</Hidden>
                ) : (
                  <p className="mentor-muted">
                    {exercise.gymDays.length ? tr(`روزهای تمرین: ${exercise.gymDays.join("، ")}`, `Workout days: ${exercise.gymDays.join(", ")}`) : tr("روز تمرینی مشخص نشده است", "No workout days set")}
                  </p>
                )}
              </div>
              {exercise.progress === null ? (
                <Hidden>{tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private")}</Hidden>
              ) : (
                <div style={{ marginTop: "var(--m-2)" }}>
                  <p className="mentor-muted">
                    {tr(`${fa(exercise.progress.completed)} از ${fa(exercise.progress.planned)} جلسه‌ی برنامه‌ریزی‌شده انجام شد`, `${fa(exercise.progress.completed)} of ${fa(exercise.progress.planned)} planned sessions done`)}
                  </p>
                  {exercise.progress.days.map((d) => (
                    <MentorRow
                      key={d.date}
                      title={fmtWeekday(d.date)}
                      sub={<span>{tr(`${fa(d.itemsDone)} حرکت`, `${fa(d.itemsDone)} ${d.itemsDone === 1 ? "exercise" : "exercises"}`)}</span>}
                      end={d.completed
                        ? <MentorChip tone="ok" icon={ic(CheckCircle2, MI.chip)}>{tr("انجام شد", "Done")}</MentorChip>
                        : <MentorChip tone="danger" icon={ic(XCircle, MI.chip)}>{tr("انجام نشد", "Not done")}</MentorChip>}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </MentorSection>
      )}

      {calorie && (
        <MentorSection title={tr("کالری", "Calories")} icon={ic(Flame, MI.section)}>
          {!calorie.hasTarget ? (
            <MentorEmpty>{tr("شاگرد هنوز هدف کالری نذاشته", "The student has not set a calorie goal yet")}</MentorEmpty>
          ) : (
            <Facts
              items={[
                { k: tr("هدف روزانه", "Daily goal"), v: calorie.dailyTargetKcal != null ? tr(`${fa(calorie.dailyTargetKcal)} کالری`, `${fa(calorie.dailyTargetKcal)} kcal`) : tr("نامشخص", "Unknown") },
                { k: tr("هدف", "Goal"), v: label(CALORIE_GOAL_LABELS, calorie.goal) ?? tr("نامشخص", "Unknown") },
                ...(calorie.macros
                  ? [
                      { k: tr("پروتئین", "Protein"), v: calorie.macros.proteinG != null ? tr(`${fa(calorie.macros.proteinG)} گرم`, `${fa(calorie.macros.proteinG)} g`) : tr("نامشخص", "Unknown") },
                      { k: tr("کربوهیدرات / چربی", "Carbs / fat"), v: tr(`${calorie.macros.carbsG != null ? fa(calorie.macros.carbsG) : "نامشخص"} / ${calorie.macros.fatG != null ? fa(calorie.macros.fatG) : "نامشخص"} گرم`, `${calorie.macros.carbsG != null ? fa(calorie.macros.carbsG) : "Unknown"} / ${calorie.macros.fatG != null ? fa(calorie.macros.fatG) : "Unknown"} g`) },
                    ]
                  : [{ k: tr("پروتئین، کربوهیدرات، چربی", "Protein, carbs, fat"), v: tr("خصوصی", "Private") }]),
              ]}
            />
          )}
          {calorie.progress === null ? (
            <Hidden>{tr("این بخش رو شاگرد خصوصی نگه داشته", "The student keeps this section private")}</Hidden>
          ) : (
            <div style={{ marginTop: "var(--m-3)" }}>
              {calorie.hasTarget && (
                <p className="mentor-muted">{tr(`${fa(calorie.progress.successDays)} روز در محدوده‌ی هدف`, `${fa(calorie.progress.successDays)} ${calorie.progress.successDays === 1 ? "day" : "days"} within the goal`)}</p>
              )}
              {calorie.progress.days.length === 0 ? (
                <MentorEmpty>{tr("در این هفته ثبتی نیست", "Nothing logged this week")}</MentorEmpty>
              ) : calorie.progress.days.map((d) => {
                const over = calorie.dailyTargetKcal != null && d.kcal > calorie.dailyTargetKcal;
                return (
                  <MentorRow
                    key={d.date}
                    title={fmtWeekday(d.date)}
                    sub={<span>{tr(`${fa(d.kcal)} کالری`, `${fa(d.kcal)} kcal`)}</span>}
                    end={over ? <MentorChip tone="warn" icon={ic(AlertCircle, MI.chip)}>{tr("بیش از هدف", "Over goal")}</MentorChip> : undefined}
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
