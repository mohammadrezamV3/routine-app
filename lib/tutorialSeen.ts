// کلید و خواندن «آموزش دیده شده» برای آموزش‌های تنبل (CalorieTutorial و
// ExerciseSetTutorial): خود پنجره‌ها فقط وقتی لازم شدن لود می‌شن، پس اینا باید
// بیرونشون و سبک باشن.
export const CALORIE_TUTORIAL_SEEN_KEY = "calorie-tutorial-seen";
export const EXERCISE_TUTORIAL_SEEN_KEY = "exercise-set-tutorial-seen";

export function hasSeenCalorieTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(CALORIE_TUTORIAL_SEEN_KEY) === "1"; } catch { return true; }
}
