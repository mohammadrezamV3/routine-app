import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorshipAsMentor, notFound, badRequest } from "@/lib/mentorGuard";
import { parseDateRange } from "@/lib/validate";
import { canSeeScope, projectRoutineForMentor, type PrivacySettings } from "@/lib/mentorPrivacy";
import { FA_WEEKDAY } from "@/lib/jalali";
import {
  PROGRAM_WITH_USERS_INCLUDE,
  PUBLIC_USER_SELECT,
  toPublicUser,
  addDaysIso,
  buildProgramRows,
  datesBetween,
  isoDate,
  toFeedbackRow,
  todayIsoForUser,
} from "@/lib/mentorServer";

// سقف بازه ۳۱ روزه (from تا to شامل هر دو سر) — نمای منتور گزارش کوتاه‌مدته، نه آرشیو کامل
const MAX_RANGE_DAYS = 30;
const FEEDBACK_LIMIT = 10;

/**
 * خلاصه‌ی بدنسازی شاگرد — فقط اگه شاگرد module:EXERCISE رو برای *همین* منتور
 * باز کرده باشه. روزهای باشگاه تابع showSchedule و اجراها تابع showProgressـن؛
 * محتوای خود برنامه‌ی تمرینی (planData) هیچ‌وقت برنمی‌گرده.
 */
async function exerciseSummary(studentId: string, p: PrivacySettings, dates: string[]) {
  const plan = await prisma.exercisePlan.findFirst({
    where: { userId: studentId, isActive: true },
    orderBy: { startDate: "desc" },
    select: { id: true, level: true, goal: true, trainingPhase: true, gymDays: true, startDate: true },
  });
  if (!plan) return { hasPlan: false as const };
  const gymDays = Array.isArray(plan.gymDays) ? (plan.gymDays as unknown[]).filter((d): d is string => typeof d === "string") : [];

  let progress: { planned: number; completed: number; days: { date: string; completed: boolean; itemsDone: number }[] } | null = null;
  if (p.showProgress && dates.length > 0) {
    const logs = await prisma.exerciseLog.findMany({
      where: { userId: studentId, planId: plan.id, date: { gte: new Date(dates[0] + "T00:00:00.000Z"), lte: new Date(dates[dates.length - 1] + "T00:00:00.000Z") } },
      select: { date: true, completed: true, completedItems: true },
    });
    const byDate = new Map(logs.map((l) => [isoDate(l.date), l]));
    const gymSet = new Set(gymDays);
    const planned = dates.filter((d) => gymSet.has(FA_WEEKDAY[new Date(d + "T00:00:00.000Z").getUTCDay()])).length;
    const days = dates
      .filter((d) => byDate.has(d))
      .map((d) => {
        const l = byDate.get(d)!;
        return { date: d, completed: l.completed, itemsDone: Array.isArray(l.completedItems) ? (l.completedItems as unknown[]).length : 0 };
      });
    progress = { planned, completed: days.filter((d) => d.completed).length, days };
  }

  return {
    hasPlan: true as const,
    level: plan.level,
    goal: plan.goal,
    trainingPhase: plan.trainingPhase,
    startDate: isoDate(plan.startDate),
    gymDays: p.showSchedule ? gymDays : null,
    progress,
  };
}

/**
 * خلاصه‌ی کالری شاگرد — هدف روزانه و (با showProgress) جمع کالری هر روز.
 * اسم غذاها/وعده‌ها هرگز برنمی‌گرده؛ فقط عدد.
 */
async function calorieSummary(studentId: string, p: PrivacySettings, dates: string[]) {
  const target = await prisma.calorieTarget.findFirst({
    where: { userId: studentId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
    select: { dailyTargetKcal: true, goal: true, proteinTargetG: true, carbsTargetG: true, fatTargetG: true },
  });

  let progress: { successDays: number; days: { date: string; kcal: number }[] } | null = null;
  if (p.showProgress && dates.length > 0) {
    const rows = await prisma.foodLogEntry.groupBy({
      by: ["date"],
      where: { userId: studentId, date: { gte: new Date(dates[0] + "T00:00:00.000Z"), lte: new Date(dates[dates.length - 1] + "T00:00:00.000Z") } },
      _sum: { customCalories: true },
    });
    const days = rows
      .map((r) => ({ date: isoDate(r.date), kcal: Math.round(r._sum.customCalories ?? 0) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // همون تعریف «روز موفق» در بخش دوستان: ثبت‌شده و نه بیشتر از هدف
    const successDays = target ? days.filter((d) => d.kcal > 0 && d.kcal <= target.dailyTargetKcal).length : 0;
    progress = { successDays, days };
  }

  return {
    hasTarget: !!target,
    dailyTargetKcal: target?.dailyTargetKcal ?? null,
    goal: target?.goal ?? null,
    macros: target && p.showTaskDetails ? { proteinG: target.proteinTargetG, carbsG: target.carbsTargetG, fatG: target.fatTargetG } : null,
    progress,
  };
}

// GET /api/mentor/students/:studentId?from=&to= → نمای منتور از یک شاگرد فعال.
// هر داده‌ای از شاگرد فقط از خروجی lib/mentorPrivacy.ts (با تنظیمات *همین*
// رابطه) یا برنامه‌هایی که خود همین منتور ساخته. رابطه‌ی غیر ACTIVE → ۴۰۴.
export async function GET(req: NextRequest, { params }: { params: { studentId: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const m = await getActiveMentorshipAsMentor(me, params.studentId);
  if (!m) return notFound();
  const studentId = m.studentId;

  const sp = req.nextUrl.searchParams;
  let fromIso: string;
  let toIso: string;
  if (sp.get("from") || sp.get("to")) {
    const r = parseDateRange(sp.get("from"), sp.get("to"), MAX_RANGE_DAYS);
    if ("error" in r) return badRequest(r.error);
    fromIso = isoDate(r.from);
    toIso = isoDate(r.to);
  } else {
    toIso = await todayIsoForUser(studentId);
    fromIso = addDaysIso(toIso, -6);
  }
  const dates = datesBetween(fromIso, toIso);

  const privacy: PrivacySettings = {
    shareAllPrograms: m.shareAllPrograms,
    sharedPrograms: m.sharedPrograms,
    showSchedule: m.showSchedule,
    showProgramName: m.showProgramName,
    showTaskName: m.showTaskName,
    showTaskDetails: m.showTaskDetails,
    showProgress: m.showProgress,
  };

  const [student, routine, exercise, calorie, programs, feedback] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: PUBLIC_USER_SELECT }),
    projectRoutineForMentor(studentId, privacy, dates),
    canSeeScope(privacy, "module:EXERCISE") ? exerciseSummary(studentId, privacy, dates) : Promise.resolve(null),
    canSeeScope(privacy, "module:CALORIE") ? calorieSummary(studentId, privacy, dates) : Promise.resolve(null),
    prisma.mentorProgram.findMany({
      where: { mentorId: me, studentId },
      include: PROGRAM_WITH_USERS_INCLUDE,
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.mentorFeedback.findMany({
      where: { mentorId: me, studentId },
      orderBy: { createdAt: "desc" },
      take: FEEDBACK_LIMIT,
      include: { item: { select: { title: true } } },
    }),
  ]);
  if (!student) return notFound();

  return NextResponse.json({
    student: toPublicUser(student),
    mentorshipId: m.id,
    since: m.startedAt,
    range: { from: fromIso, to: toIso },
    privacy: {
      shareAllPrograms: privacy.shareAllPrograms,
      sharedCount: privacy.sharedPrograms.length,
      showSchedule: privacy.showSchedule,
      showProgramName: privacy.showProgramName,
      showTaskName: privacy.showTaskName,
      showTaskDetails: privacy.showTaskDetails,
      showProgress: privacy.showProgress,
    },
    routine,
    modules: { exercise, calorie },
    programs: await buildProgramRows(programs, me),
    recentFeedback: feedback.map(toFeedbackRow),
  });
}
