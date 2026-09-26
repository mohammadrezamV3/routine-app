import { NextRequest, NextResponse } from "next/server";
import { MentorReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

// GET /api/admin/mentors/reports?status=OPEN|RESOLVED|DISMISSED&page=
// خلاصه‌ی محتوای هدف سمت سرور ساخته می‌شه (متن نظر، بخشی از پیام، عنوان
// برنامه، اسم عمومی کاربر) — هرگز ایمیل/شماره.

const STATUSES: MentorReportStatus[] = ["OPEN", "RESOLVED", "DISMISSED"];
const PAGE_SIZE = 25;
const SNIPPET = 300;
const PUBLIC_USER = { id: true, name: true, lastName: true, username: true, avatarUrl: true } as const;

type PublicUser = { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null };
type Target =
  | { kind: "USER"; exists: boolean; user: PublicUser | null }
  | { kind: "REVIEW"; exists: boolean; rating: number | null; body: string | null; status: string | null; author: PublicUser | null; mentor: PublicUser | null }
  | { kind: "MESSAGE"; exists: boolean; body: string | null; createdAt: string | null; sender: PublicUser | null }
  | { kind: "PROGRAM"; exists: boolean; title: string | null; type: string | null; status: string | null; mentor: PublicUser | null };

function cut(s: string | null | undefined, n = SNIPPET): string | null {
  if (!s) return null;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function ids(rows: { targetType: string; targetId: string }[], type: string) {
  return Array.from(new Set(rows.filter((r) => r.targetType === type).map((r) => r.targetId)));
}

export async function GET(req: NextRequest) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const sp = req.nextUrl.searchParams;
  const statusParam = sp.get("status") as MentorReportStatus;
  const status = STATUSES.includes(statusParam) ? statusParam : "OPEN";
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(sp.get("page")) || 1)));

  const [rows, total, counts] = await Promise.all([
    prisma.mentorReport.findMany({
      where: { status },
      orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, targetType: true, targetId: true, targetUserId: true, reason: true, details: true,
        status: true, resolution: true, resolvedById: true, resolvedAt: true, createdAt: true,
        reporter: { select: PUBLIC_USER },
      },
    }),
    prisma.mentorReport.count({ where: { status } }),
    prisma.mentorReport.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const userIds = ids(rows, "USER");
  const reviewIds = ids(rows, "REVIEW");
  const messageIds = ids(rows, "MESSAGE");
  const programIds = ids(rows, "PROGRAM");
  const targetUserIds = Array.from(new Set(rows.map((r) => r.targetUserId).filter((x): x is string => !!x)));
  const resolverIds = Array.from(new Set(rows.map((r) => r.resolvedById).filter((x): x is string => !!x)));

  const [users, reviews, messages, programs, resolvers] = await Promise.all([
    userIds.length || targetUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: Array.from(new Set([...userIds, ...targetUserIds])) } },
          select: { ...PUBLIC_USER, mentorProfile: { select: { id: true, suspendedAt: true } } },
        })
      : [],
    reviewIds.length
      ? prisma.mentorReview.findMany({
          where: { id: { in: reviewIds } },
          select: { id: true, rating: true, body: true, status: true, student: { select: PUBLIC_USER }, mentor: { select: PUBLIC_USER } },
        })
      : [],
    messageIds.length
      ? prisma.mentorMessage.findMany({
          where: { id: { in: messageIds } },
          select: { id: true, body: true, createdAt: true, sender: { select: PUBLIC_USER } },
        })
      : [],
    programIds.length
      ? prisma.mentorProgram.findMany({
          where: { id: { in: programIds } },
          select: { id: true, title: true, type: true, status: true, mentor: { select: PUBLIC_USER } },
        })
      : [],
    resolverIds.length
      ? prisma.user.findMany({ where: { id: { in: resolverIds } }, select: { id: true, name: true, lastName: true, username: true } })
      : [],
  ]);

  const userBy = new Map(users.map((u) => [u.id, u]));
  const reviewBy = new Map(reviews.map((r) => [r.id, r]));
  const messageBy = new Map(messages.map((m) => [m.id, m]));
  const programBy = new Map(programs.map((p) => [p.id, p]));
  const resolverBy = new Map(resolvers.map((u) => [u.id, u]));
  const pub = (u: (PublicUser & { mentorProfile?: unknown }) | null | undefined): PublicUser | null =>
    u ? { id: u.id, name: u.name, lastName: u.lastName, username: u.username, avatarUrl: u.avatarUrl } : null;

  function target(type: string, id: string): Target {
    if (type === "USER") {
      const u = userBy.get(id);
      return { kind: "USER", exists: !!u, user: pub(u) };
    }
    if (type === "REVIEW") {
      const r = reviewBy.get(id);
      return { kind: "REVIEW", exists: !!r, rating: r?.rating ?? null, body: cut(r?.body), status: r?.status ?? null, author: pub(r?.student), mentor: pub(r?.mentor) };
    }
    if (type === "MESSAGE") {
      const m = messageBy.get(id);
      return { kind: "MESSAGE", exists: !!m, body: cut(m?.body), createdAt: m?.createdAt.toISOString() ?? null, sender: pub(m?.sender) };
    }
    const p = programBy.get(id);
    return { kind: "PROGRAM", exists: !!p, title: cut(p?.title, 120), type: p?.type ?? null, status: p?.status ?? null, mentor: pub(p?.mentor) };
  }

  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count._all;

  return NextResponse.json({
    reports: rows.map((r) => {
      const tu = r.targetUserId ? userBy.get(r.targetUserId) : r.targetType === "USER" ? userBy.get(r.targetId) : undefined;
      const resolver = r.resolvedById ? resolverBy.get(r.resolvedById) : undefined;
      return {
        id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, details: r.details,
        status: r.status, resolution: r.resolution,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        resolvedBy: resolver ? { name: resolver.name, lastName: resolver.lastName, username: resolver.username } : null,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
        targetUser: tu ? { ...pub(tu)!, mentorProfileId: tu.mentorProfile?.id ?? null, mentorSuspended: !!tu.mentorProfile?.suspendedAt } : null,
        target: target(r.targetType, r.targetId),
      };
    }),
    total,
    pageSize: PAGE_SIZE,
    countByStatus,
  });
}
