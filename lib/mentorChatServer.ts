import type { Mentorship, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser, displayName } from "@/lib/inAppNotify";
import { PUBLIC_USER_SELECT } from "@/lib/mentorServer";
import { checkWrapTargets, serverFrankingTag, type EncryptedInput } from "@/lib/e2ee/server";
import type { EncryptedMessage } from "@/lib/e2ee/core";

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
  scheme: true,
  keyFromId: true,
  wraps: { select: { userId: true, keyVersion: true, wrap: true, viaVersion: true } },
} as const satisfies Prisma.MentorMessageSelect;

type MessageRow = Prisma.MentorMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

/**
 * شکلِ پیام برای کلاینت — فقط متنِ رمزشده (و برای ردیف‌های قدیمی، متنِ ساده‌ی خودِ دو طرف).
 * در scheme 2 فقط بسته‌بندی‌های *کلیدهای خودِ بیننده* فرستاده می‌شود.
 */
export function serializeMessage(r: MessageRow, viewerId: string) {
  let enc: EncryptedMessage | null = null;
  if (r.ciphertext && r.scheme === 2) {
    enc = {
      v: 2,
      clientId: r.clientId!,
      ciphertext: r.ciphertext,
      iv: r.iv!,
      commitment: r.commitment!,
      from: { u: r.keyFromId ?? r.senderId, k: r.senderKeyVersion! },
      wraps: r.wraps
        .filter((w) => w.userId === viewerId)
        .map((w) => (w.viaVersion != null ? { u: w.userId, k: w.keyVersion, w: w.wrap, via: w.viaVersion } : { u: w.userId, k: w.keyVersion, w: w.wrap })),
    };
  } else if (r.ciphertext) {
    enc = {
      clientId: r.clientId!,
      ciphertext: r.ciphertext,
      iv: r.iv!,
      senderKeyVersion: r.senderKeyVersion!,
      recipientKeyVersion: r.recipientKeyVersion!,
      commitment: r.commitment!,
    };
  }
  return {
    id: r.id,
    senderId: r.senderId,
    mine: r.senderId === viewerId,
    createdAt: r.createdAt,
    readAt: r.readAt,
    broadcast: !!r.broadcastId,
    legacyBody: r.legacyBody,
    enc,
  };
}

export const keyChanged = () =>
  NextResponse.json({ error: "کلید رمزگذاری یکی از دو طرف عوض شده؛ دوباره تلاش کن", code: "KEY_CHANGED" }, { status: 409 });
export const peerNoKey = () =>
  NextResponse.json({ error: "طرف مقابل هنوز وارد بخش مربی نشده است", code: "PEER_NO_KEY" }, { status: 409 });
export const senderNoKey = () =>
  NextResponse.json({ error: "کلید رمزگذاری این دستگاه هنوز آماده نیست؛ صفحه را دوباره باز کن", code: "NO_KEY" }, { status: 409 });

/**
 * بسته‌بندی‌های پیام باید دقیقا کلیدهای فعالِ *هر دو طرف* (همه‌ی دستگاه‌ها) را پوشش
 * دهند و از یکی از کلیدهای فعالِ فرستنده ساخته شده باشند؛ وگرنه ۴۰۹ با کد تا کلاینت
 * کلیدها را تازه کند و دوباره رمز کند (docs/mentor-e2ee.md).
 */
export async function checkSendKeys(senderId: string, recipientId: string, input: Pick<EncryptedInput, "from" | "wraps">): Promise<NextResponse | null> {
  const r = await checkWrapTargets(input, senderId, [senderId, recipientId]);
  if (r === "NO_KEY") return senderNoKey();
  if (r === "PEER_NO_KEY") return peerNoKey();
  if (r === "KEY_CHANGED") return keyChanged();
  return null;
}

function wrapRows(input: EncryptedInput) {
  return input.wraps.map((w) => ({ userId: w.u, keyVersion: w.k, wrap: w.w, viaVersion: w.via ?? null }));
}

function messageColumns(m: Pick<Mentorship, "id">, senderId: string, input: EncryptedInput, now: Date, broadcastId: string | null) {
  return {
    mentorshipId: m.id,
    senderId,
    createdAt: now,
    scheme: 2,
    clientId: input.clientId,
    ciphertext: input.ciphertext,
    iv: input.iv,
    senderKeyVersion: input.from.k,
    recipientKeyVersion: null,
    keyFromId: input.from.u === senderId ? null : input.from.u,
    commitment: input.commitment,
    serverTag: serverFrankingTag({ mentorshipId: m.id, senderId, clientId: input.clientId, commitment: input.commitment, createdAt: now }),
    broadcastId,
  };
}

/** دادهِ یک ردیفِ پیامِ رمزشده (با بسته‌بندی‌ها)، با برچسبِ فرانکینگِ سرور */
export function encryptedMessageData(
  m: Pick<Mentorship, "id">,
  senderId: string,
  input: EncryptedInput,
  now: Date,
  broadcastId: string | null = null
): Prisma.MentorMessageUncheckedCreateInput {
  return { ...messageColumns(m, senderId, input, now, broadcastId), wraps: { create: wrapRows(input) } };
}

/** همان، برای createManyِ دسته‌ای (داده‌ی آزمایشی): شناسه‌ی پیام از بیرون */
export function encryptedMessageRows(
  m: Pick<Mentorship, "id">,
  senderId: string,
  input: EncryptedInput,
  now: Date,
  id: string
): { message: Prisma.MentorMessageCreateManyInput; wraps: Prisma.MentorMessageKeyWrapCreateManyInput[] } {
  return {
    message: { id, ...messageColumns(m, senderId, input, now, null) },
    wraps: wrapRows(input).map((w) => ({ ...w, messageId: id })),
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
