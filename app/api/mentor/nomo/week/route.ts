import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict } from "@/lib/mentorGuard";
import { WEEK_SYSTEM_PROMPT, sanitizeWeekSummary, weekFacts } from "@/lib/coachNomo";
import { guardNomo, nomoUnavailable, quotaOf, runNomo } from "@/lib/coachNomoServer";
import { currentGoal } from "@/lib/coachGoalServer";
import { getWeekReport } from "@/lib/coachWeekServer";
import { isRealIso, weekStartOf } from "@/lib/coachWeek";
import { dateFromIso } from "@/lib/mentorServer";
import { tr, isEn } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// POST { mentorshipId, weekStart } → { summary, quota }؛ خلاصه روی عکس هفته ذخیره می‌شه
export async function POST(req: Request) {
  const guard = await guardNomo(req);
  if (!guard.ok) return guard.response;
  const { userId, unlimited, used, ctx, body } = guard.a;

  if (!isRealIso(body.weekStart)) return badRequest(tr("تاریخ هفته نامعتبره", "Invalid week date"));
  const weekStart = weekStartOf(body.weekStart);
  if (weekStart > weekStartOf(ctx.todayIso)) return badRequest(tr("این هفته هنوز نرسیده", "This week has not started yet"));
  const report = await getWeekReport(ctx, weekStart, "MENTOR", { live: 1 });
  if (!report || (report.grade === "none" && report.routineRate === null && report.workoutsDone === null && report.sleepAvgMinutes === null)) {
    return conflict(tr("برای این هفته داده‌ای نیست که خلاصه‌اش کنم", "There is no data for this week to summarize"));
  }
  const goal = await currentGoal(ctx);
  const json = await runNomo(userId, WEEK_SYSTEM_PROMPT, JSON.stringify({ week: weekFacts(report, goal), outputLanguage: isEn() ? "English" : "Persian" }), 800, "week");
  const summary = json ? sanitizeWeekSummary(json) : null;
  if (!summary) return nomoUnavailable();

  const { summary: _s, seenAt: _n, ...data } = report;
  await prisma.mentorWeekSnapshot.upsert({
    where: { mentorshipId_weekStart: { mentorshipId: ctx.m.id, weekStart: dateFromIso(weekStart) } },
    create: { mentorshipId: ctx.m.id, weekStart: dateFromIso(weekStart), data: data as unknown as Prisma.InputJsonValue, summary },
    update: { summary },
  });
  return NextResponse.json({ summary, quota: quotaOf(unlimited, used + 1) });
}
