import { prisma } from "@/lib/prisma";
import { decryptMessage, deriveChatKeys, encryptMessage, generateIdentityKeyPair, importPublicKey, type EncryptedMessage } from "@/lib/e2ee/core";
import { randomId } from "@/lib/e2ee/encoding";

// کمک‌تابع‌های تستِ گفت‌وگوی رمزگذاری‌شده — همان هسته‌ی WebCrypto که مرورگر
// اجرا می‌کند، این‌جا روی webcryptoِ Node.

export type TestIdentity = { userId: string; version: number; publicB64: string; privateKey: CryptoKey; publicKey: CryptoKey };

const identities = new Map<string, TestIdentity>();

/** کلیدِ هویتِ تازه برای کاربر (مستقیم در DB؛ مسیرِ API جدا در mentorE2EE.test تست می‌شود) */
export async function giveKey(userId: string): Promise<TestIdentity> {
  const cur = await prisma.userE2EKey.findFirst({ where: { userId, retiredAt: null }, orderBy: { version: "desc" } });
  if (cur) await prisma.userE2EKey.update({ where: { id: cur.id }, data: { retiredAt: new Date() } });
  const kp = await generateIdentityKeyPair();
  const version = (cur?.version ?? 0) + 1;
  await prisma.userE2EKey.create({ data: { userId, version, publicKey: kp.publicB64 } });
  const id = { userId, version, publicB64: kp.publicB64, privateKey: kp.privateKey, publicKey: kp.publicKey };
  identities.set(userId, id);
  return id;
}

export async function keyOf(userId: string): Promise<TestIdentity> {
  return identities.get(userId) ?? giveKey(userId);
}

async function relOf(mentorshipId: string) {
  return prisma.mentorship.findUniqueOrThrow({ where: { id: mentorshipId }, select: { mentorId: true, studentId: true } });
}

/** پیامِ رمزشده‌ی آماده‌ی POST، با کلیدهای جاریِ دو طرف */
export async function encFor(mentorshipId: string, senderId: string, text: string, clientId = randomId()): Promise<EncryptedMessage & { frankingKey: string }> {
  const rel = await relOf(mentorshipId);
  const recipientId = senderId === rel.mentorId ? rel.studentId : rel.mentorId;
  const me = await keyOf(senderId);
  const peer = await keyOf(recipientId);
  const mentorV = senderId === rel.mentorId ? me.version : peer.version;
  const studentV = senderId === rel.studentId ? me.version : peer.version;
  const keys = await deriveChatKeys(me.privateKey, await importPublicKey(peer.publicB64), {
    mentorshipId, mentorId: rel.mentorId, studentId: rel.studentId, mentorKeyVersion: mentorV, studentKeyVersion: studentV,
  });
  const fromMentor = senderId === rel.mentorId;
  return encryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, text, {
    mentorshipId, senderId, clientId,
    senderKeyVersion: fromMentor ? mentorV : studentV,
    recipientKeyVersion: fromMentor ? studentV : mentorV,
  });
}

/** رمزگشاییِ یک پیامِ GET از دیدِ viewer */
export async function openAs(viewerId: string, mentorshipId: string, m: { senderId: string; enc: EncryptedMessage | null; legacyBody?: string | null }) {
  if (!m.enc) return m.legacyBody ?? null;
  const rel = await relOf(mentorshipId);
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
  const d = await decryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, m.enc, {
    mentorshipId, senderId: m.senderId, clientId: m.enc.clientId, senderKeyVersion: m.enc.senderKeyVersion, recipientKeyVersion: m.enc.recipientKeyVersion,
  });
  return d;
}
