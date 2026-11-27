import { NextRequest, NextResponse } from "next/server";
import { requireMentorsUser, notFound, badRequest } from "@/lib/mentorGuard";
import { getWeekReport, listWeekReports, loadActiveMentorshipFor, makeWeekCtx } from "@/lib/coachWeekServer";
import { isRealIso, weekStartOf } from "@/lib/coachWeek";
import { tr } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// GET ?week=YYYY-MM-DD (هر روزی از هفته) | ?list=1
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const found = await loadActiveMentorshipFor(params.id, g.userId);
  if (!found) return notFound();
  const ctx = await makeWeekCtx(found.m);
  const sp = req.nextUrl.searchParams;
  if (sp.get("list") === "1") {
    return NextResponse.json({ weeks: await listWeekReports(ctx, found.role) });
  }
  const q = sp.get("week");
  let weekStart = weekStartOf(ctx.todayIso);
  if (q) {
    if (!isRealIso(q)) return badRequest(tr("تاریخ هفته نامعتبره", "Invalid week date"));
    weekStart = weekStartOf(q);
    const first = found.m.startedAt ? weekStartOf(found.m.startedAt.toISOString().slice(0, 10)) : weekStart;
    if (weekStart > weekStartOf(ctx.todayIso) || weekStart < first) return notFound();
  }
  const report = await getWeekReport(ctx, weekStart, found.role, { live: 1 });
  if (!report) return notFound();
  return NextResponse.json({ report });
}
