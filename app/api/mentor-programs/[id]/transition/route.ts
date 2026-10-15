import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, isMentorSuspended, notFound, forbidden, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { canTransition, isProgramAction, visibleToStudent, PROGRAM_TRANSITIONS, type ProgramActor } from "@/lib/mentorProgramState";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { isoDate, loadProgramWithUsers, serializeProgram, todayIsoForUser } from "@/lib/mentorServer";
import { activateWithMirror, removeProgramMirrors } from "@/lib/mentorProgramMirror";
import { fmtDate } from "@/lib/mentorFormat";
import { publishToUsers } from "@/lib/realtime";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };
const NOTE_MAX = 1000;
const tooLargeMsg = () => tr("روتین شاگرد جای این همه آیتم رو نداره؛ آیتم‌ها یا روزهای برنامه رو کمتر کن", "The student's routine doesn't have room for this many items; reduce the items or the program days");

// POST /api/mentor-programs/:id/transition { action, note? }
// تنها راه تغییر وضعیت برنامه. تصمیم «مجازه یا نه» فقط با canTransition و
// نوشتن با updateMany({ id, status: from }) — دو کلیک هم‌زمان نمی‌تونن از یک
// حالت دو انتقال متفاوت بسازن (دومی ۴۰۹ می‌گیره).
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (typeof params.id !== "string" || !params.id || params.id.length > 64) return notFound();

  const p = await prisma.mentorProgram.findFirst({
    where: { id: params.id, OR: [{ mentorId: me }, { studentId: me }] },
    include: { mentorship: { select: { status: true, pausedAt: true } }, mentor: { select: { name: true, lastName: true, username: true } }, student: { select: { name: true, lastName: true, username: true } } },
  });
  if (!p) return notFound();
  const actor: ProgramActor = p.mentorId === me ? "MENTOR" : "STUDENT";
  if (actor === "STUDENT" && !visibleToStudent(p)) return notFound();

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const action = parsed.body?.action;
  if (!isProgramAction(action)) return badRequest(tr("اقدام نامعتبره", "Invalid action"));
  const noteRaw = parsed.body?.note;
  if (noteRaw !== undefined && noteRaw !== null && typeof noteRaw !== "string") return badRequest(tr("یادداشت نامعتبره", "Invalid note"));
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, NOTE_MAX) || null : null;

  if (!PROGRAM_TRANSITIONS[action].actor.includes(actor)) return forbidden();
  const to = canTransition(action, p.status, actor);
  if (!to) return conflict(tr("این تغییر وضعیت از وضعیت فعلی برنامه ممکن نیست", "This status change is not possible from the program's current status"));

  // ارسال/پذیرش/فعال‌سازی فقط روی رابطه‌ی هنوز فعال
  if ((action === "send" || action === "accept" || action === "activate") && p.mentorship.status !== "ACTIVE") {
    return conflict(tr("رابطه با این مربی/شاگرد دیگه فعال نیست", "The relationship with this mentor/student is no longer active"));
  }
  // همکاری متوقف‌شده: برنامه‌ی تازه نه ارسال می‌شود نه فعال
  if ((action === "send" || action === "activate") && p.mentorship.pausedAt) {
    return conflict(tr("همکاری با این شاگرد متوقف است؛ اول آن را ادامه بده", "Work with this student is paused; resume it first"));
  }
  if ((action === "accept" || action === "activate") && (await isMentorSuspended(p.mentorId))) {
    return forbidden(tr("فعالیت این مربی موقتا متوقف شده", "This mentor's activity is temporarily paused"));
  }
  if (action === "send") {
    const mp = await getActiveMentorProfile(me);
    if (!mp.ok) return mp.response;
    // هر ارسال یک اعلان/پوش برای شاگرد می‌سازه — سقف تا نشه با ساخت‌وارسال پشت‌سرهم اسپم کرد
    if (!(await checkRateLimit(`mentor-program-send:${me}`, 20, 60 * 60 * 1000))) {
      return NextResponse.json({ error: tr("تعداد ارسال برنامه زیاد بوده؛ کمی بعد دوباره تلاش کن", "Too many program submissions; try again shortly") }, { status: 429 });
    }
    const items = await prisma.mentorProgramItem.count({ where: { programId: p.id } });
    if (items === 0) return badRequest(tr("برنامه حداقل یک آیتم لازم داره", "A program needs at least one item"));
  }
  if (action === "request_changes" && !note) return badRequest(tr("توضیح تغییرات لازمه", "A description of the changes is required"));

  const now = new Date();
  const from = p.status;

  if (action === "accept" || action === "activate") {
    const today = await todayIsoForUser(p.studentId);
    const startsNow = action === "activate" || !p.startDate || isoDate(p.startDate) <= today;
    if (startsNow) {
      const r = await activateWithMirror({
        programId: p.id,
        studentId: p.studentId,
        from: from as "PENDING" | "ACCEPTED",
        activationIso: today,
        extra: action === "accept" ? { respondedAt: now } : undefined,
      });
      if (r === "conflict") return conflict(tr("وضعیت برنامه هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The program status changed at the same time; try again"));
      if (r === "too_large") return NextResponse.json({ error: tooLargeMsg() }, { status: 413 });
    } else {
      const res = await prisma.mentorProgram.updateMany({ where: { id: p.id, status: from }, data: { status: "ACCEPTED", respondedAt: now } });
      if (res.count === 0) return conflict(tr("وضعیت برنامه هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The program status changed at the same time; try again"));
    }
  } else {
    let data: Prisma.MentorProgramUpdateManyMutationInput;
    switch (action) {
      case "send":
        // ارسال دوباره بعد از «درخواست تغییر» نسخه رو بالا می‌بره تا شاگرد بدونه این نسخه‌ی تازه‌ست
        data = { status: to, sentAt: now, changeRequestNote: null, rejectReason: null, respondedAt: null, ...(p.sentAt ? { version: { increment: 1 } } : {}) };
        break;
      case "reject":
        data = { status: to, rejectReason: note, respondedAt: now };
        break;
      case "request_changes":
        data = { status: to, changeRequestNote: note, respondedAt: now };
        break;
      case "complete":
        data = { status: to, completedAt: now };
        break;
      default:
        data = { status: to, cancelledAt: now };
    }
    const res = await prisma.mentorProgram.updateMany({ where: { id: p.id, status: from }, data });
    if (res.count === 0) return conflict(tr("وضعیت برنامه هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The program status changed at the same time; try again"));
    if ((action === "complete" || action === "cancel") && from === "ACTIVE") {
      await removeProgramMirrors(p.studentId, [p.id]);
    }
  }

  if (actor === "MENTOR") touchMentorActivity(me);
  // هر دو طرف؛ فعال/تموم‌شدن آینه‌ی روتین شاگرد رو هم عوض می‌کنه (liveSync
  // رویداد mentor.program رو به customOccurrences هم ترجمه می‌کنه)
  void publishToUsers([p.mentorId, p.studentId], { type: "mentor.program", data: { id: p.id } });

  // اعلان به طرف مقابل
  const url = `/mentor-programs/${p.id}`;
  const mentorName = displayName(p.mentor);
  const studentName = displayName(p.student);
  if (action === "send") {
    const resent = !!p.sentAt;
    await notifyUser(p.studentId, {
      type: resent ? "program.resent" : "program.new",
      title: resent ? "نسخه‌ی جدید برنامه" : "برنامه‌ی جدید",
      body: resent ? `${mentorName} برنامه‌ی «${p.title}» رو ویرایش و دوباره ارسال کرد.` : `${mentorName} برنامه‌ی «${p.title}» رو برات فرستاد.`,
      url,
    });
  } else if (action === "accept") {
    // شروع آینده = زمان‌بندی‌شده؛ در همان روز خودکار فعال می‌شود (lib/mentorSchedule.ts)
    const scheduledFor = p.startDate && isoDate(p.startDate) > (await todayIsoForUser(p.studentId)) ? fmtDate(isoDate(p.startDate)) : null;
    await notifyUser(p.mentorId, {
      type: "program.accepted",
      title: "برنامه پذیرفته شد",
      body: scheduledFor
        ? `${studentName} برنامه‌ی «${p.title}» را پذیرفت؛ ${scheduledFor} خودکار شروع می‌شود.`
        : `${studentName} برنامه‌ی «${p.title}» رو قبول کرد.`,
      url,
    });
  } else if (action === "reject") {
    await notifyUser(p.mentorId, {
      type: "program.rejected",
      title: "برنامه رد شد",
      body: `${studentName} برنامه‌ی «${p.title}» رو نپذیرفت.${note ? ` دلیل: ${note}` : ""}`,
      url,
    });
  } else if (action === "request_changes") {
    await notifyUser(p.mentorId, {
      type: "program.changes_requested",
      title: "درخواست تغییر برنامه",
      body: `${studentName} برای «${p.title}» تغییر خواسته: ${note}`,
      url,
    });
  }

  const program = await loadProgramWithUsers(p.id);
  return NextResponse.json({ program: await serializeProgram(program!, me) });
}
