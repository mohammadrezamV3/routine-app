import { prisma } from "@/lib/prisma";
import { displayName, notifyUser } from "@/lib/inAppNotify";
import { dateFromIso, dateIsoInTz, isoDate, isUniqueViolation, progressFromCounts, addDaysIso } from "@/lib/mentorServer";
import { projectRoutineForMentor } from "@/lib/mentorPrivacy";
import { syncProgramProgress, windowFor } from "@/lib/mentorProgress";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import {
  doneStreak, idleRun, isoRange, rollupDays, topMissedItems,
  type LogLite, type SchedProgram,
} from "@/lib/mentorAdherence";

// گزارش هفتگی منتور، هشدار پایبندی و خروجی CSV. همه فقط روی برنامه‌های
// *خود همین منتور* و رابطه‌ی ACTIVE (شاگرد مسدود/حذف‌شده نه، منتور معلق نه).
// ورودی لاگ‌های اجراست که سیستم از ردیابی خود شاگرد می‌سازد
// (lib/mentorProgress.ts)؛ این‌جا قبل از خواندن syncProgramProgress صدا زده
// می‌شود و لاگ‌ها فقط جمع‌بندی می‌شوند. رابطه‌ای که شاگرد «پیشرفت» را در آن
// مخفی کرده (showProgress=false) هیچ عددی نمی‌گیرد، هشدار نمی‌سازد و خروجی ندارد.

/** سقف نگاه به عقب برای زنجیره‌ها (روز) */
const LOOKBACK_DAYS = 60;
const MAX_STUDENTS = 500;

type StudentRel = {
  mentorshipId: string;
  studentId: string;
  name: string;
  avatarUrl: string | null;
  timezone: string | null;
  pausedAt: Date | null;
  showProgress: boolean;
};

async function activeRels(mentorId: string, studentId?: string): Promise<StudentRel[]> {
  const rows = await prisma.mentorship.findMany({
    where: {
      mentorId,
      status: "ACTIVE",
      ...(studentId ? { studentId } : {}),
      student: { isBlocked: false, deletedAt: null },
      mentor: { mentorProfile: { is: { suspendedAt: null } } },
    },
    select: {
      id: true,
      studentId: true,
      pausedAt: true,
      showProgress: true,
      student: { select: { name: true, lastName: true, username: true, avatarUrl: true, timezone: true } },
    },
    orderBy: { startedAt: "asc" },
    take: MAX_STUDENTS,
  });
  return rows.map((r) => ({
    mentorshipId: r.id,
    studentId: r.studentId,
    name: displayName(r.student),
    avatarUrl: r.student.avatarUrl,
    timezone: r.student.timezone,
    pausedAt: r.pausedAt,
    showProgress: r.showProgress,
  }));
}

type LoadedProgram = SchedProgram & { studentId: string; title: string; status: string };

/**
 * برنامه‌هایی که در بازه اجرا داشته‌اند (فعال، یا تمام/لغوشده پس از فعال‌شدن)
 * با بازه‌ی مؤثر هر کدام به روز تقویم شاگرد.
 */
async function loadSchedPrograms(mentorId: string, rels: StudentRel[], sinceIso: string): Promise<LoadedProgram[]> {
  if (rels.length === 0) return [];
  const tz = new Map(rels.map((r) => [r.studentId, r.timezone]));
  const since = dateFromIso(sinceIso);
  const rows = await prisma.mentorProgram.findMany({
    where: {
      mentorId,
      studentId: { in: rels.filter((r) => r.showProgress).map((r) => r.studentId) },
      activatedAt: { not: null },
      OR: [
        { status: "ACTIVE" },
        { status: "COMPLETED", completedAt: { gte: since } },
        { status: "CANCELLED", cancelledAt: { gte: since } },
      ],
    },
    select: {
      id: true, studentId: true, title: true, status: true, startDate: true, endDate: true,
      activatedAt: true, completedAt: true, cancelledAt: true,
      items: { select: { id: true, title: true, days: true }, orderBy: { order: "asc" } },
    },
  });
  const now = new Date();
  return rows.flatMap((p) => {
    // همان بازه‌ای که همگام‌ساز پیشرفت (lib/mentorProgress.ts) با آن لاگ می‌سازد
    const w = windowFor(p, tz.get(p.studentId) ?? null, now);
    if (!w) return [];
    return [{ id: p.id, studentId: p.studentId, title: p.title, status: p.status, fromIso: w.from, toIso: w.to, items: p.items }];
  });
}

async function loadLogs(programIds: string[], fromIso: string, toIso: string): Promise<(LogLite & { programId: string; updatedAt: Date })[]> {
  if (programIds.length === 0) return [];
  await syncProgramProgress(programIds);
  const rows = await prisma.mentorProgramLog.findMany({
    where: { programId: { in: programIds }, date: { gte: dateFromIso(fromIso), lte: dateFromIso(toIso) } },
    select: { programId: true, itemId: true, date: true, status: true, updatedAt: true },
    take: 20_000,
  });
  return rows.map((l) => ({ programId: l.programId, itemId: l.itemId, date: isoDate(l.date), status: l.status, updatedAt: l.updatedAt }));
}

// ───────────────────────── گزارش هفتگی ─────────────────────────

export type WeeklyStudentReport = {
  studentId: string;
  mentorshipId: string;
  name: string;
  avatarUrl: string | null;
  paused: boolean;
  /** شاگرد نمایش پیشرفت را برای این منتور خاموش کرده؛ عددها صفر و بی‌معنا‌اند */
  progressHidden: boolean;
  from: string;
  to: string;
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  unlogged: number;
  /** درصد انجام از کل آیتم‌های برنامه‌دار بازه (ناقص = نصف؛ ثبت‌نشده = انجام‌نشده) */
  rate: number;
  streak: number;
  idleDays: number;
  /** آخرین روزی که حداقل یک آیتم انجام شد (تقویم شاگرد) */
  lastDoneDate: string | null;
  /** آخرین پیام شاگرد در گفت‌وگو */
  lastMessageAt: Date | null;
  missedItems: { title: string; count: number }[];
  activePrograms: number;
  scheduledPrograms: { id: string; title: string; startDate: string }[];
};

export type WeeklyReport = { offset: number; generatedAt: Date; students: WeeklyStudentReport[] };

/** گزارش ۷ روزه‌ی هر شاگرد فعال. offset=۰ یعنی ۷ روز منتهی به امروز هر شاگرد؛ ۱ یعنی هفته‌ی قبلش. */
export async function buildWeeklyReport(mentorId: string, offset = 0): Promise<WeeklyReport> {
  const rels = await activeRels(mentorId);
  const now = new Date();
  if (rels.length === 0) return { offset, generatedAt: now, students: [] };

  const todays = new Map(rels.map((r) => [r.studentId, dateIsoInTz(now, r.timezone)]));
  const allToday = Array.from(todays.values()).sort();
  const minToday = allToday[0];
  const maxToday = allToday[allToday.length - 1];
  const lookFrom = addDaysIso(minToday, -(7 * offset + LOOKBACK_DAYS));

  const programs = await loadSchedPrograms(mentorId, rels, lookFrom);
  const logs = await loadLogs(programs.map((p) => p.id), lookFrom, maxToday);
  const studentIds = rels.map((r) => r.studentId);

  const [lastMsgs, scheduled] = await Promise.all([
    prisma.mentorMessage.groupBy({
      by: ["mentorshipId"],
      where: { mentorshipId: { in: rels.map((r) => r.mentorshipId) }, senderId: { in: studentIds } },
      _max: { createdAt: true },
    }),
    prisma.mentorProgram.findMany({
      where: { mentorId, studentId: { in: studentIds }, status: "ACCEPTED", startDate: { not: null } },
      select: { id: true, studentId: true, title: true, startDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);
  const lastMsg = new Map(lastMsgs.map((m) => [m.mentorshipId, m._max.createdAt]));

  const students = rels.map((r): WeeklyStudentReport => {
    const today = todays.get(r.studentId)!;
    const to = addDaysIso(today, -7 * offset);
    const from = addDaysIso(to, -6);
    const mine = programs.filter((p) => p.studentId === r.studentId);
    const ids = new Set(mine.map((p) => p.id));
    const myLogs = logs.filter((l) => ids.has(l.programId));

    const week = rollupDays(mine, myLogs, isoRange(from, to), today);
    const sum = week.reduce(
      (a, d) => ({ s: a.s + d.scheduled, c: a.c + d.completed, p: a.p + d.partial, m: a.m + d.missed, u: a.u + d.unlogged }),
      { s: 0, c: 0, p: 0, m: 0, u: 0 },
    );
    const history = rollupDays(mine, myLogs, isoRange(addDaysIso(to, -LOOKBACK_DAYS), to), today);
    const lastDoneDate = myLogs.reduce<string | null>((a, l) => (l.status !== "MISSED" && l.date <= to && (!a || l.date > a) ? l.date : a), null);

    return {
      studentId: r.studentId,
      mentorshipId: r.mentorshipId,
      name: r.name,
      avatarUrl: r.avatarUrl,
      paused: !!r.pausedAt,
      progressHidden: !r.showProgress,
      from,
      to,
      scheduled: sum.s,
      completed: sum.c,
      partial: sum.p,
      missed: sum.m,
      unlogged: sum.u,
      rate: progressFromCounts(sum.c, sum.p, sum.m + sum.u).rate,
      streak: doneStreak(history, offset === 0 ? today : addDaysIso(to, 1)),
      idleDays: idleRun(history, offset === 0 ? today : addDaysIso(to, 1)).days,
      lastDoneDate,
      lastMessageAt: lastMsg.get(r.mentorshipId) ?? null,
      missedItems: topMissedItems(mine, myLogs, isoRange(from, to), today),
      activePrograms: mine.filter((p) => p.status === "ACTIVE").length,
      scheduledPrograms: scheduled
        .filter((p) => p.studentId === r.studentId && isoDate(p.startDate!) > today)
        .map((p) => ({ id: p.id, title: p.title, startDate: isoDate(p.startDate!) })),
    };
  });

  return { offset, generatedAt: now, students };
}

// ───────────────────────── هشدار پایبندی ─────────────────────────

/**
 * هشدار «n روز برنامه‌دار پشت‌سرهم بدون انجام» برای منتور — lazy، موقع
 * لود داشبورد. برای هر رابطه یک ردیف MentorAdherenceAlert (یکتا روی رابطه
 * و روز) ساخته می‌شود؛ و تا وقتی همان دوره‌ی بی‌کاری ادامه دارد هشدار دوم
 * ساخته نمی‌شود (فقط وقتی شاگرد دوباره انجام داد و بعد باز n روز رها کرد).
 * برمی‌گرداند چند هشدار تازه ساخته شد. هرگز throw نمی‌کند.
 */
export async function runAdherenceAlerts(mentorId: string): Promise<number> {
  try {
    const profile = await prisma.mentorProfile.findUnique({ where: { userId: mentorId }, select: { alertMissedDays: true, suspendedAt: true } });
    const n = profile?.alertMissedDays;
    if (!profile || profile.suspendedAt || !n) return 0;

    const rels = (await activeRels(mentorId)).filter((r) => !r.pausedAt && r.showProgress);
    if (rels.length === 0) return 0;
    const now = new Date();
    const todays = new Map(rels.map((r) => [r.studentId, dateIsoInTz(now, r.timezone)]));
    const minToday = Array.from(todays.values()).sort()[0];
    const lookFrom = addDaysIso(minToday, -LOOKBACK_DAYS);
    const programs = (await loadSchedPrograms(mentorId, rels, lookFrom)).filter((p) => p.status === "ACTIVE");
    if (programs.length === 0) return 0;
    const logs = await loadLogs(programs.map((p) => p.id), lookFrom, Array.from(todays.values()).sort().pop()!);

    let created = 0;
    for (const r of rels) {
      const mine = programs.filter((p) => p.studentId === r.studentId);
      if (mine.length === 0) continue;
      const today = todays.get(r.studentId)!;
      const ids = new Set(mine.map((p) => p.id));
      const days = rollupDays(mine, logs.filter((l) => ids.has(l.programId)), isoRange(addDaysIso(today, -LOOKBACK_DAYS), today), today);
      const run = idleRun(days, today);
      if (run.days < n || !run.since) continue;

      // همین دوره قبلا هشدار گرفته؟
      const prior = await prisma.mentorAdherenceAlert.findFirst({
        where: { mentorshipId: r.mentorshipId, day: { gte: dateFromIso(run.since) } },
        select: { id: true },
      });
      if (prior) continue;
      try {
        await prisma.mentorAdherenceAlert.create({ data: { mentorshipId: r.mentorshipId, day: dateFromIso(today), missedDays: run.days } });
      } catch (e) {
        if (isUniqueViolation(e)) continue;
        throw e;
      }
      created++;
      await notifyUser(mentorId, {
        type: "mentor.adherence",
        title: "پایبندی شاگرد",
        body: `${r.name} ${faNum(run.days)} روز برنامه‌دار پشت‌سرهم هیچ آیتمی انجام نداده است.`,
        url: `/mentor/students/${r.studentId}`,
      });
    }
    return created;
  } catch {
    return 0;
  }
}

// ───────────────────────── خروجی CSV ─────────────────────────

export const EXPORT_MAX_DAYS = 120;
const statusLabel = (): Record<string, string> => ({ COMPLETED: tr("انجام شد", "Done"), PARTIAL: tr("ناقص", "Partial"), MISSED: tr("انجام نشد", "Not done") });

/** یک خانه‌ی CSV — نقل‌قول در صورت نیاز و خنثی‌کردن فرمول (=, +, -, @) در اکسل */
export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * پیشرفت روزبه‌روز یک شاگرد در بازه: (۱) برنامه‌های همین منتور — همیشه
 * برای سازنده‌اش دیدنی؛ (۲) روتین خود شاگرد فقط از مسیر
 * projectRoutineForMentor، یعنی دقیقا همان‌قدر که تنظیمات حریم خصوصی
 * این رابطه اجازه می‌دهد (برنامه‌ی مخفی، اسم مخفی و پیشرفت مخفی بیرون
 * نمی‌آید). null = رابطه‌ی فعالی نیست.
 */
export async function buildProgressCsv(mentorId: string, studentId: string, fromIso: string, toIso: string): Promise<{ csv: string; name: string } | "hidden" | null> {
  const [rel] = await activeRels(mentorId, studentId);
  if (!rel) return null;
  if (!rel.showProgress) return "hidden";
  const m = await prisma.mentorship.findUnique({
    where: { id: rel.mentorshipId },
    select: { shareAllPrograms: true, sharedPrograms: true, showSchedule: true, showProgramName: true, showTaskName: true, showTaskDetails: true, showProgress: true },
  });
  if (!m) return null;

  const today = dateIsoInTz(new Date(), rel.timezone);
  const dates = isoRange(fromIso, toIso);
  const programs = await loadSchedPrograms(mentorId, [rel], fromIso);
  if (programs.length) await syncProgramProgress(programs.map((p) => p.id));
  const logs = programs.length
    ? await prisma.mentorProgramLog.findMany({
        where: { programId: { in: programs.map((p) => p.id) }, date: { gte: dateFromIso(fromIso), lte: dateFromIso(toIso) } },
        select: { itemId: true, date: true, status: true, setsDone: true, note: true },
      })
    : [];
  const logMap = new Map(logs.map((l) => [`${l.itemId}|${isoDate(l.date)}`, l]));

  const lines: string[] = [csvLine([tr("تاریخ", "Date"), tr("منبع", "Source"), tr("برنامه", "Program"), tr("آیتم", "Item"), tr("وضعیت", "Status"), tr("ست انجام‌شده", "Sets done"), tr("یادداشت شاگرد", "Student note")])];
  const STATUS_FA = statusLabel();
  for (const date of dates) {
    const js = new Date(date + "T00:00:00.000Z").getUTCDay();
    for (const p of programs) {
      if ((p.fromIso && date < p.fromIso) || (p.toIso && date > p.toIso)) continue;
      for (const it of p.items) {
        if (!it.days.includes(js)) continue;
        const l = logMap.get(`${it.id}|${date}`);
        if (!l && date >= today) continue;
        lines.push(csvLine([date, tr("برنامه‌ی مربی", "Mentor program"), p.title, it.title, l ? STATUS_FA[l.status] : tr("ثبت‌نشده", "Not logged"), l?.setsDone ?? "", l?.note ?? ""]));
      }
    }
  }

  const routine = await projectRoutineForMentor(studentId, m, dates.filter((d) => d < today || d === today));
  for (const s of routine.slots) {
    if (!s.done) continue; // پیشرفت مخفی است
    for (const [date, done] of Object.entries(s.done).sort()) {
      if (date > today) continue;
      lines.push(csvLine([date, tr("روتین شاگرد", "Student routine"), s.program ?? tr("مخفی", "Hidden"), s.title, done ? tr("انجام شد", "Done") : date === today ? "" : tr("انجام نشد", "Not done"), "", ""]));
    }
  }

  const head = lines[0];
  const body = lines.slice(1).sort();
  // BOM تا اکسل متن فارسی را درست باز کند
  return { csv: "﻿" + [head, ...body].join("\r\n") + "\r\n", name: rel.name };
}
