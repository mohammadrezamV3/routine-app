import { NextResponse } from "next/server";
import type { MentorshipStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, roleIn, notFound, forbidden, conflict, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { MENTORSHIP_WITH_USERS_INCLUDE, PUBLIC_USER_SELECT, buildMentorshipRows, MENTOR_IDENTITY_REQUIRED_MSG } from "@/lib/mentorServer";
import { removeProgramMirrors } from "@/lib/mentorProgramMirror";
import { END_REASON_MAX, validateOptionalText } from "@/lib/mentorAvailability";
import { countActiveStudents, readWelcomeMessage } from "@/lib/mentorManageServer";
import { decideMentorTerms, MENTOR_TERMS_ERROR_CODE, MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { publishToUsers } from "@/lib/realtime";
import { advanceWaitlist, countReservedSeats } from "@/lib/mentorWaitlistServer";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };
const ACTIONS = ["accept", "reject", "cancel", "end", "block", "unblock"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * با پایان/بلاک رابطه، برنامه‌های باز (PENDING/ACCEPTED/ACTIVE) لغو و آینه‌ی
 * روتینشون از «روتین من» شاگرد حذف می‌شه — وگرنه تسک‌های منتوری که دیگه
 * رابطه‌ای باهاش نیست تا ابد توی برنامه‌ی شاگرد می‌موند.
 */
async function closeOpenPrograms(mentorshipId: string, studentId: string): Promise<void> {
  const open = await prisma.mentorProgram.findMany({
    where: { mentorshipId, status: { in: ["PENDING", "ACCEPTED", "ACTIVE"] } },
    select: { id: true, status: true },
  });
  if (open.length === 0) return;
  // هر برنامه با قفل وضعیت خودش — اگه هم‌زمان عوض شده باشه، همون یکی رد می‌شه
  for (const p of open) {
    await prisma.mentorProgram.updateMany({ where: { id: p.id, status: p.status }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  }
  await removeProgramMirrors(studentId, open.map((p) => p.id));
}

// PATCH /api/mentorships/:id { action, reason? } → accept | reject | cancel | end | block | unblock
// reason فقط برای end (دلیل پایان، اختیاری) — به طرف مقابل نشون داده می‌شه.
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
  if (!ACTIONS.includes(action)) return badRequest(tr(tr("اقدام نامعتبره", "Invalid action"), "Invalid action"));

  const isInitiator = m.initiatedBy === role;
  const counterpartId = role === "MENTOR" ? m.studentId : m.mentorId;
  const now = new Date();

  let from: MentorshipStatus[];
  let data: Prisma.MentorshipUpdateManyMutationInput;
  let endReason: string | null = null;
  // شاگردی که دعوت منتور را می‌پذیرد همان «شرایط منتورها»ی درخواست شاگرد را می‌پذیرد (lib/mentorTerms.ts)
  let recordStudentTerms = false;

  switch (action) {
    case "accept":
    case "reject":
      if (m.status !== "PENDING") return conflict(tr(tr("این درخواست دیگه در انتظار پاسخ نیست", "This request is no longer awaiting a response"), "This request is no longer awaiting a response"));
      if (isInitiator) return forbidden(tr(tr("فقط طرف مقابل می‌تونه به درخواست پاسخ بده", "Only the other party can respond to this request"), "Only the other party can respond to this request"));
      if (action === "accept") {
        // منتور معلق شاگرد جدید نمی‌پذیره — چه خودش قبول کنه، چه شاگرد دعوتش رو
        const mp = await prisma.mentorProfile.findUnique({ where: { userId: m.mentorId }, select: { suspendedAt: true, maxActiveStudents: true, identityStatus: true } });
        if (!mp) return conflict(tr(tr("این کاربر دیگه پروفایل مربی‌گری نداره", "This user no longer has a mentor profile"), "This user no longer has a mentor profile"));
        if (mp.suspendedAt) return forbidden(role === "MENTOR" ? tr(tr("حساب مربی‌گری تو تعلیق شده", "Your mentor account is suspended"), "Your mentor account is suspended") : tr(tr("این مربی فعلا امکان پذیرش شاگرد نداره", "This mentor cannot accept students right now"), "This mentor cannot accept students right now"));
        // احراز هویت منتور اجباریه (lib/mentorServer.ts → IDENTITY_VERIFIED_WHERE)
        if (mp.identityStatus !== "VERIFIED") return forbidden(role === "MENTOR" ? tr(MENTOR_IDENTITY_REQUIRED_MSG, "Until the Arion admins verify your identity, you cannot accept students") : tr(tr("این مربی فعلا امکان پذیرش شاگرد نداره", "This mentor cannot accept students right now"), "This mentor cannot accept students right now"));
        // سقف ظرفیت فقط جلوی پذیرش *درخواست شاگرد* رو می‌گیره؛ دعوت خود منتور انتخاب خودشه.
        // صندلی رزرو صف انتظار (نوبت زنده یا درخواست دیگری که از صف اومده) هم پر حساب می‌شه
        // تا درخواست مستقیم از نفر صف جلو نزنه؛ درخواست خود همین رابطه از رزروها کم می‌شه
        if (role === "MENTOR" && mp.maxActiveStudents != null) {
          await advanceWaitlist(m.mentorId, now);
          const [active, reserved] = await Promise.all([countActiveStudents(m.mentorId), countReservedSeats(m.mentorId, now, m.id)]);
          if (active >= mp.maxActiveStudents) {
            return conflict(tr(tr("ظرفیت شاگردهایت تکمیل است؛ برای پذیرش، سقف ظرفیت را در تنظیمات بالا ببر", "Your student capacity is full; to accept, raise the capacity limit in settings"), "Your student capacity is full; to accept, raise the capacity limit in settings"));
          }
          if (active + reserved >= mp.maxActiveStudents) {
            return conflict(tr(tr("جای خالی برای نفر صف انتظارت نگه داشته شده؛ برای پذیرش این درخواست، سقف ظرفیت را بالا ببر", "A seat is being held for someone on your waitlist; to accept this request, raise the capacity limit"), "A seat is being held for someone on your waitlist; to accept this request, raise the capacity limit"));
          }
        }
        data = { status: "ACTIVE", startedAt: now, endedAt: null, pausedAt: null, pauseReason: null, endReason: null, endedBy: null };
        if (role === "STUDENT") {
          const meRow = await prisma.user.findUnique({ where: { id: me }, select: { mentorStudentTermsVersion: true } });
          const terms = decideMentorTerms("student", meRow?.mentorStudentTermsVersion, parsed.body?.acceptMentorTerms);
          if (!terms.ok) {
            const error = terms.stale ? terms.message : tr(tr("برای پذیرش دعوت، شرایط استفاده از بخش مربی‌ها را بخوان و بپذیر", "To accept the invitation, read and accept the mentor terms"), "To accept the invitation, read and accept the mentor terms");
            return NextResponse.json({ error, code: MENTOR_TERMS_ERROR_CODE }, { status: 400 });
          }
          recordStudentTerms = terms.record;
          data = { ...data, studentTermsVersion: MENTOR_TERMS_VERSION };
        }
      } else {
        data = { status: "REJECTED", endedAt: now };
      }
      from = ["PENDING"];
      break;
    case "cancel":
      if (m.status !== "PENDING") return conflict(tr(tr("این درخواست دیگه در انتظار پاسخ نیست", "This request is no longer awaiting a response"), "This request is no longer awaiting a response"));
      if (!isInitiator) return forbidden(tr(tr("فقط فرستنده‌ی درخواست می‌تونه لغوش کنه", "Only the sender of the request can cancel it"), "Only the sender of the request can cancel it"));
      from = ["PENDING"];
      data = { status: "ENDED", endedAt: now };
      break;
    case "end": {
      if (m.status !== "ACTIVE") return conflict(tr(tr("این رابطه فعال نیست", "This relationship is not active"), "This relationship is not active"));
      const r = validateOptionalText(parsed.body?.reason, END_REASON_MAX, tr(tr("دلیل پایان", "End reason"), "End reason"));
      if (!r.ok) return badRequest(r.error);
      endReason = r.data;
      from = ["ACTIVE"];
      data = { status: "ENDED", endedAt: now, endReason, endedBy: role, pausedAt: null, pauseReason: null };
      break;
    }
    case "block":
      if (m.status === "BLOCKED") return conflict(tr(tr("این رابطه از قبل مسدوده", "This relationship is already blocked"), "This relationship is already blocked"));
      from = [m.status];
      data = { status: "BLOCKED", blockedById: me, endedAt: now, pausedAt: null, pauseReason: null };
      break;
    case "unblock":
      if (m.status !== "BLOCKED") return conflict(tr(tr("این رابطه مسدود نیست", "This relationship is not blocked"), "This relationship is not blocked"));
      // فقط کسی که بلاک کرده؛ برای طرف دیگه همون ۴۰۴ تا جزئیات لو نره
      if (m.blockedById !== me) return notFound();
      from = ["BLOCKED"];
      data = { status: "ENDED", blockedById: null };
      break;
  }

  const res = await prisma.$transaction(async (tx) => {
    const r = await tx.mentorship.updateMany({ where: { id: m.id, status: { in: from } }, data });
    if (r.count > 0 && recordStudentTerms) {
      await tx.user.update({ where: { id: me }, data: { mentorStudentTermsAcceptedAt: now, mentorStudentTermsVersion: MENTOR_TERMS_VERSION } });
    }
    return r;
  });
  if (res.count === 0) return conflict(tr(tr("وضعیت رابطه هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The relationship status changed at the same time; try again"), "The relationship status changed at the same time; try again"));

  if ((action === "end" || action === "block") && (m.status === "ACTIVE" || m.status === "PENDING")) {
    await closeOpenPrograms(m.id, m.studentId);
  }
  // صندلی آزادشده (یا رزرو صفی که دیگه PENDING نیست) به نفر بعدی صف انتظار می‌رسه
  if (action !== "accept" && action !== "unblock") await advanceWaitlist(m.mentorId, now);
  // هر دو طرف (و بقیه‌ی دستگاه‌های خودم) وضعیت تازه رو همون لحظه می‌بینن
  void publishToUsers([m.mentorId, m.studentId], { type: "mentor.mentorship", data: { id: m.id } });

  // پیام خوش‌آمد منتور (اگه تعریف شده) با اعلان شروع رابطه به شاگرد می‌رسه
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
              body: endReason ? `${name} رابطه‌ی مربی‌گری رو تموم کرد؛ دلیل: ${endReason}` : `${name} رابطه‌ی مربی‌گری رو تموم کرد.`,
              url,
            };
    await notifyUser(counterpartId, note);
  }

  const row = await prisma.mentorship.findUnique({ where: { id: m.id }, include: MENTORSHIP_WITH_USERS_INCLUDE });
  const [mentorship] = await buildMentorshipRows([row!], me);
  return NextResponse.json({ mentorship });
}
