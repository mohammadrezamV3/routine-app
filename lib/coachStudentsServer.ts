import { prisma } from "@/lib/prisma";
import { canSeeScope } from "@/lib/mentorPrivacy";
import {
  MENTORSHIP_WITH_USERS_INCLUDE, addDaysIso, buildMentorshipRows, dateFromIso, dateIsoInTz, isoDate, progressFromCounts, userTimezone,
  type MentorshipRow, type MentorshipWithUsers,
} from "@/lib/mentorServer";
import { liveLabelIds, readLabels, type LabelRow } from "@/lib/mentorManageServer";
import type { CoachStudentRow } from "@/lib/coachTypes";
import { evaluateGoal, weekValueFor } from "@/lib/coachGoal";
import { maskWeekData, parseWeekData } from "@/lib/coachWeek";

// پایه‌ی مشترک «شاگردها» و «امروز مربی»: فقط کوئری‌های گروهی (هزینه‌ی ثابت، نه به‌ازای هر شاگرد).
// weekRate همون پایبندی 7 روزه‌ی برنامه‌های خود مربیه (عدد همیشگی پنل)، نه گزارش کامل هفته.

export const MAX_STUDENTS = 500;
const DAY_MS = 86_400_000;

export type StudentBase = {
  profile: { id: string; suspendedAt: Date | null; maxActiveStudents: number | null };
  rels: MentorshipWithUsers[];
  rows: MentorshipRow[];
  labels: LabelRow[];
  adherence: Map<string, number | null>;
  lastActivity: Map<string, Date | null>;
  hideActivity: boolean;
  tz: string | null;
  today: string;
};

export async function loadStudentBase(me: string): Promise<StudentBase | null> {
  const profile = await prisma.mentorProfile.findUnique({ where: { userId: me }, select: { id: true, suspendedAt: true, maxActiveStudents: true } });
  if (!profile) return null;
  const rels = await prisma.mentorship.findMany({
    where: { mentorId: me, status: "ACTIVE", student: { isBlocked: false, deletedAt: null } },
    include: MENTORSHIP_WITH_USERS_INCLUDE,
    orderBy: { startedAt: "desc" },
    take: MAX_STUDENTS,
  });
  const [rows, labels, tz] = await Promise.all([buildMentorshipRows(rels, me), readLabels(profile.id), userTimezone(me)]);
  const studentIds = rels.map((r) => r.studentId);
  const hideActivity = !!profile.suspendedAt || studentIds.length === 0;
  const today = dateIsoInTz(new Date(), tz);
  const since7 = dateFromIso(addDaysIso(today, -6));

  const [counts, lastLogs, lastMsgs] = hideActivity
    ? [[], [], []]
    : await Promise.all([
        prisma.mentorProgramLog.groupBy({
          by: ["studentId", "status"],
          where: { studentId: { in: studentIds }, program: { mentorId: me }, date: { gte: since7 } },
          _count: { _all: true },
        }),
        prisma.mentorProgramLog.groupBy({ by: ["studentId"], where: { studentId: { in: studentIds }, program: { mentorId: me } }, _max: { updatedAt: true } }),
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
  const adherence = new Map<string, number | null>();
  const lastActivity = new Map<string, Date | null>();
  for (const m of rels) {
    const a = acc.get(m.studentId);
    adherence.set(m.studentId, a && a.c + a.p + a.m > 0 ? progressFromCounts(a.c, a.p, a.m).rate : null);
    const times = [lastLogMap.get(m.studentId), lastMsgMap.get(m.id)].filter((d): d is Date => !!d);
    lastActivity.set(m.studentId, times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null);
  }
  return { profile, rels, rows, labels, adherence, lastActivity, hideActivity, tz, today };
}

export function idleDaysOf(last: Date | null, startedAt: Date | null, now = new Date()): number {
  const ref = last ?? startedAt;
  if (!ref) return 0;
  return Math.max(0, Math.floor((now.getTime() - ref.getTime()) / DAY_MS));
}

/** ردیف‌های CoachStudentRow؛ goal از عکس‌های هفته‌ی ذخیره‌شده (بدون محاسبه‌ی زنده) */
export async function coachStudentRows(base: StudentBase): Promise<CoachStudentRow[]> {
  const ids = base.rels.map((r) => r.id);
  const [goals, workoutProgs] = ids.length
    ? await Promise.all([
        prisma.mentorGoal.findMany({ where: { mentorshipId: { in: ids }, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
        prisma.mentorProgram.groupBy({ by: ["mentorshipId"], where: { mentorshipId: { in: ids }, type: "WORKOUT", activatedAt: { not: null } }, _count: { _all: true } }),
      ])
    : [[], []];
  const goalOf = new Map<string, (typeof goals)[number]>();
  for (const g of goals) if (!goalOf.has(g.mentorshipId)) goalOf.set(g.mentorshipId, g);
  const hasWorkout = new Set(workoutProgs.map((w) => w.mentorshipId));

  const snapsBy = new Map<string, { weekStart: Date; data: unknown }[]>();
  if (goalOf.size) {
    const minStart = Array.from(goalOf.values()).reduce((a, g) => (g.startDate < a ? g.startDate : a), new Date("2999-01-01"));
    const snaps = await prisma.mentorWeekSnapshot.findMany({
      where: { mentorshipId: { in: Array.from(goalOf.keys()) }, weekStart: { gte: minStart } },
      select: { mentorshipId: true, weekStart: true, data: true },
      take: 5000,
    });
    for (const s of snaps) {
      const l = snapsBy.get(s.mentorshipId) ?? [];
      l.push(s);
      snapsBy.set(s.mentorshipId, l);
    }
  }
  const labelName = new Map(base.labels.map((l) => [l.id, l.name]));
  const rowById = new Map(base.rows.map((r) => [r.id, r]));
  const now = new Date();

  return base.rels.map((m): CoachStudentRow => {
    const row = rowById.get(m.id)!;
    const last = base.lastActivity.get(m.studentId) ?? null;
    const idleDays = base.hideActivity ? 0 : idleDaysOf(last, m.startedAt, now);
    const weekRate = m.showProgress && !base.hideActivity ? base.adherence.get(m.studentId) ?? null : null;

    let goal: CoachStudentRow["goal"] = null;
    let nearGoal = false;
    const g = goalOf.get(m.id);
    if (g) {
      const vis = { progress: m.showProgress, workouts: m.showProgress && (canSeeScope(m, "module:EXERCISE") || hasWorkout.has(m.id)), sleep: m.shareSleep };
      const metric = g.metric === "ROUTINE_RATE" ? "ROUTINE_RATE" : "WORKOUT_SESSIONS";
      const values: Record<string, number | null> = {};
      for (const s of snapsBy.get(m.id) ?? []) {
        const ws = isoDate(s.weekStart);
        const parsed = parseWeekData(s.data, m.id, ws);
        if (parsed) values[ws] = weekValueFor(metric, maskWeekData(parsed, vis));
      }
      const ev = evaluateGoal({ metric, target: g.target, weeks: g.weeks, startDate: isoDate(g.startDate), endDate: isoDate(g.endDate), status: "ACTIVE" }, values, base.today);
      if (ev.status === "ACTIVE") {
        goal = { title: g.title, weeksMet: ev.weeksMet, weeks: g.weeks, weeksLeft: ev.weeksLeft };
        nearGoal = ev.weeksLeft <= 3;
      }
    }
    return {
      mentorshipId: m.id,
      user: { ...row.counterpart, golden: !!m.student.goldenSince },
      weekRate,
      idleDays,
      paused: !!m.pausedAt,
      unread: row.unread,
      goal,
      labels: m.mentorLabelIds.map((id) => labelName.get(id)).filter((n): n is string => !!n),
      needsHelp: !m.pausedAt && ((weekRate !== null && weekRate < 50) || idleDays >= 3),
      nearGoal,
    };
  });
}

export { liveLabelIds };
