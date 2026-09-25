import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { acceptChatRules } from "@/lib/mobileSocialChat";

// POST /api/mobile/social/chat/rules — پذیرشِ قوانینِ اتاق (UserSetting
// tradeChatRulesAccepted = true؛ همون کلیدی که SymbolChatPanelِ وب می‌نویسه)
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  return socialJson(await acceptChatRules(g.viewer.userId));
}
