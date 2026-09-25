import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { clampText } from "@/lib/validate";
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_SUBJECT_MAX,
  type MobileTicketDetailResponse,
  type MobileTicketMessage,
  type MobileTicketStatus,
  type MobileTicketSummary,
} from "@/lib/mobileAccountContract";

// تیکتِ پشتیبانی برای اپ موبایل — همون قواعدِ app/api/support/tickets/* ِ وب:
// سقفِ ۱۲۰/۴۰۰۰ کاراکتر، rate limit با **همون کلیدها** (مجموعِ وب+اپ)،
// where همیشه {id, userId} (IDOR)، پیامِ کاربر تیکتِ ANSWERED/CLOSED رو
// دوباره OPEN می‌کنه. پیوست نداره چون وب هم نداره.

type Result<T> = { ok: true; body: T } | { ok: false; status: number; error: string };

const summarySelect = {
  id: true, subject: true, status: true, createdAt: true, updatedAt: true,
  messages: { orderBy: { createdAt: "desc" as const }, take: 1, select: { body: true, fromAdmin: true, createdAt: true } },
};

function toSummary(t: {
  id: string; subject: string; status: string; createdAt: Date; updatedAt: Date;
  messages: { body: string; fromAdmin: boolean; createdAt: Date }[];
}): MobileTicketSummary {
  const m = t.messages[0];
  return {
    id: t.id,
    subject: t.subject,
    status: t.status as MobileTicketStatus,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    lastMessage: m ? { body: m.body, fromAdmin: m.fromAdmin, createdAt: m.createdAt.toISOString() } : null,
  };
}

function cleanText(v: unknown, max: number): string {
  return clampText(String(typeof v === "string" ? v : "").trim(), max);
}

export async function listTickets(userId: string): Promise<MobileTicketSummary[]> {
  const rows = await prisma.supportTicket.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 100, select: summarySelect });
  return rows.map(toSummary);
}

export async function createTicket(userId: string, input: { subject?: unknown; message?: unknown }): Promise<Result<MobileTicketSummary>> {
  const subject = cleanText(input.subject, SUPPORT_SUBJECT_MAX);
  const message = cleanText(input.message, SUPPORT_MESSAGE_MAX);
  if (!subject) return { ok: false, status: 400, error: "موضوع تیکت الزامی است" };
  if (!message) return { ok: false, status: 400, error: "متن پیام الزامی است" };
  if (!(await checkRateLimit(`support-ticket-create:${userId}`, 5, 60 * 60 * 1000))) {
    return { ok: false, status: 429, error: "تعداد تیکت‌های ثبت‌شده زیاد بوده — کمی بعد دوباره امتحان کن" };
  }
  const t = await prisma.supportTicket.create({
    data: { userId, subject, messages: { create: { body: message, fromAdmin: false } } },
    select: summarySelect,
  });
  return { ok: true, body: toSummary(t) };
}

export async function getTicket(userId: string, id: string): Promise<MobileTicketDetailResponse["ticket"] | null> {
  if (typeof id !== "string" || id.length > 40) return null;
  const t = await prisma.supportTicket.findFirst({
    where: { id, userId },
    select: {
      id: true, subject: true, status: true, createdAt: true, updatedAt: true,
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, fromAdmin: true, createdAt: true } },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    subject: t.subject,
    status: t.status as MobileTicketStatus,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    messages: t.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  };
}

export async function replyToTicket(
  userId: string,
  id: string,
  input: { message?: unknown }
): Promise<Result<{ message: MobileTicketMessage; status: MobileTicketStatus }>> {
  if (typeof id !== "string" || id.length > 40) return { ok: false, status: 404, error: "تیکت پیدا نشد" };
  if (!(await checkRateLimit(`support-ticket-reply:${userId}`, 20, 60 * 60 * 1000))) {
    return { ok: false, status: 429, error: "تعداد پیام‌های ارسالی زیاد بوده — کمی بعد دوباره امتحان کن" };
  }
  const ticket = await prisma.supportTicket.findFirst({ where: { id, userId }, select: { id: true } });
  if (!ticket) return { ok: false, status: 404, error: "تیکت پیدا نشد" };
  const message = cleanText(input.message, SUPPORT_MESSAGE_MAX);
  if (!message) return { ok: false, status: 400, error: "متن پیام الزامی است" };

  const [created] = await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: ticket.id, body: message, fromAdmin: false }, select: { id: true, body: true, fromAdmin: true, createdAt: true } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } }),
  ]);
  return { ok: true, body: { message: { ...created, createdAt: created.createdAt.toISOString() }, status: "OPEN" } };
}
