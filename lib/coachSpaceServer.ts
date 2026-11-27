import { prisma } from "@/lib/prisma";
import {
  PROGRAM_WITH_USERS_INCLUDE, PUBLIC_USER_SELECT, buildProgramRows, dateFromIso, isoDate, toFeedbackRow, toPublicUser,
} from "@/lib/mentorServer";
import { isMentorSuspended } from "@/lib/mentorGuard";
import { syncProgramProgress, windowFor } from "@/lib/mentorProgress";
import type { CoachSpace, CoachTimelineEvent } from "@/lib/coachTypes";
import type { ProgramStatus, ProgramType } from "@/lib/mentorTypes";
import { listStudentScopes } from "@/lib/mentorPrivacy";
import { currentGoal, pastGoals } from "@/lib/coachGoalServer";
import { getWeekReport, makeWeekCtx, WEEK_MENTORSHIP_SELECT } from "@/lib/coachWeekServer";
import { jsDayOfIso, maskWeekData, parseWeekData, weekStartOf } from "@/lib/coachWeek";

const MAX_EVENTS = 200;
const MAX_TODAY_TASKS = 40;

const SPACE_SELECT = {
  ...WEEK_MENTORSHIP_SELECT,
  pausedAt: true,
  endedAt: true,
  mentor: { select: { ...PUBLIC_USER_SELECT, mentorProfile: { select: { headline: true, responseTimeHours: true } } } },
  student: { select: { ...PUBLIC_USER_SELECT, isBlocked: true, deletedAt: true } },
} as const;

/** فضای همکاری برای یکی از دو طرف؛ null = طرف این همکاری نیست (404). متن هیچ پیامی اینجا نیست. */
export async function buildCoachSpace(id: string, userId: string): Promise<CoachSpace | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  const rel = await prisma.mentorship.findFirst({
    where: { id, OR: [{ mentorId: userId }, { studentId: userId }] },
    select: SPACE_SELECT,
  });
  if (!rel) return null;
  const role: "MENTOR" | "STUDENT" = rel.mentorId === userId ? "MENTOR" : "STUDENT";
  const isActive = rel.status === "ACTIVE";
  const mentorSuspended = isActive ? await isMentorSuspended(rel.mentorId) : false;
  // مربی تعلیق‌شده یا شاگرد مسدود دیگه داده‌ی شاگرد رو نمی‌بینه
  const dataOpen = isActive && !(role === "MENTOR" && mentorSuspended) && !rel.student.deletedAt && !rel.student.isBlocked;

  const counterUser = role === "MENTOR" ? rel.student : rel.mentor;
  const counterpart = {
    ...toPublicUser(counterUser),
    golden: !!counterUser.goldenSince,
    headline: role === "STUDENT" ? rel.mentor.mentorProfile?.headline ?? null : null,
    responseTimeHours: role === "STUDENT" ? rel.mentor.mentorProfile?.responseTimeHours ?? null : null,
  };

  const ctx = await makeWeekCtx(rel);
  const [programRows, unread, goal, past, thisWeek, snaps] = await Promise.all([
    prisma.mentorProgram.findMany({
      where: { mentorshipId: rel.id, sentAt: { not: null } },
      include: { ...PROGRAM_WITH_USERS_INCLUDE, items: { select: { days: true } }, feedback: { include: { item: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 20 } },
      orderBy: { sentAt: "desc" },
      take: 50,
    }),
    prisma.mentorMessage.count({ where: { mentorshipId: rel.id, senderId: { not: userId }, readAt: null, mentorship: { status: { in: ["ACTIVE", "ENDED"] } } } }),
    dataOpen ? currentGoal(ctx) : Promise.resolve(null),
    dataOpen ? pastGoals(ctx, null) : Promise.resolve([]),
    dataOpen ? getWeekReport(ctx, weekStartOf(ctx.todayIso), role, { live: 1 }) : Promise.resolve(null),
    dataOpen
      ? prisma.mentorWeekSnapshot.findMany({ where: { mentorshipId: rel.id }, orderBy: { weekStart: "desc" }, take: 12, select: { weekStart: true, data: true, createdAt: true } })
      : Promise.resolve([]),
  ]);

  const progressRows = await buildProgramRows(programRows, userId);
  const rateOf = new Map(progressRows.map((r) => [r.id, r.progress.hidden ? null : r.progress.rate]));

  const events: CoachTimelineEvent[] = [];
  let pendingProgram: CoachSpace["pendingProgram"] = null;
  for (const p of programRows) {
    const at = p.sentAt ?? p.createdAt;
    const days = Array.from(new Set(p.items.flatMap((i) => i.days))).sort((a, b) => a - b);
    let weeks: number | null = null;
    if (p.startDate && p.endDate) weeks = Math.max(1, Math.ceil(((p.endDate.getTime() - p.startDate.getTime()) / 86_400_000 + 1) / 7));
    events.push({
      kind: "program", id: `program:${p.id}`, at: at.toISOString(), programId: p.id, title: p.title,
      type: p.type as ProgramType, status: p.status as ProgramStatus, itemCount: p.items.length, days, weeks,
      changeRequested: p.status === "DRAFT" && !!p.changeRequestNote,
      rate: rateOf.get(p.id) ?? null,
    });
    if (role === "STUDENT" && p.status === "PENDING" && !pendingProgram) pendingProgram = { id: p.id, title: p.title };
    // بازخورد مربی روی برنامه (متن در حال سکون رمز می‌شه ولی E2EE گفت‌وگو نیست؛ مثل /api/mentor-programs/[id]/feedback)
    for (const f of p.feedback) {
      const row = toFeedbackRow(f);
      events.push({ kind: "feedback", id: `feedback:${f.id}`, at: f.createdAt.toISOString(), programId: p.id, programTitle: p.title, itemTitle: row.itemTitle, body: row.body });
    }
  }
  for (const s of snaps) {
    const ws = isoDate(s.weekStart);
    const parsed = parseWeekData(s.data, rel.id, ws);
    if (!parsed) continue;
    const d = maskWeekData(parsed, ctx.vis);
    events.push({ kind: "week", id: `week:${ws}`, at: s.createdAt.toISOString(), weekStart: ws, grade: d.grade, routineRate: d.routineRate, workoutsDone: d.workoutsDone, sleepAvgMinutes: d.sleepAvgMinutes });
  }
  for (const g of [...(goal ? [goal] : []), ...past.slice(0, 5)]) {
    events.push({ kind: "goal", id: `goal:${g.id}`, at: g.createdAt, goalId: g.id, title: g.title, status: g.status, weeksMet: g.weeksMet, weeks: g.weeks });
  }
  if (rel.startedAt) events.push({ kind: "status", id: "status:started", at: rel.startedAt.toISOString(), status: "started" });
  if (rel.pausedAt && rel.status === "ACTIVE") events.push({ kind: "status", id: "status:paused", at: rel.pausedAt.toISOString(), status: "paused" });
  if (rel.endedAt && rel.status === "ENDED") events.push({ kind: "status", id: "status:ended", at: rel.endedAt.toISOString(), status: "ended" });
  events.sort((a, b) => a.at.localeCompare(b.at));

  const sharedCount = role === "STUDENT" ? (rel.shareAllPrograms ? (await listStudentScopes(rel.studentId)).length : rel.sharedPrograms.length) : 0;
  const todayTasks = role === "STUDENT" && dataOpen ? await loadTodayTasks(rel.id, rel.studentId, ctx.tz, ctx.todayIso) : null;

  return {
    mentorshipId: rel.id,
    role,
    status: rel.status as CoachSpace["status"],
    paused: !!rel.pausedAt && rel.status === "ACTIVE",
    since: rel.startedAt ? rel.startedAt.toISOString() : null,
    counterpart,
    goal,
    thisWeek,
    pendingProgram,
    todayTasks,
    events: events.slice(-MAX_EVENTS),
    unread,
    canSend: isActive && !mentorSuspended,
    privacy: role === "STUDENT"
      ? { shareSleep: rel.shareSleep, showProgress: rel.showProgress, sharedCount }
      : null,
  };
}

/** کارهای امروز از برنامه‌های ACTIVE همین مربی؛ done از لاگ‌های پیشرفت خودکار */
async function loadTodayTasks(mentorshipId: string, studentId: string, tz: string | null, todayIso: string): Promise<NonNullable<CoachSpace["todayTasks"]>> {
  const progs = await prisma.mentorProgram.findMany({
    where: { mentorshipId, studentId, status: "ACTIVE", activatedAt: { not: null } },
    select: {
      id: true, status: true, startDate: true, endDate: true, activatedAt: true, completedAt: true, cancelledAt: true,
      items: { select: { id: true, title: true, days: true, startTime: true, durationMin: true, sets: true, reps: true }, orderBy: { order: "asc" } },
    },
    take: 20,
  });
  const js = jsDayOfIso(todayIso);
  const cand = progs.flatMap((p) => {
    const w = windowFor(p, tz);
    if (!w || todayIso < w.from || (w.to && todayIso > w.to)) return [];
    return p.items.filter((i) => i.days.includes(js)).map((i) => ({ programId: p.id, ...i }));
  });
  if (cand.length === 0) return [];
  await syncProgramProgress(Array.from(new Set(cand.map((c) => c.programId)))).catch(() => undefined);
  const logs = await prisma.mentorProgramLog.findMany({
    where: { itemId: { in: cand.map((c) => c.id) }, date: dateFromIso(todayIso), status: { in: ["COMPLETED", "PARTIAL"] } },
    select: { itemId: true },
  });
  const done = new Set(logs.map((l) => l.itemId));
  return cand
    .sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"))
    .slice(0, MAX_TODAY_TASKS)
    .map((c) => {
      const parts = [c.startTime, c.sets && c.reps ? `${c.sets}x${c.reps}` : null, c.durationMin ? `${c.durationMin}m` : null].filter(Boolean);
      return { id: c.id, title: c.title, meta: parts.length ? parts.join(" · ") : null, done: done.has(c.id) };
    });
}
