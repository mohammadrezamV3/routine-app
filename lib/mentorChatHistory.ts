import type { Mentorship } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT, type PublicUser } from "@/lib/mentorServer";

// «سابقه‌ی گفت‌وگو» در پنل کاربری (مهاجرت 20260928101000_mentor_chat_history).
//
// مدل: «پاک کردن برای خودم». هر طرفِ رابطه یک مهرِ زمانیِ جدا دارد
// (mentorClearedBefore / studentClearedBefore). پیام‌های تا آن لحظه دیگر برای
// همان طرف برگردانده نمی‌شوند؛ ردیف‌ها حذف نمی‌شوند، چون نسخه‌ی طرفِ مقابل
// همان ردیف‌هاست (پیام‌ها سرتاسری رمزند و سرور نسخه‌ی جداگانه‌ای برای هر طرف ندارد).
// پیام‌های تازه بعد از پاک‌کردن مثلِ همیشه دیده می‌شوند.
//
// پیام‌های خوانده‌نشده‌ی طرفِ مقابل که پاک می‌شوند «خوانده» علامت می‌خورند؛
// وگرنه شمارنده‌ی خوانده‌نشده‌ها پیامی را نشان می‌داد که دیگر باز نمی‌شود.

export type ChatHistoryRole = "mentor" | "student";

export function chatRoleOf(m: Pick<Mentorship, "mentorId" | "studentId">, userId: string): ChatHistoryRole | null {
  if (m.mentorId === userId) return "mentor";
  if (m.studentId === userId) return "student";
  return null;
}

/** مهرِ «پاک‌شده تا» برای این کاربر در این رابطه (یا null) */
export function clearedBeforeFor(
  m: Pick<Mentorship, "mentorId" | "studentId" | "mentorClearedBefore" | "studentClearedBefore">,
  userId: string
): Date | null {
  const role = chatRoleOf(m, userId);
  if (role === "mentor") return m.mentorClearedBefore ?? null;
  if (role === "student") return m.studentClearedBefore ?? null;
  return null;
}

/** شرطِ where برای پیام‌هایی که این کاربر هنوز می‌بیند */
export function visibleSinceWhere(clearedBefore: Date | null): { createdAt?: { gt: Date } } {
  return clearedBefore ? { createdAt: { gt: clearedBefore } } : {};
}

export type ChatHistoryRow = {
  id: string;
  role: ChatHistoryRole;
  status: string;
  counterpart: PublicUser;
  /** پیام‌هایی که هنوز برای من دیده می‌شوند */
  messageCount: number;
  lastMessageAt: string | null;
  clearedAt: string | null;
};

/** گفت‌وگوهایی که این کاربر در آن‌ها طرف است و پیامی (دیدنی یا پاک‌شده) دارند */
export async function listChatHistory(userId: string): Promise<ChatHistoryRow[]> {
  const rels = await prisma.mentorship.findMany({
    where: { OR: [{ mentorId: userId }, { studentId: userId }], messages: { some: {} } },
    select: {
      id: true, status: true, mentorId: true, studentId: true, mentorClearedBefore: true, studentClearedBefore: true,
      mentor: { select: PUBLIC_USER_SELECT },
      student: { select: PUBLIC_USER_SELECT },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const out: ChatHistoryRow[] = [];
  for (const r of rels) {
    const role = chatRoleOf(r, userId)!;
    const cleared = clearedBeforeFor(r, userId);
    const where = { mentorshipId: r.id, ...visibleSinceWhere(cleared) };
    const [count, last] = await Promise.all([
      prisma.mentorMessage.count({ where }),
      prisma.mentorMessage.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);
    out.push({
      id: r.id,
      role,
      status: r.status,
      counterpart: role === "mentor" ? r.student : r.mentor,
      messageCount: count,
      lastMessageAt: last?.createdAt.toISOString() ?? null,
      clearedAt: cleared?.toISOString() ?? null,
    });
  }
  return out;
}

/**
 * سابقه را برای همین کاربر پاک می‌کند. `target` = شناسه‌ی یک رابطه یا "all".
 * ضدِ IDOR: فقط رابطه‌هایی که کاربر یکی از دو طرفشان است؛ برای رابطه‌ی دیگران
 * چیزی تغییر نمی‌کند و ۰ برمی‌گردد (روت ۴۰۴ می‌دهد).
 */
export async function clearChatHistory(userId: string, target: string | "all", now = new Date()): Promise<number> {
  const rels = await prisma.mentorship.findMany({
    where: {
      ...(target === "all" ? {} : { id: target }),
      OR: [{ mentorId: userId }, { studentId: userId }],
    },
    select: { id: true, mentorId: true, studentId: true },
  });
  if (rels.length === 0) return 0;
  const asMentor = rels.filter((r) => r.mentorId === userId).map((r) => r.id);
  const asStudent = rels.filter((r) => r.studentId === userId && r.mentorId !== userId).map((r) => r.id);
  const ids = rels.map((r) => r.id);
  await prisma.$transaction([
    prisma.mentorship.updateMany({ where: { id: { in: asMentor }, mentorId: userId }, data: { mentorClearedBefore: now } }),
    prisma.mentorship.updateMany({ where: { id: { in: asStudent }, studentId: userId }, data: { studentClearedBefore: now } }),
    // پیام‌های طرفِ مقابل که پاک شد دیگر «خوانده‌نشده» حساب نمی‌شوند
    prisma.mentorMessage.updateMany({
      where: { mentorshipId: { in: ids }, senderId: { not: userId }, readAt: null, createdAt: { lte: now } },
      data: { readAt: now },
    }),
  ]);
  return rels.length;
}
