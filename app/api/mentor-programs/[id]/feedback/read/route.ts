import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { visibleToStudent } from "@/lib/mentorProgramState";

// POST /api/mentor-programs/:id/feedback/read → شاگرد همه‌ی فیدبک‌های
// خوانده‌نشده‌ی این برنامه رو خوانده‌شده علامت می‌زنه.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (typeof params.id !== "string" || !params.id || params.id.length > 64) return notFound();

  const p = await prisma.mentorProgram.findFirst({ where: { id: params.id, studentId: g.userId }, select: { id: true, status: true, sentAt: true } });
  if (!p || !visibleToStudent(p)) return notFound();

  const res = await prisma.mentorFeedback.updateMany({ where: { programId: p.id, studentId: g.userId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true, count: res.count });
}
