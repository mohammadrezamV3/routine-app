import { NextRequest, NextResponse } from "next/server";
import type { MentorProgramStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, notFound, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { validateProgramInput } from "@/lib/mentorValidate";
import { PROGRAM_WITH_USERS_INCLUDE, buildProgramRows, loadProgramWithUsers, serializeProgram, todayIsoForUser } from "@/lib/mentorServer";
import { activateDuePrograms } from "@/lib/mentorProgramMirror";

const STATUSES: MentorProgramStatus[] = ["DRAFT", "PENDING", "ACCEPTED", "REJECTED", "ACTIVE", "COMPLETED", "CANCELLED"];
// سقفِ پیش‌نویس‌های هم‌زمانِ یک منتور — جلوی پرکردنِ دیتابیس با برنامه‌ی خالی
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
  if (statusRaw && !STATUSES.includes(statusRaw as MentorProgramStatus)) return badRequest("وضعیت نامعتبره");
  const status = statusRaw as MentorProgramStatus | null;
  const mentorshipId = sp.get("mentorshipId");
  if (mentorshipId && mentorshipId.length > 64) return badRequest("رابطه نامعتبره");

  const where: Prisma.MentorProgramWhereInput = {
    ...(role === "mentor" ? { mentorId: me } : { studentId: me, NOT: { status: "DRAFT", sentAt: null } }),
    ...(status ? { status } : {}),
    ...(mentorshipId ? { mentorshipId } : {}),
  };
  const load = () => prisma.mentorProgram.findMany({ where, include: PROGRAM_WITH_USERS_INCLUDE, orderBy: { updatedAt: "desc" }, take: 200 });

  let programs = await load();
  // برنامه‌های پذیرفته‌شده‌ای که روزِ شروعشون رسیده همین‌جا فعال می‌شن
  const activated = await activateDuePrograms(programs, todayIsoForUser);
  if (activated.length > 0) programs = await load();

  return NextResponse.json({ programs: await buildProgramRows(programs, me) });
}

// POST /api/mentor-programs → ساختِ پیش‌نویس (DRAFT) برای یک شاگردِ فعال.
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const mp = await getActiveMentorProfile(me);
  if (!mp.ok) return mp.response;

  const parsed = await readJsonBody(req, 128 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  if (typeof b.mentorshipId !== "string" || !b.mentorshipId || b.mentorshipId.length > 64) return badRequest("رابطه نامعتبره");
  const v = validateProgramInput(b);
  if (!v.ok) return badRequest(v.error);

  const m = await prisma.mentorship.findFirst({ where: { id: b.mentorshipId, mentorId: me }, select: { id: true, studentId: true, status: true } });
  if (!m) return notFound();
  if (m.status !== "ACTIVE") return conflict("رابطه با این شاگرد فعال نیست");

  const drafts = await prisma.mentorProgram.count({ where: { mentorId: me, status: "DRAFT" } });
  if (drafts >= MAX_DRAFTS_PER_MENTOR) return conflict("تعداد پیش‌نویس‌ها به سقف رسیده؛ چندتا رو ارسال یا حذف کن");

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

  const program = await loadProgramWithUsers(created.id);
  return NextResponse.json({ program: await serializeProgram(program!, me) });
}
