import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, notFound, forbidden, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyCommitment } from "@/lib/e2ee/core";
import { currentE2EKey, parseEncryptedMessage, serverFrankingTag } from "@/lib/e2ee/server";

type Ctx = { params: { id: string } };
const MAX_ITEMS = 50;

// POST /api/mentorships/:id/messages/legacy { items: [{ id, frankingKey, ...پیامِ رمزشده }] }
//
// بازرمزگذاریِ پیام‌های متن‌ساده‌ی پیش از رمزگذاری، توسطِ کلاینتِ یکی از دو طرف.
// سرور تعهدِ فرانکینگ را با *همان متنی که خودش دارد* چک می‌کند (پس کسی نمی‌تواند
// متنِ دیگری را به نامِ فرستنده‌ی اصلی قابلِ‌گزارش کند) و در همان به‌روزرسانی
// متنِ ساده را پاک می‌کند. متنِ رمزشده را سرور نمی‌تواند چک کند؛ کلاینتِ گیرنده
// هنگامِ خواندن تعهد را با متنِ رمزگشایی‌شده می‌سنجد و ناهمخوانی را «تأییدنشده» نشان می‌دهد.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();
  if (m.status !== "ACTIVE" && m.status !== "ENDED") return forbidden("گفت‌وگو برای این رابطه در دسترس نیست");
  if (!(await checkRateLimit(`mentor-legacy:${me}`, 20, 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 512 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const items = parsed.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return badRequest("فهرست پیام‌ها نامعتبر است");

  const [mentorKey, studentKey] = await Promise.all([currentE2EKey(m.mentorId), currentE2EKey(m.studentId)]);
  if (!mentorKey || !studentKey) return NextResponse.json({ error: "هر دو طرف باید رمز گفت‌وگو را فعال کرده باشند", code: "PEER_NO_KEY" }, { status: 409 });

  let migrated = 0;
  for (const it of items) {
    if (!it || typeof it !== "object" || typeof it.id !== "string" || typeof it.frankingKey !== "string") continue;
    const { frankingKey, id, ...rest } = it as Record<string, unknown>;
    const enc = parseEncryptedMessage(rest);
    if (!enc.ok) continue;
    const row = await prisma.mentorMessage.findFirst({
      where: { id: id as string, mentorshipId: m.id, legacyBody: { not: null } },
      select: { id: true, senderId: true, legacyBody: true, createdAt: true },
    });
    if (!row || row.legacyBody == null) continue;
    const senderKey = row.senderId === m.mentorId ? mentorKey : studentKey;
    const recipientKey = row.senderId === m.mentorId ? studentKey : mentorKey;
    if (enc.data.senderKeyVersion !== senderKey.version || enc.data.recipientKeyVersion !== recipientKey.version) continue;
    const ctx = { mentorshipId: m.id, senderId: row.senderId, clientId: enc.data.clientId };
    if (!(await verifyCommitment(frankingKey as string, enc.data.commitment, ctx, row.legacyBody))) continue;

    const r = await prisma.mentorMessage
      .updateMany({
        where: { id: row.id, mentorshipId: m.id, legacyBody: { not: null } },
        data: {
          legacyBody: null,
          clientId: enc.data.clientId,
          ciphertext: enc.data.ciphertext,
          iv: enc.data.iv,
          senderKeyVersion: enc.data.senderKeyVersion,
          recipientKeyVersion: enc.data.recipientKeyVersion,
          commitment: enc.data.commitment,
          serverTag: serverFrankingTag({ ...ctx, commitment: enc.data.commitment, createdAt: row.createdAt }),
        },
      })
      .catch(() => ({ count: 0 })); // clientIdِ تکراری → نادیده
    migrated += r.count;
  }
  return NextResponse.json({ ok: true, migrated });
}
