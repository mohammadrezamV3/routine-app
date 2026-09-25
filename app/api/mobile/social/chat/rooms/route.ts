import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { getChatRulesAccepted } from "@/lib/mobileSocialChat";
import { CHAT_RULES } from "@/lib/tradeChat";
import { TRADE_PAIRS } from "@/lib/tradePairs";
import type { SocialChatRoomsResponse } from "@/lib/mobileSocialContract";

// GET /api/mobile/social/chat/rooms — اتاق‌ها فقط از TRADE_PAIRS (همون
// normalizeRoomSymbolِ سرور) + متنِ قوانین + وضعیتِ پذیرش.
export async function GET(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  const body: SocialChatRoomsResponse = {
    rooms: TRADE_PAIRS.map((p) => ({ symbol: p.code, label: p.label })),
    rules: CHAT_RULES,
    rulesAccepted: await getChatRulesAccepted(g.viewer.userId),
  };
  return socialJson({ status: 200, body });
}
