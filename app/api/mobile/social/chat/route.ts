import { NextRequest } from "next/server";
import { ModuleKey } from "@prisma/client";
import { readSocialBody, requireMobileSocialUser, socialJson } from "@/lib/mobileSocialAuth";
import { getChatRulesAccepted, listChatMessages, sendChatMessage } from "@/lib/mobileSocialChat";
import {
  SOCIAL_CHAT_PAGE_SIZE, SOCIAL_ERROR_RULES_NOT_ACCEPTED, type SocialChatResponse,
} from "@/lib/mobileSocialContract";

// GET /api/mobile/social/chat?symbol=EURUSD[&since=<iso>][&before=<iso>][&limit=50]
// پشتِ ماژولِ TRADE (مثلِ وب). since برای پولینگ، before برای صفحه‌ی قبلی.
export async function GET(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") || SOCIAL_CHAT_PAGE_SIZE);
  const r = await listChatMessages(g.viewer.userId, g.viewer.isSuperAdmin, {
    symbol: sp.get("symbol"),
    since: sp.get("since"),
    before: sp.get("before"),
    limit: Number.isFinite(limit) ? limit : SOCIAL_CHAT_PAGE_SIZE,
  });
  if ("error" in r.body) return socialJson(r);

  const body: SocialChatResponse = { ...r.body, rulesAccepted: await getChatRulesAccepted(g.viewer.userId) };
  return socialJson({ status: 200, body });
}

// POST /api/mobile/social/chat  { symbol, body }
// همون قواعدِ وب (بن/غیرفعال‌سازی ۴۰۳، سقفِ نرخِ مشترکِ `chat:<userId>` ۴۲۹)
// + پذیرشِ قوانینِ اتاق: وب این را فقط سمتِ کلاینت نشان می‌دهد؛ این‌جا سرور
// هم چک می‌کند (۴۰۹ rules_not_accepted) چون کلاینتِ موبایل را هم می‌شود دور زد.
export async function POST(req: NextRequest) {
  const g = await requireMobileSocialUser(req, ModuleKey.TRADE);
  if (!g.ok) return g.response;

  if (!(await getChatRulesAccepted(g.viewer.userId))) {
    return socialJson({ status: 409, body: { error: SOCIAL_ERROR_RULES_NOT_ACCEPTED } });
  }
  return socialJson(await sendChatMessage(g.viewer.userId, g.viewer.isSuperAdmin, await readSocialBody(req)));
}
