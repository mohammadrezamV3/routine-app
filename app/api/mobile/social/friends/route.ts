import { NextRequest } from "next/server";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { listFriends } from "@/lib/mobileSocialFriends";
import { SOCIAL_STATS_MODULES, type SocialFriendsResponse, type SocialStatsModule } from "@/lib/mobileSocialContract";

// GET /api/mobile/social/friends?module=routine|exercise|calorie
// همون GET /api/friends — دوستانِ تأییدشده + پیشرفت/استریکِ هرکدوم.
export async function GET(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const raw = req.nextUrl.searchParams.get("module");
  const module: SocialStatsModule = SOCIAL_STATS_MODULES.includes(raw as SocialStatsModule) ? (raw as SocialStatsModule) : "routine";
  const body: SocialFriendsResponse = { module, friends: await listFriends(g.viewer.userId, module) };
  return socialJson({ status: 200, body });
}
