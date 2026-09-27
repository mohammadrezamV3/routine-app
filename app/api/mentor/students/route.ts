import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, forbidden } from "@/lib/mentorGuard";
import {
  MENTORSHIP_WITH_USERS_INCLUDE,
  addDaysIso,
  buildMentorshipRows,
  dateFromIso,
  dateIsoInTz,
  progressFromCounts,
  userTimezone,
} from "@/lib/mentorServer";
import { liveLabelIds, readLabels } from "@/lib/mentorManageServer";

const MAX_STUDENTS = 500;

// GET /api/mentor/students → فهرستِ شاگردهای فعالِ منتور برای صفحه‌ی «شاگردها»:
// برچسب‌ها، پایبندیِ ۷ روزه، آخرین فعالیت، تاریخِ شروع، توقف. همه‌ی عددها فقط
// از برنامه‌ها و پیام‌های *همین منتور* ساخته می‌شوند؛ منتورِ تعلیق‌شده
// (مثل /api/mentor/students/[id]) پایبندی و فعالیتِ شاگرد را نمی‌بیند.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const profile = await prisma.mentorProfile.findUnique({ where: { userId: me }, select: { id: true, suspendedAt: true, maxActiveStudents: true } });
  if (!profile) return forbidden("اول پروفایل منتوری بساز");

  const rels = await prisma.mentorship.findMany({
    where: { mentorId: me, status: "ACTIVE", student: { isBlocked: false, deletedAt: null } },
    include: MENTORSHIP_WITH_USERS_INCLUDE,
    orderBy: { startedAt: "desc" },
    take: MAX_STUDENTS,
  });
  const [rows, labels] = await Promise.all([buildMentorshipRows(rels, me), readLabels(profile.id)]);
  const studentIds = rels.map((r) => r.studentId);
  const hideActivity = !!profile.suspendedAt || studentIds.length === 0;

  const tz = await userTimezone(me);
  const since7 = dateFromIso(addDaysIso(dateIsoInTz(new Date(), tz), -6));

  const [counts, lastLogs, lastMsgs] = hideActivity
    ? [[], [], []]
    : await Promise.all([
        prisma.mentorProgramLog.groupBy({
          by: ["studentId", "status"],
          where: { studentId: { in: studentIds }, program: { mentorId: me }, date: { gte: since7 } },
          _count: { _all: true },
        }),
        prisma.mentorProgramLog.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds }, program: { mentorId: me } },
          _max: { updatedAt: true },
        }),
        prisma.mentorMessage.groupBy({
          by: ["mentorshipId"],
          where: { mentorshipId: { in: rels.map((r) => r.id) }, senderId: { in: studentIds } },
          _max: { createdAt: true },
        }),
      ]);

  const acc = new Map<string, { c: number; p: number; m: number }>();
  for (const r of counts) {
    const a = acc.get(r.studentId) ?? { c: 0, p: 0, m: 0 };
    if (r.status === "COMPLETED") a.c += r._count._all;
    else if (r.status === "PARTIAL") a.p += r._count._all;
    else a.m += r._count._all;
    acc.set(r.studentId, a);
  }
  const lastLogMap = new Map(lastLogs.map((r) => [r.studentId, r._max.updatedAt]));
  const lastMsgMap = new Map(lastMsgs.map((r) => [r.mentorshipId, r._max.createdAt]));
  const rowById = new Map(rows.map((r) => [r.id, r]));

  const students = rels.map((m) => {
    const row = rowById.get(m.id)!;
    const a = acc.get(m.studentId);
    const adherence = a && a.c + a.p + a.m > 0 ? progressFromCounts(a.c, a.p, a.m).rate : null;
    const times = [lastLogMap.get(m.studentId), lastMsgMap.get(m.id)].filter((d): d is Date => !!d);
    const lastActivityAt = times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;
    return {
      mentorshipId: m.id,
      student: row.counterpart,
      startedAt: m.startedAt,
      categories: row.categories,
      labelIds: liveLabelIds(m.mentorLabelIds, labels),
      adherence,
      lastActivityAt,
      activePrograms: row.activePrograms,
      unread: row.unread,
      pausedAt: m.pausedAt,
    };
  });

  return NextResponse.json({ students, labels, capacity: profile.maxActiveStudents });
}
