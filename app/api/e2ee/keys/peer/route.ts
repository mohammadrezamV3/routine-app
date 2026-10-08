import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { publicKeysFor } from "@/lib/e2ee/server";

// GET /api/e2ee/keys/peer?userId=… → کلیدهای عمومی یک کاربر دیگر (همه‌ی نسخه‌ها).
// فقط برای منتور منتشرشده (رمز جواب‌های پذیرش پیش از شکل‌گرفتن رابطه) یا کسی
// که با من رابطه‌ی منتوری دارد — نه دفترچه‌ی عمومی همه‌ی کاربران.
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!userId || userId.length > 64 || userId === me) return notFound();

  const [rel, mentor] = await Promise.all([
    prisma.mentorship.findFirst({ where: { OR: [{ mentorId: me, studentId: userId }, { mentorId: userId, studentId: me }] }, select: { id: true } }),
    prisma.mentorProfile.findFirst({ where: { userId, published: true, suspendedAt: null }, select: { id: true } }),
  ]);
  if (!rel && !mentor) return notFound();
  const keys = await publicKeysFor([userId]);
  return NextResponse.json({ userId, keys: keys[userId] });
}
