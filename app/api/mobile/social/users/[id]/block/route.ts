import { NextRequest } from "next/server";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { blockUser, unblockUser } from "@/lib/mobileSocialFriends";

// POST /api/mobile/social/users/:id/block  { blocked: boolean } — بلاک/آنبلاک
// (معادلِ POST/DELETE /api/users/:id/block؛ پیش‌فرض بلاک).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  const blocked = body.blocked === undefined ? true : !!body.blocked;
  return socialJson(blocked ? await blockUser(g.viewer.userId, params.id) : await unblockUser(g.viewer.userId, params.id));
}
