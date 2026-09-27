import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, isMentorSuspended, notFound, forbidden, conflict, badRequest, touchMentorActivity } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import { publishToUsers } from "@/lib/realtime";

type Ctx = { params: { id: string } };
const PAGE_SIZE = 50;
const MESSAGE_MAX = 2000;
// اعلانِ «پیام جدید» برای هر پیام نه — اگه طرف هنوز اعلانِ خوانده‌نشده‌ی
// همین گفت‌وگو رو از ۱۰ دقیقه‌ی اخیر داره، یکی دیگه روش تلنبار نمی‌شه.
const MESSAGE_NOTIFY_THROTTLE_MS = 10 * 60 * 1000;

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

  const rows = await prisma.mentorMessage.findMany({
    where: { mentorshipId: m.id, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: { id: true, body: true, createdAt: true, readAt: true, senderId: true },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();

  // پیام‌های طرفِ مقابل با باز شدنِ گفت‌وگو خوانده‌شده حساب می‌شن
  const marked = await prisma.mentorMessage.updateMany({ where: { mentorshipId: m.id, senderId: { not: me }, readAt: null }, data: { readAt: new Date() } });
  // رسیدِ خوانده‌شدن: تیکِ دوتاییِ فرستنده همون لحظه عوض می‌شه
  if (marked.count > 0) {
    void publishToUsers([m.mentorId === me ? m.studentId : m.mentorId], { type: "mentor.message", data: { mentorshipId: m.id, read: true } });
  }

  return NextResponse.json({
    messages: page.map((r) => ({ id: r.id, body: r.body, createdAt: r.createdAt, readAt: r.readAt, mine: r.senderId === me })),
    hasMore,
    canSend: m.status === "ACTIVE",
  });
}

// POST /api/mentorships/:id/messages { body } → فقط رابطه‌ی ACTIVE
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

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const raw = parsed.body?.body;
  if (typeof raw !== "string") return badRequest("متن پیام لازمه");
  const body = raw.trim();
  if (!body) return badRequest("پیام خالیه");
  if (body.length > MESSAGE_MAX) return badRequest(`پیام حداکثر ${MESSAGE_MAX} کاراکتره`);

  const msg = await prisma.mentorMessage.create({
    data: { mentorshipId: m.id, senderId: me, body },
    select: { id: true, body: true, createdAt: true, readAt: true },
  });
  if (m.mentorId === me) touchMentorActivity(me);

  const recipient = m.mentorId === me ? m.studentId : m.mentorId;
  // گیرنده + بقیه‌ی دستگاه‌های خودم؛ فقط شناسه‌ی گفت‌وگو، متن از GET خونده می‌شه
  void publishToUsers([recipient, me], { type: "mentor.message", data: { mentorshipId: m.id } });
  const url = `/mentorship/${m.id}`;
  const recent = await prisma.inAppNotification.findFirst({
    where: { userId: recipient, type: "message.new", url, readAt: null, createdAt: { gte: new Date(Date.now() - MESSAGE_NOTIFY_THROTTLE_MS) } },
    select: { id: true },
  });
  if (!recent) {
    const sender = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
    await notifyUser(recipient, { type: "message.new", title: "پیام جدید", body: `${displayName(sender)}: ${body.slice(0, 120)}`, url });
  }

  return NextResponse.json({ message: { ...msg, mine: true } });
}
