import { Prisma, type MentorProgramStatus, type MentorProgram, type MentorFeedback } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openAtRest } from "@/lib/e2ee/server";
import { displayName } from "@/lib/inAppNotify";
import { effectiveCategories } from "@/lib/mentorCategories";
import { progressHiddenPrograms, syncProgramProgress } from "@/lib/mentorProgress";
import { computeAvailability, dayIso, isAway, type AvailabilityState, type IntakeAnswer } from "@/lib/mentorAvailability";
import { WELCOME_VISIBLE_DAYS, availabilityToday, readIntakeAnswers } from "@/lib/mentorManageServer";

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

/**
 * شرطِ «قابلِ دیدن در کشف»: منتشرشده، معلق‌نشده، صاحبش مسدود/حذف نشده، و
 * هویتِ تأییدشده. احرازِ هویت برای هر منتور اجباریه (round 3): تا ادمین هویت
 * رو تأیید نکنه، منتور نه در جستجو دیده می‌شه، نه درخواستِ شاگرد می‌گیره،
 * نه دعوت می‌فرسته/می‌پذیره (IDENTITY_VERIFIED_WHERE در روت‌های رابطه).
 */
export const IDENTITY_VERIFIED_WHERE = { identityStatus: "VERIFIED" } as const satisfies Prisma.MentorProfileWhereInput;
export const MENTOR_IDENTITY_REQUIRED_MSG = "تا تأیید هویت توسط ادمین‌های آریون، امکان پذیرش شاگرد نیست";
export const DISCOVERABLE_PROFILE_WHERE: Prisma.MentorProfileWhereInput = {
  published: true,
  suspendedAt: null,
  ...IDENTITY_VERIFIED_WHERE,
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
  // فقط وقتی categories شاملِ ROUTINE باشه، وگرنه null
  routineRole: string | null;
  identityVerified: boolean;
  certifications: { category: string; verified: boolean }[];
  ratingAvg: number;
  ratingCount: number;
  activeStudents: number;
  totalStudents: number;
  acceptingStudents: boolean;
  // دسترس‌پذیری (lib/mentorAvailability.ts): پذیرش/ظرفیت/عدمِ حضور
  availability: AvailabilityState;
  awayUntil: string | null;
  responseTimeHours: number | null;
  /** زمانِ ساختِ پروفایلِ منتوری (ISO) — «عضویت» روی کارتِ کشف */
  memberSince: string;
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

/** نقشِ روتین برای نمایشِ عمومی — بدونِ دسته‌ی ROUTINE معنایی نداره */
export function publicRoutineRole(p: { categories: string[]; routineRole: string | null }): string | null {
  return p.categories.includes("ROUTINE") ? p.routineRole : null;
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
    routineRole: publicRoutineRole(p),
    identityVerified: p.identityStatus === "VERIFIED",
    certifications,
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    activeStudents: stats?.activeStudents ?? 0,
    totalStudents: stats?.totalStudents ?? 0,
    acceptingStudents: p.acceptingStudents,
    memberSince: p.createdAt.toISOString(),
    ...cardAvailability(p, stats?.activeStudents ?? 0),
  };
}

function cardAvailability(p: CardProfile, activeStudents: number): Pick<MentorCard, "availability" | "awayUntil" | "responseTimeHours"> {
  const a = computeAvailability(p, activeStudents, availabilityToday());
  return { availability: a.state, awayUntil: a.awayUntil, responseTimeHours: p.responseTimeHours };
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
    routineRole: p.routineRole,
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
    // دسترس‌پذیری و تنظیماتِ شاگرد (GET/PUT /api/mentor/settings)
    maxActiveStudents: p.maxActiveStudents,
    awayUntil: dayIso(p.awayUntil),
    awayMessage: p.awayMessage,
    awayPausesRequests: p.awayPausesRequests,
    responseTimeHours: p.responseTimeHours,
    welcomeMessage: p.welcomeMessage,
    intakeQuestions: p.intakeQuestions,
    // نسخه‌ی پذیرفته‌شده‌ی «شرایط منتورها» (lib/mentorTerms.ts) — فرم با مقایسه با نسخه‌ی جاری چک‌باکس را نشان می‌دهد
    mentorTermsVersion: p.mentorTermsVersion,
    acceptedMentorTermsAt: p.acceptedMentorTermsAt,
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
  mentor: { select: { ...PUBLIC_USER_SELECT, mentorProfile: { select: { categories: true, awayUntil: true, awayMessage: true, welcomeMessage: true } } } },
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
  // فقط برای BLOCKED: خودِ بیننده بلاک کرده؟ (رفعِ مسدودی فقط برای همون)
  blockedByMe: boolean;
  // حوزه‌های مؤثرِ رابطه (برای تفکیکِ منتورها و نوعِ برنامه‌ی مجاز)
  categories: string[];
  // مدیریتِ رابطه (lib/mentorManageServer.ts)
  intakeAnswers: IntakeAnswer[];
  pausedAt: Date | null;
  pauseReason: string | null;
  endReason: string | null;
  endedBy: string | null;
  // عدمِ حضورِ منتور (فقط تا روزِ بازگشت)
  mentorAway: { until: string; message: string | null } | null;
  // پیامِ خوش‌آمدِ منتور — فقط برای شاگردِ رابطه‌ی ACTIVE، تا WELCOME_VISIBLE_DAYS روز پس از شروع
  welcomeMessage: string | null;
};

/** ردیف‌های لیستِ رابطه از دیدِ viewer — شمارشِ خوانده‌نشده/برنامه‌ی فعال با کوئریِ گروهی */
export async function buildMentorshipRows(rows: MentorshipWithUsers[], viewerId: string): Promise<MentorshipRow[]> {
  const ids = rows.map((r) => r.id);
  const [unread, active] = ids.length
    ? await Promise.all([
        prisma.mentorMessage.groupBy({
          by: ["mentorshipId"],
          where: { mentorshipId: { in: ids }, senderId: { not: viewerId }, readAt: null, mentorship: { status: { in: ["ACTIVE", "ENDED"] } } },
          _count: { _all: true },
        }),
        prisma.mentorProgram.groupBy({ by: ["mentorshipId"], where: { mentorshipId: { in: ids }, status: "ACTIVE" }, _count: { _all: true } }),
      ])
    : [[], []];
  const unreadMap = new Map(unread.map((r) => [r.mentorshipId, r._count._all]));
  const activeMap = new Map(active.map((r) => [r.mentorshipId, r._count._all]));
  const intake = await readIntakeAnswers(ids);
  const today = availabilityToday();
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
    blockedByMe: r.status === "BLOCKED" && r.blockedById === viewerId,
    categories: effectiveCategories(r.categories, r.mentor.mentorProfile?.categories ?? []),
    intakeAnswers: intake.get(r.id) ?? [],
    pausedAt: r.status === "ACTIVE" ? r.pausedAt : null,
    pauseReason: r.status === "ACTIVE" && r.pausedAt ? r.pauseReason : null,
    endReason: r.status === "ENDED" ? r.endReason : null,
    endedBy: r.status === "ENDED" ? r.endedBy : null,
    mentorAway:
      r.mentor.mentorProfile && isAway(r.mentor.mentorProfile.awayUntil, today)
        ? { until: dayIso(r.mentor.mentorProfile.awayUntil)!, message: r.mentor.mentorProfile.awayMessage }
        : null,
    welcomeMessage:
      r.studentId === viewerId && r.status === "ACTIVE" && r.startedAt && Date.now() - r.startedAt.getTime() < WELCOME_VISIBLE_DAYS * 86_400_000
        ? r.mentor.mentorProfile?.welcomeMessage ?? null
        : null,
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

// شمارش‌ها از MentorProgramLog‌اند که از این به بعد خودکار از تیک‌های روتینِ شاگرد
// همگام می‌شوند (lib/mentorProgress.ts). hidden = شاگرد «نمایش پیشرفت» را برای این
// منتور بسته؛ اعداد صفرند و نباید به‌عنوانِ «۰٪» نمایش داده شوند.
export type ProgramProgress = { completed: number; partial: number; missed: number; rate: number; hidden?: boolean };

const HIDDEN_PROGRESS: ProgramProgress = { completed: 0, partial: 0, missed: 0, rate: 0, hidden: true };

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
  note?: string | null;
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
    // یادداشتِ منتور روی برنامه — در فهرستِ برنامه‌های صفحه‌ی رابطه کنارِ هر برنامه دیده می‌شود
    note: p.note ?? null,
  };
}

/** همگام‌سازیِ پیشرفتِ خودکار (با TTL) + شمارش + اعمالِ پرچمِ showProgress برای منتور */
async function progressForRows(programs: ProgramWithUsers[], viewerId: string, force = false): Promise<Map<string, ProgramProgress>> {
  const ids = programs.map((p) => p.id);
  const trackable = programs.filter((p) => p.activatedAt && (p.status === "ACTIVE" || p.status === "COMPLETED" || p.status === "CANCELLED"));
  if (trackable.length) await syncProgramProgress(trackable.map((p) => p.id), { force }).catch(() => undefined);
  const [progress, hidden] = await Promise.all([loadProgramProgress(ids), progressHiddenPrograms(programs, viewerId)]);
  hidden.forEach((id) => progress.set(id, HIDDEN_PROGRESS));
  return progress;
}

export async function buildProgramRows(programs: ProgramWithUsers[], viewerId: string): Promise<ProgramRow[]> {
  const progress = await progressForRows(programs, viewerId);
  return programs.map((p) => toProgramRow(p, viewerId, progress.get(p.id)));
}

/** Program — ProgramRow به‌علاوه‌ی فیلدهای جزئیات (توضیح، یادداشتِ تغییر، زمان‌ها) */
export async function serializeProgram(p: ProgramWithUsers, viewerId: string, opts: { forceSync?: boolean } = {}) {
  const progress = (await progressForRows([p], viewerId, !!opts.forceSync)).get(p.id);
  return {
    ...toProgramRow(p, viewerId, progress),
    description: p.description,
    note: p.note,
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
  // متنِ فیدبک رمزشده در حالِ سکون است (agent D — docs/mentor-e2ee.md)؛ ردیفِ قدیمی متنِ ساده
  const body = openAtRest(f.body, feedbackAad(f.programId, f.mentorId)) ?? "";
  return { id: f.id, body, createdAt: f.createdAt, readAt: f.readAt, itemId: f.itemId, logId: f.logId, itemTitle: f.item?.title ?? null };
}

/** AADِ رمزِ در حالِ سکونِ MentorFeedback.body — مقدار به برنامه/منتورِ دیگری منتقل‌شدنی نیست */
export function feedbackAad(programId: string, mentorId: string): string[] {
  return ["MentorFeedback.body", programId, mentorId];
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

export function serializeLog(l: {
  id: string; itemId: string; date: Date; status: string; setsDone: number | null; note: string | null; createdAt: Date; updatedAt: Date;
  source?: string; doneOn?: Date | null;
}) {
  return {
    id: l.id, itemId: l.itemId, date: isoDate(l.date), status: l.status, setsDone: l.setsDone, note: l.note, createdAt: l.createdAt, updatedAt: l.updatedAt,
    // "AUTO" = از تیک‌های روتینِ شاگرد؛ "MANUAL" = ثبتِ دستیِ قدیمی
    source: l.source ?? "MANUAL",
    doneOn: l.doneOn ? isoDate(l.doneOn) : null,
  };
}

/** نوعِ کمکی برای روت‌هایی که فقط ستون‌های خودِ برنامه رو لازم دارن */
export type ProgramCore = Pick<MentorProgram, "id" | "mentorId" | "studentId" | "mentorshipId" | "status" | "type" | "title" | "sentAt" | "startDate" | "endDate" | "activatedAt">;

/** کدِ خطای یکتا (P2002) از Prisma */
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// رتبه‌بندیِ «بهترین نتیجه»/«محبوب»/«منتورهای تازه»: lib/mentorRankingStats.ts
