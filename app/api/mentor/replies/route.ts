import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { requireMentorTools } from "@/lib/mentorToolsGuard";
import { MAX_REPLIES_PER_MENTOR, toReplyRow, validateReply } from "@/lib/mentorReplies";

// GET /api/mentor/replies → پاسخ‌های آماده‌ی خود منتور (قدیمی‌ترین اول، ترتیب ثابت برای انتخاب)
export async function GET() {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  const rows = await prisma.mentorSavedReply.findMany({
    where: { profileId: g.profile.id },
    orderBy: { createdAt: "asc" },
    take: MAX_REPLIES_PER_MENTOR,
  });
  return NextResponse.json({ replies: rows.map(toReplyRow) });
}

// POST /api/mentor/replies { title, body }
export async function POST(req: Request) {
  const g = await requireMentorTools({ write: true });
  if (!g.ok) return g.response;
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const v = validateReply(parsed.body);
  if (!v.ok) return badRequest(v.error);

  const count = await prisma.mentorSavedReply.count({ where: { profileId: g.profile.id } });
  if (count >= MAX_REPLIES_PER_MENTOR) return conflict(`حداکثر ${MAX_REPLIES_PER_MENTOR} پاسخ آماده مجاز است`);

  const r = await prisma.mentorSavedReply.create({ data: { profileId: g.profile.id, title: v.data.title!, body: v.data.body! } });
  return NextResponse.json({ reply: toReplyRow(r) });
}
