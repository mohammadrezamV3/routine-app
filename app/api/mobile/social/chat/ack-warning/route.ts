import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { ackChatWarning } from "@/lib/mobileSocialChat";

// POST /api/mobile/social/chat/ack-warning — اخطارِ فعلی دیده شد
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  return socialJson(await ackChatWarning(g.viewer.userId));
}
