import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, notFound, forbidden, conflict } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { publishToUsers } from "@/lib/realtime";
import { requestBlockedMessage } from "@/lib/mentorAvailability";
import { AVAILABILITY_SELECT, availabilityOf } from "@/lib/mentorManageServer";
import { DISCOVERABLE_PROFILE_WHERE, isUniqueViolation, usersBlockEachOther } from "@/lib/mentorServer";
import { decideMentorTerms, MENTOR_TERMS_ERROR_CODE, MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { WAITLIST_MAX, canJoinWaitlist } from "@/lib/mentorWaitlist";
import { advanceWaitlist, countOccupiedSeats, countWaiting, loadMyWaitlist } from "@/lib/mentorWaitlistServer";
import { tr } from "@/lib/i18n";

// صف انتظار منتور پر — سمت کاربر (lib/mentorWaitlistServer.ts).
//   GET    → { waitlist: MyWaitlist | null }
//   POST   { acceptMentorTerms? } → ورود به صف (فقط وقتی ظرفیت پر است)
//   DELETE → خروج از صف / رد نوبت
// پذیرش نوبت = همان POST /api/mentorships (درخواست عادی با سؤال‌های پذیرش)؛
// نوبت زنده سقف ظرفیت را برای همان کاربر باز می‌کند.

type Ctx = { params: { mentorId: string } };
const blockedMsg = () => tr("امکان ارسال درخواست به این کاربر وجود ندارد", "A request to this user is not possible");
const REREQUEST_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function validMentorId(v: unknown): v is string {
  return typeof v === "string" && !!v && v.length <= 64;
}

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  if (!validMentorId(params.mentorId)) return notFound();
  if (params.mentorId === g.userId) return NextResponse.json({ waitlist: null });
  await advanceWaitlist(params.mentorId);
  return NextResponse.json({ waitlist: await loadMyWaitlist(params.mentorId, g.userId) });
}

export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const mentorId = params.mentorId;
  if (!validMentorId(mentorId)) return notFound();
  if (mentorId === me) return badRequest(tr("نمی‌تونی توی صف خودت بری", "You can't join your own waitlist"));

  if (!(await checkRateLimit(`mentor-waitlist:${me}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("تعداد درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "There were too many requests; try again shortly") }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};

  // همان گیت‌های درخواست عادی (app/api/mentorships/route.ts)
  const profile = await prisma.mentorProfile.findFirst({
    where: { userId: mentorId, ...DISCOVERABLE_PROFILE_WHERE },
    select: AVAILABILITY_SELECT,
  });
  if (!profile) return notFound();
  if (await usersBlockEachOther(me, mentorId)) return forbidden(blockedMsg());

  const rel = await prisma.mentorship.findUnique({
    where: { mentorId_studentId: { mentorId, studentId: me } },
    select: { status: true, initiatedBy: true, updatedAt: true },
  });
  if (rel?.status === "ACTIVE") return conflict(tr("این رابطه همین الان فعاله", "This relationship is already active"));
  if (rel?.status === "PENDING") return conflict(tr("یک درخواست در انتظار پاسخ از قبل وجود داره", "A request awaiting a response already exists"));
  if (rel?.status === "BLOCKED") return forbidden(blockedMsg());
  if (rel?.status === "REJECTED" && rel.initiatedBy === "STUDENT" && Date.now() - rel.updatedAt.getTime() < REREQUEST_COOLDOWN_MS) {
    return conflict(tr("این درخواست به‌تازگی رد شده؛ بعدا دوباره امتحان کن", "This request was recently declined; try again later"));
  }

  // اول صف جلو برود تا «پر بودن» با صندلی‌های رزرو به‌روز سنجیده شود
  await advanceWaitlist(mentorId);
  const now = new Date();
  const availability = availabilityOf(profile, await countOccupiedSeats(mentorId, now));
  if (!canJoinWaitlist(availability.state)) {
    if (availability.state === "OPEN") return conflict(tr("ظرفیت این مربی باز شده؛ همین الان می‌تونی درخواست بدی", "This mentor's capacity has opened; you can send a request now"));
    return conflict(requestBlockedMessage(availability.state, availability.awayUntil));
  }

  const meRow = await prisma.user.findUnique({ where: { id: me }, select: { mentorStudentTermsVersion: true } });
  const terms = decideMentorTerms("student", meRow?.mentorStudentTermsVersion, b.acceptMentorTerms);
  if (!terms.ok) return NextResponse.json({ error: terms.message, code: MENTOR_TERMS_ERROR_CODE }, { status: 400 });

  const existing = await prisma.mentorWaitlistEntry.findUnique({
    where: { mentorId_userId: { mentorId, userId: me } },
    select: { id: true, status: true, offerExpiresAt: true },
  });
  if (existing && (existing.status === "WAITING" || (existing.status === "OFFERED" && existing.offerExpiresAt && existing.offerExpiresAt > now))) {
    return conflict(tr("از قبل توی صف این مربی هستی", "You're already on this mentor's waitlist"));
  }
  if ((await countWaiting(mentorId)) >= WAITLIST_MAX) return conflict(tr("صف این مربی فعلا پره؛ کمی بعد دوباره سر بزن", "This mentor's waitlist is full for now; check back later"));

  const recordTerms = async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    if (terms.record) {
      await tx.user.update({ where: { id: me }, data: { mentorStudentTermsAcceptedAt: now, mentorStudentTermsVersion: MENTOR_TERMS_VERSION } });
    }
  };
  const fresh = {
    status: "WAITING" as const, joinedAt: now, offeredAt: null, offerExpiresAt: null, acceptedAt: null,
    closedBy: null, closedAt: null, mentorshipId: null,
  };
  try {
    const ok = await prisma.$transaction(async (tx) => {
      if (existing) {
        // ورود دوباره (بعد از خروج/انقضا/پذیرش قبلی) — ته صف، با قفل وضعیت قبلی
        const r = await tx.mentorWaitlistEntry.updateMany({ where: { id: existing.id, status: existing.status }, data: fresh });
        if (r.count === 0) return false;
      } else {
        await tx.mentorWaitlistEntry.create({ data: { mentorId, userId: me, ...fresh } });
      }
      await recordTerms(tx);
      return true;
    });
    if (!ok) return conflict(tr("وضعیت صف هم‌زمان تغییر کرد؛ دوباره تلاش کن", "The queue status changed at the same time; try again"));
  } catch (e) {
    if (isUniqueViolation(e)) return conflict(tr("از قبل توی صف این مربی هستی", "You're already on this mentor's waitlist"));
    throw e;
  }

  void publishToUsers([mentorId, me], { type: "mentor.mentorship", data: { mentorId } });
  return NextResponse.json({ waitlist: await loadMyWaitlist(mentorId, me) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!validMentorId(params.mentorId)) return notFound();
  const now = new Date();
  const res = await prisma.mentorWaitlistEntry.updateMany({
    where: { mentorId: params.mentorId, userId: me, status: { in: ["WAITING", "OFFERED"] } },
    data: { status: "CANCELLED", closedBy: "USER", closedAt: now },
  });
  if (res.count === 0) return notFound();
  // اگر نوبت داشت، صندلی به نفر بعدی می‌رسد
  await advanceWaitlist(params.mentorId, now);
  void publishToUsers([params.mentorId, me], { type: "mentor.mentorship", data: { mentorId: params.mentorId } });
  return NextResponse.json({ waitlist: null });
}
