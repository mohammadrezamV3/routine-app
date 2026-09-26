import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";

// GET /api/support/tickets/:id — جزئیاتِ یک تیکت + کلِ پیام‌ها. طبقِ قاعده‌ی
// ثابتِ پروژه (IDOR)، where همیشه هم id هم userId دارد — یک کاربر هیچ‌وقت
// نباید تیکتِ کاربرِ دیگر را با حدس‌زدنِ id ببیند.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId },
    select: {
      id: true, subject: true, status: true, createdAt: true, updatedAt: true,
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
