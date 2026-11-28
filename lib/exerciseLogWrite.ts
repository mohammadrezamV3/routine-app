import { prisma } from "@/lib/prisma";
import {
  SessionEntry, SessionRow, SessionWrite, WriteCheck, checkSessionWrite, cleanItems, foldSessions, nextSessionState, rowToSession,
} from "@/lib/exerciseSessions";

const ROW_SELECT = { sessionNo: true, completed: true, completedItems: true, startedAt: true, plannedCount: true } as const;

/** همه‌ی جلسه‌های یک روز یک برنامه (مرتب با شماره‌ی جلسه) */
export async function loadDaySessions(userId: string, planId: string, date: Date): Promise<SessionEntry[]> {
  const rows: SessionRow[] = await prisma.exerciseLog.findMany({ where: { userId, planId, date }, orderBy: { sessionNo: "asc" }, select: ROW_SELECT });
  return rows.map(rowToSession);
}

export { foldSessions };

/**
 * ثبت یک نوشتن روی یک جلسه‌ی روز — تک‌منبع مشترک بین POST /api/exercise/log و دستیار نومو.
 * قانون‌ها در checkSessionWrite (جلسه‌ی کامل دوباره باز نمی‌شه). completedItems فقط وقتی
 * داده شده دست می‌خوره؛ سقف تعداد/طول چون ستون Jsonه.
 */
export async function writeExerciseSession(
  userId: string, planId: string, date: Date, w: SessionWrite,
): Promise<{ ok: true; session: SessionEntry } | { ok: false; check: Exclude<WriteCheck, { ok: true }> }> {
  const existing = await loadDaySessions(userId, planId, date);
  const check = checkSessionWrite(existing, w);
  if (!check.ok) return { ok: false, check };
  const cur = existing.find((s) => s.no === w.session);
  const next = nextSessionState(cur, w);
  const now = new Date();
  const data = {
    completed: next.completed,
    completedItems: next.completedItems,
    plannedCount: next.plannedCount,
  };
  await prisma.exerciseLog.upsert({
    where: { userId_planId_date_sessionNo: { userId, planId, date, sessionNo: w.session } },
    create: { userId, planId, date, sessionNo: w.session, ...data, startedAt: next.started ? now : null },
    update: data,
  });
  // اولین لحظه‌ی شروع نگه داشته می‌شه
  if (next.started) {
    await prisma.exerciseLog.updateMany({ where: { userId, planId, date, sessionNo: w.session, startedAt: null }, data: { startedAt: now } });
  }
  return { ok: true, session: next };
}

/** سازگاری با فراخوان‌های قدیمی (نومو): ثبت «انجام شد/نشد» جلسه‌ی 1 */
export async function upsertExerciseLog(userId: string, planId: string, date: Date, completed: boolean, completedItems?: unknown) {
  return writeExerciseSession(userId, planId, date, { session: 1, completed: !!completed, completedItems: cleanItems(completedItems) });
}

/**
 * «انجام شد/نشد» روز از دید نومو: انجام‌شد = اگه هیچ جلسه‌ای پایان نخورده جلسه‌ی 1 (یا اولین
 * جلسه) پایان می‌خوره؛ انجام‌نشد = پایان همه‌ی جلسه‌های اون روز برداشته می‌شه.
 */
export async function setDayDone(userId: string, planId: string, date: Date, done: boolean) {
  const sessions = await loadDaySessions(userId, planId, date);
  if (done) {
    if (sessions.some((s) => s.completed)) return;
    await upsertExerciseLog(userId, planId, date, true);
    return;
  }
  await prisma.exerciseLog.updateMany({ where: { userId, planId, date, completed: true }, data: { completed: false } });
}
