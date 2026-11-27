import type { MentorGoal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateFromIso, isoDate } from "@/lib/mentorServer";
import type { CoachGoal, CoachGoalStatus } from "@/lib/coachTypes";
import { evaluateGoal, goalWeekStarts, weekValueFor, type GoalEvaluation } from "@/lib/coachGoal";
import { weekReportsForGoal, type WeekCtx } from "@/lib/coachWeekServer";

// هدف همکاری: پیشرفت همیشه از گزارش هفته‌ها (داده‌ی واقعی با حریم خصوصی فعلی) حساب می‌شه.

function asStatus(s: string): CoachGoalStatus {
  return s === "DONE" || s === "ENDED" ? s : "ACTIVE";
}

export async function toCoachGoal(g: MentorGoal, ctx: WeekCtx): Promise<CoachGoal> {
  const start = isoDate(g.startDate);
  const end = isoDate(g.endDate);
  const metric = g.metric === "ROUTINE_RATE" ? "ROUTINE_RATE" : "WORKOUT_SESSIONS";
  const status = asStatus(g.status);
  const values: Record<string, number | null> = {};
  if (status !== "ENDED" || g.endedAt) {
    const reports = await weekReportsForGoal(ctx, goalWeekStarts(start, g.weeks));
    for (const [w, r] of reports) values[w] = weekValueFor(metric, r);
  }
  const ev: GoalEvaluation = evaluateGoal({ metric, target: g.target, weeks: g.weeks, startDate: start, endDate: end, status }, values, ctx.todayIso);
  let completedAt = g.completedAt;
  if (ev.justCompleted) {
    completedAt = new Date();
    // ضدتکرار: فقط اگه هنوز ACTIVE بود
    await prisma.mentorGoal.updateMany({ where: { id: g.id, status: "ACTIVE" }, data: { status: "DONE", completedAt } }).catch(() => undefined);
  }
  return {
    id: g.id,
    mentorshipId: g.mentorshipId,
    title: g.title,
    metric,
    target: g.target,
    weeks: g.weeks,
    startDate: start,
    endDate: end,
    status: ev.status,
    weeksMet: ev.weeksMet,
    weeksPassed: ev.weeksPassed,
    totalDone: ev.totalDone,
    history: ev.history,
    createdAt: g.createdAt.toISOString(),
    completedAt: completedAt ? completedAt.toISOString() : null,
  };
}

export async function activeGoalRow(mentorshipId: string): Promise<MentorGoal | null> {
  return prisma.mentorGoal.findFirst({ where: { mentorshipId, status: { in: ["ACTIVE"] } }, orderBy: { createdAt: "desc" } });
}

/** هدف ACTIVE (یا تازه DONE شده و هنوز در 14 روز اخیر) برای نمایش در فضا */
export async function currentGoal(ctx: WeekCtx): Promise<CoachGoal | null> {
  const g = await prisma.mentorGoal.findFirst({
    where: { mentorshipId: ctx.m.id, OR: [{ status: "ACTIVE" }, { status: "DONE", endDate: { gte: dateFromIso(new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)) } }] },
    orderBy: { createdAt: "desc" },
  });
  return g ? toCoachGoal(g, ctx) : null;
}

export async function pastGoals(ctx: WeekCtx, excludeId: string | null): Promise<CoachGoal[]> {
  const rows = await prisma.mentorGoal.findMany({
    where: { mentorshipId: ctx.m.id, ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return Promise.all(rows.filter((g) => g.status !== "ACTIVE").map((g) => toCoachGoal(g, ctx)));
}
