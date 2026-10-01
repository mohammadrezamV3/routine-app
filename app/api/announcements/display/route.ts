import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { announcementViewer, displayAnnouncementsFor } from "@/lib/announcementsServer";

export const dynamic = "force-dynamic";

// GET /api/announcements/display → پاپ‌آپ/بنرهای زنده برای همین بیننده
// (مخاطب، زمان‌بندی و بسته‌شده‌های کاربر لاگین‌کرده سمت سرور فیلتر می‌شن).
// فیلتر صفحه روی کلاینت با همون pathMatches انجام می‌شه تا هر ناوبری
// درخواست تازه نخواد. بسته‌شده‌های مهمان در localStorage خودش.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const viewer = await announcementViewer(userId);
  const items = await displayAnnouncementsFor(userId, viewer);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
