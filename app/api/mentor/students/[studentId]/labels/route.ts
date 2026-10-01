import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorshipAsMentor, notFound, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { LABELS_MAX } from "@/lib/mentorAvailability";
import { readLabels } from "@/lib/mentorManageServer";

// PUT /api/mentor/students/:studentId/labels { labelIds } → جایگزینی برچسب‌های این شاگرد.
// فقط برچسب‌های خود همین منتور پذیرفته می‌شود.
export async function PUT(req: Request, { params }: { params: { studentId: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getActiveMentorshipAsMentor(me, params.studentId);
  if (!m) return notFound();

  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const raw = parsed.body?.labelIds;
  if (!Array.isArray(raw) || raw.length > LABELS_MAX || raw.some((x: unknown) => typeof x !== "string")) return badRequest("برچسب‌ها معتبر نیست");

  const profile = await prisma.mentorProfile.findUnique({ where: { userId: me }, select: { id: true } });
  if (!profile) return notFound();
  const labels = await readLabels(profile.id);
  const own = new Set(labels.map((l) => l.id));
  const ids = Array.from(new Set(raw as string[]));
  if (ids.some((id) => !own.has(id))) return badRequest("برچسب پیدا نشد");

  await prisma.mentorship.updateMany({ where: { id: m.id, mentorId: me }, data: { mentorLabelIds: ids } });
  return NextResponse.json({ labelIds: ids, labels });
}
