import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { deleteChatMessage } from "@/lib/mobileSocialChat";

// POST /api/mobile/social/chat/delete  { id } — حذفِ نرم؛ فقط نویسنده یا ادمین (وگرنه ۴۰۳)
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  const body = await readSocialBody(req);
  return socialJson(await deleteChatMessage(g.viewer.userId, g.viewer.isSuperAdmin, body.id));
}
