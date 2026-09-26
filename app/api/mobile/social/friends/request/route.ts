import { NextRequest } from "next/server";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { sendFriendRequest } from "@/lib/mobileSocialFriends";

// POST /api/mobile/social/friends/request  { userId } | { username }
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  return socialJson(await sendFriendRequest(g.viewer.userId, g.viewer.name, await readSocialBody(req)));
}
