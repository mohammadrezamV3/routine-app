import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { getWeeklyReportForUser } from "@/lib/mobileSocialWeekly";

// AI صدا زده می‌شه — تا ۶۰ ثانیه وقت بده
export const maxDuration = 60;

// GET /api/mobile/social/weekly-report?offset=0|-1|… — پشتِ AI_INSIGHT، سقفِ
// نرخِ مشترک با وب (weekly-report-get، ۴۰ در ساعت).
export async function GET(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.AI_INSIGHT);
  if (!g.ok) return g.response;

  return socialJson(await getWeeklyReportForUser(g.viewer.userId, g.viewer.isSuperAdmin, req.nextUrl.searchParams.get("offset") || "0"));
}
