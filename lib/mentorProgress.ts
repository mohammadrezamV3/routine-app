import type { MentorProgramStatus, ProgramLogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import {
  buildOccurrenceItemMap,
  deriveItemStates,
  isoAddDays,
  isoRange,
  jsDayOfIso,
  LOG_STATUS_TO_STATE,
  programWindow,
  weekStartIso,
  type DeriveItem,
  type MirrorOccurrenceLike,
  type ProgressState,
} from "@/lib/mentorProgressCore";

// پیشرفتِ خودکارِ برنامه‌ی منتور — سمتِ سرور.
//
// شاگرد دیگه «انجام شد/نشد» رو دستی گزارش نمی‌ده؛ وضعیتِ هر آیتم در هر روز از
// تیک‌های خودش در «روتین من» (DailyEntry) مشتق می‌شه (lib/mentorProgressCore.ts).
//
// چرا «همگام‌سازی هنگامِ خواندن» و نه «هوک روی نوشتنِ تیک»:
//   - «انجام‌نشده» با گذشتِ زمان پیش میاد، نه با یک نوشتن — هوکِ نوشتن هرگز
//     روزِ ازدست‌رفته رو ثبت نمی‌کرد.
//   - تیک از چند مسیر نوشته می‌شه (DayModal، داشبورد، همگام‌سازیِ آفلاین)؛ هوک
//     روی یکی‌شون یعنی جا انداختنِ بقیه. خواندن همیشه از خودِ DailyEntry‌ـه.
//   - ردیف‌های مشتق‌شده (source = "AUTO") در همون MentorProgramLog می‌مونن تا
//     آمارِ گروهی (داشبورد، «نیازمند توجه»، نرخ پایبندی) و بازخوردِ منتور روی
//     یک اجرا (logId) بدونِ تغییر کار کنن.
//
// idempotent و بدونِ شمارشِ دوباره: هر آیتم/روز یک ردیف (یکتای itemId+date)،
// ساخت با skipDuplicates، به‌روزرسانی/حذف فقط روی ردیف‌های AUTO و فقط وقتی
// مقدار فرق کرده. ردیف‌های MANUALِ قدیمی دست نمی‌خورن و جای ردیفِ AUTO رو می‌گیرن.
//
// هزینه: برنامه‌ی فعال حداکثر هر SYNC_TTL_MS یک بار (مگر force)؛ بعد از اولین
// همگام‌سازی فقط RESYNC_DAYS روزِ آخر دوباره حساب می‌شه (تیک‌زدنِ دیرهنگامِ
// روزهای اخیر) و روزهای قدیمی‌تر منجمد می‌مونن. برنامه‌ی بسته‌شده یک بار
// (هنگامِ بستن، قبل از حذفِ آینه) نهایی می‌شه و دیگه حساب نمی‌شه.

const SYNC_TTL_MS = 60_000;
const RESYNC_DAYS = 14;
const MAX_PROGRAMS_PER_SYNC = 200;

type SyncProgram = {
  id: string;
  type: "ROUTINE" | "WORKOUT";
  studentId: string;
  status: MentorProgramStatus;
  startDate: Date | null;
  endDate: Date | null;
  activatedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  progressSyncedAt: Date | null;
  items: DeriveItem[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function dayInTz(d: Date, tz: string | null | undefined): string {
  const fmt = (zone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  try {
    return fmt(tz || "Asia/Tehran");
  } catch {
    return fmt("Asia/Tehran");
  }
}

function closedAt(p: Pick<SyncProgram, "status" | "completedAt" | "cancelledAt">): Date | null {
  if (p.status === "ACTIVE") return null;
  return p.completedAt ?? p.cancelledAt ?? null;
}

/** بازه‌ی برنامه به تقویمِ محلیِ شاگرد؛ null برای برنامه‌ای که هرگز فعال نشده */
export function windowFor(p: Pick<SyncProgram, "status" | "startDate" | "endDate" | "activatedAt" | "completedAt" | "cancelledAt">, tz: string | null, now = new Date()) {
  if (!p.activatedAt) return null;
  const closed = closedAt(p);
  return programWindow({
    startIso: p.startDate ? iso(p.startDate) : null,
    endIso: p.endDate ? iso(p.endDate) : null,
    activationIso: dayInTz(p.activatedAt, tz),
    closeIso: closed ? dayInTz(closed, tz) : null,
    todayIso: dayInTz(now, tz),
  });
}

const PROGRAM_SELECT = {
  id: true, type: true, studentId: true, status: true, startDate: true, endDate: true, activatedAt: true,
  completedAt: true, cancelledAt: true, progressSyncedAt: true,
  items: { select: { id: true, order: true, title: true, days: true, sets: true, reps: true }, orderBy: { order: "asc" as const } },
};

async function loadTimezones(userIds: string[]): Promise<Map<string, string | null>> {
  const rows = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true } });
  return new Map(rows.map((r) => [r.id, r.timezone]));
}

async function loadOccurrences(userIds: string[]): Promise<Map<string, MirrorOccurrenceLike[]>> {
  const rows = await prisma.userSetting.findMany({
    where: { userId: { in: userIds }, key: SETTING_KEYS.customOccurrences },
    select: { userId: true, value: true },
  });
  return new Map(rows.map((r) => [r.userId, Array.isArray(r.value) ? (r.value as MirrorOccurrenceLike[]) : []]));
}

async function loadTicks(userId: string, from: string, to: string): Promise<Map<string, Record<string, unknown>>> {
  const rows = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: new Date(from + "T00:00:00.000Z"), lte: new Date(to + "T00:00:00.000Z") } },
    select: { date: true, completedItems: true },
  });
  return new Map(rows.map((r) => [iso(r.date), (r.completedItems ?? {}) as Record<string, unknown>]));
}

function needsSync(p: SyncProgram, now: Date, force: boolean): boolean {
  const closed = closedAt(p);
  if (closed) {
    // برنامه‌ی بسته منجمد است: فقط اگه بعد از بستن هنوز نهایی نشده (null = برنامه‌ی قدیمیِ دستی → هرگز؛
    // نهایی‌کردنِ صریح با finalize). force روی برنامه‌ی بسته اثری ندارد.
    return !!p.progressSyncedAt && p.progressSyncedAt < closed;
  }
  if (force || !p.progressSyncedAt) return true;
  return now.getTime() - p.progressSyncedAt.getTime() >= SYNC_TTL_MS;
}

/**
 * لاگ‌های AUTOِ برنامه‌ها رو با تیک‌های روتینِ شاگرد هم‌سو می‌کنه.
 * force: بدونِ توجه به TTL (نمای جزئیاتِ برنامه، لحظه‌ی بستنِ برنامه، دیتای آزمایشی).
 * finalize: برای برنامه‌ی بسته‌ای که هنوز هرگز همگام نشده هم اجرا شود (فقط هنگامِ بستن).
 */
export async function syncProgramProgress(programIds: string[], opts: { force?: boolean; finalize?: boolean } = {}): Promise<void> {
  const ids = Array.from(new Set(programIds)).slice(0, MAX_PROGRAMS_PER_SYNC);
  if (ids.length === 0) return;
  const now = new Date();
  const all = (await prisma.mentorProgram.findMany({
    where: { id: { in: ids }, activatedAt: { not: null }, status: { in: ["ACTIVE", "COMPLETED", "CANCELLED"] } },
    select: PROGRAM_SELECT,
  })) as SyncProgram[];
  const due = all.filter((p) => needsSync(p, now, !!opts.force) || (opts.finalize && p.status !== "ACTIVE"));
  if (due.length === 0) return;

  const students = Array.from(new Set(due.map((p) => p.studentId)));
  const [tzs, occs] = await Promise.all([loadTimezones(students), loadOccurrences(students)]);

  for (const studentId of students) {
    const tz = tzs.get(studentId) ?? null;
    const progs = due.filter((p) => p.studentId === studentId);
    const plans = progs.flatMap((p) => {
      const w = windowFor(p, tz, now);
      if (!w) return [];
      // اولین بار کلِ بازه؛ بعد از آن فقط روزهای اخیر (از شنبه‌ی همان هفته تا پیوستگیِ جابه‌جایی‌ها حفظ شود)
      let deriveFrom = w.from;
      if (p.progressSyncedAt) {
        const lastSyncDay = isoAddDays(dayInTz(p.progressSyncedAt, tz), -1);
        const recent = isoAddDays(w.openDay, -RESYNC_DAYS);
        deriveFrom = weekStartIso(recent < lastSyncDay ? recent : lastSyncDay);
        if (deriveFrom < w.from) deriveFrom = w.from;
      }
      return [{ p, w, deriveFrom }];
    });
    if (plans.length === 0) continue;

    const minFrom = plans.reduce((a, x) => (x.deriveFrom < a ? x.deriveFrom : a), plans[0].deriveFrom);
    const maxTo = plans.reduce((a, x) => (x.w.lastFinal > a ? x.w.lastFinal : a), plans[0].w.lastFinal);
    const ticks = minFrom <= maxTo ? await loadTicks(studentId, minFrom, maxTo) : new Map();
    const existing = await prisma.mentorProgramLog.findMany({
      where: { programId: { in: plans.map((x) => x.p.id) }, date: { gte: new Date(minFrom + "T00:00:00.000Z") } },
      select: { id: true, programId: true, itemId: true, date: true, status: true, source: true, doneOn: true },
    });

    for (const { p, w, deriveFrom } of plans) {
      const itemOf = buildOccurrenceItemMap(p.id, p.type, p.items, occs.get(studentId) ?? []);
      const cells =
        deriveFrom <= w.lastFinal
          ? deriveItemStates({ items: p.items, from: deriveFrom, to: w.lastFinal, openDay: w.openDay, ticks, itemOf })
          : [];
      const desired = new Map<string, { itemId: string; date: string; status: ProgramLogStatus; doneOn: string | null }>();
      for (const c of cells) {
        if (c.state === "upcoming") continue;
        desired.set(`${c.itemId}|${c.date}`, { itemId: c.itemId, date: c.date, status: c.state === "done" ? "COMPLETED" : "MISSED", doneOn: c.doneOn });
      }

      const toDelete: string[] = [];
      const toUpdate: { id: string; status: ProgramLogStatus; doneOn: string | null }[] = [];
      for (const r of existing) {
        if (r.programId !== p.id) continue;
        const d = iso(r.date);
        if (d < deriveFrom) continue;
        const key = `${r.itemId}|${d}`;
        const want = desired.get(key);
        desired.delete(key); // ردیفِ موجود (AUTO یا MANUAL) جای ساختِ دوباره نیست
        if (r.source !== "AUTO") continue;
        if (!want) toDelete.push(r.id);
        else if (want.status !== r.status || want.doneOn !== (r.doneOn ? iso(r.doneOn) : null)) toUpdate.push({ id: r.id, status: want.status, doneOn: want.doneOn });
      }

      if (desired.size > 0) {
        await prisma.mentorProgramLog.createMany({
          data: Array.from(desired.values()).map((x) => ({
            programId: p.id,
            itemId: x.itemId,
            studentId: p.studentId,
            date: new Date(x.date + "T00:00:00.000Z"),
            status: x.status,
            source: "AUTO",
            doneOn: x.doneOn ? new Date(x.doneOn + "T00:00:00.000Z") : null,
          })),
          skipDuplicates: true,
        });
      }
      for (const u of toUpdate) {
        await prisma.mentorProgramLog.updateMany({
          where: { id: u.id, source: "AUTO" },
          data: { status: u.status, doneOn: u.doneOn ? new Date(u.doneOn + "T00:00:00.000Z") : null },
        });
      }
      if (toDelete.length) await prisma.mentorProgramLog.deleteMany({ where: { id: { in: toDelete }, source: "AUTO" } });
      await prisma.mentorProgram.updateMany({ where: { id: p.id }, data: { progressSyncedAt: now } });
    }
  }
}

// ───────────────────────── نمای هفته ─────────────────────────

export type ProgressCell = {
  itemId: string;
  state: ProgressState;
  logId: string | null;
  doneOn: string | null;
  setsDone: number | null;
  /** یادداشتِ شاگرد روی ثبتِ دستیِ قدیمی */
  note: string | null;
};
export type ProgressDay = { date: string; cells: ProgressCell[]; note: string | null };
export type ProgressView = {
  /** true = شاگرد نمایشِ پیشرفت را برای این منتور بسته (یا دسترسی بسته است)؛ cells خالی */
  hidden: boolean;
  from: string;
  to: string | null;
  today: string;
  days: ProgressDay[];
};

type ViewProgram = SyncProgram & { mentorId: string };

/**
 * وضعیتِ هر آیتم در روزهای [fromIso, toIso] (حداکثر ۴۲ روز) برای نمایش.
 * ردیف‌های MentorProgramLog (AUTO/MANUAL) منبع‌اند؛ روزهای باز «پیشِ رو».
 * برای برنامه‌ی هرگز-فعال‌نشده null.
 */
export async function loadProgressView(
  programId: string,
  fromIso: string,
  toIso: string,
  opts: { hidden: boolean; withNotes?: boolean }
): Promise<ProgressView | null> {
  const p = (await prisma.mentorProgram.findUnique({ where: { id: programId }, select: { ...PROGRAM_SELECT, mentorId: true } })) as ViewProgram | null;
  if (!p) return null;
  const tz = (await loadTimezones([p.studentId])).get(p.studentId) ?? null;
  const w = windowFor(p, tz);
  if (!w) return null;

  const dates = isoRange(fromIso, toIso, 42);
  const fromD = new Date(fromIso + "T00:00:00.000Z");
  const toD = new Date((dates[dates.length - 1] ?? fromIso) + "T00:00:00.000Z");
  const [rows, notes] = await Promise.all([
    opts.hidden
      ? Promise.resolve([] as { id: string; itemId: string; date: Date; status: ProgramLogStatus; doneOn: Date | null; setsDone: number | null; note: string | null }[])
      : prisma.mentorProgramLog.findMany({
          where: { programId: p.id, date: { gte: fromD, lte: toD } },
          select: { id: true, itemId: true, date: true, status: true, doneOn: true, setsDone: true, note: true },
        }),
    opts.withNotes === false
      ? Promise.resolve([] as { date: Date; body: string }[])
      : prisma.mentorProgramDayNote.findMany({ where: { programId: p.id, date: { gte: fromD, lte: toD } }, select: { date: true, body: true } }),
  ]);
  const rowMap = new Map(rows.map((r) => [`${r.itemId}|${iso(r.date)}`, r]));
  const noteMap = new Map(notes.map((n) => [iso(n.date), n.body]));
  const legacy = !p.progressSyncedAt;
  const closed = !!closedAt(p);

  const days: ProgressDay[] = dates.map((d) => {
    const inRange = d >= w.from && (!w.to || d <= w.to);
    const cells: ProgressCell[] = [];
    if (inRange && !opts.hidden) {
      const js = jsDayOfIso(d);
      for (const it of p.items) {
        if (!it.days.includes(js)) continue;
        const r = rowMap.get(`${it.id}|${d}`);
        let state: ProgressState;
        if (r) state = LOG_STATUS_TO_STATE[r.status];
        else if (legacy || (closed && d >= w.openDay)) state = "untracked";
        else if (d >= w.openDay) state = "upcoming";
        else state = "missed";
        cells.push({
          itemId: it.id,
          state,
          logId: r?.id ?? null,
          doneOn: r?.doneOn ? iso(r.doneOn) : null,
          setsDone: r?.setsDone ?? null,
          note: r?.note ?? null,
        });
      }
    }
    return { date: d, cells, note: noteMap.get(d) ?? null };
  });
  return { hidden: opts.hidden, from: w.from, to: w.to, today: w.openDay, days };
}

/**
 * idِ برنامه‌هایی که viewer منتورِ آن‌هاست و شاگرد «نمایش پیشرفت» را برایش
 * بسته — همان پرچمی که نمای روتینِ شاگرد (lib/mentorPrivacy.ts) رعایت می‌کند.
 */
export async function progressHiddenPrograms(programs: { id: string; mentorId: string; mentorshipId: string }[], viewerId: string): Promise<Set<string>> {
  const mine = programs.filter((p) => p.mentorId === viewerId);
  if (mine.length === 0) return new Set();
  const closed = await prisma.mentorship.findMany({
    where: { id: { in: Array.from(new Set(mine.map((p) => p.mentorshipId))) }, showProgress: false },
    select: { id: true },
  });
  const hiddenRel = new Set(closed.map((m) => m.id));
  return new Set(mine.filter((p) => hiddenRel.has(p.mentorshipId)).map((p) => p.id));
}
