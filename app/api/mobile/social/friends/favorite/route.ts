import { NextRequest } from "next/server";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { setFriendFavorite } from "@/lib/mobileSocialFriends";

// POST /api/mobile/social/friends/favorite  { friendshipId, favorite }
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  const friendshipId = typeof body.friendshipId === "string" ? body.friendshipId : "";
  return socialJson(await setFriendFavorite(g.viewer.userId, friendshipId, !!body.favorite));
}
