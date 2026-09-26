import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile, badRequest, notFound, forbidden, conflict } from "@/lib/mentorGuard";
import { readJsonBody, isValidUsername } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import {
  MENTORSHIP_WITH_USERS_INCLUDE,
  DEFAULT_PRIVACY,
  buildMentorshipRows,
  usersBlockEachOther,
  isUniqueViolation,
} from "@/lib/mentorServer";

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
//   { mentorId, message? }         → شاگرد به یک منتورِ قابل‌کشف درخواست می‌ده
//   { studentUsername, message? }  → منتورِ فعال (غیرمعلق) یک کاربر رو دعوت می‌کنه
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

  if (b.mentorId !== undefined) {
    if (typeof b.mentorId !== "string" || !b.mentorId || b.mentorId.length > 64) return badRequest("منتور نامعتبره");
    if (b.mentorId === me) return badRequest("نمی‌تونی به خودت درخواست بدی");
    const profile = await prisma.mentorProfile.findFirst({
      where: { userId: b.mentorId, published: true, suspendedAt: null, user: { isBlocked: false, deletedAt: null } },
      select: { acceptingStudents: true },
    });
    if (!profile) return notFound();
    if (!profile.acceptingStudents) return conflict("این منتور فعلا شاگرد جدید نمی‌پذیره");
    mentorId = b.mentorId;
    studentId = me;
    initiatedBy = "STUDENT";
  } else if (b.studentUsername !== undefined) {
    const mp = await getActiveMentorProfile(me);
    if (!mp.ok) return mp.response;
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
  } else {
    return badRequest("منتور یا یوزرنیم شاگرد لازمه");
  }

  if (await usersBlockEachOther(mentorId, studentId)) return forbidden(BLOCKED_MSG);

  const existing = await prisma.mentorship.findUnique({ where: { mentorId_studentId: { mentorId, studentId } } });
  let id: string;
  if (existing) {
    if (existing.status === "ACTIVE") return conflict("این رابطه همین الان فعاله");
    if (existing.status === "PENDING") return conflict("یک درخواست در انتظار پاسخ از قبل وجود داره");
    if (existing.status === "BLOCKED") return forbidden(BLOCKED_MSG);
    // REJECTED/ENDED → همون ردیف دوباره PENDING می‌شه و حریم خصوصی به
    // پیش‌فرض (هیچ برنامه‌ای مشترک نیست) برمی‌گرده؛ اجازه‌ی رابطه‌ی قبلی
    // نباید بی‌صدا به رابطه‌ی جدید منتقل بشه.
    const res = await prisma.mentorship.updateMany({
      where: { id: existing.id, status: existing.status },
      data: { status: "PENDING", initiatedBy, message, blockedById: null, endedAt: null, ...DEFAULT_PRIVACY },
    });
    if (res.count === 0) return conflict("وضعیت رابطه هم‌زمان تغییر کرد؛ دوباره تلاش کن");
    id = existing.id;
  } else {
    try {
      const created = await prisma.mentorship.create({ data: { mentorId, studentId, initiatedBy, message }, select: { id: true } });
      id = created.id;
    } catch (e) {
      if (isUniqueViolation(e)) return conflict("یک درخواست در انتظار پاسخ از قبل وجود داره");
      throw e;
    }
  }

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
