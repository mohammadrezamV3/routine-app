import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ANNOUNCEMENT_PUBLIC_LIMIT, type PublicAnnouncement } from "@/lib/announcements";
import { announcementViewer, listAnnouncementsFor } from "@/lib/announcementsServer";

export const dynamic = "force-dynamic";

// GET /api/announcements → اطلاعیه‌های لیست زنگوله (جدیدترین اول) برای همین
// بیننده: فعال، در بازه‌ی زمانی، showInList و مخاطب‌خورده (سمت سرور).
// عمومی‌ست (مهمان هم می‌بینه) — فقط فیلدهای نمایشی برمی‌گردن.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const viewer = await announcementViewer(userId);
  const rows = await listAnnouncementsFor(viewer, ANNOUNCEMENT_PUBLIC_LIMIT);
  const announcements: PublicAnnouncement[] = rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, createdAt: r.createdAt.toISOString(),
  }));
  return NextResponse.json({ announcements }, { headers: { "Cache-Control": "no-store" } });
}
