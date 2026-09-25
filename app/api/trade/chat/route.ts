import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { CHAT_PAGE_SIZE } from "@/lib/tradeChat";
import { deleteChatMessage, listChatMessages, sendChatMessage } from "@/lib/mobileSocialChat";

// اتاقِ گفت‌وگوی هر نماد. برخلافِ بقیه‌ی روت‌های ترید که داده‌ی خصوصیِ یک
// کاربرند، این‌جا داده عمومی است — پس قاعده‌ی `where:{id, userId}` این‌جا
// معنا ندارد و به‌جایش این‌ها را داریم:
//   • خواندن و نوشتن هر دو پشتِ ماژولِ TRADE قفل است.
//   • نوشتن سقفِ نرخ دارد (اسپم).
//   • حذف فقط برای نویسنده یا ادمین، و «نرم» است تا گزارش‌ها خالی نشوند.
// منطق در lib/mobileSocialChat.ts است (مشترک با /api/mobile/social/chat).

// GET /api/trade/chat?symbol=EURUSD[&since=<iso>]
// `since` برای پولینگ است: فقط پیام‌های جدیدتر برمی‌گردند، نه کلِ اتاق.
export async function GET(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const r = await listChatMessages(guard.userId, guard.isSuperAdmin, {
    symbol: req.nextUrl.searchParams.get("symbol"),
    since: req.nextUrl.searchParams.get("since"),
    limit: CHAT_PAGE_SIZE,
  });
  if ("error" in r.body) return NextResponse.json(r.body, { status: r.status });
  const { symbol, messages, moderation } = r.body;
  return NextResponse.json({ symbol, messages, moderation });
}

// POST /api/trade/chat  { symbol, body }
export async function POST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const r = await sendChatMessage(guard.userId, guard.isSuperAdmin, payload);
  return NextResponse.json(r.body, { status: r.status });
}

// DELETE /api/trade/chat?id=...
// حذفِ نرم. نویسنده پیامِ خودش را، و ادمین هر پیامی را می‌تواند بردارد.
export async function DELETE(req: NextRequest) {
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const r = await deleteChatMessage(guard.userId, guard.isSuperAdmin, req.nextUrl.searchParams.get("id"));
  return NextResponse.json(r.body, { status: r.status });
}
