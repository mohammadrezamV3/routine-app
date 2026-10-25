import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, badRequest, conflict } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { dateFromIso } from "@/lib/mentorServer";
import { validateGoalInput } from "@/lib/coachGoal";
import { currentGoal, pastGoals, toCoachGoal } from "@/lib/coachGoalServer";
import { loadActiveMentorshipFor, makeWeekCtx } from "@/lib/coachWeekServer";
import { publishToUsers } from "@/lib/realtime";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };

// GET: هدف فعال و قبلی‌ها (هر دو طرف)
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const found = await loadActiveMentorshipFor(params.id, g.userId);
  if (!found) return notFound();
  const ctx = await makeWeekCtx(found.m);
  const goal = await currentGoal(ctx);
  const past = await pastGoals(ctx, goal?.id ?? null);
  return NextResponse.json({ goal, past });
}

// POST: هدف تازه (فقط مربی). هدف فعال قبلی ENDED می‌شه.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const found = await loadActiveMentorshipFor(params.id, g.userId);
  if (!found || found.role !== "MENTOR") return notFound();
  if (!(await checkRateLimit(`coach-goal:${g.userId}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("خیلی پشت هم هدف ساختی. کمی بعد دوباره امتحان کن.", "You created goals too quickly. Try again in a bit.") }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const ctx = await makeWeekCtx(found.m);
  const v = validateGoalInput(parsed.body, ctx.todayIso);
  if (!v.ok) return badRequest(v.error);
  const now = new Date();
  const row = await prisma.$transaction(async (tx) => {
    await tx.mentorGoal.updateMany({ where: { mentorshipId: found.m.id, status: "ACTIVE" }, data: { status: "ENDED", endedAt: now } });
    return tx.mentorGoal.create({
      data: {
        mentorshipId: found.m.id,
        title: v.value.title,
        metric: v.value.metric,
        target: v.value.target,
        weeks: v.value.weeks,
        startDate: dateFromIso(v.value.startDate),
        endDate: dateFromIso(v.value.endDate),
        createdById: g.userId,
      },
    });
  });
  void publishToUsers([found.m.mentorId, found.m.studentId], { type: "mentor.mentorship", data: { id: found.m.id } });
  return NextResponse.json({ goal: await toCoachGoal(row, ctx) });
}

// PATCH { action: "end" }: پایان هدف فعال (فقط مربی)
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const found = await loadActiveMentorshipFor(params.id, g.userId);
  if (!found || found.role !== "MENTOR") return notFound();
  const parsed = await readJsonBody(req, 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (parsed.body?.action !== "end") return badRequest(tr("اقدام نامعتبره", "Invalid action"));
  const active = await prisma.mentorGoal.findFirst({ where: { mentorshipId: found.m.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!active) return conflict(tr("هدف فعالی نداری", "There is no active goal"));
  const res = await prisma.mentorGoal.updateMany({ where: { id: active.id, mentorshipId: found.m.id, status: "ACTIVE" }, data: { status: "ENDED", endedAt: new Date() } });
  if (res.count === 0) return conflict(tr("هدف فعالی نداری", "There is no active goal"));
  const ctx = await makeWeekCtx(found.m);
  const row = await prisma.mentorGoal.findUnique({ where: { id: active.id } });
  void publishToUsers([found.m.mentorId, found.m.studentId], { type: "mentor.mentorship", data: { id: found.m.id } });
  return NextResponse.json({ goal: row ? await toCoachGoal(row, ctx) : null });
}
