// ذخیره‌ی وضعیتِ تایمرِ پاپ‌آپِ ردیابیِ یک حرکت (ExerciseSetTrackerModal) توی
// localStorage — با یک epoch (endAt) به‌جای شمارشِ صرفِ عدد، تا هم رفرشِ
// صفحه هم بستن/بازکردنِ دوباره‌ی پاپ‌آپ پیشرفت رو از دست ندن (پاز هم دقیقاً
// همینه: به‌جای endAt، باقی‌مونده‌ی زمان یخ‌زده ذخیره می‌شه).

export type ExerciseTimerPhase = "timing" | "resting";

export type PersistedExerciseTimer = {
  completedSets: number;
  phase: ExerciseTimerPhase | null;
  /** epoch میلی‌ثانیه‌ای که این فاز طبیعی تموم می‌شه — فقط وقتی در حالِ اجراست */
  endAt: number | null;
  /** باقی‌مونده‌ی یخ‌زده‌ی میلی‌ثانیه‌ای — فقط وقتی پازه */
  pausedRemainingMs: number | null;
  /** برای محاسبه‌ی «کل زمانِ صرف‌شده» در پایان، حتی بعدِ رفرش */
  startedAt: number;
};

const KEY_PREFIX = "exercise-timer:";

function storageKey(planId: string, dateIso: string, item: string): string {
  return `${KEY_PREFIX}${planId}:${dateIso}:${item}`;
}

export function loadExerciseTimer(planId: string, dateIso: string, item: string): PersistedExerciseTimer | null {
  try {
    const raw = window.localStorage.getItem(storageKey(planId, dateIso, item));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedExerciseTimer;
  } catch {
    return null;
  }
}

export function saveExerciseTimer(planId: string, dateIso: string, item: string, state: PersistedExerciseTimer) {
  try {
    window.localStorage.setItem(storageKey(planId, dateIso, item), JSON.stringify(state));
  } catch {}
}

export function clearExerciseTimer(planId: string, dateIso: string, item: string) {
  try {
    window.localStorage.removeItem(storageKey(planId, dateIso, item));
  } catch {}
}
