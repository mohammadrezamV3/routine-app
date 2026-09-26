import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { displayName } from "@/lib/inAppNotify";
import { PROGRAM_STATUS_LABELS } from "@/lib/mentorProgramState";
import {
  MENTORSHIP_WITH_USERS_INCLUDE,
  PROGRAM_WITH_USERS_INCLUDE,
  PUBLIC_USER_SELECT,
  addDaysIso,
  buildMentorshipRows,
  buildProgramRows,
  dateFromIso,
  dateIsoInTz,
  progressFromCounts,
  userTimezone,
} from "@/lib/mentorServer";

const LOG_STATUS_LABELS = { COMPLETED: "انجام شد", PARTIAL: "نیمه‌کاره", MISSED: "انجام نشد" } as const;
const ACTIVITY_LIMIT = 15;
// «نیاز به توجه»: ≥۲ بار «انجام نشد» در ۷ روز، یا برنامه‌ی فعالی که ۳ روزه هیچ
// اجرایی براش ثبت نشده. برنامه‌ای که کمتر از ۳ روزه فعال شده هنوز فرصت داره،
// پس برای شرطِ دوم حساب نمی‌شه (وگرنه هر برنامه‌ی تازه فوراً قرمز می‌شد).
const MISSED_THRESHOLD = 2;
const SILENT_DAYS = 3;

type Activity = { type: "log" | "program" | "message"; at: Date; studentName: string; text: string; url: string };

// GET /api/mentor/dashboard → نمای کلیِ منتور: آمار، درخواست‌ها، برنامه‌های
// منتظر، فعالیتِ اخیر، نرخِ انجامِ ۷ روزه و شاگردهای نیازمندِ توجه.
// همه‌چیز فقط از برنامه/پیام‌هایی که مالِ *خودِ همین منتور*ن.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const tz = await userTimezone(me);
  const today = dateIsoInTz(new Date(), tz);
  const since7 = dateFromIso(addDaysIso(today, -6));
  const silentSince = dateFromIso(addDaysIso(today, -(SILENT_DAYS - 1)));
  const activeBefore = new Date(Date.now() - SILENT_DAYS * 86_400_000);
  const recentCutoff = new Date(Date.now() - 7 * 86_400_000);

  const [profile, students, activeStudents, pendingRequests, pendingProgramsCount, activeProgramsCount] = await Promise.all([
    prisma.mentorProfile.findUnique({ where: { userId: me }, select: { published: true, suspendedAt: true, identityStatus: true } }),
    prisma.mentorship.count({ where: { mentorId: me, startedAt: { not: null } } }),
    prisma.mentorship.count({ where: { mentorId: me, status: "ACTIVE" } }),
    prisma.mentorship.count({ where: { mentorId: me, status: "PENDING", initiatedBy: "STUDENT" } }),
    prisma.mentorProgram.count({ where: { mentorId: me, status: "PENDING" } }),
    prisma.mentorProgram.count({ where: { mentorId: me, status: "ACTIVE" } }),
  ]);

  const [requestRows, pendingProgramRows, recentLogs, recentPrograms, recentMessages, activeRels, activePrograms] = await Promise.all([
    prisma.mentorship.findMany({
      where: { mentorId: me, status: "PENDING", initiatedBy: "STUDENT" },
      include: MENTORSHIP_WITH_USERS_INCLUDE,
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.mentorProgram.findMany({ where: { mentorId: me, status: "PENDING" }, include: PROGRAM_WITH_USERS_INCLUDE, orderBy: { sentAt: "desc" }, take: 50 }),
    prisma.mentorProgramLog.findMany({
      where: { program: { mentorId: me }, updatedAt: { gte: recentCutoff } },
      orderBy: { updatedAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: { programId: true, status: true, updatedAt: true, item: { select: { title: true } }, program: { select: { student: { select: PUBLIC_USER_SELECT } } } },
    }),
    prisma.mentorProgram.findMany({
      where: { mentorId: me, respondedAt: { gte: recentCutoff } },
      orderBy: { respondedAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: { id: true, title: true, status: true, respondedAt: true, student: { select: PUBLIC_USER_SELECT } },
    }),
    prisma.mentorMessage.findMany({
      where: { mentorship: { mentorId: me }, senderId: { not: me }, createdAt: { gte: recentCutoff } },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: { mentorshipId: true, body: true, createdAt: true, sender: { select: PUBLIC_USER_SELECT } },
    }),
    prisma.mentorship.findMany({
      where: { mentorId: me, status: "ACTIVE" },
      select: { studentId: true, student: { select: PUBLIC_USER_SELECT } },
      take: 500,
    }),
    prisma.mentorProgram.findMany({ where: { mentorId: me, status: "ACTIVE" }, select: { id: true, studentId: true, activatedAt: true } }),
  ]);

  const recentActivity: Activity[] = [
    ...recentLogs.map((l) => ({
      type: "log" as const,
      at: l.updatedAt,
      studentName: displayName(l.program.student),
      text: `${l.item.title}: ${LOG_STATUS_LABELS[l.status]}`,
      url: `/mentor-programs/${l.programId}`,
    })),
    ...recentPrograms.map((p) => ({
      type: "program" as const,
      at: p.respondedAt!,
      studentName: displayName(p.student),
      text: `${p.title}: ${p.status === "DRAFT" ? "درخواست تغییر" : PROGRAM_STATUS_LABELS[p.status]}`,
      url: `/mentor-programs/${p.id}`,
    })),
    ...recentMessages.map((m) => ({
      type: "message" as const,
      at: m.createdAt,
      studentName: displayName(m.sender),
      text: m.body.slice(0, 80),
      url: `/mentorship/${m.mentorshipId}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, ACTIVITY_LIMIT);

  // نرخِ انجامِ ۷ روزه به‌ازای هر شاگردِ فعال (فقط لاگ‌های برنامه‌های همین منتور)
  const studentIds = activeRels.map((r) => r.studentId);
  const [logCounts, missedOnActive, lastLogs] = studentIds.length
    ? await Promise.all([
        prisma.mentorProgramLog.groupBy({
          by: ["studentId", "status"],
          where: { studentId: { in: studentIds }, program: { mentorId: me }, date: { gte: since7 } },
          _count: { _all: true },
        }),
        prisma.mentorProgramLog.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds }, program: { mentorId: me, status: "ACTIVE" }, status: "MISSED", date: { gte: since7 } },
          _count: { _all: true },
        }),
        activePrograms.length
          ? prisma.mentorProgramLog.groupBy({
              by: ["programId"],
              where: { programId: { in: activePrograms.map((p) => p.id) }, date: { gte: silentSince } },
              _count: { _all: true },
            })
          : Promise.resolve([] as { programId: string; _count: { _all: number } }[]),
      ])
    : [[], [], []];

  const counts = new Map<string, { c: number; p: number; m: number }>();
  for (const r of logCounts) {
    const a = counts.get(r.studentId) ?? { c: 0, p: 0, m: 0 };
    if (r.status === "COMPLETED") a.c += r._count._all;
    else if (r.status === "PARTIAL") a.p += r._count._all;
    else a.m += r._count._all;
    counts.set(r.studentId, a);
  }
  const completion = activeRels.map((r) => {
    const a = counts.get(r.studentId) ?? { c: 0, p: 0, m: 0 };
    const pr = progressFromCounts(a.c, a.p, a.m);
    return { studentId: r.studentId, name: displayName(r.student), avatarUrl: r.student.avatarUrl, ...pr };
  });

  const missedMap = new Map(missedOnActive.map((r) => [r.studentId, r._count._all]));
  const recentlyLogged = new Set(lastLogs.map((r) => r.programId));
  const silentStudents = new Set(
    activePrograms.filter((p) => p.activatedAt && p.activatedAt <= activeBefore && !recentlyLogged.has(p.id)).map((p) => p.studentId)
  );
  const attention: { studentId: string; name: string; avatarUrl: string | null; reason: string }[] = [];
  for (const r of activeRels) {
    const missed = missedMap.get(r.studentId) ?? 0;
    let reason: string | null = null;
    if (missed >= MISSED_THRESHOLD) reason = `${missed} بار «انجام نشد» در ۷ روز اخیر`;
    else if (silentStudents.has(r.studentId)) reason = `${SILENT_DAYS} روزه هیچ اجرایی برای برنامه‌ی فعال ثبت نکرده`;
    if (reason) attention.push({ studentId: r.studentId, name: displayName(r.student), avatarUrl: r.student.avatarUrl, reason });
  }

  return NextResponse.json({
    profile,
    stats: { students, activeStudents, pendingRequests, pendingPrograms: pendingProgramsCount, activePrograms: activeProgramsCount },
    requests: await buildMentorshipRows(requestRows, me),
    pendingPrograms: await buildProgramRows(pendingProgramRows, me),
    recentActivity,
    completion,
    attention,
  });
}
