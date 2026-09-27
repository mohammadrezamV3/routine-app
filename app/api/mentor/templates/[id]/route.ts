import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { requireMentorTools, validId } from "@/lib/mentorToolsGuard";
import { toTemplateDetail, toTemplateRow, validateTemplateName } from "@/lib/mentorTemplates";

type Ctx = { params: { id: string } };

// هر سه متد فقط روی قالبِ خودِ منتور (where: { id, profileId }) — ضدِ IDOR.

// GET /api/mentor/templates/:id → قالب با آیتم‌ها
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();
  const t = await prisma.mentorProgramTemplate.findFirst({ where: { id: params.id, profileId: g.profile.id } });
  if (!t) return notFound();
  return NextResponse.json({ template: toTemplateDetail(t) });
}

// PATCH /api/mentor/templates/:id { name } → تغییرِ نام
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireMentorTools({ write: true });
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();
  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const n = validateTemplateName(parsed.body?.name);
  if (!n.ok) return badRequest(n.error);

  const res = await prisma.mentorProgramTemplate.updateMany({ where: { id: params.id, profileId: g.profile.id }, data: { name: n.name } });
  if (res.count === 0) return notFound();
  const t = await prisma.mentorProgramTemplate.findUnique({ where: { id: params.id } });
  return NextResponse.json({ template: toTemplateRow(t!) });
}

// DELETE /api/mentor/templates/:id → برنامه‌هایی که از قالب ساخته شده‌اند دست نمی‌خورند
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();
  const res = await prisma.mentorProgramTemplate.deleteMany({ where: { id: params.id, profileId: g.profile.id } });
  if (res.count === 0) return notFound();
  return NextResponse.json({ ok: true });
}
