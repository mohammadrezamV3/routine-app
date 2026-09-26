import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/support/tickets/:id/messages — پیامِ جدیدِ کاربر روی تیکتِ خودش.
// اگه تیکت قبلا ANSWERED یا CLOSED شده بود، با این پیام دوباره OPEN می‌شه —
// یعنی گفت‌وگو ادامه‌دار می‌مونه، کاربر مجبور نیست تیکتِ تازه بسازه.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(`support-ticket-reply:${userId}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد پیام‌های ارسالی زیاد بوده — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const ticket = await prisma.supportTicket.findFirst({ where: { id: params.id, userId }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "تیکت پیدا نشد" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const message = clampText(String(body?.message || "").trim(), 4000);
  if (!message) return NextResponse.json({ error: "متن پیام الزامی است" }, { status: 400 });

  const [created] = await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: ticket.id, body: message, fromAdmin: false } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } }),
  ]);
  return NextResponse.json({ ok: true, message: { ...created, createdAt: created.createdAt.toISOString() } });
}
