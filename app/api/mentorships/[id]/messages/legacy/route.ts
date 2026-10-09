import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getMentorshipForUser, notFound, forbidden, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyCommitment } from "@/lib/e2ee/core";
import { activeKeysFor, checkWrapTargets, parseEncryptedMessage, serverFrankingTag } from "@/lib/e2ee/server";
import { tr } from "@/lib/i18n";

type Ctx = { params: { id: string } };
const MAX_ITEMS = 50;

// POST /api/mentorships/:id/messages/legacy { items: [{ id, frankingKey, ...پیام رمزشده }] }
//
// بازرمزگذاری پیام‌های متن‌ساده‌ی پیش از رمزگذاری، توسط کلاینت یکی از دو طرف.
// سرور تعهد فرانکینگ را با *همان متنی که خودش دارد* چک می‌کند (پس کسی نمی‌تواند
// متن دیگری را به نام فرستنده‌ی اصلی قابل‌گزارش کند) و در همان به‌روزرسانی
// متن ساده را پاک می‌کند. بسته‌بندی‌ها را کلید خود بازرمزکننده (from) می‌سازد و
// باید همه‌ی کلیدهای فعال دو طرف را پوشش دهند. متن رمزشده را سرور نمی‌تواند چک کند؛ کلاینت گیرنده
// هنگام خواندن تعهد را با متن رمزگشایی‌شده می‌سنجد و ناهمخوانی را «تاییدنشده» نشان می‌دهد.
export async function POST(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const m = await getMentorshipForUser(params.id, me);
  if (!m) return notFound();
  if (m.status !== "ACTIVE" && m.status !== "ENDED") return forbidden(tr(tr("گفت‌وگو برای این رابطه در دسترس نیست", "The conversation is not available for this relationship"), "The conversation is not available for this relationship"));
  if (!(await checkRateLimit(`mentor-legacy:${me}`, 20, 60 * 1000))) {
    return NextResponse.json({ error: tr("درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "There were too many requests; try again shortly") }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 512 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const items = parsed.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return badRequest(tr(tr("فهرست پیام‌ها نامعتبر است", "Invalid message list"), "Invalid message list"));

  const active = await activeKeysFor([m.mentorId, m.studentId]);
  if (!active[m.mentorId].length || !active[m.studentId].length) return NextResponse.json({ error: tr(tr("هر دو طرف باید کلید رمزگذاری داشته باشند", "Both sides must have encryption keys"), "Both sides must have encryption keys"), code: "PEER_NO_KEY" }, { status: 409 });

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
    if ((await checkWrapTargets(enc.data, me, [m.mentorId, m.studentId])) !== "ok") continue;
    const ctx = { mentorshipId: m.id, senderId: row.senderId, clientId: enc.data.clientId };
    if (!(await verifyCommitment(frankingKey as string, enc.data.commitment, ctx, row.legacyBody))) continue;

    const r = await prisma
      .$transaction(async (tx) => {
        const u = await tx.mentorMessage.updateMany({
          where: { id: row.id, mentorshipId: m.id, legacyBody: { not: null } },
          data: {
            legacyBody: null,
            scheme: 2,
            clientId: enc.data.clientId,
            ciphertext: enc.data.ciphertext,
            iv: enc.data.iv,
            senderKeyVersion: enc.data.from.k,
            recipientKeyVersion: null,
            keyFromId: me === row.senderId ? null : me,
            commitment: enc.data.commitment,
            serverTag: serverFrankingTag({ ...ctx, commitment: enc.data.commitment, createdAt: row.createdAt }),
          },
        });
        if (u.count === 1) {
          await tx.mentorMessageKeyWrap.createMany({
            data: enc.data.wraps.map((w) => ({ messageId: row.id, userId: w.u, keyVersion: w.k, wrap: w.w })),
          });
        }
        return u;
      })
      .catch(() => ({ count: 0 })); // clientId تکراری → نادیده
    migrated += r.count;
  }
  return NextResponse.json({ ok: true, migrated });
}
