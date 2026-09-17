import type { ExerciseDay, ExerciseLevel } from "./exercisePlans";

export type ExercisePlan = {
  id: string;
  // پلن‌های دستی (بدون هوش‌مصنوعی/پرسش‌نامه) "custom" ذخیره می‌شن — سه‌تای
  // اصلی فقط برای پلن‌های ساخته‌شده با فرم سطح/هدف (AI یا fallback) صدق می‌کنه.
  level: ExerciseLevel | "custom";
  heightCm: number | null;
  weightKg: number | null;
  // طبقِ درخواستِ صریح، هدف دیگر یکی از چند گزینه‌ی ثابت نیست — متنِ آزادِ
  // خودِ کاربر است.
  goal: string | null;
  gymDays: string[] | null;
  generatedByAi: boolean;
  createdAt: string;
  planData: ExerciseDay[];
};

export type ExercisePlanFormValue = {
  level: ExerciseLevel;
  heightCm: string;
  weightKg: string;
  goal: string;
  hasLimitation: boolean;
  limitationDetails: string;
  gymDays: string[];
  description: string;
};

export const EMPTY_EXERCISE_FORM: ExercisePlanFormValue = {
  level: "beginner",
  heightCm: "",
  weightKg: "",
  goal: "",
  hasLimitation: false,
  limitationDetails: "",
  gymDays: [],
  description: "",
};
