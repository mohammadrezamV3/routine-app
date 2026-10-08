import type { Feedback, MentorRoutineSlot, ProgramRow, PublicUser } from "@/lib/mentorTypes";

// شکل پاسخ GET /api/mentor/students/[studentId] (docs/mentors.md › دید منتور).
// فقط برای صفحه‌ی /mentor/students/[studentId] و اجزای MentorStudent*.

export type StudentPrivacySummary = {
  shareAllPrograms: boolean;
  sharedCount: number;
  showSchedule: boolean;
  showProgramName: boolean;
  showTaskName: boolean;
  showTaskDetails: boolean;
  showProgress: boolean;
};

/** خلاصه‌ی بدنسازی (exerciseSummary در روت) — null یعنی شاگرد مخفی کرده */
export type StudentExerciseSummary =
  | { hasPlan: false }
  | {
      hasPlan: true;
      level: string;
      goal: string | null;
      trainingPhase: string | null;
      startDate: string;
      gymDays: string[] | null; // null = زمان‌بندی مخفی
      progress: { planned: number; completed: number; days: { date: string; completed: boolean; itemsDone: number }[] } | null;
    };

/** خلاصه‌ی کالری (calorieSummary در روت) — فقط عدد، هرگز اسم غذا */
export type StudentCalorieSummary = {
  hasTarget: boolean;
  dailyTargetKcal: number | null;
  goal: string | null;
  macros: { proteinG: number | null; carbsG: number | null; fatG: number | null } | null;
  progress: { successDays: number; days: { date: string; kcal: number }[] } | null;
};

export type StudentView = {
  student: PublicUser;
  mentorshipId: string;
  since: string | null;
  privacy: StudentPrivacySummary;
  routine: { scheduleHidden: boolean; slots: MentorRoutineSlot[] };
  range?: { from: string; to: string };
  modules: { exercise: StudentExerciseSummary | null; calorie: StudentCalorieSummary | null };
  programs: ProgramRow[];
  recentFeedback: Feedback[];
};
