import { NextResponse } from "next/server";
import { NUDGE_SYSTEM_PROMPT, sanitizeSuggestions, weekFacts } from "@/lib/coachNomo";
import { guardNomo, nomoUnavailable, quotaOf, runNomo } from "@/lib/coachNomoServer";
import { currentGoal } from "@/lib/coachGoalServer";
import { getWeekReport } from "@/lib/coachWeekServer";
import { isRealIso, lastFinishedWeekStart, weekStartOf } from "@/lib/coachWeek";
import { isEn } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// POST { mentorshipId, weekStart? } → { suggestions, quota } (2 تا 3 پیام کوتاه از روی گزارش هفته؛ پیش‌فرض هفته‌ی جاری)
export async function POST(req: Request) {
  const guard = await guardNomo(req);
  if (!guard.ok) return guard.response;
  const { userId, unlimited, used, ctx, body } = guard.a;

  const cur = weekStartOf(ctx.todayIso);
  let weekStart = isRealIso(body.weekStart) ? weekStartOf(body.weekStart) : cur;
  if (weekStart > cur) weekStart = cur;
  const report = await getWeekReport(ctx, weekStart, "MENTOR", { live: 1 }) ?? (await getWeekReport(ctx, lastFinishedWeekStart(ctx.todayIso), "MENTOR", { live: 1 }));
  const goal = await currentGoal(ctx);
  const json = await runNomo(userId, NUDGE_SYSTEM_PROMPT, JSON.stringify({ week: report ? weekFacts(report, goal) : null, outputLanguage: isEn() ? "English" : "Persian" }), 600, "nudge");
  const suggestions = json ? sanitizeSuggestions(json) : null;
  if (!suggestions) return nomoUnavailable();
  return NextResponse.json({ suggestions, quota: quotaOf(unlimited, used + 1) });
}
