import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { dateFromIso } from "@/lib/mentorServer";
import { isRealIso, weekStartOf } from "@/lib/coachWeek";
import { loadActiveMentorshipFor } from "@/lib/coachWeekServer";
import { tr } from "@/lib/i18n";

// POST { weekStart } → علامت «دیده شد» (فقط مربی)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const found = await loadActiveMentorshipFor(params.id, g.userId);
  if (!found || found.role !== "MENTOR") return notFound();
  const parsed = await readJsonBody(req, 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const w = parsed.body?.weekStart;
  if (!isRealIso(w)) return badRequest(tr("تاریخ هفته نامعتبره", "Invalid week date"));
  await prisma.mentorWeekSnapshot.updateMany({
    where: { mentorshipId: found.m.id, weekStart: dateFromIso(weekStartOf(w)), seenAt: null },
    data: { seenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
