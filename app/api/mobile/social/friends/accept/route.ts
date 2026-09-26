import { NextRequest } from "next/server";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { acceptFriendRequest } from "@/lib/mobileSocialFriends";

// POST /api/mobile/social/friends/accept  { friendshipId } — فقط گیرنده‌ی درخواست (وگرنه ۴۰۴)
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  const friendshipId = typeof body.friendshipId === "string" ? body.friendshipId : "";
  return socialJson(await acceptFriendRequest(g.viewer.userId, g.viewer.name, friendshipId));
}
