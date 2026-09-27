import { NextResponse } from "next/server";
import type { MentorshipStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, roleIn, notFound, forbidden, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { MENTORSHIP_WITH_USERS_INCLUDE, PUBLIC_USER_SELECT, buildMentorshipRows } from "@/lib/mentorServer";
import { removeProgramMirrors } from "@/lib/mentorProgramMirror";
import { END_REASON_MAX, validateOptionalText } from "@/lib/mentorAvailability";
import { countActiveStudents, readWelcomeMessage } from "@/lib/mentorManageServer";

type Ctx = { params: { id: string } };
const ACTIONS = ["accept", "reject", "cancel", "end", "block", "unblock"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * با پایان/بلاکِ رابطه، برنامه‌های باز (PENDING/ACCEPTED/ACTIVE) لغو و آینه‌ی
 * روتینشون از «روتین من»ِ شاگرد حذف می‌شه — وگرنه تسک‌های منتوری که دیگه
 * رابطه‌ای باهاش نیست تا ابد توی برنامه‌ی شاگرد می‌موند.
 */
async function closeOpenPrograms(mentorshipId: string, studentId: string): Promise<void> {
  const open = await prisma.mentorProgram.findMany({
    where: { mentorshipId, status: { in: ["PENDING", "ACCEPTED", "ACTIVE"] } },
    select: { id: true, status: true },
  });
  if (open.length === 0) return;
  // هر برنامه با قفلِ وضعیتِ خودش — اگه هم‌زمان عوض شده باشه، همون یکی رد می‌شه
  for (const p of open) {
    await prisma.mentorProgram.updateMany({ where: { id: p.id, status: p.status }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  }
  await removeProgramMirrors(studentId, open.map((p) => p.id));
}

// PATCH /api/mentorships/:id { action, reason? } → accept | reject | cancel | end | block | unblock
// reason فقط برای end (دلیلِ پایان، اختیاری) — به طرفِ مقابل نشون داده می‌شه.
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();
  const role = roleIn(m, me)!;

  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const action = parsed.body?.action as Action;
  if (!ACTIONS.includes(action)) return badRequest("اقدام نامعتبره");

  const isInitiator = m.initiatedBy === role;
  const counterpartId = role === "MENTOR" ? m.studentId : m.mentorId;
  const now = new Date();

  let from: MentorshipStatus[];
  let data: Prisma.MentorshipUpdateManyMutationInput;
  let endReason: string | null = null;

  switch (action) {
    case "accept":
    case "reject":
      if (m.status !== "PENDING") return conflict("این درخواست دیگه در انتظار پاسخ نیست");
      if (isInitiator) return forbidden("فقط طرف مقابل می‌تونه به درخواست پاسخ بده");
      if (action === "accept") {
        // منتورِ معلق شاگردِ جدید نمی‌پذیره — چه خودش قبول کنه، چه شاگرد دعوتش رو
        const mp = await prisma.mentorProfile.findUnique({ where: { userId: m.mentorId }, select: { suspendedAt: true, maxActiveStudents: true } });
        if (!mp) return conflict("این کاربر دیگه پروفایل منتوری نداره");
        if (mp.suspendedAt) return forbidden(role === "MENTOR" ? "حساب منتوری تو تعلیق شده" : "این منتور فعلا امکان پذیرش شاگرد نداره");
        // سقفِ ظرفیت فقط جلوی پذیرشِ *درخواستِ شاگرد* رو می‌گیره؛ دعوتِ خودِ منتور انتخابِ خودشه
        if (role === "MENTOR" && mp.maxActiveStudents != null && (await countActiveStudents(m.mentorId)) >= mp.maxActiveStudents) {
          return conflict("ظرفیت شاگردهایت تکمیل است؛ برای پذیرش، سقف ظرفیت را در تنظیمات بالا ببر");
        }
        data = { status: "ACTIVE", startedAt: now, endedAt: null, pausedAt: null, pauseReason: null, endReason: null, endedBy: null };
      } else {
        data = { status: "REJECTED", endedAt: now };
      }
      from = ["PENDING"];
      break;
    case "cancel":
      if (m.status !== "PENDING") return conflict("این درخواست دیگه در انتظار پاسخ نیست");
      if (!isInitiator) return forbidden("فقط فرستنده‌ی درخواست می‌تونه لغوش کنه");
      from = ["PENDING"];
      data = { status: "ENDED", endedAt: now };
      break;
    case "end": {
      if (m.status !== "ACTIVE") return conflict("این رابطه فعال نیست");
      const r = validateOptionalText(parsed.body?.reason, END_REASON_MAX, "دلیل پایان");
      if (!r.ok) return badRequest(r.error);
      endReason = r.data;
      from = ["ACTIVE"];
      data = { status: "ENDED", endedAt: now, endReason, endedBy: role, pausedAt: null, pauseReason: null };
      break;
    }
    case "block":
      if (m.status === "BLOCKED") return conflict("این رابطه از قبل مسدوده");
      from = [m.status];
      data = { status: "BLOCKED", blockedById: me, endedAt: now, pausedAt: null, pauseReason: null };
      break;
    case "unblock":
      if (m.status !== "BLOCKED") return conflict("این رابطه مسدود نیست");
      // فقط کسی که بلاک کرده؛ برای طرفِ دیگه همون ۴۰۴ تا جزئیات لو نره
      if (m.blockedById !== me) return notFound();
      from = ["BLOCKED"];
      data = { status: "ENDED", blockedById: null };
      break;
  }

  const res = await prisma.mentorship.updateMany({ where: { id: m.id, status: { in: from } }, data });
  if (res.count === 0) return conflict("وضعیت رابطه هم‌زمان تغییر کرد؛ دوباره تلاش کن");

  if ((action === "end" || action === "block") && (m.status === "ACTIVE" || m.status === "PENDING")) {
    await closeOpenPrograms(m.id, m.studentId);
  }

  // پیامِ خوش‌آمدِ منتور (اگه تعریف شده) با اعلانِ شروعِ رابطه به شاگرد می‌رسه
  const welcome = action === "accept" && counterpartId === m.studentId ? await readWelcomeMessage(m.mentorId) : null;

  if (action === "accept" || action === "reject" || action === "end") {
    const actor = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
    const name = displayName(actor);
    const url = counterpartId === m.mentorId ? "/mentor" : `/mentorship/${m.id}`;
    const note =
      action === "accept"
        ? {
            type: "mentor.accepted",
            title: "درخواست پذیرفته شد",
            body: welcome ? `${name} درخواستت رو قبول کرد: ${welcome}` : `${name} درخواستت رو قبول کرد.`,
            url: `/mentorship/${m.id}`,
          }
        : action === "reject"
          ? { type: "mentor.rejected", title: "درخواست رد شد", body: `${name} درخواستت رو نپذیرفت.`, url: counterpartId === m.mentorId ? "/mentor" : "/mentorship" }
          : {
              type: "mentor.ended",
              title: "پایان رابطه",
              body: endReason ? `${name} رابطه‌ی منتورشیپ رو تموم کرد؛ دلیل: ${endReason}` : `${name} رابطه‌ی منتورشیپ رو تموم کرد.`,
              url,
            };
    await notifyUser(counterpartId, note);
  }

  const row = await prisma.mentorship.findUnique({ where: { id: m.id }, include: MENTORSHIP_WITH_USERS_INCLUDE });
  const [mentorship] = await buildMentorshipRows([row!], me);
  return NextResponse.json({ mentorship });
}
