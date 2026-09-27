import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { requireMentorTools, validId } from "@/lib/mentorToolsGuard";
import { toReplyRow, validateReply } from "@/lib/mentorReplies";

type Ctx = { params: { id: string } };

// PATCH /api/mentor/replies/:id { title?, body? } — فقط پاسخِ خودِ منتور
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireMentorTools({ write: true });
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const v = validateReply(parsed.body, true);
  if (!v.ok) return badRequest(v.error);

  const res = await prisma.mentorSavedReply.updateMany({ where: { id: params.id, profileId: g.profile.id }, data: v.data });
  if (res.count === 0) return notFound();
  const r = await prisma.mentorSavedReply.findUnique({ where: { id: params.id } });
  return NextResponse.json({ reply: toReplyRow(r!) });
}

// DELETE /api/mentor/replies/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();
  const res = await prisma.mentorSavedReply.deleteMany({ where: { id: params.id, profileId: g.profile.id } });
  if (res.count === 0) return notFound();
  return NextResponse.json({ ok: true });
}
