"use client";

import { FA_WEEKDAY, FA_WEEKDAY_SHORT } from "@/lib/jalali";
import { LEVEL_LABELS, GOAL_LABELS, ExerciseLevel, ExerciseGoal } from "@/lib/exercisePlans";
import { ExercisePlanFormValue, PHASE_LABELS, TrainingPhase } from "@/lib/exerciseTypes";
import { PillDropdown } from "./PillDropdown";

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

  return (
    <>
      <label className="exercise-form-label">کدوم روزها می‌ری باشگاه؟</label>
      <div className="exercise-day-select">
        {FA_WEEKDAY.map((d, i) => (
          <span key={d} className={`day-pill${value.gymDays.includes(d) ? " on" : ""}`} onClick={() => toggleDay(d)}>
            {FA_WEEKDAY_SHORT[i]}
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
      <PillDropdown
        value={value.goal}
        options={(Object.keys(GOAL_LABELS) as ExerciseGoal[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
        placeholder="یک هدف انتخاب کن"
        onChange={(g) => onChange({ goal: g })}
      />

      <label className="exercise-form-label">دوره‌ی تمرینی‌ات چیه؟</label>
      <PillDropdown
        value={value.trainingPhase}
        options={(Object.keys(PHASE_LABELS) as TrainingPhase[]).map((p) => ({ value: p, label: PHASE_LABELS[p] }))}
        placeholder="یک دوره انتخاب کن"
        onChange={(p) => onChange({ trainingPhase: p })}
      />

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
  if (!value.heightCm || !value.weightKg) return "قد و وزن لازمه";
  return null;
}
