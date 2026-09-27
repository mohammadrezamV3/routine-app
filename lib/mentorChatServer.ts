import type { Mentorship, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import { currentE2EKey, serverFrankingTag, type EncryptedInput } from "@/lib/e2ee/server";

// منطقِ مشترکِ سمتِ سرورِ گفت‌وگوی رمزگذاری‌شده (ارسالِ تکی، ارسالِ گروهی،
// بازرمزگذاریِ پیام‌های قدیمی). سرور متن را هرگز نمی‌بیند؛ فقط شکل، نسخه‌ی
// کلیدها و یکتاییِ clientId را چک می‌کند و برچسبِ فرانکینگ می‌زند.

/** پیام‌های قدیمیِ متن‌ساده (پیش از رمزگذاری) بعد از این مدت پاک می‌شوند */
export const LEGACY_RETENTION_DAYS = 30;
const MESSAGE_NOTIFY_THROTTLE_MS = 10 * 60 * 1000;

export const MESSAGE_SELECT = {
  id: true,
  senderId: true,
  createdAt: true,
  readAt: true,
  legacyBody: true,
  clientId: true,
  ciphertext: true,
  iv: true,
  senderKeyVersion: true,
  recipientKeyVersion: true,
  commitment: true,
  broadcastId: true,
} as const satisfies Prisma.MentorMessageSelect;

type MessageRow = Prisma.MentorMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

/** شکلِ پیام برای کلاینت — فقط متنِ رمزشده (و برای ردیف‌های قدیمی، متنِ ساده‌ی خودِ دو طرف) */
export function serializeMessage(r: MessageRow, viewerId: string) {
  return {
    id: r.id,
    senderId: r.senderId,
    mine: r.senderId === viewerId,
    createdAt: r.createdAt,
    readAt: r.readAt,
    broadcast: !!r.broadcastId,
    legacyBody: r.legacyBody,
    enc: r.ciphertext
      ? {
          clientId: r.clientId!,
          ciphertext: r.ciphertext,
          iv: r.iv!,
          senderKeyVersion: r.senderKeyVersion!,
          recipientKeyVersion: r.recipientKeyVersion!,
          commitment: r.commitment!,
        }
      : null,
  };
}

export const keyChanged = () =>
  NextResponse.json({ error: "کلید رمزگذاری یکی از دو طرف عوض شده؛ دوباره تلاش کن", code: "KEY_CHANGED" }, { status: 409 });
export const peerNoKey = () =>
  NextResponse.json({ error: "طرف مقابل هنوز رمزگذاری سرتاسری را فعال نکرده", code: "PEER_NO_KEY" }, { status: 409 });
export const senderNoKey = () =>
  NextResponse.json({ error: "اول رمز گفت‌وگو را روی این دستگاه فعال کن", code: "NO_KEY" }, { status: 409 });

/**
 * نسخه‌ی کلیدهای اعلام‌شده باید دقیقا کلیدِ *جاریِ* فرستنده و گیرنده باشد؛
 * وگرنه پیام با کلیدی رمز شده که گیرنده (پس از بازنشانی) دیگر ندارد.
 */
export async function checkSendKeys(senderId: string, recipientId: string, input: Pick<EncryptedInput, "senderKeyVersion" | "recipientKeyVersion">): Promise<NextResponse | null> {
  const [mine, theirs] = await Promise.all([currentE2EKey(senderId), currentE2EKey(recipientId)]);
  if (!mine) return senderNoKey();
  if (!theirs) return peerNoKey();
  if (mine.version !== input.senderKeyVersion || theirs.version !== input.recipientKeyVersion) return keyChanged();
  return null;
}

/** دادهِ یک ردیفِ پیامِ رمزشده، با برچسبِ فرانکینگِ سرور */
export function encryptedMessageData(
  m: Pick<Mentorship, "id">,
  senderId: string,
  input: EncryptedInput,
  now: Date,
  broadcastId: string | null = null
): Prisma.MentorMessageCreateManyInput {
  return {
    mentorshipId: m.id,
    senderId,
    createdAt: now,
    clientId: input.clientId,
    ciphertext: input.ciphertext,
    iv: input.iv,
    senderKeyVersion: input.senderKeyVersion,
    recipientKeyVersion: input.recipientKeyVersion,
    commitment: input.commitment,
    serverTag: serverFrankingTag({ mentorshipId: m.id, senderId, clientId: input.clientId, commitment: input.commitment, createdAt: now }),
    broadcastId,
  };
}

/**
 * اعلانِ «پیام جدید» — بدونِ هیچ بخشی از متن (سرور متن را ندارد). اگه گیرنده
 * اعلانِ خوانده‌نشده‌ی همین گفت‌وگو را از ۱۰ دقیقه‌ی اخیر دارد، یکی دیگر نمی‌سازد.
 */
export async function notifyNewMessage(m: Pick<Mentorship, "id" | "mentorId" | "studentId">, senderId: string): Promise<void> {
  const recipient = m.mentorId === senderId ? m.studentId : m.mentorId;
  const url = `/mentorship/${m.id}`;
  const recent = await prisma.inAppNotification.findFirst({
    where: { userId: recipient, type: "message.new", url, readAt: null, createdAt: { gte: new Date(Date.now() - MESSAGE_NOTIFY_THROTTLE_MS) } },
    select: { id: true },
  });
  if (recent) return;
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: PUBLIC_USER_SELECT });
  await notifyUser(recipient, { type: "message.new", title: "پیام جدید", body: `${displayName(sender)} پیام تازه‌ای فرستاد`, url });
}

/** پاک‌کردنِ پیام‌های قدیمیِ متن‌ساده‌ی منقضی (یک گفت‌وگو یا همه) */
export async function purgeExpiredLegacyMessages(mentorshipId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - LEGACY_RETENTION_DAYS * 86_400_000);
  const r = await prisma.mentorMessage.deleteMany({
    where: { legacyBody: { not: null }, createdAt: { lt: cutoff }, ...(mentorshipId ? { mentorshipId } : {}) },
  });
  return r.count;
}
