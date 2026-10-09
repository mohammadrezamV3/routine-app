import { tr } from "@/lib/i18n";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// POST /api/announcements/:id/dismiss → بستن پاپ‌آپ/بنر (یا ثبت «یک بار
// دیده‌شده») برای کاربر لاگین‌کرده. مهمان این روت رو صدا نمی‌زنه
// (localStorage). تکراری بی‌اثره (کلید یکتای announcementId+userId).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: tr("ابتدا وارد شوید", "Please sign in first") }, { status: 401 });
  if (!(await checkRateLimit(`ann-dismiss:${userId}`, 60, 60_000))) {
    return NextResponse.json({ error: tr("درخواست زیاد است", "Too many requests") }, { status: 429 });
  }
  if (typeof params.id !== "string" || params.id.length > 64) return NextResponse.json({ error: tr("نامعتبر", "Invalid") }, { status: 400 });

  const exists = await prisma.announcement.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: tr("اطلاعیه پیدا نشد", "Announcement not found") }, { status: 404 });

  await prisma.announcementDismissal.upsert({
    where: { announcementId_userId: { announcementId: exists.id, userId } },
    create: { announcementId: exists.id, userId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
