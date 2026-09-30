import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, notFound, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { isoDate } from "@/lib/mentorServer";
import { requireMentorTools, validId } from "@/lib/mentorToolsGuard";
import { MAX_TEMPLATES_PER_MENTOR, templateDataFromBody, toTemplateRow, validateTemplateName } from "@/lib/mentorTemplates";

// GET /api/mentor/templates → قالب‌های برنامه‌ی خودِ منتور (بدونِ آیتم‌ها)
export async function GET() {
  const g = await requireMentorTools();
  if (!g.ok) return g.response;
  const rows = await prisma.mentorProgramTemplate.findMany({
    where: { profileId: g.profile.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_TEMPLATES_PER_MENTOR,
  });
  return NextResponse.json({ templates: rows.map(toTemplateRow) });
}

// POST /api/mentor/templates
//   { name, programId }            → کپیِ محتوای یکی از برنامه‌های خودِ منتور (هر وضعیتی)
//   { name, program: {type,…} }    → از محتوای ویرایشگر (همان بدنه‌ی POSTِ برنامه)
// تاریخ‌ها ذخیره نمی‌شوند؛ فقط طولِ بازه (durationDays).
export async function POST(req: Request) {
  const g = await requireMentorTools({ write: true });
  if (!g.ok) return g.response;

  const parsed = await readJsonBody(req, 128 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  const n = validateTemplateName(b.name);
  if (!n.ok) return badRequest(n.error);

  let source: unknown;
  if (b.programId !== undefined) {
    if (!validId(b.programId)) return notFound();
    const p = await prisma.mentorProgram.findFirst({
      where: { id: b.programId, mentorId: g.userId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!p) return notFound();
    source = {
      type: p.type,
      title: p.title,
      description: p.description,
      note: p.note,
      startDate: p.startDate ? isoDate(p.startDate) : undefined,
      endDate: p.endDate ? isoDate(p.endDate) : undefined,
      items: p.items,
    };
  } else if (b.program && typeof b.program === "object") {
    source = b.program;
  } else {
    return badRequest("برنامه‌ی مبدا لازم است");
  }

  const t = templateDataFromBody(source);
  if (!t.ok) return badRequest(t.error);

  const count = await prisma.mentorProgramTemplate.count({ where: { profileId: g.profile.id } });
  if (count >= MAX_TEMPLATES_PER_MENTOR) return conflict(`حداکثر ${MAX_TEMPLATES_PER_MENTOR} قالب مجاز است؛ چند قالب قدیمی را حذف کن`);

  const created = await prisma.mentorProgramTemplate.create({ data: { profileId: g.profile.id, name: n.name, ...t.data } });
  touchMentorActivity(g.userId);
  return NextResponse.json({ template: toTemplateRow(created) });
}
