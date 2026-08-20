import type { ExerciseDay, ExerciseGoalOption, ExerciseLevel } from "./exercisePlans";

export type ExercisePlan = {
  id: string;
  // پلن‌های دستی (بدونِ هوش‌مصنوعی/پرسش‌نامه) "custom" ذخیره می‌شن — سه‌تای
  // اصلی فقط برای پلن‌های ساخته‌شده با فرمِ سطح/هدف (AI یا fallback) صدق می‌کنه.
  level: ExerciseLevel | "custom";
  heightCm: number | null;
  weightKg: number | null;
  goal: ExerciseGoalOption | null;
  gymDays: string[] | null;
  generatedByAi: boolean;
  createdAt: string;
  planData: ExerciseDay[];
};

export type ExercisePlanFormValue = {
  level: ExerciseLevel;
  heightCm: string;
  weightKg: string;
  goal: ExerciseGoalOption | null;
  hasLimitation: boolean;
  gymDays: string[];
  description: string;
};

export const EMPTY_EXERCISE_FORM: ExercisePlanFormValue = {
  level: "beginner",
  heightCm: "",
  weightKg: "",
  goal: null,
  hasLimitation: false,
  gymDays: [],
  description: "",
};
