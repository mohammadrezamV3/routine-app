import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampText } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";

// تیکت‌های پشتیبانی — طبق درخواست صریح، تنها راه پشتیبانی همین سایت است
// (نه ایمیل/تلگرام). هر کاربر فقط تیکت‌های خودش را می‌بیند/می‌سازد؛ جواب
// دادن کارِ ادمینه (app/api/admin/support).

// GET /api/support/tickets — فهرست تیکت‌های خودِ کاربر، تازه‌ترین اول
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, subject: true, status: true, createdAt: true, updatedAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromAdmin: true, createdAt: true } },
    },
  });
  return NextResponse.json({
    tickets: tickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      lastMessage: t.messages[0]
        ? { ...t.messages[0], createdAt: t.messages[0].createdAt.toISOString() }
        : null,
      messages: undefined,
    })),
  });
}

// POST /api/support/tickets — تیکتِ جدید (موضوع + متنِ اولین پیام)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(`support-ticket-create:${userId}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تیکت‌های ثبت‌شده زیاد بوده — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const subject = clampText(String(body?.subject || "").trim(), 120);
  const message = clampText(String(body?.message || "").trim(), 4000);
  if (!subject) return NextResponse.json({ error: "موضوع تیکت الزامی است" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "متن پیام الزامی است" }, { status: 400 });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId, subject,
      messages: { create: { body: message, fromAdmin: false } },
    },
    select: { id: true, subject: true, status: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({
    ok: true,
    ticket: { ...ticket, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString() },
  });
}
