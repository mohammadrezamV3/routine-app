import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, notFound, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { programTypeAllowed, programTypeBlockedMsg } from "@/lib/mentorCategories";
import { validateProgramInput } from "@/lib/mentorValidate";
import { isoDate, loadProgramWithUsers, serializeProgram, todayIsoForUser } from "@/lib/mentorServer";
import { rangeDuration, shiftedRange, isoDay } from "@/lib/mentorProgramCopy";
import { validId } from "@/lib/mentorToolsGuard";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };
const MAX_DRAFTS_PER_MENTOR = 200; // همان سقف POST /api/mentor-programs

// POST /api/mentor-programs/:id/duplicate { mentorshipId, startDate?: "YYYY-MM-DD" | null, title? }
// کپی یکی از برنامه‌های خود منتور (هر وضعیتی) به‌صورت پیش‌نویس تازه برای
// یک شاگرد فعال — همان شاگرد برای دوره‌ی بعد، یا شاگرد دیگر. آیتم‌ها،
// توضیح و یادداشت کپی می‌شوند؛ لاگ، بازخورد و وضعیت نه. با startDate، پایان
// با همان طول بازه‌ی مبدا جابه‌جا می‌شود؛ بدون آن برنامه بی‌تاریخ است.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validId(params.id)) return notFound();

  const mp = await getActiveMentorProfile(me);
  if (!mp.ok) return mp.response;

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (!validId(b.mentorshipId)) return badRequest(tr("شاگرد مقصد معتبر نیست", "The target student is not valid"));

  const src = await prisma.mentorProgram.findFirst({ where: { id: params.id, mentorId: me }, include: { items: { orderBy: { order: "asc" } } } });
  if (!src) return notFound();

  const m = await prisma.mentorship.findFirst({ where: { id: b.mentorshipId, mentorId: me }, select: { id: true, studentId: true, status: true, categories: true } });
  if (!m) return notFound();
  if (m.status !== "ACTIVE") return conflict(tr("رابطه با این شاگرد فعال نیست", "The relationship with this student is not active"));
  if (!programTypeAllowed(src.type, m.categories, mp.profile.categories)) return badRequest(programTypeBlockedMsg());

  let newStart: string | null = null;
  if (b.startDate !== undefined && b.startDate !== null && b.startDate !== "") {
    newStart = typeof b.startDate === "string" ? isoDay(b.startDate) : null;
    if (!newStart || b.startDate.length !== 10) return badRequest(tr("تاریخ شروع معتبر نیست", "Start date is not valid"));
    if (newStart < (await todayIsoForUser(m.studentId))) return badRequest(tr("تاریخ شروع نمی‌تواند در گذشته باشد", "Start date can't be in the past"));
  }
  const duration = rangeDuration(src.startDate ? isoDate(src.startDate) : null, src.endDate ? isoDate(src.endDate) : null);
  const range = shiftedRange(duration, newStart);

  // از همان اعتبارسنج ساخت برنامه رد می‌شود تا کپی هیچ‌وقت چیزی نامعتبر نسازد
  const v = validateProgramInput({
    type: src.type,
    title: typeof b.title === "string" && b.title.trim() ? b.title : src.title,
    description: src.description,
    note: src.note,
    startDate: range.startDate ?? undefined,
    endDate: range.endDate ?? undefined,
    items: src.items,
  });
  if (!v.ok) return badRequest(v.error);

  const drafts = await prisma.mentorProgram.count({ where: { mentorId: me, status: "DRAFT" } });
  if (drafts >= MAX_DRAFTS_PER_MENTOR) return conflict(tr("تعداد پیش‌نویس‌ها به سقف رسیده؛ چندتا را ارسال یا حذف کن", "You've reached the draft limit; send or delete some"));

  const { items, ...fields } = v.data;
  const created = await prisma.mentorProgram.create({
    data: { mentorshipId: m.id, mentorId: me, studentId: m.studentId, ...fields, items: { create: items } },
    select: { id: true },
  });
  touchMentorActivity(me);

  const program = await loadProgramWithUsers(created.id);
  return NextResponse.json({ program: await serializeProgram(program!, me) });
}
