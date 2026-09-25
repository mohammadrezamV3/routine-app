import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { reportChatMessage } from "@/lib/mobileSocialChat";

// POST /api/mobile/social/chat/report  { messageId, reason, note? } — همون گزارشِ وب
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  return socialJson(await reportChatMessage(g.viewer.userId, await readSocialBody(req)));
}
