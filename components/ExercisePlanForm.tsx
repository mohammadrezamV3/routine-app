"use client";

import { FA_WEEKDAY, CAL_WEEK_ORDER } from "@/lib/jalali";
import { LEVEL_LABELS, GOAL_LABELS, ExerciseLevel, ExerciseGoal, getRequiredDaysCount } from "@/lib/exercisePlans";
import { ExercisePlanFormValue, PHASE_LABELS, TrainingPhase } from "@/lib/exerciseTypes";

export function ExercisePlanForm({
  value,
  onChange,
}: {
  value: ExercisePlanFormValue;
  onChange: (patch: Partial<ExercisePlanFormValue>) => void;
}) {
  function toggleDay(day: string) {
    onChange({
      gymDays: value.gymDays.includes(day) ? value.gymDays.filter((d) => d !== day) : [...value.gymDays, day],
    });
  }

  const requiredDays = value.goal ? getRequiredDaysCount(value.goal, value.level) : null;

  return (
    <>
      <label className="exercise-form-label">
        کدوم روزها می‌ری باشگاه؟
        {requiredDays !== null && (
          <span style={{ color: "var(--muted2)", fontWeight: 400 }}>
            {" "}
            (حداقل {requiredDays} روز برای این برنامه لازمه)
          </span>
        )}
      </label>
      <div className="exercise-day-select">
        {CAL_WEEK_ORDER.map((i) => FA_WEEKDAY[i]).map((d) => (
          <span key={d} className={`day-pill${value.gymDays.includes(d) ? " on" : ""}`} onClick={() => toggleDay(d)}>
            {d}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label className="exercise-form-label">قد (سانتی‌متر)</label>
          <input type="number" className="wsearch-newform-name" value={value.heightCm} onChange={(e) => onChange({ heightCm: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="exercise-form-label">وزن (کیلوگرم)</label>
          <input type="number" className="wsearch-newform-name" value={value.weightKg} onChange={(e) => onChange({ weightKg: e.target.value })} />
        </div>
      </div>

      <label className="exercise-form-label">سطح</label>
      <div className="day-picker">
        {(["beginner", "intermediate", "advanced"] as ExerciseLevel[]).map((l) => (
          <span key={l} className={`day-pill${value.level === l ? " on" : ""}`} onClick={() => onChange({ level: l })}>
            {LEVEL_LABELS[l]}
          </span>
        ))}
      </div>

      <label className="exercise-form-label">هدف تمرین</label>
      <div className="day-picker" style={{ flexWrap: "wrap" }}>
        {(Object.keys(GOAL_LABELS) as ExerciseGoal[]).map((g) => (
          <span
            key={g}
            className={`day-pill${value.goal === g ? " on" : ""}`}
            onClick={() => onChange({ goal: g })}
            style={{ flex: "1 1 calc(50% - 4px)" }}
          >
            {GOAL_LABELS[g]}
          </span>
        ))}
      </div>

      <label className="exercise-form-label">دوره‌ی تمرینی‌ات چیه؟</label>
      <div className="day-picker" style={{ flexWrap: "wrap" }}>
        {(Object.keys(PHASE_LABELS) as TrainingPhase[]).map((p) => (
          <span
            key={p}
            className={`day-pill${value.trainingPhase === p ? " on" : ""}`}
            onClick={() => onChange({ trainingPhase: p })}
            style={{ flex: "1 1 calc(50% - 4px)" }}
          >
            {PHASE_LABELS[p]}
          </span>
        ))}
      </div>

      <div className="task" style={{ marginTop: 14, cursor: "pointer" }} onClick={() => onChange({ hasLimitation: !value.hasLimitation })}>
        <div className={`check${value.hasLimitation ? " on" : ""}`}>
          <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="task-name">محدودیت جسمی دارم (بدون جزئیات، فقط برای احتیاط بیشتر)</div>
      </div>
    </>
  );
}

export function validateExerciseForm(value: ExercisePlanFormValue): string | null {
  if (!value.goal) return "انتخاب هدف تمرین لازمه";
  if (value.gymDays.length === 0) return "حداقل یک روز باشگاه رو انتخاب کن";
  const requiredDays = getRequiredDaysCount(value.goal, value.level);
  if (value.gymDays.length < requiredDays) return `این برنامه حداقل ${requiredDays} روز در هفته لازم داره`;
  if (!value.heightCm || !value.weightKg) return "قد و وزن لازمه";
  return null;
}
