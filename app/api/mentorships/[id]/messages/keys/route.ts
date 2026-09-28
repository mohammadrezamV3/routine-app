import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, notFound, forbidden } from "@/lib/mentorGuard";
import { checkRateLimit } from "@/lib/rateLimit";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import { publicKeysFor } from "@/lib/e2ee/server";

type Ctx = { params: { id: string } };
const NUDGE_THROTTLE_MS = 24 * 60 * 60 * 1000;

// GET /api/mentorships/:id/messages/keys → کلیدهای عمومیِ هر دو طرف (همه‌ی نسخه‌ها)
//   { mentorId, studentId, keys: { [userId]: { version, publicKey, current }[] } }
export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const m = await getMentorshipForUser(params.id, g.userId);
  if (!m) return notFound();
  if (m.status !== "ACTIVE" && m.status !== "ENDED") return forbidden("گفت‌وگو برای این رابطه در دسترس نیست");
  const keys = await publicKeysFor([m.mentorId, m.studentId]);
  return NextResponse.json({ mentorId: m.mentorId, studentId: m.studentId, keys });
}

// POST /api/mentorships/:id/messages/keys → به طرفِ مقابل اطلاع بده که پیام دارد. کلیدِ
// رمزگذاری با اولین ورود/بازدیدش خودکار ساخته می‌شود (بدونِ کلیدِ او پیامی قابلِ ارسال نیست).
// حداکثر یک اعلان در ۲۴ ساعت برای هر رابطه.
export async function POST(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();
  if (m.status !== "ACTIVE") return forbidden("این رابطه فعال نیست");
  if (!(await checkRateLimit(`e2ee-nudge:${me}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }
  const peer = m.mentorId === me ? m.studentId : m.mentorId;
  const hasKey = await prisma.userE2EKey.count({ where: { userId: peer, retiredAt: null } });
  if (hasKey) return NextResponse.json({ ok: true, sent: false });

  const url = `/mentorship/${m.id}`;
  const recent = await prisma.inAppNotification.findFirst({
    where: { userId: peer, type: "message.e2ee_setup", url, createdAt: { gte: new Date(Date.now() - NUDGE_THROTTLE_MS) } },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ ok: true, sent: false });
  const sender = await prisma.user.findUnique({ where: { id: me }, select: PUBLIC_USER_SELECT });
  await notifyUser(peer, {
    type: "message.e2ee_setup",
    title: "پیام مربی‌گری",
    body: `${displayName(sender)} می‌خواهد به تو پیام بدهد؛ برای دریافت، یک بار گفت‌وگو را باز کن`,
    url,
  });
  return NextResponse.json({ ok: true, sent: true });
}
