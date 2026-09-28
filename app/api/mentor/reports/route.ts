import { NextRequest, NextResponse } from "next/server";
import { requireMentorTools } from "@/lib/mentorToolsGuard";
import { forbidden } from "@/lib/mentorGuard";
import { buildWeeklyReport } from "@/lib/mentorReports";

const MAX_OFFSET = 12;

// GET /api/mentor/reports?offset=0 → خلاصه‌ی ۷ روزه‌ی هر شاگردِ فعال
// (offset=۱ یعنی هفته‌ی قبل، تا ۱۲ هفته). منتورِ معلق به داده‌ی اجرای شاگرد دسترسی ندارد.
export async function GET(req: NextRequest) {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  if (g.profile.suspendedAt) return forbidden("حساب مربی‌گری تو تعلیق شده");
  const raw = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  const offset = Number.isInteger(raw) && raw >= 0 && raw <= MAX_OFFSET ? raw : 0;
  return NextResponse.json(await buildWeeklyReport(g.userId, offset));
}
