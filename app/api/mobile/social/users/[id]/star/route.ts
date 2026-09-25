import { NextRequest } from "next/server";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { setFriendStar } from "@/lib/mobileSocialFriends";

// POST /api/mobile/social/users/:id/star  { starred } — فقط بین دوستانِ تأییدشده
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  return socialJson(await setFriendStar(g.viewer.userId, params.id, !!body.starred));
}
