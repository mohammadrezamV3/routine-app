import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

const STATUSES = ["OPEN", "ANSWERED", "CLOSED"] as const;

// GET /api/admin/support?status=OPEN — فهرستِ تیکت‌های همه‌ی کاربرها،
// تازه‌آپدیت‌شده اول (هم تیکتِ تازه‌ساز هم تیکتی که کاربر تازه بهش جواب داده).
export async function GET(req: NextRequest) {
  const guard = await requireAdmin("support");
  if (!guard.ok) return guard.response;

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = STATUSES.includes(statusParam as any) ? (statusParam as (typeof STATUSES)[number]) : undefined;

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true, subject: true, status: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, name: true, lastName: true, username: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromAdmin: true } },
      },
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count._all;

  return NextResponse.json({
    countByStatus,
    tickets: tickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      lastMessage: t.messages[0] || null,
      messages: undefined,
    })),
  });
}
