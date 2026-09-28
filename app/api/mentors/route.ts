import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { clampQuery } from "@/lib/validate";
import { isMentorCategory } from "@/lib/mentorCategories";
import { checkRateLimit } from "@/lib/rateLimit";
import { DISCOVERABLE_PROFILE_WHERE, MENTOR_CARD_INCLUDE, blockedUserIds, loadMentorStats, toMentorCard } from "@/lib/mentorServer";
import { RANK_SCOPE_ALL, loadRankedCards } from "@/lib/mentorRankingStats";

const PAGE_SIZE = 20;
const MAX_PAGE = 50;

// GET /api/mentors?q=&category=&sort=best|rating|new&verified=1&accepting=1&page= → فهرستِ منتورها
//   verified=1  فقط منتورهای با هویتِ تأییدشده؛ accepting=1 فقط کسانی که شاگردِ جدید می‌پذیرند
//   best   «بهترین نتیجه» (پیش‌فرض): امتیازِ شایستگی — lib/mentorRanking.ts
//   rating «بالاترین امتیاز»: فقط نظرهای تأییدشده، میانگینِ بیزی (نه میانگینِ خام)
//   new    «تازه‌ترین»: زمانِ ساختِ پروفایل
// با فیلترِ دسته، رتبه از امتیازِ *همون حوزه* میاد (مربیِ بدنسازی با نتیجه‌ی
// برنامه‌های تمرینی، نه روتین). ترتیب همیشه قطعیه (tie-break با id).
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
  // "popular" نامِ قدیمیِ همون best ـه
  const sort = sortRaw === "rating" || sortRaw === "new" ? sortRaw : "best";
  const verifiedOnly = sp.get("verified") === "1";
  const acceptingOnly = sp.get("accepting") === "1";
  const pageNum = Number(sp.get("page") || 1);
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? Math.min(pageNum, MAX_PAGE) : 1;

  // کسی که با من (از بخشِ دوستان) رابطه‌ی بلاک داره در کشف دیده نمی‌شه
  const blocked = await blockedUserIds(g.userId);

  const where: Prisma.MentorProfileWhereInput = {
    ...DISCOVERABLE_PROFILE_WHERE,
    ...(blocked.length ? { userId: { notIn: blocked } } : {}),
    ...(category ? { categories: { has: category } } : {}),
    ...(verifiedOnly ? { identityStatus: "VERIFIED" as const } : {}),
    ...(acceptingOnly ? { acceptingStudents: true } : {}),
    ...(q
      ? {
          OR: [
            { headline: { contains: q, mode: "insensitive" } },
            { routineRole: { contains: q, mode: "insensitive" } },
            { specialties: { has: q } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
            { user: { username: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  if (sort !== "new") {
    const { cards, hasMore } = await loadRankedCards(where, category ?? RANK_SCOPE_ALL, sort, (page - 1) * PAGE_SIZE, PAGE_SIZE);
    return NextResponse.json({ mentors: cards, hasMore });
  }

  const orderBy: Prisma.MentorProfileOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "asc" }];
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
