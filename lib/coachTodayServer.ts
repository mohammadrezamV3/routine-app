import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/inAppNotify";
import { activateDueForUser } from "@/lib/mentorSchedule";
import { syncProgramProgress, windowFor } from "@/lib/mentorProgress";
import { dateFromIso, isoDate, PUBLIC_USER_SELECT, toPublicUser } from "@/lib/mentorServer";
import { computeAvailability } from "@/lib/mentorAvailability";
import type { CoachInboxItem, CoachToday } from "@/lib/coachTypes";
import { coachStudentRows, loadStudentBase } from "@/lib/coachStudentsServer";
import { jsDayOfIso, maskWeekData, parseWeekData, addDaysIso } from "@/lib/coachWeek";
import { canSeeScope } from "@/lib/mentorPrivacy";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

// اولویت ردیف‌های «منتظر تو»
export const PRIORITY = { request: 100, change_request: 90, unread: 80, idle: 70, week_ready: 50, goal_done: 40 } as const;
const MAX_INBOX = 50;
const IDLE_DAYS = 3;
const RECENT_DAYS = 14;

export async function buildCoachToday(me: string): Promise<CoachToday> {
  const profile = await prisma.mentorProfile.findUnique({
    where: { userId: me },
    select: { published: true, acceptingStudents: true, suspendedAt: true, maxActiveStudents: true, awayUntil: true, awayPausesRequests: true, user: { select: { username: true } } },
  });
  if (!profile) return { profile: null, counts: { students: 0, doneToday: 0, waiting: 0 }, hint: null, inbox: [], students: [] };

  // lazy: شروع برنامه‌های زمان‌بندی‌شده (هرگز throw نمی‌کنه)
  await activateDueForUser(me);
  const base = await loadStudentBase(me);
  if (!base) return { profile: null, counts: { students: 0, doneToday: 0, waiting: 0 }, hint: null, inbox: [], students: [] };
  const { rels, rows, today } = base;
  const mentorshipIds = rels.map((r) => r.id);
  const now = new Date();
  const recentCut = new Date(now.getTime() - RECENT_DAYS * 86_400_000);

  const [coachRows, requests, changeReqs, unreadAgg, snaps, goals, activeProgs, workoutProgs] = await Promise.all([
    coachStudentRows(base),
    prisma.mentorship.findMany({
      where: { mentorId: me, status: "PENDING", initiatedBy: "STUDENT", student: { isBlocked: false, deletedAt: null } },
      select: { id: true, message: true, categories: true, updatedAt: true, student: { select: PUBLIC_USER_SELECT } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.mentorProgram.findMany({
      where: { mentorId: me, status: "DRAFT", changeRequestNote: { not: null }, mentorship: { status: "ACTIVE" } },
      select: { id: true, title: true, mentorshipId: true, respondedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    mentorshipIds.length
      ? prisma.mentorMessage.groupBy({
          by: ["mentorshipId"],
          where: { mentorshipId: { in: mentorshipIds }, senderId: { not: me }, readAt: null },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : Promise.resolve([] as { mentorshipId: string; _count: { _all: number }; _max: { createdAt: Date | null } }[]),
    mentorshipIds.length
      ? prisma.mentorWeekSnapshot.findMany({
          where: { mentorshipId: { in: mentorshipIds }, notifiedAt: { not: null, gte: recentCut }, seenAt: null },
          select: { mentorshipId: true, weekStart: true, data: true, notifiedAt: true },
          orderBy: { weekStart: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    mentorshipIds.length
      ? prisma.mentorGoal.findMany({
          where: {
            mentorshipId: { in: mentorshipIds },
            OR: [
              { status: "DONE", endDate: { gte: dateFromIso(addDaysIso(today, -RECENT_DAYS)) } },
              { status: "ACTIVE", endDate: { lt: dateFromIso(today) } },
            ],
          },
          select: { id: true, mentorshipId: true, title: true, status: true, endDate: true, completedAt: true },
          take: 50,
        })
      : Promise.resolve([]),
    prisma.mentorProgram.findMany({
      where: { mentorId: me, status: "ACTIVE", activatedAt: { not: null }, mentorship: { status: "ACTIVE" } },
      select: {
        id: true, studentId: true, status: true, startDate: true, endDate: true, activatedAt: true, completedAt: true, cancelledAt: true,
        items: { select: { id: true, days: true } },
      },
      take: 500,
    }),
    mentorshipIds.length
      ? prisma.mentorProgram.groupBy({ by: ["mentorshipId"], where: { mentorshipId: { in: mentorshipIds }, type: "WORKOUT", activatedAt: { not: null } }, _count: { _all: true } })
      : Promise.resolve([] as { mentorshipId: string }[]),
  ]);

  // ── درصد امروز هر شاگرد از برنامه‌های همین مربی ──
  const todayRate = new Map<string, number | null>();
  if (!base.hideActivity && activeProgs.length) {
    await syncProgramProgress(activeProgs.map((p) => p.id)).catch(() => undefined);
    const js = jsDayOfIso(today);
    const scheduled = new Map<string, string[]>(); // studentId → itemIds امروز
    for (const p of activeProgs) {
      const w = windowFor(p, base.tz, now);
      if (!w || today < w.from || (w.to && today > w.to)) continue;
      const list = scheduled.get(p.studentId) ?? [];
      for (const it of p.items) if (it.days.includes(js)) list.push(it.id);
      scheduled.set(p.studentId, list);
    }
    const allItems = Array.from(scheduled.values()).flat();
    const logs = allItems.length
      ? await prisma.mentorProgramLog.findMany({ where: { itemId: { in: allItems }, date: dateFromIso(today) }, select: { studentId: true, itemId: true, status: true } })
      : [];
    const statusOf = new Map(logs.map((l) => [l.itemId, l.status]));
    for (const [studentId, items] of scheduled) {
      if (items.length === 0) continue;
      let score = 0;
      for (const id of items) {
        const st = statusOf.get(id);
        score += st === "COMPLETED" ? 1 : st === "PARTIAL" ? 0.5 : 0;
      }
      todayRate.set(studentId, Math.round((score / items.length) * 100));
    }
  }
  const hiddenProgress = new Set(rels.filter((r) => !r.showProgress).map((r) => r.studentId));
  for (const id of hiddenProgress) todayRate.delete(id);

  // ── صندوق «منتظر تو» ──
  const relById = new Map(rels.map((r) => [r.id, r]));
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const inbox: CoachInboxItem[] = [];

  for (const r of requests) {
    inbox.push({ id: `request:${r.id}`, user: toPublicUser(r.student), reason: { kind: "request", mentorshipId: r.id, message: r.message, categories: r.categories }, priority: PRIORITY.request, at: r.updatedAt.toISOString() });
  }
  for (const p of changeReqs) {
    const rel = relById.get(p.mentorshipId);
    if (!rel) continue;
    inbox.push({ id: `change:${p.id}`, user: rowById.get(rel.id)!.counterpart, reason: { kind: "change_request", mentorshipId: rel.id, programId: p.id, programTitle: p.title }, priority: PRIORITY.change_request, at: (p.respondedAt ?? p.updatedAt).toISOString() });
  }
  for (const u of unreadAgg) {
    const rel = relById.get(u.mentorshipId);
    if (!rel || !u._count._all) continue;
    inbox.push({ id: `unread:${rel.id}`, user: rowById.get(rel.id)!.counterpart, reason: { kind: "unread", mentorshipId: rel.id, count: u._count._all }, priority: PRIORITY.unread, at: (u._max.createdAt ?? now).toISOString() });
  }
  const workoutSet = new Set(workoutProgs.map((w) => w.mentorshipId));
  for (const c of coachRows) {
    if (c.paused || c.idleDays < IDLE_DAYS) continue;
    const rel = relById.get(c.mentorshipId)!;
    inbox.push({ id: `idle:${c.mentorshipId}`, user: rowById.get(rel.id)!.counterpart, reason: { kind: "idle", mentorshipId: c.mentorshipId, days: c.idleDays }, priority: PRIORITY.idle + Math.min(c.idleDays, 29), at: (base.lastActivity.get(rel.studentId) ?? rel.startedAt ?? now).toISOString() });
  }
  for (const s of snaps) {
    const rel = relById.get(s.mentorshipId);
    if (!rel) continue;
    const ws = isoDate(s.weekStart);
    const parsed = parseWeekData(s.data, rel.id, ws);
    const d = parsed ? maskWeekData(parsed, { progress: rel.showProgress, workouts: rel.showProgress && (canSeeScope(rel, "module:EXERCISE") || workoutSet.has(rel.id)), sleep: rel.shareSleep }) : null;
    inbox.push({ id: `week:${rel.id}:${ws}`, user: rowById.get(rel.id)!.counterpart, reason: { kind: "week_ready", mentorshipId: rel.id, weekStart: ws, routineRate: d?.routineRate ?? null }, priority: PRIORITY.week_ready, at: (s.notifiedAt ?? now).toISOString() });
  }
  for (const g of goals) {
    const rel = relById.get(g.mentorshipId);
    if (!rel) continue;
    if (g.status === "ACTIVE") {
      // پایان هدف رسیده ولی هنوز DONE ثبت نشده: ضدتکرار با شرط status
      await prisma.mentorGoal.updateMany({ where: { id: g.id, status: "ACTIVE" }, data: { status: "DONE", completedAt: now } }).catch(() => undefined);
    }
    inbox.push({ id: `goal:${g.id}`, user: rowById.get(rel.id)!.counterpart, reason: { kind: "goal_done", mentorshipId: rel.id, goalId: g.id, title: g.title }, priority: PRIORITY.goal_done, at: (g.completedAt ?? g.endDate).toISOString() });
  }
  inbox.sort((a, b) => b.priority - a.priority || b.at.localeCompare(a.at));
  const top = inbox.slice(0, MAX_INBOX);

  const availability = computeAvailability(
    { acceptingStudents: profile.acceptingStudents, maxActiveStudents: profile.maxActiveStudents, awayUntil: profile.awayUntil, awayPausesRequests: profile.awayPausesRequests },
    rels.length,
    today,
  ).state;

  return {
    profile: { published: profile.published, accepting: profile.acceptingStudents, availability, suspended: !!profile.suspendedAt, username: profile.user.username },
    counts: { students: rels.length, doneToday: Array.from(todayRate.values()).filter((v) => v !== null && v >= 100).length, waiting: inbox.length },
    hint: hintFor(top[0]),
    inbox: top,
    students: rels.map((r) => ({ mentorshipId: r.id, user: rowById.get(r.id)!.counterpart, todayRate: todayRate.get(r.studentId) ?? null })),
  };
}

/** یک جمله‌ی قاعده‌محور درباره‌ی مهم‌ترین مورد (نه AI) */
export function hintFor(item: CoachInboxItem | undefined): string | null {
  if (!item) return null;
  const name = displayName(item.user);
  const r = item.reason;
  switch (r.kind) {
    case "request":
      return tr(`${name} می‌خواد باهات کار کنه. جوابش رو بده.`, `${name} wants to work with you. Reply to the request.`);
    case "change_request":
      return tr(`${name} برای «${r.programTitle}» تغییر خواسته. اول اون رو ببین.`, `${name} asked for changes to "${r.programTitle}". Take a look first.`);
    case "unread":
      return tr(`${name} برات پیام گذاشته. اول جوابش رو بده.`, `${name} sent you a message. Reply first.`);
    case "idle":
      return tr(`${name} ${faNum(r.days)} روزه فعالیت نکرده. اول به اون سر بزن.`, `${name} has been inactive for ${faNum(r.days)} days. Check in with them first.`);
    case "week_ready":
      return tr(`گزارش هفته‌ی ${name} آماده‌ست.`, `${name}'s weekly report is ready.`);
    case "goal_done":
      return tr(`هدف ${name} تموم شد. نتیجه‌ش رو ببین.`, `${name}'s goal has ended. See the result.`);
  }
}

