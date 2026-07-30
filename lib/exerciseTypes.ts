import { ExerciseDay, ExerciseGoal, ExerciseLevel } from "./exercisePlans";

export type TrainingPhase = "bulk" | "cut" | "maintenance" | "none";

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  bulk: "حجم (بالک)",
  cut: "کات (کاهش چربی)",
  maintenance: "نگهداری",
  none: "بدون دوره خاص",
};

export type ExercisePlan = {
  id: string;
  level: ExerciseLevel;
  heightCm: number | null;
  weightKg: number | null;
  goal: ExerciseGoal | null;
  gymDays: string[] | null;
  trainingPhase: TrainingPhase | null;
  generatedByAi: boolean;
  createdAt: string;
  planData: ExerciseDay[];
};

export type ExercisePlanFormValue = {
  level: ExerciseLevel;
  heightCm: string;
  weightKg: string;
  goal: ExerciseGoal | null;
  hasLimitation: boolean;
  gymDays: string[];
  trainingPhase: TrainingPhase;
};

export const EMPTY_EXERCISE_FORM: ExercisePlanFormValue = {
  level: "beginner",
  heightCm: "",
  weightKg: "",
  goal: null,
  hasLimitation: false,
  gymDays: [],
  trainingPhase: "none",
};

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "attendance"; completedSessions: number; requiredSessions: number };
