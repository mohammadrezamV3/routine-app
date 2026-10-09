import { NextResponse } from "next/server";
import { requireMentorsUser, notFound } from "@/lib/mentorGuard";
import { checkRateLimit } from "@/lib/rateLimit";
import { SAVED_MENTORS_MAX, saveMentor, unsaveMentor, type SaveResult } from "@/lib/savedMentors";
import { tr } from "@/lib/i18n";

type Ctx = { params: { mentorId: string } };

// PUT    /api/mentors/:mentorId/saved → ذخیره (سقف ۱۰؛ عبور → ۴۰۹ با پیام روشن)
// DELETE /api/mentors/:mentorId/saved → برداشتن
// هر دو بی‌اثر در تکرار؛ پاسخ: { saved, count, max }
function respond(r: SaveResult) {
  if (!r.ok) return r.status === 404 ? notFound() : NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ saved: r.saved, count: r.count, max: SAVED_MENTORS_MAX });
}

async function guard() {
  const g = await requireMentorsUser();
  if (!g.ok) return g;
  if (!(await checkRateLimit(`mentors:saved:${g.userId}`, 60, 60_000))) {
    return { ok: false as const, response: NextResponse.json({ error: tr("درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "There were too many requests; try again shortly") }, { status: 429 }) };
  }
  return g;
}

export async function PUT(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.ok) return g.response;
  return respond(await saveMentor(g.userId, params.mentorId));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.ok) return g.response;
  return respond(await unsaveMentor(g.userId, params.mentorId));
}
