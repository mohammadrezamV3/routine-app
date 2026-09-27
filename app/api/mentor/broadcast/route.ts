import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { PUBLIC_USER_SELECT, isUniqueViolation, toPublicUser } from "@/lib/mentorServer";
import { requireMentorTools, validId } from "@/lib/mentorToolsGuard";
import { randomId } from "@/lib/e2ee/encoding";
import { currentE2EKey, parseEncryptedMessage } from "@/lib/e2ee/server";
import { encryptedMessageData, notifyNewMessage } from "@/lib/mentorChatServer";

// «ارسال گروهی»: منتور یک متن را برای چند شاگردِ فعال می‌فرستد. رمزگذاریِ سرتاسری
// می‌ماند: کلاینتِ منتور همان متن را *جداگانه* برای هر گفت‌وگو (کلیدِ همان جفت،
// IV و کلیدِ فرانکینگِ تازه) رمز می‌کند و سرور فقط N پیامِ رمزشده‌ی مستقل می‌گیرد.
// هر پیامِ حاصل مثلِ پیامِ عادی قابلِ گزارش است. docs/mentor-e2ee.md

const MAX_RECIPIENTS = 200;

// GET /api/mentor/broadcast → گیرنده‌های ممکن (رابطه‌های ACTIVEِ من به‌عنوانِ منتور) با کلیدِ جاری‌شان
export async function GET() {
  const g = await requireMentorTools({ write: true });
  if (!g.ok) return g.response;
  const rels = await prisma.mentorship.findMany({
    where: { mentorId: g.userId, status: "ACTIVE", student: { isBlocked: false, deletedAt: null } },
    select: { id: true, studentId: true, mentorLabelIds: true, student: { select: PUBLIC_USER_SELECT } },
    orderBy: { startedAt: "asc" },
    take: 500,
  });
  const keys = rels.length
    ? await prisma.userE2EKey.findMany({
        where: { userId: { in: rels.map((r) => r.studentId) }, retiredAt: null },
        select: { userId: true, version: true, publicKey: true },
      })
    : [];
  const keyBy = new Map(keys.map((k) => [k.userId, { version: k.version, publicKey: k.publicKey }]));
  const labels = await prisma.mentorStudentLabel.findMany({ where: { profileId: g.profile.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    recipients: rels.map((r) => ({
      mentorshipId: r.id,
      student: toPublicUser(r.student),
      key: keyBy.get(r.studentId) ?? null,
      labelIds: r.mentorLabelIds,
    })),
    labels,
  });
}

// POST /api/mentor/broadcast { items: [{ mentorshipId, clientId, ciphertext, iv, senderKeyVersion, recipientKeyVersion, commitment }] }
//   → { sent, failed: [{ mentorshipId, code }] } — هر مورد مستقل بررسی می‌شود
export async function POST(req: Request) {
  const g = await requireMentorTools({ write: true });
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!(await checkRateLimit(`mentor-broadcast:${me}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "ارسال گروهی در یک ساعت حداکثر 5 بار ممکن است" }, { status: 429 });
  }

  const parsed = await readJsonBody(req, 3 * 1024 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const items = parsed.body?.items;
  if (!Array.isArray(items) || items.length === 0) return badRequest("حداقل یک گیرنده لازم است");
  if (items.length > MAX_RECIPIENTS) return badRequest(`حداکثر ${MAX_RECIPIENTS} گیرنده در هر ارسال`);

  const myKey = await currentE2EKey(me);
  if (!myKey) return NextResponse.json({ error: "اول رمز گفت‌وگو را روی این دستگاه فعال کن", code: "NO_KEY" }, { status: 409 });

  const seen = new Set<string>();
  const failed: { mentorshipId: string; code: string }[] = [];
  const broadcastId = randomId();
  const now = new Date();
  let sent = 0;

  for (const it of items) {
    const mentorshipId = it?.mentorshipId;
    if (!validId(mentorshipId) || seen.has(mentorshipId)) {
      failed.push({ mentorshipId: String(mentorshipId ?? ""), code: "INVALID" });
      continue;
    }
    seen.add(mentorshipId);
    const { mentorshipId: _m, ...rest } = it as Record<string, unknown>;
    const enc = parseEncryptedMessage(rest);
    if (!enc.ok) { failed.push({ mentorshipId, code: "INVALID" }); continue; }

    // ضدِ IDOR: فقط رابطه‌ی ACTIVEی که خودم منتورش هستم
    const m = await prisma.mentorship.findFirst({
      where: { id: mentorshipId, mentorId: me, status: "ACTIVE", student: { isBlocked: false, deletedAt: null } },
      select: { id: true, mentorId: true, studentId: true },
    });
    if (!m) { failed.push({ mentorshipId, code: "NOT_FOUND" }); continue; }
    const theirs = await currentE2EKey(m.studentId);
    if (!theirs) { failed.push({ mentorshipId, code: "PEER_NO_KEY" }); continue; }
    if (enc.data.senderKeyVersion !== myKey.version || enc.data.recipientKeyVersion !== theirs.version) {
      failed.push({ mentorshipId, code: "KEY_CHANGED" });
      continue;
    }
    try {
      await prisma.mentorMessage.create({ data: encryptedMessageData(m, me, enc.data, now, broadcastId), select: { id: true } });
    } catch (e) {
      if (isUniqueViolation(e)) { failed.push({ mentorshipId, code: "DUPLICATE" }); continue; }
      throw e;
    }
    sent++;
    await notifyNewMessage(m, me);
  }

  if (sent > 0) {
    prisma.mentorProfile.updateMany({ where: { userId: me }, data: { lastActiveAt: now } }).catch(() => {});
    await prisma.auditLog
      .create({ data: { actorUserId: me, action: "mentor.broadcast", targetType: "User", targetId: me, meta: { broadcastId, sent, failed: failed.length } } })
      .catch(() => {});
  }
  return NextResponse.json({ sent, failed, broadcastId });
}
