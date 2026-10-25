import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/mentorGuard";
import { NOMO_PROMPT_MAX, PROGRAM_SYSTEM_PROMPT, cleanText, sanitizeProgramDraft, weekFacts } from "@/lib/coachNomo";
import { guardNomo, nomoUnavailable, quotaOf, runNomo } from "@/lib/coachNomoServer";
import { currentGoal } from "@/lib/coachGoalServer";
import { getWeekReport } from "@/lib/coachWeekServer";
import { weekStartOf } from "@/lib/coachWeek";
import { tr, isEn } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// POST { mentorshipId, prompt, type } → { draft, quota }
export async function POST(req: Request) {
  const guard = await guardNomo(req);
  if (!guard.ok) return guard.response;
  const { userId, unlimited, used, ctx, body } = guard.a;

  const prompt = cleanText(body.prompt, NOMO_PROMPT_MAX + 1);
  if (!prompt) return badRequest(tr("بنویس چه برنامه‌ای می‌خوای", "Write what kind of program you want"));
  if (prompt.length > NOMO_PROMPT_MAX) return badRequest(tr(`درخواستت حداکثر ${NOMO_PROMPT_MAX} حرف باشه`, `Keep your request under ${NOMO_PROMPT_MAX} characters`));
  const type = body.type === "WORKOUT" ? "WORKOUT" : body.type === "ROUTINE" ? "ROUTINE" : null;
  if (!type) return badRequest(tr("نوع برنامه نامعتبره", "Invalid program type"));

  const [goal, report, recent] = await Promise.all([
    currentGoal(ctx),
    getWeekReport(ctx, weekStartOf(ctx.todayIso), "MENTOR", { live: 1 }),
    prisma.mentorProgram.findMany({ where: { mentorshipId: ctx.m.id, mentorId: userId }, orderBy: { createdAt: "desc" }, take: 5, select: { title: true, type: true } }),
  ]);
  const input = {
    programType: type,
    coachRequest: prompt,
    currentWeek: report ? weekFacts(report, goal) : null,
    goal: goal ? { title: goal.title, metric: goal.metric, targetPerWeek: goal.target, weeks: goal.weeks } : null,
    previousProgramTitles: recent.map((p) => `${p.type}: ${p.title}`),
    outputLanguage: isEn() ? "English" : "Persian",
  };
  const json = await runNomo(userId, PROGRAM_SYSTEM_PROMPT, JSON.stringify(input), 3500, "program");
  const draft = json ? sanitizeProgramDraft(json, type) : null;
  if (!draft) return nomoUnavailable();
  return NextResponse.json({ draft, quota: quotaOf(unlimited, used + 1) });
}
