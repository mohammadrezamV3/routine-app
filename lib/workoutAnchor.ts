// لنگر بخش‌های تمرین/تغذیه در داشبورد ورزش (?tab=exercise|calorie) — مشترک
// هیرو (حلقه‌ها) و خود بخش‌ها.

export type WorkoutPart = "exercise" | "calorie";

export const workoutSectionId = (part: WorkoutPart) => `db-sec-${part}`;

/** بخش رو وسط دید می‌آره؛ فقط بدون حرکت‌کاهی نرم اسکرول می‌کنه. true = بخش پیدا شد */
export function scrollToWorkoutSection(part: WorkoutPart): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(workoutSectionId(part));
  if (!el) return false;
  const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  return true;
}
