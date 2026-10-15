import { NextResponse } from "next/server";
import { requireMentorsUser, notFound, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { clearChatHistory, listChatHistory } from "@/lib/mentorChatHistory";
import { tr } from "@/lib/i18n";

// «سابقه‌ی گفت‌وگو» در پنل کاربری. پاک‌کردن فقط برای خود کاربر است
// (lib/mentorChatHistory.ts)؛ نسخه‌ی طرف مقابل دست نمی‌خورد.

// GET /api/mentorships/chat-history → { conversations }
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  return NextResponse.json({ conversations: await listChatHistory(g.userId) });
}

// POST /api/mentorships/chat-history { mentorshipId } | { all: true }
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!(await checkRateLimit(`mentor-chat-clear:${g.userId}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "There were too many requests; try again shortly") }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  if (b.all === true) {
    const cleared = await clearChatHistory(g.userId, "all");
    return NextResponse.json({ ok: true, cleared });
  }
  if (typeof b.mentorshipId !== "string" || !b.mentorshipId || b.mentorshipId.length > 64) return badRequest(tr(tr("گفت‌وگو نامعتبره", "Invalid conversation"), "Invalid conversation"));
  const cleared = await clearChatHistory(g.userId, b.mentorshipId);
  if (!cleared) return notFound();
  return NextResponse.json({ ok: true, cleared });
}
