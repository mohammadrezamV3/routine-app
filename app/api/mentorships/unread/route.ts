import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";

// GET /api/mentorships/unread → شمار پیام‌های خوانده‌نشده‌ی من (کل + به‌ازای هر رابطه).
// فقط رابطه‌هایی که چتشون در دسترسه (ACTIVE/ENDED) — پیام یک رابطه‌ی بلاک‌شده
// نباید نشان «خوانده‌نشده»ای بسازه که هیچ‌وقت نمی‌شه بازش کرد.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const rows = await prisma.mentorMessage.groupBy({
    by: ["mentorshipId"],
    where: {
      senderId: { not: me },
      readAt: null,
      mentorship: { status: { in: ["ACTIVE", "ENDED"] }, OR: [{ mentorId: me }, { studentId: me }] },
    },
    _count: { _all: true },
  });

  const byMentorship: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byMentorship[r.mentorshipId] = r._count._all;
    total += r._count._all;
  }
  return NextResponse.json({ total, byMentorship });
}
