import { prisma } from "@/lib/prisma";
import {
  decryptMessage,
  decryptMessageV2,
  deriveChatKeys,
  encryptMessageV2,
  generateIdentityKeyPair,
  importPublicKey,
  isV2,
  type EncryptedMessage,
  type EncryptedMessageV2,
  type KeyRef,
} from "@/lib/e2ee/core";
import { randomId } from "@/lib/e2ee/encoding";

// کمک‌تابع‌های تستِ گفت‌وگوی رمزگذاری‌شده — همان هسته‌ی WebCrypto که مرورگر
// اجرا می‌کند، این‌جا روی webcryptoِ Node. پیام‌ها scheme 2 (بسته‌بندی برای همه‌ی
// کلیدهای فعالِ دو طرف).

export type TestIdentity = { userId: string; version: number; publicB64: string; privateKey: CryptoKey; publicKey: CryptoKey };

const identities = new Map<string, TestIdentity>();
/** همه‌ی کلیدهای خصوصیِ ساخته‌شده در تست، به‌ازای `${userId}:${version}` */
const allKeys = new Map<string, TestIdentity>();

/** کلیدِ SYNCEDِ تازه برای کاربر؛ همه‌ی کلیدهای فعالِ قبلی بازنشسته می‌شوند */
export async function giveKey(userId: string): Promise<TestIdentity> {
  await prisma.userE2EKey.updateMany({ where: { userId, retiredAt: null }, data: { retiredAt: new Date(), activeSyncedFor: null } });
  const max = await prisma.userE2EKey.aggregate({ where: { userId }, _max: { version: true } });
  const kp = await generateIdentityKeyPair();
  const version = (max._max.version ?? 0) + 1;
  await prisma.userE2EKey.create({ data: { userId, version, kind: "SYNCED", activeSyncedFor: userId, publicKey: kp.publicB64 } });
  const id = { userId, version, publicB64: kp.publicB64, privateKey: kp.privateKey, publicKey: kp.publicKey };
  identities.set(userId, id);
  allKeys.set(`${userId}:${version}`, id);
  return id;
}

/** کلیدِ DEVICEِ اضافه (دستگاهِ دوم) — کلیدِ قبلی فعال می‌ماند */
export async function giveDeviceKey(userId: string): Promise<TestIdentity> {
  const max = await prisma.userE2EKey.aggregate({ where: { userId }, _max: { version: true } });
  const kp = await generateIdentityKeyPair();
  const version = (max._max.version ?? 0) + 1;
  await prisma.userE2EKey.create({ data: { userId, version, kind: "DEVICE", publicKey: kp.publicB64, lastSeenAt: new Date() } });
  const id = { userId, version, publicB64: kp.publicB64, privateKey: kp.privateKey, publicKey: kp.publicKey };
  allKeys.set(`${userId}:${version}`, id);
  return id;
}

export async function keyOf(userId: string): Promise<TestIdentity> {
  return identities.get(userId) ?? giveKey(userId);
}

async function relOf(mentorshipId: string) {
  return prisma.mentorship.findUniqueOrThrow({ where: { id: mentorshipId }, select: { mentorId: true, studentId: true } });
}

async function activeTargets(userIds: string[]) {
  const rows = await prisma.userE2EKey.findMany({ where: { userId: { in: userIds }, retiredAt: null }, select: { userId: true, version: true, publicKey: true } });
  return rows.map((r) => ({ ref: { u: r.userId, k: r.version }, publicKey: r.publicKey }));
}

/** پیامِ رمزشده‌ی آماده‌ی POST، برای همه‌ی کلیدهای فعالِ دو طرف */
export async function encFor(mentorshipId: string, senderId: string, text: string, clientId = randomId(), wrapperId = senderId): Promise<EncryptedMessageV2 & { frankingKey: string }> {
  const rel = await relOf(mentorshipId);
  const recipientId = senderId === rel.mentorId ? rel.studentId : rel.mentorId;
  await keyOf(senderId);
  await keyOf(recipientId);
  // wrapperId ≠ فرستنده: بازرمزگذاریِ پیامِ قدیمی توسطِ طرفِ مقابل (بسته‌بندی با کلیدِ او)
  const w = await keyOf(wrapperId);
  return encryptMessageV2(text, { mentorshipId, senderId, clientId }, { ref: { u: wrapperId, k: w.version }, privateKey: w.privateKey }, await activeTargets([senderId, recipientId]));
}

async function publicOfDb(r: KeyRef): Promise<string | null> {
  const row = await prisma.userE2EKey.findUnique({ where: { userId_version: { userId: r.u, version: r.k } }, select: { publicKey: true } });
  return row?.publicKey ?? null;
}

/** رمزگشاییِ یک پیامِ GET از دیدِ viewer (با هر کلیدی از viewer که در تست ساخته شده) */
export async function openAs(viewerId: string, mentorshipId: string, m: { senderId: string; enc: EncryptedMessage | null; legacyBody?: string | null }) {
  if (!m.enc) return m.legacyBody ?? null;
  const rel = await relOf(mentorshipId);
  if (isV2(m.enc)) {
    const mine = Array.from(allKeys.values()).filter((k) => k.userId === viewerId).map((k) => ({ ref: { u: viewerId, k: k.version }, privateKey: k.privateKey }));
    const pubs = new Map<string, string | null>();
    for (const w of m.enc.wraps) if (w.via) pubs.set(`${w.u}:${w.via}`, await publicOfDb({ u: w.u, k: w.via }));
    pubs.set(`${m.enc.from.u}:${m.enc.from.k}`, await publicOfDb(m.enc.from));
    return decryptMessageV2(m.enc, { mentorshipId, senderId: m.senderId }, mine, (r) => pubs.get(`${r.u}:${r.k}`) ?? null);
  }
  const me = await keyOf(viewerId);
  const peerId = viewerId === rel.mentorId ? rel.studentId : rel.mentorId;
  const fromMentor = m.senderId === rel.mentorId;
  const mentorV = fromMentor ? m.enc.senderKeyVersion : m.enc.recipientKeyVersion;
  const studentV = fromMentor ? m.enc.recipientKeyVersion : m.enc.senderKeyVersion;
  const peerV = viewerId === rel.mentorId ? studentV : mentorV;
  const peerRow = await prisma.userE2EKey.findUniqueOrThrow({ where: { userId_version: { userId: peerId, version: peerV } } });
  const keys = await deriveChatKeys(me.privateKey, await importPublicKey(peerRow.publicKey), {
    mentorshipId, mentorId: rel.mentorId, studentId: rel.studentId, mentorKeyVersion: mentorV, studentKeyVersion: studentV,
  });
  return decryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, m.enc, {
    mentorshipId, senderId: m.senderId, clientId: m.enc.clientId, senderKeyVersion: m.enc.senderKeyVersion, recipientKeyVersion: m.enc.recipientKeyVersion,
  });
}

/** کلیدِ خصوصیِ یک نسخه که در تست ساخته شده */
export function testKey(userId: string, version: number): TestIdentity | undefined {
  return allKeys.get(`${userId}:${version}`);
}
