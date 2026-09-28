import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/inAppNotify";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import { availabilityToday } from "@/lib/mentorManageServer";
import { MENTOR_CARD_INCLUDE, buildMentorCards, dateFromIso, loadMentorStats, type MentorCard } from "@/lib/mentorServer";
import { RANK_SCOPE_ALL, ensureFreshRankings, loadRankedCards, type RankScope } from "@/lib/mentorRankingStats";
import { RELEVANCE_MIN, blendScore, buildSearchDoc, parseQuery, relevance, type MentorFilters } from "@/lib/mentorSearch";

// اجرای جستجو/فیلترِ «جستجوی منتور» روی دیتابیس.
//
//   • هر فیلتری که در SQL بیان‌شدنیه (حوزه، مدرک، پذیرش، امتیاز، زمانِ پاسخ)
//     همون‌جا اعمال می‌شه (filterWhere).
//   • بدونِ عبارتِ جستجو ترتیب از جدولِ رتبه‌بندیِ شایستگی (lib/mentorRankingStats.ts،
//     agent E) با صفحه‌بندیِ دیتابیسی میاد — همون مسیرِ قبلی.
//   • با عبارت (یا فیلترِ «پذیرش باز» که ظرفیتِ پر فقط با شمارشِ شاگردِ فعال معلوم
//     می‌شه) نامزدها با سقفِ CANDIDATE_CAP از دیتابیس خوانده و در حافظه با
//     lib/mentorSearch.ts امتیاز می‌گیرن؛ فقط نتایجِ مرتبط (≥ RELEVANCE_MIN) می‌مونن
//     و شایستگی فقط ترتیبِ همون‌ها رو تنظیم می‌کنه.
//   اگه تعدادِ منتورها از چند هزار گذشت، پیش‌فیلترِ pg_trgm جای سقفِ ساده رو می‌گیره.

export const CANDIDATE_CAP = 400;

const RATING_EPS = 0.05; // میانگینِ ۴٫۴۶ روی کارت «۴٫۵» دیده می‌شه

/** فیلترهای SQL-بیان‌شدنی روی MentorProfile (کنارِ شرطِ «قابلِ کشف») */
export function filterWhere(f: MentorFilters, base: Prisma.MentorProfileWhereInput): Prisma.MentorProfileWhereInput {
  const and: Prisma.MentorProfileWhereInput[] = [base];
  const category = isMentorCategory(f.category) ? f.category : null;
  if (category) and.push({ categories: { has: category } });
  if (f.cert) {
    // مدرک فقط وقتی حسابه که حوزه‌اش هنوز روی پروفایل باشه (همون قاعده‌ی toMentorCard)
    and.push(
      category
        ? { credentials: { some: { category, status: "VERIFIED" } } }
        : { OR: MENTOR_CATEGORIES.map((c) => ({ categories: { has: c }, credentials: { some: { category: c, status: "VERIFIED" as const } } })) }
    );
  }
  if (f.open) {
    // پذیرش روشن و «در دسترس نیستم» با توقفِ درخواست فعال نباشه؛ ظرفیتِ پر در حافظه
    const today = dateFromIso(availabilityToday());
    and.push({ acceptingStudents: true, OR: [{ awayUntil: null }, { awayUntil: { lte: today } }, { awayPausesRequests: false }] });
  }
  if (f.minRating > 0) and.push({ ratingCount: { gt: 0 }, ratingAvg: { gte: f.minRating - RATING_EPS } });
  if (f.maxResponse > 0) and.push({ responseTimeHours: { not: null, lte: f.maxResponse } });
  return { AND: and };
}

async function cardsInOrder(profileIds: string[]): Promise<MentorCard[]> {
  if (profileIds.length === 0) return [];
  const rows = await prisma.mentorProfile.findMany({ where: { id: { in: profileIds } }, include: MENTOR_CARD_INCLUDE });
  const cards = await buildMentorCards(rows);
  const byProfile = new Map(rows.map((r, i) => [r.id, cards[i]]));
  return profileIds.map((id) => byProfile.get(id)).filter((c): c is MentorCard => !!c);
}

const CATEGORY_LABEL = (c: string) => (isMentorCategory(c) ? `${MENTOR_CATEGORY_META[c].label} ${MENTOR_CATEGORY_META[c].short}` : c);

export type SearchPage = { cards: MentorCard[]; hasMore: boolean };

/**
 * یک صفحه از نتیجه‌ی جستجو. `base` = شرطِ قابلِ کشف‌بودن (+ بلاک‌ها) از روت.
 */
export async function searchMentors(f: MentorFilters, base: Prisma.MentorProfileWhereInput, page: number, pageSize: number): Promise<SearchPage> {
  const where = filterWhere(f, base);
  const scope: RankScope = isMentorCategory(f.category) ? f.category : RANK_SCOPE_ALL;
  const offset = (page - 1) * pageSize;

  // ── مسیرِ دیتابیسی: بدونِ عبارت و بدونِ نیاز به شمارشِ ظرفیت ──
  if (!f.q && !f.open) {
    if (f.sort !== "new") {
      const { cards, hasMore } = await loadRankedCards(where, scope, f.sort, offset, pageSize);
      return { cards, hasMore };
    }
    const rows = await prisma.mentorProfile.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: pageSize + 1,
      select: { id: true },
    });
    return { cards: await cardsInOrder(rows.slice(0, pageSize).map((r) => r.id)), hasMore: rows.length > pageSize };
  }

  // ── مسیرِ حافظه‌ای: نامزدهای محدود، امتیازِ مرتبط‌بودن، ترکیب با شایستگی ──
  const candidates = await prisma.mentorProfile.findMany({
    where,
    orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { id: "asc" }],
    take: CANDIDATE_CAP,
    select: {
      id: true, userId: true, headline: true, routineRole: true, specialties: true, bio: true, categories: true,
      createdAt: true, maxActiveStudents: true,
      user: { select: { name: true, lastName: true, username: true } },
    },
  });

  let pool = candidates.map((c) => ({ c, rel: 1 }));
  if (f.q) {
    const pq = parseQuery(f.q);
    pool = pool
      .map(({ c }) => ({
        c,
        rel: relevance(
          pq,
          buildSearchDoc(
            {
              name: displayName(c.user),
              username: c.user.username,
              headline: c.headline,
              // نقشِ روتین فقط با دسته‌ی ROUTINE عمومیه (publicRoutineRole)
              routineRole: c.categories.includes("ROUTINE") ? c.routineRole : null,
              specialties: c.specialties,
              bio: c.bio,
              categories: c.categories,
            },
            CATEGORY_LABEL
          )
        ),
      }))
      .filter((x) => x.rel >= RELEVANCE_MIN);
  }

  if (f.open) {
    const capped = pool.filter((x) => x.c.maxActiveStudents != null).map((x) => x.c.userId);
    if (capped.length) {
      const stats = await loadMentorStats(capped);
      pool = pool.filter((x) => x.c.maxActiveStudents == null || (stats.get(x.c.userId)?.activeStudents ?? 0) < x.c.maxActiveStudents);
    }
  }

  if (pool.length === 0) return { cards: [], hasMore: false };

  type Scored = { id: string; score: number; tie: number; createdAt: number };
  let scored: Scored[];
  if (f.sort === "new") {
    scored = pool.map((x) => ({ id: x.c.id, score: x.c.createdAt.getTime(), tie: 0, createdAt: x.c.createdAt.getTime() }));
  } else {
    await ensureFreshRankings(scope);
    const stats = await prisma.mentorRankingStat.findMany({
      where: { category: scope, profileId: { in: pool.map((x) => x.c.id) } },
      select: { profileId: true, score: true, ratingScore: true, sampleStudents: true, verifiedReviews: true },
    });
    const byId = new Map(stats.map((s) => [s.profileId, s]));
    scored = pool.map((x) => {
      const s = byId.get(x.c.id);
      const merit = s?.score ?? 0;
      const rating = s?.ratingScore ?? 0;
      const score =
        f.sort === "rating"
          ? (f.q ? x.rel * 0.6 + rating * 0.4 : rating)
          : (f.q ? blendScore(x.rel, merit) : merit);
      const tie = f.sort === "rating" ? (s?.verifiedReviews ?? 0) : (s?.sampleStudents ?? 0);
      return { id: x.c.id, score, tie, createdAt: x.c.createdAt.getTime() };
    });
  }
  // ترتیبِ قطعی: امتیاز، بعد نمونه، بعد id
  scored.sort((a, b) => b.score - a.score || b.tie - a.tie || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const slice = scored.slice(offset, offset + pageSize);
  return { cards: await cardsInOrder(slice.map((s) => s.id)), hasMore: scored.length > offset + pageSize };
}
