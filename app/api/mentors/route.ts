import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { clampQuery } from "@/lib/validate";
import { isMentorCategory } from "@/lib/mentorCategories";
import { rankByPopularity } from "@/lib/mentorRanking";
import { DISCOVERABLE_PROFILE_WHERE, MENTOR_CARD_INCLUDE, blockedUserIds, loadMentorStats, toMentorCard } from "@/lib/mentorServer";

const PAGE_SIZE = 20;
const MAX_PAGE = 50;
// «محبوب» در حافظه رتبه‌بندی می‌شه (امتیازِ ترکیبی قابل‌بیان با ORDER BY نیست)؛
// این سقفِ نامزدهاست — بیشتر از این، کشف باید به ستونِ امتیازِ ذخیره‌شده مهاجرت کنه.
const POPULAR_CANDIDATES = 500;

// GET /api/mentors?q=&category=&sort=popular|rating|new&page= → کشفِ منتورها
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;

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
    const candidates = await prisma.mentorProfile.findMany({
      where,
      include: MENTOR_CARD_INCLUDE,
      orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: POPULAR_CANDIDATES,
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
    const slice = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return NextResponse.json({
      mentors: slice.map((p) => toMentorCard(p, stats.get(p.userId))),
      hasMore: ranked.length > page * PAGE_SIZE,
    });
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
