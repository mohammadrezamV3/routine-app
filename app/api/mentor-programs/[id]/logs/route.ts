import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody, parseIsoDate } from "@/lib/validate";
import { visibleToStudent } from "@/lib/mentorProgramState";
import { isoDate, dateIsoInTz, userTimezone } from "@/lib/mentorServer";
import { windowFor } from "@/lib/mentorProgress";
import { publishToUsers } from "@/lib/realtime";

type Ctx = { params: { id: string } };
const NOTE_MAX = 500;

// وضعیت اجرا دیگر دستی ثبت نمی‌شود: از تیک‌های روتین شاگرد خوانده می‌شود
// (lib/mentorProgress.ts). ردیف‌های دستی قدیمی (source = MANUAL) سر جایشان
// می‌مانند و در آمار و نمایش حساب می‌شوند.
const MANUAL_STATUS_GONE = "وضعیت اجرا خودکار از تیک‌های روتین خوانده می‌شود و دستی ثبت نمی‌شود";

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
    return NextResponse.json({ error: MANUAL_STATUS_GONE }, { status: 410 });
  }

  if (p.status !== "ACTIVE") return conflict("یادداشت فقط برای برنامه‌ی در حال اجرا ثبت می‌شود");
  if (p.mentorship.status !== "ACTIVE") return conflict("رابطه با این مربی دیگر فعال نیست");

  const date = parseIsoDate(b.date);
  if (!date) return badRequest("تاریخ معتبر نیست (YYYY-MM-DD)");
  if (b.note !== undefined && b.note !== null && typeof b.note !== "string") return badRequest("یادداشت معتبر نیست");
  const raw = typeof b.note === "string" ? b.note.trim() : "";
  if (raw.length > NOTE_MAX) return badRequest(`یادداشت حداکثر ${NOTE_MAX} نویسه است`);

  const iso = isoDate(date);
  const tz = await userTimezone(me);
  if (iso > dateIsoInTz(new Date(), tz)) return badRequest("برای روزهای آینده یادداشت ثبت نمی‌شود");
  const w = windowFor(p, tz);
  if (!w || iso < w.from || (w.to && iso > w.to)) return badRequest("این روز خارج از بازه‌ی برنامه است");

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
