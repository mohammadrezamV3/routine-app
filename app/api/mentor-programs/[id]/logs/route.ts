import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, notFound, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody, parseIsoDate } from "@/lib/validate";
import { visibleToStudent } from "@/lib/mentorProgramState";
import { isoDate, dateIsoInTz, serializeLog, userTimezone } from "@/lib/mentorServer";

type Ctx = { params: { id: string } };
const NOTE_MAX = 500;
const STATUSES = ["COMPLETED", "PARTIAL", "MISSED"] as const;

// POST /api/mentor-programs/:id/logs { itemId, date, status, setsDone?, note? }
// ثبتِ اجرای یک آیتم در یک روز (upsert روی itemId+date) — فقط شاگرد، فقط برنامه‌ی ACTIVE.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (typeof params.id !== "string" || !params.id || params.id.length > 64) return notFound();

  const p = await prisma.mentorProgram.findFirst({
    where: { id: params.id, studentId: me },
    select: { id: true, status: true, sentAt: true, startDate: true, endDate: true, activatedAt: true, mentorship: { select: { status: true } } },
  });
  if (!p || !visibleToStudent(p)) return notFound();
  if (p.status !== "ACTIVE") return conflict("فقط برای برنامه‌ی فعال می‌شه اجرا ثبت کرد");
  if (p.mentorship.status !== "ACTIVE") return conflict("رابطه با این منتور دیگه فعال نیست");

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  if (typeof b.itemId !== "string" || !b.itemId || b.itemId.length > 64) return badRequest("آیتم نامعتبره");
  const date = parseIsoDate(b.date);
  if (!date) return badRequest("تاریخ نامعتبره (YYYY-MM-DD)");
  if (!STATUSES.includes(b.status)) return badRequest("وضعیت اجرا نامعتبره");
  const status = b.status as (typeof STATUSES)[number];

  let setsDone: number | null = null;
  if (b.setsDone !== undefined && b.setsDone !== null) {
    if (typeof b.setsDone !== "number" || !Number.isInteger(b.setsDone) || b.setsDone < 0 || b.setsDone > 100) return badRequest("تعداد ست انجام‌شده نامعتبره");
    setsDone = b.setsDone;
  }
  if (b.note !== undefined && b.note !== null && typeof b.note !== "string") return badRequest("یادداشت نامعتبره");
  const note = typeof b.note === "string" ? b.note.trim().slice(0, NOTE_MAX) || null : null;

  // آیتم باید مالِ همین برنامه باشه (ضد IDOR بینِ برنامه‌ها)
  const item = await prisma.mentorProgramItem.findFirst({ where: { id: b.itemId, programId: p.id }, select: { id: true, repeat: true, days: true } });
  if (!item) return notFound();

  const iso = isoDate(date);
  const tz = await userTimezone(me);
  const today = dateIsoInTz(new Date(), tz);
  if (iso > today) return badRequest("برای روزهای آینده نمی‌شه اجرا ثبت کرد");
  // بازه‌ی برنامه: از تاریخِ شروع (یا اگه نداره، روزِ فعال‌شدن) تا تاریخِ پایان
  const lower = p.startDate ? isoDate(p.startDate) : p.activatedAt ? dateIsoInTz(p.activatedAt, tz) : null;
  if (lower && iso < lower) return badRequest("این تاریخ قبل از شروع برنامه‌ست");
  if (p.endDate && iso > isoDate(p.endDate)) return badRequest("این تاریخ بعد از پایان برنامه‌ست");
  if (item.repeat === "WEEKLY" && item.days.length > 0 && !item.days.includes(date.getUTCDay())) {
    return badRequest("این آیتم برای این روز هفته برنامه‌ریزی نشده");
  }

  const log = await prisma.mentorProgramLog.upsert({
    where: { itemId_date: { itemId: item.id, date } },
    create: { programId: p.id, itemId: item.id, studentId: me, date, status, setsDone, note },
    update: { status, setsDone, note },
  });
  return NextResponse.json({ log: serializeLog(log) });
}
