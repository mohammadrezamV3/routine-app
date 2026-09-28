import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANNOUNCEMENT_PUBLIC_LIMIT, type PublicAnnouncement } from "@/lib/announcements";

export const dynamic = "force-dynamic";

// GET /api/announcements → اطلاعیه‌های فعال و منقضی‌نشده (جدیدترین اول).
// عمومی‌ست (مهمان هم می‌بینه) — فقط فیلدهای نمایشی برمی‌گردن، نه سازنده/وضعیت.
export async function GET() {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { createdAt: "desc" },
    take: ANNOUNCEMENT_PUBLIC_LIMIT,
    select: { id: true, title: true, body: true, createdAt: true },
  });
  const announcements: PublicAnnouncement[] = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  return NextResponse.json({ announcements }, { headers: { "Cache-Control": "no-store" } });
}
