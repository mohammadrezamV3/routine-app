import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MENTOR_CATEGORIES, PROGRAM_TYPE_CATEGORY, effectiveCategories } from "@/lib/mentorCategories";
import { MENTOR_CARD_INCLUDE, loadMentorStats, loadProgramProgress, toMentorCard, type MentorCard } from "@/lib/mentorServer";
import { syncProgramProgress } from "@/lib/mentorProgress";
import {
  computeMerit,
  explorationOrder,
  isDemoIdentity,
  requestResponseHours,
  responseHoursFromMessages,
  type MeritBreakdown,
  type ReviewSignal,
  type StudentSignals,
} from "@/lib/mentorRanking";

// جمع‌آوری و نگه‌داریِ رتبه‌بندیِ شایستگی (فرمول: lib/mentorRanking.ts،
// توضیح: docs/mentor-ranking.md).
//
// - امتیاز در جدولِ MentorRankingStat (یک ردیف به‌ازای هر منتور × دامنه) ذخیره
//   و با ایندکس مرتب می‌شه؛ صفحه‌بندی سمتِ دیتابیسه، نه در حافظه.
// - تازه‌سازی تنبل و بدونِ cron (همون الگوی ensureFreshCalendar): روتِ خواندن
//   اگه ردیفی نبود منتظر ساخت می‌مونه (با سقفِ زمان)، و اگه کهنه بود با داده‌ی
//   موجود جواب می‌ده و در پس‌زمینه بازمحاسبه می‌کنه.
// - فیلترهای «قابلِ نمایش بودن» (انتشار، تعلیق، مسدودی، بلاکِ کاربر-به-کاربر)
//   *زنده* روی کوئری اعمال می‌شن، نه از روی ردیفِ ذخیره‌شده — تعلیق فوری اثر داره.

export const RANK_SCOPE_ALL = "ALL";
export type RankScope = typeof RANK_SCOPE_ALL | (typeof MENTOR_CATEGORIES)[number];

/** بعد از این مدت ردیف کهنه حساب می‌شه و در پس‌زمینه بازمحاسبه می‌شه */
export const RANKING_TTL_MS = 15 * 60 * 1000;
/** بیشترین انتظارِ درخواستِ کاربر برای ساختِ اولیه */
const READ_WAIT_MS = 8 * 1000;
const MIN_ATTEMPT_GAP_MS = 60 * 1000;
/** پروفایل‌های بی‌ردیف که روی مسیرِ خواندن محاسبه می‌شن (بیشتر = دورِ بعد) */
const MISSING_BATCH = 50;
/** پنجره‌ی سیگنال‌های رفتاری (پایبندی، پیام‌ها) */
const SIGNAL_WINDOW_DAYS = 90;
const INTEGRITY_WINDOW_DAYS = 180;
const CHUNK = 200;
const MAX_MESSAGES_PER_CHUNK = 60_000;

const DAY_MS = 86_400_000;

// ───────────────────────── جمع‌آوری ─────────────────────────

type ProfileRow = {
  id: string;
  userId: string;
  categories: string[];
  identityStatus: string;
  lastActiveAt: Date | null;
  credentials: { category: string; status: string }[];
  user: { email: string | null; username: string | null };
};

type PersonLite = { email: string | null; username: string | null; isBlocked: boolean; deletedAt: Date | null; createdAt: Date };

/** کاربری که سیگنالش برای این منتور شمرده می‌شه: مسدود/حذف نشده و از همون «دنیا» (واقعی/آزمایشی) */
export function countsForMentor(person: PersonLite, mentorIsDemo: boolean): boolean {
  return !person.isBlocked && !person.deletedAt && isDemoIdentity(person) === mentorIsDemo;
}

/** دامنه‌هایی که یک برنامه/رابطه در آن‌ها شمرده می‌شود */
function programInScope(type: string, scope: RankScope): boolean {
  if (scope === RANK_SCOPE_ALL) return true;
  return PROGRAM_TYPE_CATEGORY[type as keyof typeof PROGRAM_TYPE_CATEGORY] === scope;
}

/**
 * بازمحاسبه‌ی امتیازِ منتورها. بدونِ ورودی = همه‌ی پروفایل‌های منتشرشده.
 * خروجی: تعدادِ پروفایل‌های بازمحاسبه‌شده.
 */
export async function recomputeMentorRankings(opts: { profileIds?: string[]; now?: Date } = {}): Promise<number> {
  const now = opts.now ?? new Date();
  const where: Prisma.MentorProfileWhereInput = opts.profileIds ? { id: { in: opts.profileIds } } : { published: true };
  let cursor: string | undefined;
  let total = 0;
  for (;;) {
    const profiles: ProfileRow[] = await prisma.mentorProfile.findMany({
      where,
      orderBy: { id: "asc" },
      take: CHUNK,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true, userId: true, categories: true, identityStatus: true, lastActiveAt: true,
        credentials: { select: { category: true, status: true } },
        user: { select: { email: true, username: true } },
      },
    });
    if (profiles.length === 0) break;
    await recomputeChunk(profiles, now);
    total += profiles.length;
    cursor = profiles[profiles.length - 1].id;
    if (profiles.length < CHUNK) break;
  }
  return total;
}

async function recomputeChunk(profiles: ProfileRow[], now: Date): Promise<void> {
  const mentorIds = profiles.map((p) => p.userId);
  const since = new Date(now.getTime() - SIGNAL_WINDOW_DAYS * DAY_MS);
  const integritySince = new Date(now.getTime() - INTEGRITY_WINDOW_DAYS * DAY_MS);
  const personSelect = { email: true, username: true, isBlocked: true, deletedAt: true, createdAt: true } as const;

  const [mentorships, programs, reviews, reports, suspensions] = await Promise.all([
    prisma.mentorship.findMany({
      where: { mentorId: { in: mentorIds } },
      select: {
        id: true, mentorId: true, studentId: true, status: true, initiatedBy: true, categories: true, showProgress: true,
        startedAt: true, endedAt: true, createdAt: true, updatedAt: true,
        student: { select: personSelect },
      },
    }),
    prisma.mentorProgram.findMany({
      where: { mentorId: { in: mentorIds }, activatedAt: { not: null } },
      select: { id: true, mentorshipId: true, type: true, status: true, activatedAt: true, completedAt: true, cancelledAt: true, endDate: true },
    }),
    prisma.mentorReview.findMany({
      where: { mentorId: { in: mentorIds }, status: "VISIBLE" },
      select: { id: true, mentorId: true, studentId: true, mentorshipId: true, rating: true, createdAt: true, student: { select: personSelect } },
    }),
    prisma.mentorReport.findMany({
      where: {
        targetUserId: { in: mentorIds },
        OR: [{ status: "OPEN" }, { status: "RESOLVED", resolvedAt: { gte: integritySince } }],
      },
      select: { reporterId: true, targetUserId: true, status: true, reporter: { select: personSelect } },
    }),
    prisma.auditLog.findMany({
      where: { action: "mentor.suspend", targetId: { in: mentorIds }, createdAt: { gte: integritySince } },
      select: { targetId: true },
    }),
  ]);

  const mentorshipIds = mentorships.map((m) => m.id);
  const programIds = programs.map((p) => p.id);
  // پیشرفتِ خودکار (لاگ‌های AUTO از تیک‌های روتینِ شاگرد) فقط برای برنامه‌های فعال
  // و با TTLِ خودِ lib/mentorProgress.ts — این مسیر در پس‌زمینه اجرا می‌شه، نه
  // روی درخواستِ کاربر (جز ساختِ اولیه با سقفِ زمان).
  await syncProgramProgress(programs.filter((p) => p.status === "ACTIVE").map((p) => p.id)).catch(() => undefined);
  const [recentProgress, allProgress, messages, reportedReviews] = await Promise.all([
    loadProgramProgress(programIds, since),
    loadProgramProgress(programIds),
    mentorshipIds.length
      ? prisma.mentorMessage.findMany({
          where: { mentorshipId: { in: mentorshipIds }, createdAt: { gte: since } },
          select: { mentorshipId: true, senderId: true, createdAt: true, broadcastId: true },
          orderBy: { createdAt: "asc" },
          take: MAX_MESSAGES_PER_CHUNK,
        })
      : Promise.resolve([]),
    reviews.length
      ? prisma.mentorReport.findMany({
          where: { targetType: "REVIEW", targetId: { in: reviews.map((r) => r.id) }, status: "OPEN" },
          select: { targetId: true },
        })
      : Promise.resolve([]),
  ]);

  const programsByRel = groupBy(programs, (p) => p.mentorshipId);
  const messagesByRel = groupBy(messages, (m) => m.mentorshipId);
  const relsByMentor = groupBy(mentorships, (m) => m.mentorId);
  const relById = new Map(mentorships.map((m) => [m.id, m]));
  const reviewsByMentor = groupBy(reviews, (r) => r.mentorId);
  const reportsByMentor = groupBy(reports, (r) => r.targetUserId ?? "");
  const suspended = new Set(suspensions.map((s) => s.targetId));
  const reportedReviewIds = new Set(reportedReviews.map((r) => r.targetId));

  const rows: Prisma.MentorRankingStatCreateManyInput[] = [];

  for (const p of profiles) {
    const mentorIsDemo = isDemoIdentity(p.user);
    const rels = (relsByMentor.get(p.userId) ?? []).filter((r) => r.studentId !== p.userId && countsForMentor(r.student, mentorIsDemo));

    const reporters = (status: "OPEN" | "RESOLVED") =>
      new Set(
        (reportsByMentor.get(p.userId) ?? [])
          .filter((r) => r.status === status && r.reporterId !== p.userId && countsForMentor(r.reporter, mentorIsDemo))
          .map((r) => r.reporterId)
      ).size;
    const integrity = { openReporters: reporters("OPEN"), resolvedReporters: reporters("RESOLVED"), recentSuspension: suspended.has(p.userId) };

    const scopes: RankScope[] = [RANK_SCOPE_ALL, ...MENTOR_CATEGORIES.filter((c) => p.categories.includes(c))];
    for (const scope of scopes) {
      const inScope = (relCategories: string[]) =>
        scope === RANK_SCOPE_ALL || effectiveCategories(relCategories, p.categories).includes(scope);
      const scopedRels = rels.filter((r) => inScope(r.categories));

      // شاگردهای معتبر: رابطه‌ای که واقعاً شروع شده (یک رابطه به‌ازای هر شاگرد — @@unique)
      const students: StudentSignals[] = [];
      for (const r of scopedRels) {
        if (!r.startedAt) continue;
        const progs = (programsByRel.get(r.id) ?? []).filter((x) => programInScope(x.type, scope));
        const adherence = { completed: 0, partial: 0, missed: 0 };
        // شاگردی که «نمایشِ پیشرفت» رو برای این منتور بسته، در پایبندی شمرده نمی‌شه
        // (نه به نفع و نه به ضررِ منتور) — بقیه‌ی سیگنال‌ها (تکمیل، ماندگاری، نظر) می‌مونن
        for (const x of r.showProgress ? progs : []) {
          const pr = recentProgress.get(x.id);
          if (!pr) continue;
          adherence.completed += pr.completed;
          adherence.partial += pr.partial;
          adherence.missed += pr.missed;
        }
        const responseHours = responseHoursFromMessages(messagesByRel.get(r.id) ?? [], p.userId, now);
        const req = requestResponseHours(r, now);
        if (req !== null && r.createdAt >= since) responseHours.push(req);
        students.push({
          studentId: r.studentId,
          startedAt: r.startedAt,
          endedAt: r.status === "ACTIVE" ? null : r.endedAt ?? r.updatedAt,
          adherence,
          programs: progs.map((x) => ({ status: x.status, activatedAt: x.activatedAt!, completedAt: x.completedAt, cancelledAt: x.cancelledAt, endDate: x.endDate })),
          responseHours,
        });
      }
      // درخواست‌هایی که شروع نشدن (رد/بی‌جواب) فقط در سرعتِ پاسخ اثر دارن
      const requestResponses: number[][] = [];
      for (const r of scopedRels) {
        if (r.startedAt || r.createdAt < since) continue;
        const h = requestResponseHours(r, now);
        if (h !== null) requestResponses.push([h]);
      }

      const reviewSignals: ReviewSignal[] = [];
      for (const rv of reviewsByMentor.get(p.userId) ?? []) {
        if (reportedReviewIds.has(rv.id)) continue; // گزارشِ باز روی نظر: تا بررسی شمرده نمی‌شه
        if (!countsForMentor(rv.student, mentorIsDemo)) continue;
        const rel = relById.get(rv.mentorshipId);
        if (!rel || !rel.startedAt || !inScope(rel.categories)) continue;
        const relPrograms = (programsByRel.get(rel.id) ?? []).filter((x) => programInScope(x.type, scope));
        const activeEnd = rel.status === "ACTIVE" ? now : rel.endedAt ?? rel.updatedAt;
        let engagement = 0;
        for (const x of relPrograms) {
          const pr = allProgress.get(x.id);
          if (pr) engagement += pr.completed + pr.partial + pr.missed;
        }
        reviewSignals.push({
          studentId: rv.studentId,
          rating: rv.rating,
          createdAt: rv.createdAt,
          reviewerCreatedAt: rv.student.createdAt,
          activeDays: (activeEnd.getTime() - rel.startedAt.getTime()) / DAY_MS,
          activatedPrograms: relPrograms.length,
          engagementEntries: engagement,
        });
      }

      const certificateVerified =
        scope === RANK_SCOPE_ALL
          ? p.credentials.some((c) => c.status === "VERIFIED" && p.categories.includes(c.category))
          : p.credentials.some((c) => c.status === "VERIFIED" && c.category === scope);

      const final = computeMerit(
        {
          students,
          reviews: reviewSignals,
          trust: { identityVerified: p.identityStatus === "VERIFIED", certificateVerified },
          integrity,
          lastActiveAt: p.lastActiveAt,
          requestResponses,
        },
        now
      );

      rows.push({
        profileId: p.id,
        category: scope,
        score: final.score,
        ratingScore: final.ratingScore,
        eligible: final.eligible,
        sampleStudents: final.sample.students,
        verifiedReviews: final.sample.verifiedReviews,
        breakdown: final as unknown as Prisma.InputJsonValue,
        computedAt: now,
      });
    }
  }

  // حذف + درج در یک تراکنش (دامنه‌ای که دیگه نیست هم پاک می‌شه). دو بازمحاسبه‌ی
  // هم‌زمان (پس‌زمینه + درخواستِ ادمین) هر دو داده‌ی تازه دارن؛ skipDuplicates
  // نمی‌ذاره یکی‌شون با خطای یکتایی بشکنه.
  await prisma.$transaction([
    prisma.mentorRankingStat.deleteMany({ where: { profileId: { in: profiles.map((p) => p.id) } } }),
    prisma.mentorRankingStat.createMany({ data: rows, skipDuplicates: true }),
  ]);
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

// ───────────────────────── تازه‌نگه‌داشتن (بدونِ cron) ─────────────────────────

let inflight: Promise<unknown> | null = null;
let lastAttemptAt = 0;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function startRecompute(): Promise<unknown> {
  lastAttemptAt = Date.now();
  inflight = recomputeMentorRankings()
    .catch((err) => {
      console.error(`[mentor-ranking] بازمحاسبه شکست خورد: ${err instanceof Error ? err.message : err}`);
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * stale-while-revalidate:
 *   - پروفایلِ منتشرشده‌ای که ردیفِ همین دامنه رو نداره (تازه منتشر شده یا حوزه
 *     اضافه کرده) همین حالا و *فقط خودش* محاسبه می‌شه — تا فوراً در فهرست بیاد؛
 *   - ردیف‌های کهنه‌تر از TTL: جواب با داده‌ی موجود، بازمحاسبه‌ی کامل در پس‌زمینه.
 */
export async function ensureFreshRankings(scope: RankScope = RANK_SCOPE_ALL): Promise<void> {
  if (inflight) await Promise.race([inflight, sleep(READ_WAIT_MS)]);
  const missing = await prisma.mentorProfile.findMany({
    where: {
      published: true,
      ...(scope === RANK_SCOPE_ALL ? {} : { categories: { has: scope } }),
      rankingStats: { none: { category: scope } },
    },
    select: { id: true },
    take: MISSING_BATCH,
  });
  if (missing.length > 0) {
    await Promise.race([
      recomputeMentorRankings({ profileIds: missing.map((m) => m.id) }).catch((err) => {
        console.error(`[mentor-ranking] محاسبه‌ی پروفایل‌های تازه شکست خورد: ${err instanceof Error ? err.message : err}`);
      }),
      sleep(READ_WAIT_MS),
    ]);
  }
  if (inflight || Date.now() - lastAttemptAt < MIN_ATTEMPT_GAP_MS) return;
  const oldest = await prisma.mentorRankingStat.findFirst({ orderBy: { computedAt: "asc" }, select: { computedAt: true } });
  if (oldest && Date.now() - oldest.computedAt.getTime() > RANKING_TTL_MS) void startRecompute();
}

/** فقط برای تست‌ها: وضعیتِ درون‌پروسه‌ای رو صفر می‌کنه */
export function __resetRankingFreshnessForTests(): void {
  inflight = null;
  lastAttemptAt = 0;
}

// ───────────────────────── خواندن ─────────────────────────

export type RankSort = "best" | "rating";

async function cardsForProfileIds(ids: string[]): Promise<MentorCard[]> {
  if (ids.length === 0) return [];
  const full = await prisma.mentorProfile.findMany({ where: { id: { in: ids } }, include: MENTOR_CARD_INCLUDE });
  const stats = await loadMentorStats(full.map((p) => p.userId));
  const byId = new Map(full.map((p) => [p.id, p]));
  return ids.flatMap((id) => {
    const p = byId.get(id);
    return p ? [toMentorCard(p, stats.get(p.userId))] : [];
  });
}

const orderFor = (sort: RankSort): Prisma.MentorRankingStatOrderByWithRelationInput[] =>
  sort === "rating"
    ? [{ ratingScore: "desc" }, { verifiedReviews: "desc" }, { score: "desc" }, { profileId: "asc" }]
    : [{ score: "desc" }, { sampleStudents: "desc" }, { profileId: "asc" }];

/** فهرستِ مرتب‌شده با صفحه‌بندیِ دیتابیسی. where = شرطِ زنده روی MentorProfile */
export async function loadRankedCards(
  where: Prisma.MentorProfileWhereInput,
  scope: RankScope,
  sort: RankSort,
  offset: number,
  limit: number
): Promise<{ cards: MentorCard[]; hasMore: boolean }> {
  await ensureFreshRankings(scope);
  const rows = await prisma.mentorRankingStat.findMany({
    where: { category: scope, profile: { is: where } },
    orderBy: orderFor(sort),
    skip: offset,
    take: limit + 1,
    select: { profileId: true },
  });
  const cards = await cardsForProfileIds(rows.slice(0, limit).map((r) => r.profileId));
  return { cards, hasMore: rows.length > limit };
}

/** ظرفیتِ پر، پذیرشِ بسته یا «در دسترس نیستم» زنده حساب می‌شه (lib/mentorAvailability.ts) */
function isOpenForRequests(c: MentorCard): boolean {
  return c.acceptingStudents && (c.availability ?? "OPEN") === "OPEN";
}

/** «منتورهای محبوب»: فقط eligible، فقط کسانی که الان واقعاً درخواست می‌پذیرن */
export async function loadPopularMentorCards(where: Prisma.MentorProfileWhereInput, limit: number): Promise<MentorCard[]> {
  await ensureFreshRankings(RANK_SCOPE_ALL);
  const rows = await prisma.mentorRankingStat.findMany({
    where: { category: RANK_SCOPE_ALL, eligible: true, profile: { is: where } },
    orderBy: orderFor("best"),
    take: limit * 2,
    select: { profileId: true },
  });
  // ویترین نباید به درِ بسته بفرسته
  const cards = await cardsForProfileIds(rows.map((r) => r.profileId));
  return cards.filter(isOpenForRequests).slice(0, limit);
}

/** پروفایلِ «کامل» برای جایگاهِ منتورهای تازه */
const COMPLETE_PROFILE_WHERE: Prisma.MentorProfileWhereInput = {
  identityStatus: "VERIFIED",
  headline: { not: null },
  bio: { not: null },
  NOT: [{ categories: { isEmpty: true } }, { headline: "" }, { bio: "" }],
};
const NEWCOMER_MAX_AGE_DAYS = 90;
const NEWCOMER_POOL = 60;

/**
 * «منتورهای تازه» — جایگاهِ جدا و برچسب‌دار برای دیده‌شدنِ منتورهای تأییدشده‌ای
 * که هنوز نمونه‌ی کافی برای رتبه‌بندیِ شایستگی ندارن. با فهرستِ محبوب قاطی
 * نمی‌شه؛ ترتیب روزانه و قطعی می‌چرخه تا همیشه همون چند نفر اول نباشن.
 */
export async function loadNewcomerCards(
  where: Prisma.MentorProfileWhereInput,
  excludeProfileIds: string[],
  limit: number,
  now: Date = new Date()
): Promise<MentorCard[]> {
  const pool = await prisma.mentorProfile.findMany({
    where: {
      AND: [
        where,
        COMPLETE_PROFILE_WHERE,
        { createdAt: { gte: new Date(now.getTime() - NEWCOMER_MAX_AGE_DAYS * DAY_MS) } },
        { rankingStats: { none: { category: RANK_SCOPE_ALL, eligible: true } } },
        ...(excludeProfileIds.length ? [{ id: { notIn: excludeProfileIds } }] : []),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: NEWCOMER_POOL,
    select: { id: true },
  });
  const order = explorationOrder(pool.map((p) => ({ profileId: p.id })), now.toISOString().slice(0, 10));
  const cards = await cardsForProfileIds(order.map((o) => o.profileId));
  return cards.filter(isOpenForRequests).slice(0, limit);
}

// ───────────────────────── ادمین ─────────────────────────

export type RankingBreakdownRow = {
  scope: string;
  score: number;
  ratingScore: number;
  eligible: boolean;
  /** جایگاه در دامنه‌ی خودش بینِ منتورهای قابلِ نمایش (۱ = اول) */
  position: number | null;
  of: number;
  computedAt: Date;
  breakdown: MeritBreakdown;
};

export async function loadRankingBreakdown(profileId: string): Promise<RankingBreakdownRow[]> {
  await recomputeMentorRankings({ profileIds: [profileId] });
  const rows = await prisma.mentorRankingStat.findMany({ where: { profileId }, orderBy: { category: "asc" } });
  const visible: Prisma.MentorProfileWhereInput = { published: true, suspendedAt: null, user: { isBlocked: false, deletedAt: null } };
  const out: RankingBreakdownRow[] = [];
  for (const r of rows) {
    const [ahead, of, self] = await Promise.all([
      prisma.mentorRankingStat.count({
        where: {
          category: r.category,
          profile: { is: visible },
          OR: [
            { score: { gt: r.score } },
            { score: r.score, sampleStudents: { gt: r.sampleStudents } },
            { score: r.score, sampleStudents: r.sampleStudents, profileId: { lt: r.profileId } },
          ],
        },
      }),
      prisma.mentorRankingStat.count({ where: { category: r.category, profile: { is: visible } } }),
      prisma.mentorProfile.count({ where: { id: profileId, ...visible } }),
    ]);
    out.push({
      scope: r.category,
      score: r.score,
      ratingScore: r.ratingScore,
      eligible: r.eligible,
      position: self ? ahead + 1 : null,
      of,
      computedAt: r.computedAt,
      breakdown: r.breakdown as unknown as MeritBreakdown,
    });
  }
  out.sort((a, b) => (a.scope === RANK_SCOPE_ALL ? -1 : b.scope === RANK_SCOPE_ALL ? 1 : a.scope.localeCompare(b.scope)));
  return out;
}
