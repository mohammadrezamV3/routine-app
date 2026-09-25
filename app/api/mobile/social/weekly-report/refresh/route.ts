import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { refreshWeeklyReportForUser } from "@/lib/mobileSocialWeekly";

export const maxDuration = 60;

// POST /api/mobile/social/weekly-report/refresh  { offset } — تولیدِ دوباره،
// سقفِ مشترک با وب (weekly-report-refresh، ۵ در روز).
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.AI_INSIGHT);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  return socialJson(await refreshWeeklyReportForUser(g.viewer.userId, g.viewer.isSuperAdmin, body.offset ?? 0));
}
