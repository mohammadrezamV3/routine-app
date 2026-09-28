import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUniqueViolation } from "@/lib/mentorServer";
import { KDF_SALT_BYTES, isKeyBackupShape, isPublicKeyShape } from "@/lib/e2ee/core";
import { b64ByteLength } from "@/lib/e2ee/encoding";
import { E2E_KEY_SELECT, keyChangedResponse, myKeyState, nextVersionOk } from "@/lib/e2ee/keyServer";

// کلیدهای رمزگذاریِ سرتاسریِ کاربرِ فعلی (docs/mentor-e2ee.md). سرور فقط کلیدهای
// عمومی و پشتیبانِ *رمزشده* (با کلیدِ مشتق از رمزِ عبور، روی دستگاه) را نگه می‌دارد.

// GET /api/e2ee/keys[?touch=<نسخه‌ی کلیدِ این دستگاه>] →
//   { userId, hasPassword, kdf, keys: [{ version, kind, publicKey, active, hasBackup, backupKind, deviceLabel, createdAt, lastSeenAt, hasMessages }], link }
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const touch = Number(req.nextUrl.searchParams.get("touch"));
  return NextResponse.json(await myKeyState(g.userId, Number.isInteger(touch) && touch > 0 ? touch : null));
}

// POST /api/e2ee/keys { publicKey, backup, version, replaceVersion }
//   ساختِ کلیدِ SYNCED (بسته‌بندی‌شده با KEKِ رمزِ عبور). replaceVersion = 0 → بارِ اول؛
//   = نسخه‌ی SYNCEDِ فعال → جایگزینی (پس از بازیابیِ رمز: کلیدِ قبلی بازنشسته و پشتیبانش پاک).
//   version باید «بزرگ‌ترین نسخه + ۱» باشد (کلاینت همین را در AADِ پشتیبان گذاشته).
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (!isPublicKeyShape(b.publicKey)) return badRequest("کلید عمومی نامعتبر است");
  if (!isKeyBackupShape(b.backup)) return badRequest("پشتیبان کلید نامعتبر است");
  if (!Number.isInteger(b.version) || b.version < 1) return badRequest("نسخه‌ی کلید نامعتبر است");
  if (!Number.isInteger(b.replaceVersion) || b.replaceVersion < 0) return badRequest("نسخه‌ی قبلی نامعتبر است");
  if (!(await checkRateLimit(`e2ee-key-create:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }
  // پشتیبان باید با نمکِ فعلیِ همین حساب ساخته شده باشد؛ فقط در جایگزینی (بازیابیِ رمز)
  // نمکِ تازه همراهِ کلید می‌آید و اتمی ثبت می‌شود (KEKِ کهنه‌ی دستگاه‌های دیگر باطل)
  const newKdf = b.kdf as { salt?: unknown; iterations?: unknown } | undefined;
  if (newKdf !== undefined) {
    if (b.replaceVersion === 0 || !newKdf || typeof newKdf.salt !== "string" || b64ByteLength(newKdf.salt) !== KDF_SALT_BYTES) return badRequest("نمک نامعتبر است");
    if (newKdf.iterations !== b.backup.iterations || newKdf.salt !== b.backup.salt) return badRequest("پشتیبان با پارامترهای این حساب نمی‌خواند");
  } else {
    const kdf = await prisma.userE2EKdf.findUnique({ where: { userId: me } });
    if (!kdf || kdf.salt !== b.backup.salt || kdf.iterations !== b.backup.iterations) return badRequest("پشتیبان با پارامترهای این حساب نمی‌خواند");
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const cur = await tx.userE2EKey.findFirst({ where: { userId: me, kind: "SYNCED", retiredAt: null }, select: { id: true, version: true } });
      if ((cur?.version ?? 0) !== b.replaceVersion) return null;
      if (!(await nextVersionOk(tx, me, b.version))) return null;
      if (cur) {
        await tx.userE2EKey.update({
          where: { id: cur.id },
          data: { retiredAt: new Date(), activeSyncedFor: null, backupCiphertext: null, backupIv: null, backupSalt: null, backupIterations: null, backupKind: null },
        });
      }
      if (newKdf) {
        const salt = newKdf.salt as string;
        const iterations = b.backup.iterations as number;
        await tx.userE2EKdf.upsert({ where: { userId: me }, create: { userId: me, salt, iterations }, update: { salt, iterations } });
      }
      return tx.userE2EKey.create({
        data: {
          userId: me,
          version: b.version,
          kind: "SYNCED",
          activeSyncedFor: me,
          publicKey: b.publicKey,
          backupKind: "PASSWORD",
          backupCiphertext: b.backup.ciphertext,
          backupIv: b.backup.iv,
          backupSalt: b.backup.salt,
          backupIterations: b.backup.iterations,
        },
        select: E2E_KEY_SELECT,
      });
    });
    if (!created) return keyChangedResponse();
    await prisma.auditLog
      .create({ data: { actorUserId: me, action: b.replaceVersion === 0 ? "e2ee.key_create" : "e2ee.key_reset", targetType: "User", targetId: me, meta: { version: created.version } } })
      .catch(() => {});
    return NextResponse.json({ key: { version: created.version, publicKey: created.publicKey, kind: created.kind } });
  } catch (e) {
    if (isUniqueViolation(e)) return keyChangedResponse();
    throw e;
  }
}
