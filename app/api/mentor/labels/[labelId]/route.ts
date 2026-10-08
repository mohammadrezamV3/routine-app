import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, conflict, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { isUniqueViolation } from "@/lib/mentorServer";
import { validateLabelName } from "@/lib/mentorAvailability";
import { readLabels } from "@/lib/mentorManageServer";

type Ctx = { params: { labelId: string } };

/** برچسب خود همین منتور (ضد IDOR: where با profile سشن) */
async function ownLabel(userId: string, labelId: string) {
  if (typeof labelId !== "string" || !labelId || labelId.length > 64) return null;
  return prisma.mentorStudentLabel.findFirst({ where: { id: labelId, profile: { userId } }, select: { id: true, profileId: true } });
}

// PATCH /api/mentor/labels/:labelId { name } → تغییر نام
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const label = await ownLabel(g.userId, params.labelId);
  if (!label) return notFound();

  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const v = validateLabelName(parsed.body?.name);
  if (!v.ok) return badRequest(v.error);
  try {
    await prisma.mentorStudentLabel.updateMany({ where: { id: label.id, profileId: label.profileId }, data: { name: v.data } });
  } catch (e) {
    if (isUniqueViolation(e)) return conflict("برچسبی با این نام داری");
    throw e;
  }
  return NextResponse.json({ labels: await readLabels(label.profileId) });
}

// DELETE /api/mentor/labels/:labelId → حذف برچسب و برداشتنش از روی همه‌ی شاگردها
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const label = await ownLabel(g.userId, params.labelId);
  if (!label) return notFound();

  const tagged = await prisma.mentorship.findMany({
    where: { mentorId: g.userId, mentorLabelIds: { has: label.id } },
    select: { id: true, mentorLabelIds: true },
  });
  await prisma.$transaction([
    ...tagged.map((m) =>
      prisma.mentorship.updateMany({ where: { id: m.id, mentorId: g.userId }, data: { mentorLabelIds: m.mentorLabelIds.filter((x) => x !== label.id) } })
    ),
    prisma.mentorStudentLabel.deleteMany({ where: { id: label.id, profileId: label.profileId } }),
  ]);
  return NextResponse.json({ labels: await readLabels(label.profileId) });
}
