import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorshipAsMentor, notFound, badRequest, conflict } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import { PAUSE_REASON_MAX, validateOptionalText } from "@/lib/mentorAvailability";
import { tr } from "@/lib/i18n";

type Ctx = { params: { studentId: string } };

// توقف موقت همکاری با یک شاگرد: رابطه ACTIVE می‌ماند (گفت‌وگو، دسترسی‌ها و
// برنامه‌های فعلی دست نمی‌خورند) ولی به شاگرد اعلام می‌شود که همکاری متوقف
// است و دلیلش چیست؛ در پنل منتور هم از هشدارهای پایبندی کنار گذاشته می‌شود.

// POST /api/mentor/students/:studentId/pause { reason? } → توقف
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getActiveMentorshipAsMentor(me, params.studentId);
  if (!m) return notFound();
  if (m.pausedAt) return conflict(tr(tr("همکاری با این شاگرد از قبل متوقف است", "Work with this student is already paused"), "Work with this student is already paused"));

  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const r = validateOptionalText(parsed.body?.reason, PAUSE_REASON_MAX, tr(tr("دلیل توقف", "Pause reason"), "Pause reason"));
  if (!r.ok) return badRequest(r.error);

  const now = new Date();
  const res = await prisma.mentorship.updateMany({ where: { id: m.id, mentorId: me, status: "ACTIVE", pausedAt: null }, data: { pausedAt: now, pauseReason: r.data } });
  if (res.count === 0) return conflict(tr(tr("وضعیت رابطه هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The relationship status changed at the same time; try again"), "The relationship status changed at the same time; try again"));

  const mentor = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
  await notifyUser(m.studentId, {
    type: "mentor.paused",
    title: "توقف موقت همکاری",
    body: r.data ? `${displayName(mentor)} همکاری را موقتا متوقف کرد؛ دلیل: ${r.data}` : `${displayName(mentor)} همکاری را موقتا متوقف کرد.`,
    url: `/mentorship/${m.id}`,
  });
  return NextResponse.json({ pausedAt: now, pauseReason: r.data });
}

// DELETE /api/mentor/students/:studentId/pause → ادامه‌ی همکاری
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getActiveMentorshipAsMentor(me, params.studentId);
  if (!m) return notFound();
  if (!m.pausedAt) return conflict(tr("همکاری با این شاگرد متوقف نیست", "Work with this student is not paused"));

  const res = await prisma.mentorship.updateMany({ where: { id: m.id, mentorId: me, status: "ACTIVE", pausedAt: { not: null } }, data: { pausedAt: null, pauseReason: null } });
  if (res.count === 0) return conflict(tr(tr("وضعیت رابطه هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The relationship status changed at the same time; try again"), "The relationship status changed at the same time; try again"));

  const mentor = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
  await notifyUser(m.studentId, {
    type: "mentor.resumed",
    title: "ادامه‌ی همکاری",
    body: `${displayName(mentor)} همکاری را از سر گرفت.`,
    url: `/mentorship/${m.id}`,
  });
  return NextResponse.json({ pausedAt: null, pauseReason: null });
}
