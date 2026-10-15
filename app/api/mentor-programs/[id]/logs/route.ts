import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody, parseIsoDate } from "@/lib/validate";
import { visibleToStudent } from "@/lib/mentorProgramState";
import { isoDate, dateIsoInTz, userTimezone } from "@/lib/mentorServer";
import { windowFor } from "@/lib/mentorProgress";
import { publishToUsers } from "@/lib/realtime";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };
const NOTE_MAX = 500;
const manualStatusGone = () => tr("وضعیت اجرا خودکار از تیک‌های روتین خوانده می‌شود و دستی ثبت نمی‌شود", "Status is read automatically from routine checkmarks and can't be logged manually");

// وضعیت اجرا دیگر دستی ثبت نمی‌شود: از تیک‌های روتین شاگرد خوانده می‌شود
// (lib/mentorProgress.ts). ردیف‌های دستی قدیمی (source = MANUAL) سر جایشان
// می‌مانند و در آمار و نمایش حساب می‌شوند.

// POST /api/mentor-programs/:id/logs { date, note }
// یادداشت اختیاری شاگرد برای منتور روی یک روز برنامه (upsert روی programId+date؛
// note خالی = حذف). فقط شاگرد، فقط برنامه‌ی ACTIVE، فقط روزهای تا امروز در بازه‌ی برنامه.
// هر بدنه‌ای که status/setsDone داشته باشد با ۴۱۰ رد می‌شود.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (typeof params.id !== "string" || !params.id || params.id.length > 64) return notFound();

  const p = await prisma.mentorProgram.findFirst({
    where: { id: params.id, studentId: me },
    select: {
      id: true, mentorId: true, status: true, sentAt: true, startDate: true, endDate: true, activatedAt: true, completedAt: true, cancelledAt: true,
      mentorship: { select: { status: true } },
    },
  });
  if (!p || !visibleToStudent(p)) return notFound();

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if ((b.status !== undefined && b.status !== null) || (b.setsDone !== undefined && b.setsDone !== null)) {
    return NextResponse.json({ error: manualStatusGone() }, { status: 410 });
  }

  if (p.status !== "ACTIVE") return conflict(tr("یادداشت فقط برای برنامه‌ی در حال اجرا ثبت می‌شود", "Notes can only be saved for a running program"));
  if (p.mentorship.status !== "ACTIVE") return conflict(tr("رابطه با این مربی دیگر فعال نیست", "The relationship with this mentor is no longer active"));

  const date = parseIsoDate(b.date);
  if (!date) return badRequest(tr("تاریخ معتبر نیست (YYYY-MM-DD)", "Invalid date (YYYY-MM-DD)"));
  if (b.note !== undefined && b.note !== null && typeof b.note !== "string") return badRequest(tr("یادداشت معتبر نیست", "Invalid note"));
  const raw = typeof b.note === "string" ? b.note.trim() : "";
  if (raw.length > NOTE_MAX) return badRequest(tr(`یادداشت حداکثر ${NOTE_MAX} نویسه است`, `Note can be at most ${NOTE_MAX} characters`));

  const iso = isoDate(date);
  const tz = await userTimezone(me);
  if (iso > dateIsoInTz(new Date(), tz)) return badRequest(tr("برای روزهای آینده یادداشت ثبت نمی‌شود", "Notes cannot be saved for future days"));
  const w = windowFor(p, tz);
  if (!w || iso < w.from || (w.to && iso > w.to)) return badRequest(tr("این روز خارج از بازه‌ی برنامه است", "This day is outside the program's range"));

  if (!raw) {
    await prisma.mentorProgramDayNote.deleteMany({ where: { programId: p.id, date } });
    void publishToUsers([p.mentorId, me], { type: "mentor.program", data: { id: p.id } });
    return NextResponse.json({ note: null });
  }
  const note = await prisma.mentorProgramDayNote.upsert({
    where: { programId_date: { programId: p.id, date } },
    create: { programId: p.id, studentId: me, date, body: raw },
    update: { body: raw },
    select: { date: true, body: true },
  });
  // منتور و دستگاه‌های دیگه‌ی شاگرد همون لحظه یادداشت رو می‌بینن
  void publishToUsers([p.mentorId, me], { type: "mentor.program", data: { id: p.id } });
  return NextResponse.json({ note: { date: isoDate(note.date), body: note.body } });
}
