import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { applyChatModeration } from "@/lib/adminAnalytics";
import { clampText } from "@/lib/validate";
import { isChatModerationAction } from "@/lib/tradeChat";
import { adminErrorResponse, loadTarget } from "@/lib/adminUsers";

// POST /api/admin/chat-moderation  { userId, action, note? }
//
// اعمالِ یکی از سه سطحِ تعدیلِ چت (یا رفعِ محدودیت) روی هر کاربری با هر
// شناسه‌ای — طبقِ درخواستِ صریح، از پنلِ کاربر (`/admin/users/[id]`) صدا
// زده می‌شود، پس شناسه از قبل معلوم و معتبر است.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin("users.edit");
  if (!guard.ok) return guard.response;

  const payload = await req.json().catch(() => null);
  const userId = typeof payload?.userId === "string" ? payload.userId : "";
  if (!userId || !isChatModerationAction(payload?.action)) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  try {
    await loadTarget(guard, userId, { destructive: true });
  } catch (e) {
    return adminErrorResponse(e);
  }

  const note = clampText(String(payload?.note ?? "").trim(), 300) || null;

  const updated = await applyChatModeration(guard.userId, userId, payload.action, note).catch(() => null);
  if (!updated) return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });

  return NextResponse.json({ ok: true, user: updated });
}
