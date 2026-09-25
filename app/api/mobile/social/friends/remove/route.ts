import { NextRequest } from "next/server";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { removeFriendship } from "@/lib/mobileSocialFriends";

// POST /api/mobile/social/friends/remove  { friendshipId }
// ردِ درخواست، لغوِ درخواستِ ارسالی یا حذفِ دوست — فقط دو طرفِ همون رابطه (وگرنه ۴۰۴).
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  const friendshipId = typeof body.friendshipId === "string" ? body.friendshipId : "";
  return socialJson(await removeFriendship(g.viewer.userId, friendshipId));
}
