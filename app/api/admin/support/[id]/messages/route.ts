import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { writeAuditLog } from "@/lib/adminAnalytics";
import { clampText } from "@/lib/validate";
import { tr } from "@/lib/i18n";

// POST /api/admin/support/:id/messages — جواب ادمین روی هر تیکتی. تیکت
// خودکار ANSWERED می‌شه (منتظر کاربر) — برخلاف پیام کاربر که تیکت رو
// OPEN می‌کنه (منتظر ادمین).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin("support");
  if (!guard.ok) return guard.response;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: tr("تیکت پیدا نشد", "Ticket not found") }, { status: 404 });

  const body = await req.json().catch(() => null);
  const message = clampText(String(body?.message || "").trim(), 4000);
  if (!message) return NextResponse.json({ error: tr("متن پیام الزامی است", "Message text is required") }, { status: 400 });

  const [created] = await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: ticket.id, body: message, fromAdmin: true } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "ANSWERED" } }),
  ]);
  await writeAuditLog(guard.userId, "support.reply", "SupportTicket", ticket.id, { messageId: created.id });
  return NextResponse.json({ ok: true, message: { ...created, createdAt: created.createdAt.toISOString() } });
}
