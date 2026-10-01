import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, forbidden } from "@/lib/mentorGuard";
import { advanceWaitlist, countReservedSeats, loadMentorWaitlist } from "@/lib/mentorWaitlistServer";

// GET /api/mentor/waitlist → صف انتظار خودم (منتور) به ترتیب ورود:
// { entries: MentorWaitlistRow[], capacity, reserved } — فقط کاربر عمومی و زمان‌ها،
// بدون هیچ متن آزادی (جواب‌های پذیرش با درخواست عادی می‌رسند).
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const profile = await prisma.mentorProfile.findUnique({ where: { userId: me }, select: { maxActiveStudents: true } });
  if (!profile) return forbidden("اول پروفایل مربی‌گری بساز");
  await advanceWaitlist(me);
  const now = new Date();
  const [entries, reserved] = await Promise.all([loadMentorWaitlist(me, now), countReservedSeats(me, now)]);
  return NextResponse.json({ entries, capacity: profile.maxActiveStudents, reserved });
}
