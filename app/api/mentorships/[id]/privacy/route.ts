import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { listStudentScopes, sanitizeSharedPrograms, type PrivacySettings } from "@/lib/mentorPrivacy";
import { publishToUsers } from "@/lib/realtime";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };

const PRIVACY_SELECT = {
  shareAllPrograms: true,
  sharedPrograms: true,
  showSchedule: true,
  showProgramName: true,
  showTaskName: true,
  showTaskDetails: true,
  showProgress: true,
} as const;

const BOOL_FIELDS = ["shareAllPrograms", "showSchedule", "showProgramName", "showTaskName", "showTaskDetails", "showProgress"] as const;

function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

// GET /api/mentorships/:id/privacy → فقط شاگرد همین رابطه. تنظیمات هر رابطه
// جداست؛ تغییر دسترسی منتور A هیچ اثری روی منتور B نداره.
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();

  const m = await prisma.mentorship.findFirst({ where: { id: params.id, studentId: g.userId }, select: PRIVACY_SELECT });
  if (!m) return notFound();
  return NextResponse.json({ privacy: m as PrivacySettings, scopes: await listStudentScopes(g.userId) });
}

// PUT /api/mentorships/:id/privacy → زیرمجموعه‌ای از فیلدها؛ فقط شاگرد.
export async function PUT(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!validId(params.id)) return notFound();

  const parsed = await readJsonBody(req, 32 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  const data: Partial<PrivacySettings> = {};
  for (const k of BOOL_FIELDS) {
    if (b[k] === undefined) continue;
    if (typeof b[k] !== "boolean") return badRequest(tr(tr("مقدار تنظیمات حریم خصوصی نامعتبره", "Invalid privacy setting value"), "Invalid privacy setting value"));
    data[k] = b[k];
  }
  if (b.sharedPrograms !== undefined) {
    if (!Array.isArray(b.sharedPrograms)) return badRequest(tr(tr("لیست برنامه‌های مشترک نامعتبره", "Invalid shared programs list"), "Invalid shared programs list"));
    data.sharedPrograms = sanitizeSharedPrograms(b.sharedPrograms);
  }

  const res = await prisma.mentorship.updateMany({ where: { id: params.id, studentId: g.userId }, data });
  if (res.count === 0) return notFound();
  const row = await prisma.mentorship.findFirst({ where: { id: params.id, studentId: g.userId }, select: { ...PRIVACY_SELECT, mentorId: true } });
  let privacy = null;
  if (row) {
    const { mentorId, ...rest } = row;
    privacy = rest;
    // منتور همون لحظه دسترسی‌های تازه رو می‌بینه (و بقیه‌ی دستگاه‌های شاگرد)
    void publishToUsers([mentorId, g.userId], { type: "mentor.mentorship", data: { id: params.id } });
  }
  return NextResponse.json({ privacy });
}
