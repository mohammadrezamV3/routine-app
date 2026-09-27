import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, isMentorSuspended, notFound, forbidden, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUniqueViolation } from "@/lib/mentorServer";
import { parseEncryptedMessage } from "@/lib/e2ee/server";
import { MESSAGE_SELECT, checkSendKeys, encryptedMessageData, notifyNewMessage, purgeExpiredLegacyMessages, serializeMessage } from "@/lib/mentorChatServer";

type Ctx = { params: { id: string } };
const PAGE_SIZE = 50;

// گفت‌وگوی منتور با رمزگذاریِ سرتاسری (docs/mentor-e2ee.md): سرور فقط متنِ
// رمزشده، IV، نسخه‌ی کلیدها و تعهدِ فرانکینگ را نگه می‌دارد و برمی‌گرداند.

// GET /api/mentorships/:id/messages?before=<ISO> → ۵۰ پیامِ قبل از before (صعودی).
// رابطه‌ی ENDED فقط‌خواندنیه؛ PENDING/REJECTED/BLOCKED چتی ندارن.
export async function GET(req: NextRequest, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();
  if (m.status !== "ACTIVE" && m.status !== "ENDED") return forbidden("گفت‌وگو برای این رابطه در دسترس نیست");

  const beforeRaw = req.nextUrl.searchParams.get("before");
  let before: Date | null = null;
  if (beforeRaw) {
    before = new Date(beforeRaw);
    if (Number.isNaN(before.getTime())) return badRequest("پارامتر before نامعتبره");
  }

  await purgeExpiredLegacyMessages(m.id);

  const rows = await prisma.mentorMessage.findMany({
    where: { mentorshipId: m.id, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    select: MESSAGE_SELECT,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();

  // پیام‌های طرفِ مقابل با باز شدنِ گفت‌وگو خوانده‌شده حساب می‌شن
  await prisma.mentorMessage.updateMany({ where: { mentorshipId: m.id, senderId: { not: me }, readAt: null }, data: { readAt: new Date() } });

  // پیامِ خوش‌آمد از تنظیماتِ منتور — جزوِ گفت‌وگوی رمزشده نیست و جدا برچسب می‌خورد
  let welcome: { body: string; at: Date } | null = null;
  if (!before && m.startedAt) {
    const p = await prisma.mentorProfile.findUnique({ where: { userId: m.mentorId }, select: { welcomeMessage: true } });
    const body = p?.welcomeMessage?.trim();
    if (body) welcome = { body, at: m.startedAt };
  }

  return NextResponse.json({
    messages: page.map((r) => serializeMessage(r, me)),
    hasMore,
    canSend: m.status === "ACTIVE",
    mentorId: m.mentorId,
    studentId: m.studentId,
    welcome,
  });
}

// POST /api/mentorships/:id/messages { clientId, ciphertext, iv, senderKeyVersion, recipientKeyVersion, commitment }
// فقط رابطه‌ی ACTIVE. متنِ ساده (body) رد می‌شود.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();
  if (m.status !== "ACTIVE") return conflict("این رابطه فعال نیست؛ امکان ارسال پیام نداری");
  if (await isMentorSuspended(m.mentorId)) return forbidden("فعالیتِ این منتور موقتا متوقف شده");

  if (!(await checkRateLimit(`mentor-msg:${me}`, 30, 60 * 1000))) {
    return NextResponse.json({ error: "پیام‌ها خیلی پشت‌سرهم بود؛ چند لحظه صبر کن" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 24 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const input = parseEncryptedMessage(parsed.body);
  if (!input.ok) return badRequest(input.error);

  const recipient = m.mentorId === me ? m.studentId : m.mentorId;
  const keyErr = await checkSendKeys(me, recipient, input.data);
  if (keyErr) return keyErr;

  let msg;
  try {
    msg = await prisma.mentorMessage.create({ data: encryptedMessageData(m, me, input.data, new Date()), select: MESSAGE_SELECT });
  } catch (e) {
    // clientIdِ تکراری در همین گفت‌وگو: ارسالِ دوباره‌ی *همان* پیام (شبکه قطع شده
    // بود) بی‌اثر و موفق است؛ هر چیزِ دیگر (replay/دست‌کاری) رد می‌شود.
    if (!isUniqueViolation(e)) throw e;
    const prev = await prisma.mentorMessage.findUnique({
      where: { mentorshipId_clientId: { mentorshipId: m.id, clientId: input.data.clientId } },
      select: MESSAGE_SELECT,
    });
    if (prev && prev.senderId === me && prev.ciphertext === input.data.ciphertext) return NextResponse.json({ message: serializeMessage(prev, me) });
    return NextResponse.json({ error: "این پیام قبلا ثبت شده", code: "DUPLICATE" }, { status: 409 });
  }
  if (m.mentorId === me) touchMentorActivity(me);
  await notifyNewMessage(m, me);

  return NextResponse.json({ message: serializeMessage(msg, me) });
}
