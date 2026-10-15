import { NextRequest, NextResponse } from "next/server";
import type { MentorProgramStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, notFound, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { programTypeAllowed, programTypeBlockedMsg } from "@/lib/mentorCategories";
import { validateProgramInput } from "@/lib/mentorValidate";
import { PROGRAM_WITH_USERS_INCLUDE, buildProgramRows, loadProgramWithUsers, serializeProgram } from "@/lib/mentorServer";
import { activateDueForUser } from "@/lib/mentorSchedule";
import { publishToUsers } from "@/lib/realtime";
import { tr } from "@/lib/i18n";

const STATUSES: MentorProgramStatus[] = ["DRAFT", "PENDING", "ACCEPTED", "REJECTED", "ACTIVE", "COMPLETED", "CANCELLED"];
// سقف پیش‌نویس‌های هم‌زمان یک منتور — جلوی پرکردن دیتابیس با برنامه‌ی خالی
const MAX_DRAFTS_PER_MENTOR = 200;

// GET /api/mentor-programs?role=mentor|student&status=&mentorshipId=
// شاگرد پیش‌نویسی که هرگز براش ارسال نشده رو نمی‌بینه (visibleToStudent).
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const sp = req.nextUrl.searchParams;
  const role = sp.get("role") === "mentor" ? "mentor" : "student";

  const statusRaw = sp.get("status");
  if (statusRaw && !STATUSES.includes(statusRaw as MentorProgramStatus)) return badRequest(tr("وضعیت نامعتبره", "Invalid status"));
  const status = statusRaw as MentorProgramStatus | null;
  const mentorshipId = sp.get("mentorshipId");
  if (mentorshipId && mentorshipId.length > 64) return badRequest(tr("رابطه نامعتبره", "Invalid relationship"));

  const where: Prisma.MentorProgramWhereInput = {
    ...(role === "mentor" ? { mentorId: me } : { studentId: me, NOT: { status: "DRAFT", sentAt: null } }),
    ...(status ? { status } : {}),
    ...(mentorshipId ? { mentorshipId } : {}),
  };
  const load = () => prisma.mentorProgram.findMany({ where, include: PROGRAM_WITH_USERS_INCLUDE, orderBy: { updatedAt: "desc" }, take: 200 });

  // برنامه‌های پذیرفته‌شده‌ای که روز شروعشون رسیده همین‌جا فعال می‌شن (+ اعلان به هر دو طرف)
  await activateDueForUser(me);
  const programs = await load();

  return NextResponse.json({ programs: await buildProgramRows(programs, me) });
}

// POST /api/mentor-programs → ساخت پیش‌نویس (DRAFT) برای یک شاگرد فعال.
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const mp = await getActiveMentorProfile(me);
  if (!mp.ok) return mp.response;

  const parsed = await readJsonBody(req, 128 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  if (typeof b.mentorshipId !== "string" || !b.mentorshipId || b.mentorshipId.length > 64) return badRequest(tr("رابطه نامعتبره", "Invalid relationship"));
  const v = validateProgramInput(b);
  if (!v.ok) return badRequest(v.error);

  const m = await prisma.mentorship.findFirst({ where: { id: b.mentorshipId, mentorId: me }, select: { id: true, studentId: true, status: true, categories: true } });
  if (!m) return notFound();
  if (m.status !== "ACTIVE") return conflict(tr("رابطه با این شاگرد فعال نیست", "The relationship with this student is not active"));
  if (!programTypeAllowed(v.data.type, m.categories, mp.profile.categories)) return badRequest(programTypeBlockedMsg());

  const drafts = await prisma.mentorProgram.count({ where: { mentorId: me, status: "DRAFT" } });
  if (drafts >= MAX_DRAFTS_PER_MENTOR) return conflict(tr("تعداد پیش‌نویس‌ها به سقف رسیده؛ چندتا رو ارسال یا حذف کن", "You've reached the draft limit; send or delete some"));

  const { items, ...fields } = v.data;
  const created = await prisma.mentorProgram.create({
    data: {
      mentorshipId: m.id,
      mentorId: me,
      studentId: m.studentId,
      ...fields,
      items: { create: items },
    },
    select: { id: true },
  });
  touchMentorActivity(me);
  // پیش‌نویس فقط مال منتوره — بقیه‌ی دستگاه‌های خودش
  void publishToUsers([me], { type: "mentor.program", data: { id: created.id } });

  // ساخته‌شده از قالب؟ فقط آمار استفاده‌ی قالب *خود* همین منتور بالا می‌رود
  if (typeof b.templateId === "string" && b.templateId.length > 0 && b.templateId.length <= 64) {
    await prisma.mentorProgramTemplate
      .updateMany({ where: { id: b.templateId, profileId: mp.profile.id }, data: { usedCount: { increment: 1 }, lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  const program = await loadProgramWithUsers(created.id);
  return NextResponse.json({ program: await serializeProgram(program!, me) });
}
