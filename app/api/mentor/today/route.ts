import { NextResponse } from "next/server";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { buildCoachToday } from "@/lib/coachTodayServer";

export const dynamic = "force-dynamic";

// GET /api/mentor/today → CoachToday (بدون پروفایل مربی: profile=null و شمارنده‌های صفر)
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  return NextResponse.json(await buildCoachToday(g.userId));
}
