import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rateLimit";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { searchUsers } from "@/lib/mobileSocialFriends";

// GET /api/mobile/social/friends/search?q= — همون قواعدِ وب: فقط discoverable،
// بدونِ بلاکِ دوطرفه، سقفِ ۳۰/دقیقه (کاربر) و ۶۰/دقیقه (IP).
export async function GET(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  return socialJson(await searchUsers(g.viewer.userId, g.viewer.isSuperAdmin, getClientIp(req.headers), req.nextUrl.searchParams.get("q")));
}
