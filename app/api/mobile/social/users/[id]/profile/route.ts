import { NextRequest } from "next/server";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { getVisibleProfile } from "@/lib/mobileSocialFriends";

// GET /api/mobile/social/users/:id/profile — discoverable/بلاک مثلِ وب؛ شماره فقط با sharePhone.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  return socialJson(await getVisibleProfile(g.viewer.userId, params.id));
}
