import { prisma } from "@/lib/prisma";
import { SETTING_KEYS, MAX_SETTING_VALUE_BYTES } from "@/lib/userSettingKeys";
import { normalizeTimeToFa } from "@/lib/timeUtils";
import type { StudentOccurrence } from "@/lib/mentorPrivacy";
import { isoDate, isUniqueViolation } from "@/lib/mentorServer";

// آینه‌کردنِ برنامه‌ی ROUTINEِ فعالِ منتور در «روتین من»ِ شاگرد.
//
// روتینِ شاگرد یک آرایه‌ی JSON در UserSetting("customOccurrences")ـه که خودِ
// کلاینت هم کلِ آن را بازنویسی می‌کنه. پس:
//   - هر occurrenceِ آینه‌شده `mentorProgramId` داره تا حذف/جایگزینی فقط
//     همون‌ها رو هدف بگیره و به برنامه‌های خودِ شاگرد دست نزنه (مثلِ الگوی roadmapId).
//   - idها قطعی‌ان (برنامه + ترتیبِ آیتم + روز) تا فعال‌سازیِ دوباره تیک‌های
//     قبلیِ DailyEntry رو گم نکنه.
//   - نوشتن read-modify-writeِ خوش‌بینانه‌ست: اگه بینِ خوندن و نوشتن ردیف
//     عوض شده باشه (updatedAt فرق کنه) دوباره از نو خونده می‌شه، تا تغییرِ
//     هم‌زمانِ کلاینت بی‌صدا پاک نشه.
//   - سقفِ MAX_SETTING_VALUE_BYTES رعایت می‌شه؛ وگرنه PUTِ بعدیِ خودِ شاگرد
//     روی /api/settings با ۴۱۳ می‌شکست و دیگه نمی‌تونست روتینش رو ویرایش کنه.

export class MirrorTooLargeError extends Error {
  constructor() {
    super("mirror too large");
  }
}

type MirrorProgram = { id: string; title: string; startDate: Date | null; endDate: Date | null };
type MirrorItem = { order: number; title: string; days: number[]; startTime: string | null; durationMin: number | null };

function timeLabel(startTime: string | null, durationMin: number | null): string {
  if (!startTime) return "";
  const [h, m] = startTime.split(":").map(Number);
  const start = normalizeTimeToFa(startTime);
  if (!durationMin) return start;
  const endMin = h * 60 + m + durationMin;
  // عبور از نیمه‌شب در قالبِ روتین قابل‌نمایش نیست؛ فقط ساعتِ شروع می‌مونه
  if (endMin >= 24 * 60) return start;
  const end = normalizeTimeToFa(`${Math.floor(endMin / 60)}:${String(endMin % 60).padStart(2, "0")}`);
  // همون قالبِ AddProgramForm: "۰۸:۰۰ – ۰۹:۰۰"
  return `${start} – ${end}`;
}

/** occurrenceهای روتینِ یک برنامه، از activationIso به بعد (روزهای گذشته یهو برنامه نمی‌گیرن) */
export function buildMirrorOccurrences(program: MirrorProgram, items: MirrorItem[], activationIso: string): StudentOccurrence[] {
  const programStart = program.startDate ? isoDate(program.startDate) : null;
  const startDate = programStart && programStart > activationIso ? programStart : activationIso;
  const endDate = program.endDate ? isoDate(program.endDate) : undefined;
  if (endDate && endDate < startDate) return [];

  const out: StudentOccurrence[] = [];
  for (const it of items) {
    for (const jsDay of it.days) {
      out.push({
        id: `mp-${program.id}-${it.order}-${jsDay}`,
        name: it.title,
        jsDay,
        time: timeLabel(it.startTime, it.durationMin),
        startDate,
        ...(endDate ? { endDate } : {}),
        tag: program.title,
        mentorProgramId: program.id,
      });
    }
  }
  return out;
}

function byteSize(v: unknown): number {
  return new TextEncoder().encode(JSON.stringify(v)).length;
}

/**
 * read-modify-writeِ خوش‌بینانه روی customOccurrencesِ یک کاربر.
 * mutate باید تابعِ خالص باشه (ممکنه چند بار صدا زده بشه). null یعنی تغییری لازم نیست.
 */
async function rewriteOccurrences(userId: string, mutate: (arr: unknown[]) => unknown[] | null): Promise<void> {
  const key = SETTING_KEYS.customOccurrences;
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key } }, select: { id: true, value: true, updatedAt: true } });
    const current = Array.isArray(row?.value) ? (row!.value as unknown[]) : [];
    const next = mutate(current);
    if (next === null) return;
    if (byteSize(next) > MAX_SETTING_VALUE_BYTES) throw new MirrorTooLargeError();

    if (!row) {
      try {
        await prisma.userSetting.create({ data: { userId, key, value: next as any } });
        return;
      } catch (e) {
        // ردیف هم‌زمان ساخته شد — دوباره از نو بخون
        if (isUniqueViolation(e)) continue;
        throw e;
      }
    }
    const res = await prisma.userSetting.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: { value: next as any } });
    if (res.count === 1) return;
  }
  throw new Error("customOccurrences write contention");
}

const isMirrorOf = (ids: Set<string>) => (o: unknown) =>
  !!o && typeof o === "object" && typeof (o as any).mentorProgramId === "string" && ids.has((o as any).mentorProgramId);

/**
 * پیش‌بررسیِ ظرفیت قبل از تغییرِ وضعیت — تا برنامه‌ای که جا نمی‌شه اصلا ACTIVE
 * نشه (به‌جای فعال‌شدن و بعد شکستِ آینه).
 */
export async function mirrorFits(studentId: string, occurrences: StudentOccurrence[], programId: string): Promise<boolean> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: studentId, key: SETTING_KEYS.customOccurrences } },
    select: { value: true },
  });
  const current = Array.isArray(row?.value) ? (row!.value as unknown[]) : [];
  const kept = current.filter((o) => !isMirrorOf(new Set([programId]))(o));
  return byteSize([...kept, ...occurrences]) <= MAX_SETTING_VALUE_BYTES;
}

/** آیتم‌های برنامه (فقط ROUTINE) رو در روتینِ شاگرد می‌نویسه؛ نسخه‌ی قبلیِ همین برنامه جایگزین می‌شه */
export async function writeProgramMirror(studentId: string, programId: string, occurrences: StudentOccurrence[]): Promise<void> {
  const own = isMirrorOf(new Set([programId]));
  await rewriteOccurrences(studentId, (arr) => [...arr.filter((o) => !own(o)), ...occurrences]);
}

/** حذفِ آینه‌ی یک یا چند برنامه از روتینِ شاگرد (complete / cancel / پایانِ رابطه) */
export async function removeProgramMirrors(studentId: string, programIds: string[]): Promise<void> {
  if (programIds.length === 0) return;
  const match = isMirrorOf(new Set(programIds));
  await rewriteOccurrences(studentId, (arr) => (arr.some(match) ? arr.filter((o) => !match(o)) : null));
}

/** برنامه + آیتم‌ها رو از دیتابیس می‌خونه و occurrenceها رو می‌سازه (برای غیرِ ROUTINE خالی) */
export async function loadMirrorOccurrences(programId: string, activationIso: string): Promise<StudentOccurrence[]> {
  const p = await prisma.mentorProgram.findUnique({
    where: { id: programId },
    select: {
      id: true, type: true, title: true, startDate: true, endDate: true,
      items: { select: { order: true, title: true, days: true, startTime: true, durationMin: true }, orderBy: { order: "asc" } },
    },
  });
  if (!p || p.type !== "ROUTINE") return [];
  return buildMirrorOccurrences(p, p.items, activationIso);
}

export type ActivationResult = "ok" | "conflict" | "too_large";

/**
 * انتقال به ACTIVE (از PENDING در «قبول + شروعِ فوری»، یا از ACCEPTED) همراه با
 * آینه‌ی روتین. ظرفیت قبل از تغییرِ وضعیت چک می‌شه؛ اگه نوشتنِ آینه با این
 * حال شکست بخوره، وضعیت به حالتِ قبل برمی‌گرده تا برنامه‌ی «فعال» بدونِ
 * آیتم در روتینِ شاگرد نمونه.
 */
export async function activateWithMirror(opts: {
  programId: string;
  studentId: string;
  from: "PENDING" | "ACCEPTED";
  activationIso: string;
  extra?: { respondedAt?: Date };
}): Promise<ActivationResult> {
  const occurrences = await loadMirrorOccurrences(opts.programId, opts.activationIso);
  if (occurrences.length > 0 && !(await mirrorFits(opts.studentId, occurrences, opts.programId))) return "too_large";

  const now = new Date();
  const res = await prisma.mentorProgram.updateMany({
    where: { id: opts.programId, status: opts.from },
    data: { status: "ACTIVE", activatedAt: now, ...(opts.extra ?? {}) },
  });
  if (res.count === 0) return "conflict";

  if (occurrences.length > 0) {
    try {
      await writeProgramMirror(opts.studentId, opts.programId, occurrences);
    } catch (e) {
      await prisma.mentorProgram.updateMany({
        where: { id: opts.programId, status: "ACTIVE", activatedAt: now },
        data: { status: opts.from, activatedAt: null, ...(opts.extra?.respondedAt ? { respondedAt: null } : {}) },
      });
      if (e instanceof MirrorTooLargeError) return "too_large";
      throw e;
    }
  }
  return "ok";
}

/**
 * برنامه‌های ACCEPTED که تاریخِ شروعشون رسیده، بدونِ کلیکِ کسی فعال می‌شن
 * (lazy — موقعِ خوندنِ برنامه‌ها). فقط وقتی رابطه هنوز ACTIVEـه.
 */
export async function activateDuePrograms(
  programs: { id: string; studentId: string; status: string; startDate: Date | null; mentorshipId: string }[],
  todayIsoFor: (studentId: string) => Promise<string>
): Promise<string[]> {
  const due = programs.filter((p) => p.status === "ACCEPTED" && p.startDate);
  if (due.length === 0) return [];
  const active = await prisma.mentorship.findMany({
    where: { id: { in: Array.from(new Set(due.map((p) => p.mentorshipId))) }, status: "ACTIVE" },
    select: { id: true },
  });
  const activeIds = new Set(active.map((m) => m.id));
  const activated: string[] = [];
  for (const p of due) {
    if (!activeIds.has(p.mentorshipId)) continue;
    const today = await todayIsoFor(p.studentId);
    if (isoDate(p.startDate!) > today) continue;
    const r = await activateWithMirror({ programId: p.id, studentId: p.studentId, from: "ACCEPTED", activationIso: today }).catch(() => "conflict" as const);
    if (r === "ok") activated.push(p.id);
  }
  return activated;
}
