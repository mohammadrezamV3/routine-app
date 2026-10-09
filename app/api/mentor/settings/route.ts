import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, forbidden, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import {
  AWAY_MESSAGE_MAX,
  WELCOME_MAX,
  dayIso,
  validateAwayUntil,
  validateCapacity,
  validateIntakeQuestions,
  validateOptionalText,
  validateResponseTime,
} from "@/lib/mentorAvailability";
import { AVAILABILITY_SELECT, availabilityOf, availabilityToday, countActiveStudents } from "@/lib/mentorManageServer";
import { advanceWaitlist, countReservedSeats } from "@/lib/mentorWaitlistServer";
import { tr } from "@/lib/i18n";

const SETTINGS_SELECT = { ...AVAILABILITY_SELECT, welcomeMessage: true, intakeQuestions: true } as const;

async function respond(userId: string) {
  const [p, active, reserved] = await Promise.all([
    prisma.mentorProfile.findUnique({ where: { userId }, select: SETTINGS_SELECT }),
    countActiveStudents(userId),
    countReservedSeats(userId),
  ]);
  if (!p) return forbidden(tr(tr("اول پروفایل مربی‌گری بساز", "Create your mentor profile first"), "Create your mentor profile first"));
  // صندلی‌های رزرو صف انتظار هم «پر» حساب می‌شوند (lib/mentorWaitlistServer.ts)
  const availability = availabilityOf(p, active + reserved);
  return NextResponse.json({
    settings: {
      acceptingStudents: p.acceptingStudents,
      maxActiveStudents: p.maxActiveStudents,
      // تاریخ گذشته یعنی حالت عدم حضور تمام شده — به کلاینت «خاموش» نشان داده می‌شود
      awayUntil: availability.away ? dayIso(p.awayUntil) : null,
      awayMessage: availability.away ? p.awayMessage : null,
      awayPausesRequests: p.awayPausesRequests,
      responseTimeHours: p.responseTimeHours,
      welcomeMessage: p.welcomeMessage,
      intakeQuestions: p.intakeQuestions,
    },
    activeStudents: active,
    availability,
  });
}

// GET /api/mentor/settings → تنظیمات دسترس‌پذیری و پذیرش شاگرد + وضعیت محاسبه‌شده
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  return respond(g.userId);
}

// PUT /api/mentor/settings → به‌روزرسانی جزئی؛ فقط فیلدهای فرستاده‌شده عوض می‌شوند.
//   acceptingStudents: boolean
//   maxActiveStudents: number | null            (۱ تا ۵۰۰؛ null = بدون سقف)
//   awayUntil: "YYYY-MM-DD" | null              (null = پایان عدم حضور؛ پیامش هم پاک می‌شود)
//   awayMessage: string | null · awayPausesRequests: boolean
//   responseTimeHours: 12 | 24 | 48 | 72 | null · welcomeMessage: string | null
//   intakeQuestions: string[]                   (حداکثر ۵)
// تعلیق این‌جا را نمی‌بندد: بستن پذیرش یا اعلام عدم حضور در حال تعلیق هم معنا دارد.
export async function PUT(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const userId = g.userId;

  const exists = await prisma.mentorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!exists) return forbidden(tr(tr("اول پروفایل مربی‌گری بساز", "Create your mentor profile first"), "Create your mentor profile first"));

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (typeof b !== "object" || Array.isArray(b)) return badRequest(tr(tr("بدنه‌ی درخواست معتبر نیست", "Invalid request body"), "Invalid request body"));

  const data: {
    acceptingStudents?: boolean;
    maxActiveStudents?: number | null;
    awayUntil?: Date | null;
    awayMessage?: string | null;
    awayPausesRequests?: boolean;
    responseTimeHours?: number | null;
    welcomeMessage?: string | null;
    intakeQuestions?: string[];
  } = {};

  if (b.acceptingStudents !== undefined) {
    if (typeof b.acceptingStudents !== "boolean") return badRequest(tr(tr("وضعیت پذیرش معتبر نیست", "Acceptance status is not valid"), "Acceptance status is not valid"));
    data.acceptingStudents = b.acceptingStudents;
  }
  if (b.maxActiveStudents !== undefined) {
    const r = validateCapacity(b.maxActiveStudents);
    if (!r.ok) return badRequest(r.error);
    data.maxActiveStudents = r.data;
  }
  if (b.awayUntil !== undefined) {
    if (b.awayUntil === null) {
      data.awayUntil = null;
      data.awayMessage = null;
    } else {
      const r = validateAwayUntil(b.awayUntil, availabilityToday());
      if (!r.ok) return badRequest(r.error);
      data.awayUntil = new Date(r.data + "T00:00:00.000Z");
    }
  }
  if (b.awayMessage !== undefined && data.awayUntil !== null) {
    const r = validateOptionalText(b.awayMessage, AWAY_MESSAGE_MAX, tr(tr("پیام عدم حضور", "Away message"), "Away message"));
    if (!r.ok) return badRequest(r.error);
    data.awayMessage = r.data;
  }
  if (b.awayPausesRequests !== undefined) {
    if (typeof b.awayPausesRequests !== "boolean") return badRequest(tr(tr("تنظیم توقف درخواست‌ها معتبر نیست", "The request pause setting is not valid"), "The request pause setting is not valid"));
    data.awayPausesRequests = b.awayPausesRequests;
  }
  if (b.responseTimeHours !== undefined) {
    const r = validateResponseTime(b.responseTimeHours);
    if (!r.ok) return badRequest(r.error);
    data.responseTimeHours = r.data;
  }
  if (b.welcomeMessage !== undefined) {
    const r = validateOptionalText(b.welcomeMessage, WELCOME_MAX, tr(tr("پیام خوش‌آمد", "Welcome message"), "Welcome message"));
    if (!r.ok) return badRequest(r.error);
    data.welcomeMessage = r.data;
  }
  if (b.intakeQuestions !== undefined) {
    const r = validateIntakeQuestions(b.intakeQuestions);
    if (!r.ok) return badRequest(r.error);
    data.intakeQuestions = r.data;
  }

  if (Object.keys(data).length > 0) {
    await prisma.mentorProfile.update({ where: { userId }, data });
    touchMentorActivity(userId);
    // ظرفیت بیشتر / پذیرش دوباره / پایان عدم حضور → نوبت به نفرهای صف می‌رسد
    await advanceWaitlist(userId);
  }
  return respond(userId);
}
