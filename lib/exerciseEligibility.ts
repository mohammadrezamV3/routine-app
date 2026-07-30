import { prisma } from "./prisma";

// قوانین «برنامه جدید»: کاربر باید حداقل ۷۰٪ روزهایی که خودش گفته باشگاه
// می‌ره رو توی دو هفته‌ی اخیر واقعاً رفته باشه — وگرنه برنامه‌ی جدید فایده‌ای
// نداره چون هنوز داده‌ی کافی از عملکردش روی برنامه‌ی فعلی جمع نشده.
export const ATTENDANCE_WINDOW_DAYS = 14;
export const REQUIRED_ATTENDANCE_RATIO = 0.7;

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "attendance"; completedSessions: number; requiredSessions: number };

type ActivePlanForEligibility = {
  id: string;
  gymDays: unknown;
  generatedByAi: boolean;
  createdAt: Date;
};

export async function checkNewProgramEligibility(
  userId: string,
  activePlan: ActivePlanForEligibility | null
): Promise<EligibilityResult> {
  if (!activePlan) return { eligible: true }; // اولین برنامه — همیشه آزاد، چیزی برای مقایسه نیست

  const gymDays = Array.isArray(activePlan.gymDays) ? (activePlan.gymDays as string[]) : [];
  const daysPerWeek = gymDays.length || 3;
  const requiredSessions = Math.ceil(daysPerWeek * (ATTENDANCE_WINDOW_DAYS / 7) * REQUIRED_ATTENDANCE_RATIO);

  const since = new Date(Date.now() - ATTENDANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const completedSessions = await prisma.exerciseLog.count({
    where: { userId, planId: activePlan.id, completed: true, date: { gte: since } },
  });

  if (completedSessions < requiredSessions) {
    return { eligible: false, reason: "attendance", completedSessions, requiredSessions };
  }
  return { eligible: true };
}
