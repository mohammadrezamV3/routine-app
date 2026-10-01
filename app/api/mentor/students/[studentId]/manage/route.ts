import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorshipAsMentor, notFound } from "@/lib/mentorGuard";
import { liveLabelIds, readIntakeAnswers, readLabels, readStudentNotes } from "@/lib/mentorManageServer";

// GET /api/mentor/students/:studentId/manage → داده‌ی خصوصی منتور برای مدیریت
// یک شاگرد فعال: برچسب‌ها، یادداشت‌ها، جواب‌های پذیرش و وضعیت توقف.
// هیچ‌کدام از این‌ها هرگز به شاگرد برنمی‌گردد (جز جواب‌های خودش و وضعیت توقف
// که از /api/mentorships می‌بیند).
export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getActiveMentorshipAsMentor(me, params.studentId);
  if (!m) return notFound();

  const profile = await prisma.mentorProfile.findUnique({ where: { userId: me }, select: { id: true } });
  if (!profile) return notFound();
  const [labels, notes, intake] = await Promise.all([readLabels(profile.id), readStudentNotes(m.id, me), readIntakeAnswers([m.id])]);

  return NextResponse.json({
    mentorshipId: m.id,
    labels,
    labelIds: liveLabelIds(m.mentorLabelIds, labels),
    notes,
    intakeAnswers: intake.get(m.id) ?? [],
    pausedAt: m.pausedAt,
    pauseReason: m.pausedAt ? m.pauseReason : null,
  });
}
