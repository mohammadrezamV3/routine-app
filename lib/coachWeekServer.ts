import type { Mentorship, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canSeeScope, projectRoutineForMentor } from "@/lib/mentorPrivacy";
import { syncProgramProgress, windowFor } from "@/lib/mentorProgress";
import { rollupDays, type LogLite, type SchedProgram } from "@/lib/mentorAdherence";
import { dateFromIso, dateIsoInTz, isoDate } from "@/lib/mentorServer";
import { routineStatsForUsers } from "@/lib/friendStats";
import { FA_WEEKDAY } from "@/lib/jalali";
import { displayName, notifyUser } from "@/lib/inAppNotify";
import { isMentorSuspended, roleIn } from "@/lib/mentorGuard";
import { tr, iso as isoText } from "@/lib/i18n";
import type { CoachWeekReport } from "@/lib/coachTypes";
import {
  buildWeekReport,
  jsDayOfIso,
  lastFinishedWeekStart,
  maskWeekData,
  parseWeekData,
  recentWeekStarts,
  weekDatesOf,
  weekEndOf,
  weekIndexOf,
  weekStartOf,
  addDaysIso,
  type CoachDayInput,
  type CoachWeekData,
  type WeekVisibility,
} from "@/lib/coachWeek";

// خواندن داده‌ی گزارش هفته با رعایت حریم خصوصی همین همکاری. هر چیزی که شاگرد
// به این مربی نداده null می‌شود (نه 0). متن هیچ پیامی اینجا خوانده یا ساخته نمی‌شود.

export type WeekMentorship = Pick<
  Mentorship,
  | "id" | "mentorId" | "studentId" | "startedAt" | "status"
  | "shareAllPrograms" | "sharedPrograms" | "showSchedule" | "showProgramName" | "showTaskName" | "showTaskDetails" | "showProgress" | "shareSleep"
>;

export const WEEK_MENTORSHIP_SELECT = {
  id: true, mentorId: true, studentId: true, startedAt: true, status: true,
  shareAllPrograms: true, sharedPrograms: true, showSchedule: true, showProgramName: true,
  showTaskName: true, showTaskDetails: true, showProgress: true, shareSleep: true,
} as const;

export const MAX_WEEK_LIST = 12;
/** حداکثر هفته‌ی بدون عکس که در یک درخواست زنده حساب می‌شود */
const LIVE_BUDGET = 6;
/** عکس هفته‌ی تموم‌شده وقتی کش می‌شود که چند روز از پایانش گذشته باشد (تیک دیرهنگام) */
const CACHE_AFTER_DAYS = 2;

export type WeekCtx = {
  m: WeekMentorship;
  tz: string | null;
  todayIso: string;
  vis: WeekVisibility;
  hasMentorWorkout: boolean;
};

/** همکاری ACTIVE که کاربر یکی از دو طرفشه (ضد IDOR)؛ مربی تعلیق‌شده دسترسی نداره */
export async function loadActiveMentorshipFor(id: string, userId: string): Promise<{ m: WeekMentorship; role: "MENTOR" | "STUDENT" } | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  const m = await prisma.mentorship.findFirst({
    where: { id, status: "ACTIVE", OR: [{ mentorId: userId }, { studentId: userId }], student: { isBlocked: false, deletedAt: null } },
    select: WEEK_MENTORSHIP_SELECT,
  });
  if (!m) return null;
  const role = roleIn(m, userId);
  if (!role) return null;
  if (role === "MENTOR" && (await isMentorSuspended(m.mentorId))) return null;
  return { m, role };
}

export async function makeWeekCtx(m: WeekMentorship, now = new Date()): Promise<WeekCtx> {
  const [u, workoutCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: m.studentId }, select: { timezone: true } }),
    prisma.mentorProgram.count({ where: { mentorshipId: m.id, type: "WORKOUT", activatedAt: { not: null } } }),
  ]);
  const tz = u?.timezone ?? null;
  const hasMentorWorkout = workoutCount > 0;
  return {
    m,
    tz,
    todayIso: dateIsoInTz(now, tz),
    hasMentorWorkout,
    vis: {
      progress: m.showProgress,
      workouts: m.showProgress && (canSeeScope(m, "module:EXERCISE") || hasMentorWorkout),
      sleep: m.shareSleep,
    },
  };
}

type RawWeek = { days: CoachDayInput[]; workoutAccess: boolean; workoutsPlanned: number | null };

type LoadedProgram = SchedProgram & { type: "ROUTINE" | "WORKOUT" };

async function loadMentorPrograms(ctx: WeekCtx, weekStart: string, now: Date): Promise<LoadedProgram[]> {
  const weekEnd = weekEndOf(weekStart);
  const rows = await prisma.mentorProgram.findMany({
    where: { mentorshipId: ctx.m.id, activatedAt: { not: null }, status: { in: ["ACTIVE", "COMPLETED", "CANCELLED"] } },
    select: {
      id: true, type: true, status: true, startDate: true, endDate: true, activatedAt: true, completedAt: true, cancelledAt: true,
      items: { select: { id: true, title: true, days: true }, orderBy: { order: "asc" } },
    },
    take: 100,
  });
  return rows.flatMap((p) => {
    const w = windowFor(p, ctx.tz, now);
    if (!w) return [];
    if ((w.to && w.to < weekStart) || w.from > weekEnd) return [];
    return [{ id: p.id, type: p.type, fromIso: w.from, toIso: w.to, items: p.items }];
  });
}

/** داده‌ی خام 7 روز هفته؛ routineOnly = فقط روتین (برای هفته‌ی قبل و مقایسه) */
async function loadWeekDays(ctx: WeekCtx, weekStart: string, opts: { routineOnly?: boolean } = {}): Promise<RawWeek> {
  const { m, todayIso } = ctx;
  const now = new Date();
  const dates = weekDatesOf(weekStart);
  const countable = dates.filter((d) => d <= todayIso);
  const days: CoachDayInput[] = dates.map((date) => ({ date, routineDone: null, routineTotal: null, workout: null, sleepMinutes: null }));
  const at = new Map(days.map((d) => [d.date, d]));

  const planned = new Set<string>();
  const doneWorkout = new Set<string>();

  if (m.showProgress && countable.length > 0) {
    for (const d of days) {
      if (d.date <= todayIso) {
        d.routineDone = 0;
        d.routineTotal = 0;
      }
    }

    // ۱) روتین خود شاگرد (فقط چیزی که حریم خصوصی اجازه می‌ده)
    const proj = await projectRoutineForMentor(m.studentId, m, countable);
    for (const s of proj.slots) {
      if (!s.done) continue;
      for (const [date, done] of Object.entries(s.done)) {
        const d = at.get(date);
        if (!d || d.routineTotal === null) continue;
        if (date === todayIso && !done) continue; // امروز تموم نشده
        d.routineTotal += 1;
        if (done) d.routineDone = (d.routineDone ?? 0) + 1;
      }
    }

    // ۲) برنامه‌های خود همین مربی (روتین و تمرین)
    const progs = await loadMentorPrograms(ctx, weekStart, now);
    if (progs.length > 0) {
      await syncProgramProgress(progs.map((p) => p.id)).catch(() => undefined);
      const logRows = await prisma.mentorProgramLog.findMany({
        where: { programId: { in: progs.map((p) => p.id) }, date: { gte: dateFromIso(weekStart), lte: dateFromIso(weekEndOf(weekStart)) } },
        select: { itemId: true, date: true, status: true },
        take: 5000,
      });
      const logs: LogLite[] = logRows.map((l) => ({ itemId: l.itemId, date: isoDate(l.date), status: l.status }));
      const routineProgs = progs.filter((p) => p.type === "ROUTINE");
      const workoutProgs = progs.filter((p) => p.type === "WORKOUT");
      if (routineProgs.length) {
        for (const r of rollupDays(routineProgs, logs, countable, todayIso)) {
          const d = at.get(r.date);
          if (!d || d.routineTotal === null) continue;
          d.routineTotal += r.scheduled;
          d.routineDone = (d.routineDone ?? 0) + r.completed + r.partial * 0.5;
        }
      }
      if (workoutProgs.length && !opts.routineOnly) {
        // روز برنامه‌ی تمرین مربی: «انجام‌شده» وقتی همه‌ی آیتم‌های اون روز انجام (کامل یا ناقص) شده
        for (const r of rollupDays(workoutProgs, logs, dates, todayIso)) {
          const hasItems = workoutProgs.some((p) => (!p.fromIso || r.date >= p.fromIso) && (!p.toIso || r.date <= p.toIso) && p.items.some((it) => it.days.includes(jsDayOfIso(r.date))));
          if (hasItems) planned.add(r.date);
          if (r.scheduled > 0 && r.completed + r.partial === r.scheduled) doneWorkout.add(r.date);
        }
      }
    }
  }

  let workoutAccess = false;
  if (!opts.routineOnly && ctx.vis.workouts) {
    workoutAccess = true;
    // ۳) جلسه‌های تمرین خود شاگرد (فقط با اجازه‌ی module:EXERCISE)
    if (canSeeScope(m, "module:EXERCISE")) {
      const [plan, logs] = await Promise.all([
        prisma.exercisePlan.findFirst({ where: { userId: m.studentId, isActive: true }, orderBy: { startDate: "desc" }, select: { gymDays: true } }),
        prisma.exerciseLog.findMany({
          where: { userId: m.studentId, date: { gte: dateFromIso(weekStart), lte: dateFromIso(weekEndOf(weekStart)) } },
          select: { date: true, completed: true },
        }),
      ]);
      const gym = new Set(Array.isArray(plan?.gymDays) ? (plan!.gymDays as unknown[]).filter((x): x is string => typeof x === "string") : []);
      for (const date of dates) if (gym.has(FA_WEEKDAY[jsDayOfIso(date)])) planned.add(date);
      for (const l of logs) if (l.completed) doneWorkout.add(isoDate(l.date));
    }
    for (const d of days) {
      if (doneWorkout.has(d.date)) d.workout = true;
      else if (planned.has(d.date) && d.date < todayIso) d.workout = false;
      else d.workout = null;
    }
  }

  // ۴) خواب (فقط با تیک «خواب»)
  if (!opts.routineOnly && ctx.vis.sleep) {
    const rows = await prisma.sleepEntry.findMany({
      where: { userId: m.studentId, date: { gte: dateFromIso(weekStart), lte: dateFromIso(weekEndOf(weekStart)) } },
      select: { date: true, sleptAt: true, wokeAt: true },
    });
    for (const r of rows) {
      const d = at.get(isoDate(r.date));
      if (!d || !r.sleptAt || !r.wokeAt) continue;
      const mins = Math.round((r.wokeAt.getTime() - r.sleptAt.getTime()) / 60000);
      if (mins >= 30 && mins <= 1200) d.sleepMinutes = mins;
    }
  }

  return { days, workoutAccess, workoutsPlanned: workoutAccess ? (planned.size > 0 ? planned.size : null) : null };
}

async function loadStreak(ctx: WeekCtx): Promise<number | null> {
  if (!ctx.vis.progress) return null;
  try {
    const s = (await routineStatsForUsers([ctx.m.studentId])).get(ctx.m.studentId);
    return s ? s.streak : null;
  } catch {
    return null;
  }
}

type SnapRow = { weekStart: Date; data: Prisma.JsonValue; summary: string | null; seenAt: Date | null; notifiedAt: Date | null };

async function snapshotOf(mentorshipId: string, weekStart: string): Promise<SnapRow | null> {
  return prisma.mentorWeekSnapshot.findUnique({
    where: { mentorshipId_weekStart: { mentorshipId, weekStart: dateFromIso(weekStart) } },
    select: { weekStart: true, data: true, summary: true, seenAt: true, notifiedAt: true },
  });
}

async function prevRoutineRate(ctx: WeekCtx, weekStart: string): Promise<number | null> {
  if (!ctx.vis.progress) return null;
  const prev = addDaysIso(weekStart, -7);
  if (ctx.m.startedAt && weekEndOf(prev) < weekStartOf(isoDate(ctx.m.startedAt))) return null;
  const snap = await snapshotOf(ctx.m.id, prev);
  const parsed = snap ? parseWeekData(snap.data, ctx.m.id, prev) : null;
  if (parsed) return parsed.routineRate;
  const raw = await loadWeekDays(ctx, prev, { routineOnly: true });
  let done = 0;
  let total = 0;
  for (const d of raw.days) {
    if (d.routineDone === null || d.routineTotal === null) continue;
    done += d.routineDone;
    total += d.routineTotal;
  }
  return total > 0 ? Math.round((done / total) * 100) : null;
}

/** گزارش زنده‌ی یک هفته، همیشه با حریم خصوصی فعلی */
export async function computeWeekData(ctx: WeekCtx, weekStart: string): Promise<CoachWeekData> {
  const [raw, prev] = await Promise.all([loadWeekDays(ctx, weekStart), prevRoutineRate(ctx, weekStart)]);
  const streak = weekStart >= lastFinishedWeekStart(ctx.todayIso) ? await loadStreak(ctx) : null;
  return buildWeekReport({
    mentorshipId: ctx.m.id,
    weekStart,
    todayIso: ctx.todayIso,
    startedIso: ctx.m.startedAt ? isoDate(ctx.m.startedAt) : null,
    days: raw.days,
    workoutAccess: raw.workoutAccess,
    workoutsPlanned: raw.workoutsPlanned,
    streak,
    prevRoutineRate: prev,
  });
}

function withMeta(data: CoachWeekData, snap: SnapRow | null, viewer: "MENTOR" | "STUDENT"): CoachWeekReport {
  return {
    ...data,
    summary: viewer === "MENTOR" ? snap?.summary ?? null : null,
    seenAt: viewer === "MENTOR" && snap?.seenAt ? snap.seenAt.toISOString() : null,
  };
}

async function cacheSnapshot(ctx: WeekCtx, weekStart: string, data: CoachWeekData): Promise<void> {
  if (weekEndOf(weekStart) >= addDaysIso(ctx.todayIso, -CACHE_AFTER_DAYS)) return;
  try {
    await prisma.mentorWeekSnapshot.upsert({
      where: { mentorshipId_weekStart: { mentorshipId: ctx.m.id, weekStart: dateFromIso(weekStart) } },
      create: { mentorshipId: ctx.m.id, weekStart: dateFromIso(weekStart), data: data as unknown as Prisma.InputJsonValue },
      update: {},
    });
  } catch {
    // کش بهینه‌سازی‌ست، نه الزام
  }
}

/** budget.live: چند هفته‌ی بدون عکس هنوز اجازه‌ی محاسبه‌ی زنده دارن؛ تموم شد = null */
export async function getWeekReport(
  ctx: WeekCtx,
  weekStart: string,
  viewer: "MENTOR" | "STUDENT",
  budget: { live: number } = { live: LIVE_BUDGET },
): Promise<CoachWeekReport | null> {
  const complete = weekEndOf(weekStart) < ctx.todayIso;
  if (complete) {
    const snap = await snapshotOf(ctx.m.id, weekStart);
    const parsed = snap ? parseWeekData(snap.data, ctx.m.id, weekStart) : null;
    if (snap && parsed) return withMeta(maskWeekData({ ...parsed, weekIndex: weekIndexOf(ctx.m.startedAt ? isoDate(ctx.m.startedAt) : null, weekStart), complete: true }, ctx.vis), snap, viewer);
  }
  if (budget.live <= 0) return null;
  budget.live--;
  const data = await computeWeekData(ctx, weekStart);
  if (complete) await cacheSnapshot(ctx, weekStart, data);
  const snap = complete ? await snapshotOf(ctx.m.id, weekStart) : null;
  return withMeta(data, snap, viewer);
}

/** حداکثر 12 هفته‌ی اخیر (از شروع همکاری)، جدیدترین اول، بدون روزها */
export async function listWeekReports(ctx: WeekCtx, viewer: "MENTOR" | "STUDENT"): Promise<CoachWeekReport[]> {
  const firstWeek = ctx.m.startedAt ? weekStartOf(isoDate(ctx.m.startedAt)) : weekStartOf(ctx.todayIso);
  const starts = recentWeekStarts(ctx.todayIso, MAX_WEEK_LIST).filter((w) => w >= firstWeek);
  const budget = { live: LIVE_BUDGET };
  const out: CoachWeekReport[] = [];
  for (const w of starts) {
    const r = await getWeekReport(ctx, w, viewer, budget);
    if (r) out.push({ ...r, days: [] });
  }
  return out;
}

/** مقدار هر هفته برای ارزیابی هدف؛ هفته‌ی محاسبه‌نشده null */
export async function weekReportsForGoal(ctx: WeekCtx, weekStarts: string[]): Promise<Map<string, CoachWeekReport>> {
  const out = new Map<string, CoachWeekReport>();
  const budget = { live: LIVE_BUDGET };
  // جدیدترین اول تا بودجه‌ی زنده صرف هفته‌های نزدیک بشه
  for (const w of [...weekStarts].filter((x) => x <= ctx.todayIso).sort().reverse()) {
    const r = await getWeekReport(ctx, w, "STUDENT", budget);
    if (r) out.set(w, r);
  }
  return out;
}

// ───────────────────────── زمان‌بند هفتگی ─────────────────────────

const SNAPSHOT_EVERY_MS = 15 * 60 * 1000;
const SNAPSHOT_BATCH = 20;
let lastSnapshotRun = 0;

/**
 * برای همکاری‌های ACTIVE عکس آخرین هفته‌ی تموم‌شده رو می‌سازه و یک اعلان
 * «گزارش هفته آماده‌ست» برای مربی می‌فرسته. ضدتکرار با notifiedAt (updateMany
 * شرطی؛ چند worker هم‌زمان امنه). برمی‌گردونه چند اعلان رفت.
 */
export async function snapshotCoachWeeks(now = new Date()): Promise<number> {
  if (now.getTime() - lastSnapshotRun < SNAPSHOT_EVERY_MS) return 0;
  lastSnapshotRun = now.getTime();

  // منطقه‌ی زمانی شاگرد تا یک روز با UTC فرق داره؛ سه روز مجاور کاندیدای «امروز»ن
  const utcToday = dateIsoInTz(now, "UTC");
  const candidates = Array.from(new Set([-1, 0, 1].map((d) => lastFinishedWeekStart(addDaysIso(utcToday, d)))));
  const earliestEnd = weekEndOf(candidates.slice().sort()[0]);

  const rels = await prisma.mentorship.findMany({
    where: {
      status: "ACTIVE",
      pausedAt: null,
      startedAt: { not: null, lte: new Date(addDaysIso(earliestEnd, 1) + "T23:59:59.999Z") },
      student: { isBlocked: false, deletedAt: null },
      mentor: { mentorProfile: { is: { suspendedAt: null } } },
      weekSnapshots: { none: { weekStart: { in: candidates.map(dateFromIso) }, notifiedAt: { not: null } } },
    },
    select: { ...WEEK_MENTORSHIP_SELECT, student: { select: { name: true, lastName: true, username: true } } },
    orderBy: { startedAt: "asc" },
    take: SNAPSHOT_BATCH,
  });

  let sent = 0;
  for (const rel of rels) {
    try {
      const { student, ...m } = rel;
      const ctx = await makeWeekCtx(m, now);
      const weekStart = lastFinishedWeekStart(ctx.todayIso);
      if (!m.startedAt || isoDate(m.startedAt) > weekEndOf(weekStart)) continue;
      if (!candidates.includes(weekStart)) continue;
      const existing = await snapshotOf(m.id, weekStart);
      if (existing?.notifiedAt) continue;

      const data = await computeWeekData(ctx, weekStart);
      const json = data as unknown as Prisma.InputJsonValue;
      await prisma.mentorWeekSnapshot.upsert({
        where: { mentorshipId_weekStart: { mentorshipId: m.id, weekStart: dateFromIso(weekStart) } },
        create: { mentorshipId: m.id, weekStart: dateFromIso(weekStart), data: json },
        update: { data: json },
      });
      // ادعای اعلان: فقط یک worker موفق می‌شه
      const claimed = await prisma.mentorWeekSnapshot.updateMany({
        where: { mentorshipId: m.id, weekStart: dateFromIso(weekStart), notifiedAt: null },
        data: { notifiedAt: now },
      });
      if (claimed.count !== 1) continue;
      if (data.grade === "none") continue; // چیزی برای نشون‌دادن نیست
      const name = displayName(student);
      const rate = data.routineRate;
      await notifyUser(m.mentorId, () => ({
        type: "mentor.week_report",
        title: tr("گزارش هفته آماده‌ست", "Weekly report is ready"),
        body: rate !== null
          ? tr(`گزارش هفته‌ی ${name} آماده‌ست. روتین: ${rate}%`, `${isoText(name)}'s weekly report is ready. Routine: ${rate}%`)
          : tr(`گزارش هفته‌ی ${name} آماده‌ست.`, `${isoText(name)}'s weekly report is ready.`),
        url: `/mentor/students/${m.studentId}/week?w=${weekStart}`,
      }));
      sent++;
    } catch {
      // یک همکاری خراب نباید بقیه رو متوقف کنه
    }
  }
  return sent;
}
