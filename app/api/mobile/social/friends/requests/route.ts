import { NextRequest } from "next/server";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { listIncomingRequests } from "@/lib/mobileSocialFriends";
import type { SocialRequestsResponse } from "@/lib/mobileSocialContract";

// GET /api/mobile/social/friends/requests — درخواست‌های دریافتیِ در انتظار
export async function GET(req: NextRequest) {
  const g = await requireMobileSocialUser(req);
  if (!g.ok) return g.response;

  const body: SocialRequestsResponse = { requests: await listIncomingRequests(g.viewer.userId) };
  return socialJson({ status: 200, body });
}
