import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";
import { loadRankingBreakdown } from "@/lib/mentorRankingStats";

// GET /api/admin/mentors/:profileId/ranking — جزئیاتِ امتیازِ شایستگیِ یک منتور
// (هر مؤلفه، ضریب‌ها، نمونه‌ها و دلیلِ ماندن بیرونِ «منتورهای محبوب») برای
// هر دامنه. همین لحظه بازمحاسبه می‌شه تا ادمین عددِ کهنه نبینه. فقط ادمین.
export async function GET(_req: NextRequest, { params }: { params: { profileId: string } }) {
  const g = await requireAdmin("mentors");
  if (!g.ok) return g.response;

  const profile = await prisma.mentorProfile.findUnique({ where: { id: params.profileId }, select: { id: true, userId: true } });
  if (!profile) return NextResponse.json({ error: "مربی پیدا نشد" }, { status: 404 });
  try {
    await loadTarget(g, profile.userId);
  } catch (e) {
    return adminErrorResponse(e);
  }

  const rows = await loadRankingBreakdown(profile.id);
  return NextResponse.json({ rows });
}
