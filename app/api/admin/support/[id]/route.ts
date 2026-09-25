import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

// GET /api/admin/support/:id — جزئیاتِ یک تیکت (هر تیکتی، نه فقط تیکتِ خودِ ادمین).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("support");
  if (!guard.ok) return guard.response;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: {
      id: true, subject: true, status: true, createdAt: true, updatedAt: true,
      user: { select: { id: true, name: true, lastName: true, username: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, fromAdmin: true, createdAt: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "تیکت پیدا نشد" }, { status: 404 });

  return NextResponse.json({
    ticket: {
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messages: ticket.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    },
  });
}

// PATCH /api/admin/support/:id — فقط برای بستنِ دستیِ تیکت.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("support");
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (body?.status !== "CLOSED") return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });

  const result = await prisma.supportTicket.updateMany({ where: { id: params.id }, data: { status: "CLOSED" } });
  if (!result.count) return NextResponse.json({ error: "تیکت پیدا نشد" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
