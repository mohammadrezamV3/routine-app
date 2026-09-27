import { Prisma, type MentorProgramStatus, type MentorProgram, type MentorFeedback } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/inAppNotify";
import { rankByPopularity } from "@/lib/mentorRanking";

// کمک‌تابع‌های مشترکِ سمت سرورِ اکوسیستم منتور — شکلِ پاسخ‌های قرارداد
// (docs/mentors.md) فقط همین‌جا ساخته می‌شه تا روت‌ها و پنلِ ادمین هر کدوم
// نسخه‌ی خودشون رو نسازن و یکی‌شون بی‌صدا فیلدِ حساسی (ایمیل/شماره) لو نده.

// ───────────────────────── کاربرِ عمومی ─────────────────────────

/** تنها فیلدهای کاربر که به طرفِ مقابل نشون داده می‌شه — هرگز ایمیل/شماره */
export const PUBLIC_USER_SELECT = { id: true, name: true, lastName: true, username: true, avatarUrl: true } as const;
export type PublicUser = { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null };

export function toPublicUser(u: PublicUser): PublicUser {
  return { id: u.id, name: u.name, lastName: u.lastName, username: u.username, avatarUrl: u.avatarUrl };
}

// ───────────────────────── تاریخ ─────────────────────────

/** YYYY-MM-DDِ یک ستونِ @db.Date (که Prisma به‌صورت نیمه‌شبِ UTC برمی‌گردونه) */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateFromIso(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

export function addDaysIso(iso: string, days: number): string {
  const d = dateFromIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

/** همه‌ی روزهای [from, to] به‌صورت YYYY-MM-DD */
export function datesBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  for (let d = fromIso; d <= toIso && out.length < 400; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

/**
 * «امروز» در تایم‌زونِ خودِ کاربر — نه ساعتِ سرور. بدونِ این، شاگردِ تهرانی
 * بعد از نیمه‌شب (که هنوز روزِ قبل در UTCـه) نمی‌تونست اجرای امروزش رو ثبت کنه.
 */
export function dateIsoInTz(d: Date, tz: string | null | undefined): string {
  const fmt = (zone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  try {
    return fmt(tz || "Asia/Tehran");
  } catch {
    return fmt("Asia/Tehran");
  }
}

export function todayIsoInTz(tz: string | null | undefined): string {
  return dateIsoInTz(new Date(), tz);
}

export async function userTimezone(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return u?.timezone ?? null;
}

export async function todayIsoForUser(userId: string): Promise<string> {
  return todayIsoInTz(await userTimezone(userId));
}

// ───────────────────────── بلاکِ کاربر-به-کاربر ─────────────────────────

/** آیا یکی از دو نفر اون یکی رو (از بخشِ دوستان) بلاک کرده؟ */
export async function usersBlockEachOther(a: string, b: string): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return !!row;
}

/** idهای کاربرانی که با viewer رابطه‌ی بلاک (در هر جهت) دارن */
export async function blockedUserIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
    take: 1000,
  });
  return rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId));
}

// ───────────────────────── پروفایلِ منتور ─────────────────────────

/** شرطِ «قابلِ دیدن در کشف»: منتشرشده، معلق‌نشده، صاحبش مسدود/حذف نشده */
export const DISCOVERABLE_PROFILE_WHERE: Prisma.MentorProfileWhereInput = {
  published: true,
  suspendedAt: null,
  user: { isBlocked: false, deletedAt: null },
};

export const MENTOR_CARD_INCLUDE = {
  user: { select: PUBLIC_USER_SELECT },
  credentials: { select: { category: true, status: true } },
} satisfies Prisma.MentorProfileInclude;

export type CardProfile = Prisma.MentorProfileGetPayload<{ include: typeof MENTOR_CARD_INCLUDE }>;

export type MentorCard = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  categories: string[];
  identityVerified: boolean;
  certifications: { category: string; verified: boolean }[];
  ratingAvg: number;
  ratingCount: number;
  activeStudents: number;
  totalStudents: number;
  acceptingStudents: boolean;
};

export type MentorStats = { activeStudents: number; totalStudents: number; completedPrograms: number };

/** آمارِ شاگرد/برنامه برای چند منتور، با سه کوئریِ گروهی (نه به‌ازای هر منتور) */
export async function loadMentorStats(mentorIds: string[]): Promise<Map<string, MentorStats>> {
  const out = new Map<string, MentorStats>();
  for (const id of mentorIds) out.set(id, { activeStudents: 0, totalStudents: 0, completedPrograms: 0 });
  if (mentorIds.length === 0) return out;
  const [active, total, completed] = await Promise.all([
    prisma.mentorship.groupBy({ by: ["mentorId"], where: { mentorId: { in: mentorIds }, status: "ACTIVE" }, _count: { _all: true } }),
    prisma.mentorship.groupBy({ by: ["mentorId"], where: { mentorId: { in: mentorIds }, startedAt: { not: null } }, _count: { _all: true } }),
    prisma.mentorProgram.groupBy({ by: ["mentorId"], where: { mentorId: { in: mentorIds }, status: "COMPLETED" }, _count: { _all: true } }),
  ]);
  for (const r of active) out.get(r.mentorId)!.activeStudents = r._count._all;
  for (const r of total) out.get(r.mentorId)!.totalStudents = r._count._all;
  for (const r of completed) out.get(r.mentorId)!.completedPrograms = r._count._all;
  return out;
}

export function toMentorCard(p: CardProfile, stats: MentorStats | undefined): MentorCard {
  // فقط مدرکِ دسته‌هایی که الان روی پروفایلن — مدرکِ دسته‌ی حذف‌شده نباید «تأییدشده» جلوه کنه
  const certifications = p.categories.map((category) => ({
    category,
    verified: p.credentials.some((c) => c.category === category && c.status === "VERIFIED"),
  }));
  return {
    userId: p.userId,
    name: displayName(p.user),
    avatarUrl: p.user.avatarUrl,
    headline: p.headline,
    categories: p.categories,
    identityVerified: p.identityStatus === "VERIFIED",
    certifications,
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    activeStudents: stats?.activeStudents ?? 0,
    totalStudents: stats?.totalStudents ?? 0,
    acceptingStudents: p.acceptingStudents,
  };
}

export async function buildMentorCards(profiles: CardProfile[]): Promise<MentorCard[]> {
  const stats = await loadMentorStats(profiles.map((p) => p.userId));
  return profiles.map((p) => toMentorCard(p, stats.get(p.userId)));
}

/** MentorSelf — پروفایلِ منتوریِ خودم با وضعیتِ احراز و متای مدارک (بدونِ بایتِ فایل) */
export async function loadMentorSelf(userId: string) {
  const p = await prisma.mentorProfile.findUnique({
    where: { userId },
    include: {
      credentials: { select: { category: true, status: true, rejectReason: true } },
      documents: {
        select: { id: true, kind: true, category: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    userId: p.userId,
    headline: p.headline,
    bio: p.bio,
    specialties: p.specialties,
    categories: p.categories,
    published: p.published,
    acceptingStudents: p.acceptingStudents,
    identityStatus: p.identityStatus,
    identityRejectReason: p.identityRejectReason,
    suspendedAt: p.suspendedAt,
    suspendedReason: p.suspendedReason,
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    credentials: p.credentials.filter((c) => p.categories.includes(c.category)),
    documents: p.documents,
  };
}

/**
 * بازمحاسبه‌ی خلاصه‌ی امتیاز از نظرهای VISIBLE — بعد از هر ساخت/ویرایش/حذف/
 * پنهان‌سازیِ نظر (هم روتِ کاربر، هم پنلِ ادمین). denormalized نگه داشته
 * می‌شه تا کشف و رتبه‌بندی برای هر منتور aggregate نزنن.
 */
export async function recomputeMentorRating(mentorUserId: string): Promise<void> {
  const agg = await prisma.mentorReview.aggregate({
    where: { mentorId: mentorUserId, status: "VISIBLE" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.mentorProfile.updateMany({
    where: { userId: mentorUserId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all },
  });
}

// ───────────────────────── رابطه ─────────────────────────

export const MENTORSHIP_WITH_USERS_INCLUDE = {
  mentor: { select: PUBLIC_USER_SELECT },
  student: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.MentorshipInclude;

export type MentorshipWithUsers = Prisma.MentorshipGetPayload<{ include: typeof MENTORSHIP_WITH_USERS_INCLUDE }>;

export type MentorshipRow = {
  id: string;
  status: string;
  initiatedBy: string;
  message: string | null;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  counterpart: PublicUser;
  unread: number;
  activePrograms: number;
};

/** ردیف‌های لیستِ رابطه از دیدِ viewer — شمارشِ خوانده‌نشده/برنامه‌ی فعال با کوئریِ گروهی */
export async function buildMentorshipRows(rows: MentorshipWithUsers[], viewerId: string): Promise<MentorshipRow[]> {
  const ids = rows.map((r) => r.id);
  const [unread, active] = ids.length
    ? await Promise.all([
        prisma.mentorMessage.groupBy({
          by: ["mentorshipId"],
          where: { mentorshipId: { in: ids }, senderId: { not: viewerId }, readAt: null },
          _count: { _all: true },
        }),
        prisma.mentorProgram.groupBy({ by: ["mentorshipId"], where: { mentorshipId: { in: ids }, status: "ACTIVE" }, _count: { _all: true } }),
      ])
    : [[], []];
  const unreadMap = new Map(unread.map((r) => [r.mentorshipId, r._count._all]));
  const activeMap = new Map(active.map((r) => [r.mentorshipId, r._count._all]));
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    initiatedBy: r.initiatedBy,
    message: r.message,
    createdAt: r.createdAt,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    counterpart: toPublicUser(r.mentorId === viewerId ? r.student : r.mentor),
    unread: unreadMap.get(r.id) ?? 0,
    activePrograms: activeMap.get(r.id) ?? 0,
  }));
}

/** مقادیرِ پیش‌فرضِ حریم خصوصی — درخواستِ دوباره بعد از رد/پایان به همین برمی‌گرده */
export const DEFAULT_PRIVACY = {
  shareAllPrograms: false,
  sharedPrograms: [] as string[],
  showSchedule: true,
  showProgramName: true,
  showTaskName: false,
  showTaskDetails: false,
  showProgress: true,
};

// ───────────────────────── برنامه ─────────────────────────

export type ProgramProgress = { completed: number; partial: number; missed: number; rate: number };

/** rate = درصدِ انجام (PARTIAL نصف حساب می‌شه) از روزهای ثبت‌شده؛ ۰ تا ۱۰۰ */
export function progressFromCounts(completed: number, partial: number, missed: number): ProgramProgress {
  const total = completed + partial + missed;
  const rate = total === 0 ? 0 : Math.round(((completed + partial * 0.5) / total) * 100);
  return { completed, partial, missed, rate };
}

export async function loadProgramProgress(programIds: string[], since?: Date): Promise<Map<string, ProgramProgress>> {
  const out = new Map<string, ProgramProgress>();
  if (programIds.length === 0) return out;
  const rows = await prisma.mentorProgramLog.groupBy({
    by: ["programId", "status"],
    where: { programId: { in: programIds }, ...(since ? { date: { gte: since } } : {}) },
    _count: { _all: true },
  });
  const acc = new Map<string, { c: number; p: number; m: number }>();
  for (const r of rows) {
    const a = acc.get(r.programId) ?? { c: 0, p: 0, m: 0 };
    if (r.status === "COMPLETED") a.c += r._count._all;
    else if (r.status === "PARTIAL") a.p += r._count._all;
    else a.m += r._count._all;
    acc.set(r.programId, a);
  }
  for (const id of programIds) {
    const a = acc.get(id) ?? { c: 0, p: 0, m: 0 };
    out.set(id, progressFromCounts(a.c, a.p, a.m));
  }
  return out;
}

export const PROGRAM_WITH_USERS_INCLUDE = {
  mentor: { select: PUBLIC_USER_SELECT },
  student: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.MentorProgramInclude;

export type ProgramWithUsers = Prisma.MentorProgramGetPayload<{ include: typeof PROGRAM_WITH_USERS_INCLUDE }>;

export type ProgramRow = {
  id: string;
  type: string;
  title: string;
  status: MentorProgramStatus;
  version: number;
  startDate: string | null;
  endDate: string | null;
  sentAt: Date | null;
  updatedAt: Date;
  mentorshipId: string;
  counterpart: PublicUser;
  progress: ProgramProgress;
};

export function toProgramRow(p: ProgramWithUsers, viewerId: string, progress: ProgramProgress | undefined): ProgramRow {
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    status: p.status,
    version: p.version,
    startDate: p.startDate ? isoDate(p.startDate) : null,
    endDate: p.endDate ? isoDate(p.endDate) : null,
    sentAt: p.sentAt,
    updatedAt: p.updatedAt,
    mentorshipId: p.mentorshipId,
    counterpart: toPublicUser(p.mentorId === viewerId ? p.student : p.mentor),
    progress: progress ?? progressFromCounts(0, 0, 0),
  };
}

export async function buildProgramRows(programs: ProgramWithUsers[], viewerId: string): Promise<ProgramRow[]> {
  const progress = await loadProgramProgress(programs.map((p) => p.id));
  return programs.map((p) => toProgramRow(p, viewerId, progress.get(p.id)));
}

/** Program — ProgramRow به‌علاوه‌ی فیلدهای جزئیات (توضیح، یادداشتِ تغییر، زمان‌ها) */
export async function serializeProgram(p: ProgramWithUsers, viewerId: string) {
  const progress = (await loadProgramProgress([p.id])).get(p.id);
  return {
    ...toProgramRow(p, viewerId, progress),
    description: p.description,
    changeRequestNote: p.changeRequestNote,
    rejectReason: p.rejectReason,
    respondedAt: p.respondedAt,
    activatedAt: p.activatedAt,
    completedAt: p.completedAt,
    cancelledAt: p.cancelledAt,
    createdAt: p.createdAt,
  };
}

export async function loadProgramWithUsers(id: string): Promise<ProgramWithUsers | null> {
  return prisma.mentorProgram.findUnique({ where: { id }, include: PROGRAM_WITH_USERS_INCLUDE });
}

export type FeedbackRow = { id: string; body: string; createdAt: Date; readAt: Date | null; itemId: string | null; logId: string | null; itemTitle: string | null };

export function toFeedbackRow(f: MentorFeedback & { item: { title: string } | null }): FeedbackRow {
  return { id: f.id, body: f.body, createdAt: f.createdAt, readAt: f.readAt, itemId: f.itemId, logId: f.logId, itemTitle: f.item?.title ?? null };
}

export function serializeItem(i: {
  id: string; order: number; title: string; details: string | null; repeat: string; days: number[]; startTime: string | null;
  durationMin: number | null; sets: number | null; reps: string | null; weightKg: number | null; restSec: number | null;
}) {
  return {
    id: i.id, order: i.order, title: i.title, details: i.details, repeat: i.repeat, days: i.days, startTime: i.startTime,
    durationMin: i.durationMin, sets: i.sets, reps: i.reps, weightKg: i.weightKg, restSec: i.restSec,
  };
}

export function serializeLog(l: { id: string; itemId: string; date: Date; status: string; setsDone: number | null; note: string | null; createdAt: Date; updatedAt: Date }) {
  return { id: l.id, itemId: l.itemId, date: isoDate(l.date), status: l.status, setsDone: l.setsDone, note: l.note, createdAt: l.createdAt, updatedAt: l.updatedAt };
}

/** نوعِ کمکی برای روت‌هایی که فقط ستون‌های خودِ برنامه رو لازم دارن */
export type ProgramCore = Pick<MentorProgram, "id" | "mentorId" | "studentId" | "mentorshipId" | "status" | "type" | "title" | "sentAt" | "startDate" | "endDate" | "activatedAt">;

/** کدِ خطای یکتا (P2002) از Prisma */
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * رتبه‌بندیِ «محبوب» روی ستون‌های سبک (بدونِ user/avatarUrl که data URLِ تا
 * ۴۰۰KB هست)، و فقط برای برشِ برگشتی کارتِ کامل لود می‌شه — وگرنه یک درخواست
 * می‌تونست صدها آواتار رو هم‌زمان توی حافظه بکشه.
 */
export async function loadPopularCards(
  where: Prisma.MentorProfileWhereInput,
  offset: number,
  limit: number,
  maxCandidates = 500
): Promise<{ cards: MentorCard[]; total: number }> {
  const candidates = await prisma.mentorProfile.findMany({
    where,
    select: { id: true, userId: true, ratingAvg: true, ratingCount: true, lastActiveAt: true },
    orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: maxCandidates,
  });
  const stats = await loadMentorStats(candidates.map((c) => c.userId));
  const ranked = rankByPopularity(candidates, (c) => {
    const s = stats.get(c.userId);
    return {
      ratingAvg: c.ratingAvg,
      ratingCount: c.ratingCount,
      activeStudents: s?.activeStudents ?? 0,
      totalStudents: s?.totalStudents ?? 0,
      completedPrograms: s?.completedPrograms ?? 0,
      lastActiveAt: c.lastActiveAt,
    };
  });
  const slice = ranked.slice(offset, offset + limit);
  const full = await prisma.mentorProfile.findMany({ where: { id: { in: slice.map((s) => s.id) } }, include: MENTOR_CARD_INCLUDE });
  const byId = new Map(full.map((p) => [p.id, p]));
  const cards = slice.flatMap((s) => {
    const p = byId.get(s.id);
    return p ? [toMentorCard(p, stats.get(p.userId))] : [];
  });
  return { cards, total: ranked.length };
}
