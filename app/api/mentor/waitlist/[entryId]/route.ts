import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { publishToUsers } from "@/lib/realtime";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import { advanceWaitlist } from "@/lib/mentorWaitlistServer";

// DELETE /api/mentor/waitlist/:entryId → منتور یک نفر را از صفش بیرون می‌برد.
// where همیشه {id, mentorId: من} (ضد IDOR)؛ «وجود ندارد» و «مال تو نیست» هر دو ۴۰۴.
export async function DELETE(_req: Request, { params }: { params: { entryId: string } }) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const id = params.entryId;
  if (typeof id !== "string" || !id || id.length > 64) return notFound();

  const entry = await prisma.mentorWaitlistEntry.findFirst({
    where: { id, mentorId: me, status: { in: ["WAITING", "OFFERED"] } },
    select: { userId: true, status: true },
  });
  if (!entry) return notFound();
  const now = new Date();
  const res = await prisma.mentorWaitlistEntry.updateMany({
    where: { id, mentorId: me, status: entry.status },
    data: { status: "CANCELLED", closedBy: "MENTOR", closedAt: now },
  });
  if (res.count === 0) return NextResponse.json({ error: "وضعیت صف هم‌زمان تغییر کرد؛ دوباره تلاش کن" }, { status: 409 });

  const mentor = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
  await notifyUser(entry.userId, {
    type: "mentor.waitlist.removed",
    title: "از صف خارج شدی",
    body: `${displayName(mentor)} فعلا نمی‌تونه شاگرد جدید از صفش بپذیره.`,
    url: "/mentors",
  });
  if (entry.status === "OFFERED") await advanceWaitlist(me, now);
  void publishToUsers([me, entry.userId], { type: "mentor.mentorship", data: { mentorId: me } });
  return NextResponse.json({ ok: true });
}
