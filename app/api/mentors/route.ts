import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { clampQuery } from "@/lib/validate";
import { isMentorCategory } from "@/lib/mentorCategories";
import { checkRateLimit } from "@/lib/rateLimit";
import { DISCOVERABLE_PROFILE_WHERE, MENTOR_CARD_INCLUDE, blockedUserIds, loadMentorStats, loadPopularCards, toMentorCard } from "@/lib/mentorServer";

const PAGE_SIZE = 20;
const MAX_PAGE = 50;
// «محبوب» در حافظه رتبه‌بندی می‌شه (امتیازِ ترکیبی قابل‌بیان با ORDER BY نیست)؛
// این سقفِ نامزدهاست — بیشتر از این، کشف باید به ستونِ امتیازِ ذخیره‌شده مهاجرت کنه.
const POPULAR_CANDIDATES = 500;

// GET /api/mentors?q=&category=&sort=popular|rating|new&page= → کشفِ منتورها
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!(await checkRateLimit(`mentors:discover:${g.userId}`, 60, 60_000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاده؛ کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const q = clampQuery(sp.get("q"), 60);
  const categoryRaw = sp.get("category");
  const category = isMentorCategory(categoryRaw) ? categoryRaw : null;
  const sortRaw = sp.get("sort");
  const sort = sortRaw === "rating" || sortRaw === "new" ? sortRaw : "popular";
  const pageNum = Number(sp.get("page") || 1);
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? Math.min(pageNum, MAX_PAGE) : 1;

  // کسی که با من (از بخشِ دوستان) رابطه‌ی بلاک داره در کشف دیده نمی‌شه
  const blocked = await blockedUserIds(g.userId);

  const where: Prisma.MentorProfileWhereInput = {
    ...DISCOVERABLE_PROFILE_WHERE,
    ...(blocked.length ? { userId: { notIn: blocked } } : {}),
    ...(category ? { categories: { has: category } } : {}),
    ...(q
      ? {
          OR: [
            { headline: { contains: q, mode: "insensitive" } },
            { specialties: { has: q } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
            { user: { username: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  if (sort === "popular") {
    const { cards, total } = await loadPopularCards(where, (page - 1) * PAGE_SIZE, PAGE_SIZE, POPULAR_CANDIDATES);
    return NextResponse.json({ mentors: cards, hasMore: total > page * PAGE_SIZE });
  }

  const orderBy: Prisma.MentorProfileOrderByWithRelationInput[] =
    sort === "rating" ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];
  const rows = await prisma.mentorProfile.findMany({
    where,
    include: MENTOR_CARD_INCLUDE,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  const pageRows = rows.slice(0, PAGE_SIZE);
  const stats = await loadMentorStats(pageRows.map((p) => p.userId));
  return NextResponse.json({ mentors: pageRows.map((p) => toMentorCard(p, stats.get(p.userId))), hasMore: rows.length > PAGE_SIZE });
}
