import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorshipAsMentor, notFound, badRequest, conflict } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { NOTES_MAX_PER_STUDENT } from "@/lib/mentorAvailability";
import { isSealedNote } from "@/lib/e2ee/notes";
import { createStudentNote, readStudentNotes } from "@/lib/mentorManageServer";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

type Ctx = { params: { studentId: string } };

// GET /api/mentor/students/:studentId/notes → یادداشت‌های خصوصی منتور، تازه‌ترین اول
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const m = await getActiveMentorshipAsMentor(g.userId, params.studentId);
  if (!m) return notFound();
  return NextResponse.json({ notes: await readStudentNotes(m.id, g.userId) });
}

// POST /api/mentor/students/:studentId/notes { body } → { note }
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getActiveMentorshipAsMentor(me, params.studentId);
  if (!m) return notFound();

  if (!(await checkRateLimit(`mentor-note:${me}`, 120, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr(tr(tr("تعداد یادداشت‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "There were too many notes; try again shortly"), "There were too many notes; try again shortly"), "There were too many notes; try again shortly") }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  // یادداشت رمزگذاری سرتاسری دارد (فقط برای خود منتور؛ lib/e2ee/notes.ts) — متن ساده رد می‌شود
  const body = parsed.body?.body;
  if (!isSealedNote(body)) return badRequest(tr(tr(tr("یادداشت باید روی دستگاه رمزگذاری شود", "The note must be encrypted on this device"), "The note must be encrypted on this device"), "The note must be encrypted on this device"));

  const count = await prisma.mentorStudentNote.count({ where: { mentorshipId: m.id, mentorId: me } });
  if (count >= NOTES_MAX_PER_STUDENT) return conflict(tr(`حداکثر ${faNum(NOTES_MAX_PER_STUDENT)} یادداشت برای هر شاگرد؛ چند یادداشت قدیمی را حذف کن`, `Up to ${faNum(NOTES_MAX_PER_STUDENT)} notes per student; delete some old notes`));

  return NextResponse.json({ note: await createStudentNote(m.id, me, body) });
}
