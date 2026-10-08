import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

// GET /api/admin/mentors?tab=pending|all|suspended&q=&page=
// صف احراز (هویت یا هر مدرکی PENDING) + همه + تعلیق‌شده‌ها. فقط اطلاعات
// عمومی کاربر برمی‌گرده (هیچ ایمیل/شماره‌ای) و هیچ‌وقت بایت‌های مدرک.

const TABS = ["pending", "all", "suspended"] as const;
type Tab = (typeof TABS)[number];
const PAGE_SIZE = 25;

const PENDING_WHERE: Prisma.MentorProfileWhereInput = {
  OR: [{ identityStatus: "PENDING" }, { credentials: { some: { status: "PENDING" } } }],
};

function tabWhere(tab: Tab): Prisma.MentorProfileWhereInput {
  if (tab === "pending") return PENDING_WHERE;
  if (tab === "suspended") return { suspendedAt: { not: null } };
  return {};
}

export async function GET(req: NextRequest) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const sp = req.nextUrl.searchParams;
  const tabParam = sp.get("tab");
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "pending";
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(sp.get("page")) || 1)));
  const q = (sp.get("q") || "").trim().slice(0, 80);

  const where: Prisma.MentorProfileWhereInput = { ...tabWhere(tab) };
  if (q) {
    const search: Prisma.MentorProfileWhereInput = {
      OR: [
        { id: q },
        { userId: q },
        { headline: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
        { user: { username: { contains: q.replace(/^@/, ""), mode: "insensitive" } } },
      ],
    };
    where.AND = [search];
  }

  const [rows, total, pendingTotal, suspendedTotal, allTotal] = await Promise.all([
    prisma.mentorProfile.findMany({
      where,
      // صف احراز: قدیمی‌ترین درخواست اول؛ بقیه: تازه‌ترین منتور اول
      orderBy: tab === "pending" ? { updatedAt: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, userId: true, categories: true, published: true, identityStatus: true,
        suspendedAt: true, ratingAvg: true, ratingCount: true, createdAt: true,
        user: { select: { id: true, name: true, lastName: true, username: true, avatarUrl: true, isBlocked: true } },
        credentials: { select: { category: true, status: true } },
      },
    }),
    prisma.mentorProfile.count({ where }),
    prisma.mentorProfile.count({ where: PENDING_WHERE }),
    prisma.mentorProfile.count({ where: { suspendedAt: { not: null } } }),
    prisma.mentorProfile.count(),
  ]);

  const userIds = rows.map((r) => r.userId);
  const students = userIds.length
    ? await prisma.mentorship.groupBy({
        by: ["mentorId"],
        where: { mentorId: { in: userIds }, status: "ACTIVE" },
        _count: { _all: true },
      })
    : [];
  const studentsBy = new Map(students.map((s) => [s.mentorId, s._count._all]));

  return NextResponse.json({
    mentors: rows.map((r) => ({
      profileId: r.id,
      user: r.user,
      categories: r.categories,
      published: r.published,
      identityStatus: r.identityStatus,
      credentials: r.credentials,
      pendingCount: (r.identityStatus === "PENDING" ? 1 : 0) + r.credentials.filter((c) => c.status === "PENDING").length,
      suspendedAt: r.suspendedAt ? r.suspendedAt.toISOString() : null,
      ratingAvg: r.ratingAvg,
      ratingCount: r.ratingCount,
      students: studentsBy.get(r.userId) || 0,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    pageSize: PAGE_SIZE,
    counts: { pending: pendingTotal, suspended: suspendedTotal, all: allTotal },
  });
}
