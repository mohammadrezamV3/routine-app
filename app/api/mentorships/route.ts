import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, badRequest, notFound, forbidden, conflict } from "@/lib/mentorGuard";
import { readJsonBody, isValidUsername } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { requestBlockedMessage, validateIntakeAnswers, type IntakeAnswer } from "@/lib/mentorAvailability";
import { AVAILABILITY_SELECT, availabilityOf, countActiveStudents, writeIntakeAnswers } from "@/lib/mentorManageServer";
import {
  MENTORSHIP_WITH_USERS_INCLUDE,
  DEFAULT_PRIVACY,
  buildMentorshipRows,
  usersBlockEachOther,
  isUniqueViolation,
  DISCOVERABLE_PROFILE_WHERE,
  IDENTITY_VERIFIED_WHERE,
  MENTOR_IDENTITY_REQUIRED_MSG,
} from "@/lib/mentorServer";
import { decideMentorTerms, MENTOR_TERMS_ERROR_CODE, MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { publishToUsers } from "@/lib/realtime";

const MESSAGE_MAX = 500;
// پیامِ عمومی برای هر حالتِ «بلاک» — تا معلوم نشه دقیقاً کی کی رو بلاک کرده
const BLOCKED_MSG = "امکان ارسال درخواست به این کاربر وجود ندارد";

// GET /api/mentorships?role=student|mentor → رابطه‌های من از یک نقش
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const role = req.nextUrl.searchParams.get("role") === "mentor" ? "mentor" : "student";

  const rows = await prisma.mentorship.findMany({
    where: role === "mentor" ? { mentorId: g.userId } : { studentId: g.userId },
    include: MENTORSHIP_WITH_USERS_INCLUDE,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ mentorships: await buildMentorshipRows(rows, g.userId) });
}

// POST /api/mentorships
//   { mentorId, message?, intakeAnswers? } → شاگرد به یک منتورِ قابل‌کشف درخواست می‌ده
//     (پذیرشِ خاموش، ظرفیتِ پر، یا عدمِ حضورِ منتور با توقفِ درخواست → ۴۰۹؛
//      اگه منتور سؤالِ پذیرش تعریف کرده، جوابِ همه‌شون به همون ترتیب لازمه)
//   { studentUsername, message? }  → منتورِ فعال (غیرمعلق) یک کاربر رو دعوت می‌کنه
const REREQUEST_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  if (!(await checkRateLimit(`mentorship-req:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (b.message !== undefined && b.message !== null && typeof b.message !== "string") return badRequest("متن پیام نامعتبره");
  const message = typeof b.message === "string" ? b.message.trim().slice(0, MESSAGE_MAX) || null : null;

  let mentorId: string;
  let studentId: string;
  let initiatedBy: "STUDENT" | "MENTOR";
  let mentorCategories: string[] = [];
  let intakeAnswers: IntakeAnswer[] | null = null;
  // پذیرشِ «شرایط منتورها» از سمتِ شاگرد (lib/mentorTerms.ts) — فقط درخواستِ خودِ شاگرد
  let studentTermsVersion: string | null = null;
  let recordStudentTerms = false;

  if (b.mentorId !== undefined) {
    if (typeof b.mentorId !== "string" || !b.mentorId || b.mentorId.length > 64) return badRequest("منتور نامعتبره");
    if (b.mentorId === me) return badRequest("نمی‌تونی به خودت درخواست بدی");
    const profile = await prisma.mentorProfile.findFirst({
      // همان شرطِ قابلِ کشف: منتشرشده، غیرمعلق، هویتِ تأییدشده (احراز اجباری)
      where: { userId: b.mentorId, ...DISCOVERABLE_PROFILE_WHERE },
      select: { ...AVAILABILITY_SELECT, categories: true, intakeQuestions: true },
    });
    if (!profile) return notFound();
    // پذیرش/ظرفیت/عدمِ حضور — دعوتِ خودِ منتور (شاخه‌ی پایین) از این‌ها معافه
    const availability = availabilityOf(profile, await countActiveStudents(b.mentorId));
    if (availability.state !== "OPEN") return conflict(requestBlockedMessage(availability.state, availability.awayUntil));
    const ia = validateIntakeAnswers(profile.intakeQuestions, b.intakeAnswers);
    if (!ia.ok) return badRequest(ia.error);
    intakeAnswers = ia.data;
    const meRow = await prisma.user.findUnique({ where: { id: me }, select: { mentorStudentTermsVersion: true } });
    const terms = decideMentorTerms("student", meRow?.mentorStudentTermsVersion, b.acceptMentorTerms);
    if (!terms.ok) return NextResponse.json({ error: terms.message, code: MENTOR_TERMS_ERROR_CODE }, { status: 400 });
    recordStudentTerms = terms.record;
    studentTermsVersion = MENTOR_TERMS_VERSION;
    mentorId = b.mentorId;
    studentId = me;
    initiatedBy = "STUDENT";
    mentorCategories = profile.categories;
  } else if (b.studentUsername !== undefined) {
    const mp = await getActiveMentorProfile(me);
    if (!mp.ok) return mp.response;
    // احرازِ هویت برای منتور اجباریه — بدونِ تأیید، دعوتِ شاگرد هم ممکن نیست
    if (mp.profile.identityStatus !== IDENTITY_VERIFIED_WHERE.identityStatus) return forbidden(MENTOR_IDENTITY_REQUIRED_MSG);
    const username = typeof b.studentUsername === "string" ? b.studentUsername.trim().replace(/^@/, "") : "";
    if (!isValidUsername(username)) return badRequest("یوزرنیم نامعتبره");
    // بدون حساسیت به بزرگ/کوچکی — هم‌راستا با ورود و جست‌وجوی دوستان
    const target = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, isBlocked: false, deletedAt: null },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "کاربری پیدا نشد" }, { status: 404 });
    if (target.id === me) return badRequest("نمی‌تونی خودت رو دعوت کنی");
    mentorId = me;
    studentId = target.id;
    initiatedBy = "MENTOR";
    mentorCategories = mp.profile.categories;
  } else {
    return badRequest("منتور یا یوزرنیم شاگرد لازمه");
  }

  // حوزه‌های این رابطه (مثلا فقط «روتین») — باید زیرمجموعه‌ی دسته‌های منتور باشه؛
  // نفرستادن یعنی همه‌ی حوزه‌های منتور
  let categories: string[];
  if (b.categories === undefined || b.categories === null) {
    categories = mentorCategories;
  } else {
    if (!Array.isArray(b.categories)) return badRequest("حوزه‌ها نامعتبره");
    categories = Array.from(new Set(b.categories.filter((c: unknown): c is string => typeof c === "string" && mentorCategories.includes(c))));
    if (categories.length === 0 || categories.length !== new Set(b.categories).size) return badRequest("حداقل یک حوزه از حوزه‌های این منتور انتخاب کن");
  }

  // برای دعوت با یوزرنیم، «بلاک» و «وجود نداره» یک پاسخ دارن تا نشه یوزرنیم‌ها یا
  // «چه کسی من رو بلاک کرده» رو با این روت کاوید
  const hidden = () => (initiatedBy === "MENTOR" ? NextResponse.json({ error: "کاربری پیدا نشد" }, { status: 404 }) : forbidden(BLOCKED_MSG));
  if (await usersBlockEachOther(mentorId, studentId)) return hidden();

  const existing = await prisma.mentorship.findUnique({ where: { mentorId_studentId: { mentorId, studentId } } });
  let id: string;
  if (existing) {
    if (existing.status === "ACTIVE") return conflict("این رابطه همین الان فعاله");
    if (existing.status === "PENDING") return conflict("یک درخواست در انتظار پاسخ از قبل وجود داره");
    if (existing.status === "BLOCKED") return hidden();
    // بعد از رد، همون طرف تا یک هفته نمی‌تونه دوباره درخواست بده (ضد مزاحمت)
    if (existing.status === "REJECTED" && existing.initiatedBy === initiatedBy && Date.now() - existing.updatedAt.getTime() < REREQUEST_COOLDOWN_MS) {
      return conflict("این درخواست به‌تازگی رد شده؛ بعدا دوباره امتحان کن");
    }
    // REJECTED/ENDED → همون ردیف دوباره PENDING می‌شه و حریم خصوصی به
    // پیش‌فرض (هیچ برنامه‌ای مشترک نیست) برمی‌گرده؛ اجازه‌ی رابطه‌ی قبلی
    // نباید بی‌صدا به رابطه‌ی جدید منتقل بشه.
    // وضعیتِ مدیریتیِ رابطه‌ی قبلی (توقف، دلیلِ پایان، جواب‌های پذیرش) هم پاک می‌شه
    const count = await prisma.$transaction(async (tx) => {
      const res = await tx.mentorship.updateMany({
        where: { id: existing.id, status: existing.status },
        data: {
          status: "PENDING", initiatedBy, message, categories, blockedById: null, endedAt: null, ...DEFAULT_PRIVACY,
          pausedAt: null, pauseReason: null, endReason: null, endedBy: null, studentTermsVersion,
        },
      });
      if (res.count > 0) await writeIntakeAnswers(tx, existing.id, intakeAnswers);
      if (res.count > 0 && recordStudentTerms) await recordStudentTermsAcceptance(tx, studentId);
      return res.count;
    });
    if (count === 0) return conflict("وضعیت رابطه هم‌زمان تغییر کرد؛ دوباره تلاش کن");
    id = existing.id;
  } else {
    try {
      id = await prisma.$transaction(async (tx) => {
        const created = await tx.mentorship.create({ data: { mentorId, studentId, initiatedBy, message, categories, studentTermsVersion }, select: { id: true } });
        await writeIntakeAnswers(tx, created.id, intakeAnswers);
        if (recordStudentTerms) await recordStudentTermsAcceptance(tx, studentId);
        return created.id;
      });
    } catch (e) {
      if (isUniqueViolation(e)) return conflict("یک درخواست در انتظار پاسخ از قبل وجود داره");
      throw e;
    }
  }

  void publishToUsers([mentorId, studentId], { type: "mentor.mentorship", data: { id } });

  const row = await prisma.mentorship.findUnique({ where: { id }, include: MENTORSHIP_WITH_USERS_INCLUDE });
  const [mentorship] = await buildMentorshipRows([row!], me);

  const sender = initiatedBy === "STUDENT" ? row!.student : row!.mentor;
  await notifyUser(initiatedBy === "STUDENT" ? mentorId : studentId, {
    type: "mentor.request",
    title: initiatedBy === "STUDENT" ? "درخواست شاگردی جدید" : "دعوت به منتورشیپ",
    body:
      initiatedBy === "STUDENT"
        ? `${displayName(sender)} می‌خواد شاگردت بشه.`
        : `${displayName(sender)} دعوتت کرده که منتورت باشه.`,
    url: initiatedBy === "STUDENT" ? "/mentor" : "/mentorship",
  });

  return NextResponse.json({ mentorship });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** ثبتِ پذیرشِ نسخه‌ی جاریِ شرایط روی کاربر — هم‌تراکنش با ساختِ درخواست */
async function recordStudentTermsAcceptance(tx: Tx, userId: string): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { mentorStudentTermsAcceptedAt: new Date(), mentorStudentTermsVersion: MENTOR_TERMS_VERSION },
  });
}
