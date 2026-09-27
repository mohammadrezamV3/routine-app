import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

// GET /api/admin/mentors/reviews?status=VISIBLE|HIDDEN|reported&page=
// «reported» = نظرهایی که حداقل یک گزارشِ باز دارن (هر وضعیتی).

const STATUSES = ["VISIBLE", "HIDDEN", "reported"] as const;
type Status = (typeof STATUSES)[number];
const PAGE_SIZE = 25;
const PUBLIC_USER = { id: true, name: true, lastName: true, username: true, avatarUrl: true } as const;

export async function GET(req: NextRequest) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const sp = req.nextUrl.searchParams;
  const statusParam = sp.get("status");
  const status: Status = STATUSES.includes(statusParam as Status) ? (statusParam as Status) : "VISIBLE";
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(sp.get("page")) || 1)));

  const openReports = await prisma.mentorReport.groupBy({
    by: ["targetId"],
    where: { targetType: "REVIEW", status: "OPEN" },
    _count: { _all: true },
  });
  const reportsBy = new Map(openReports.map((r) => [r.targetId, r._count._all]));

  const where: Prisma.MentorReviewWhereInput =
    status === "reported" ? { id: { in: Array.from(reportsBy.keys()) } } : { status };

  const [rows, total, visible, hidden] = await Promise.all([
    prisma.mentorReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, rating: true, body: true, status: true, hiddenReason: true, createdAt: true, updatedAt: true,
        mentor: { select: { ...PUBLIC_USER, mentorProfile: { select: { id: true } } } },
        student: { select: PUBLIC_USER },
      },
    }),
    prisma.mentorReview.count({ where }),
    prisma.mentorReview.count({ where: { status: "VISIBLE" } }),
    prisma.mentorReview.count({ where: { status: "HIDDEN" } }),
  ]);

  return NextResponse.json({
    reviews: rows.map((r) => {
      const { mentorProfile, ...mentor } = r.mentor;
      return {
        id: r.id, rating: r.rating, body: r.body, status: r.status, hiddenReason: r.hiddenReason,
        createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
        mentor, mentorProfileId: mentorProfile?.id ?? null,
        student: r.student,
        openReports: reportsBy.get(r.id) || 0,
      };
    }),
    total,
    pageSize: PAGE_SIZE,
    counts: { VISIBLE: visible, HIDDEN: hidden, reported: reportsBy.size },
  });
}
