import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, conflict } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUniqueViolation } from "@/lib/mentorServer";
import { isKeyBackupShape, isPublicKeyShape } from "@/lib/e2ee/core";

// کلیدِ هویتِ رمزگذاریِ سرتاسریِ کاربرِ فعلی (docs/mentor-e2ee.md).
// سرور فقط کلیدِ عمومی و پشتیبانِ *رمزشده* با رمزِ گفت‌وگو را نگه می‌دارد.

// GET /api/e2ee/keys → { userId, key: { version, publicKey, hasBackup, createdAt } | null }
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const k = await prisma.userE2EKey.findFirst({
    where: { userId: g.userId, retiredAt: null },
    orderBy: { version: "desc" },
    select: { version: true, publicKey: true, backupCiphertext: true, createdAt: true },
  });
  return NextResponse.json({
    userId: g.userId,
    key: k ? { version: k.version, publicKey: k.publicKey, hasBackup: !!k.backupCiphertext, createdAt: k.createdAt } : null,
  });
}

// POST /api/e2ee/keys { publicKey, backup, expectedVersion }
//   expectedVersion = 0 → راه‌اندازیِ اول؛ = نسخه‌ی جاری → «بازنشانی» (کلیدِ قبلی بازنشسته و پشتیبانش پاک می‌شود)
//   ناهمخوانی با نسخه‌ی جاری → ۴۰۹ (دو دستگاه هم‌زمان کلید نسازند)
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (!isPublicKeyShape(b.publicKey)) return badRequest("کلید عمومی نامعتبر است");
  if (!isKeyBackupShape(b.backup)) return badRequest("پشتیبان کلید نامعتبر است");
  if (!Number.isInteger(b.expectedVersion) || b.expectedVersion < 0) return badRequest("نسخه‌ی مورد انتظار نامعتبر است");
  const expected = b.expectedVersion as number;
  // سقف فقط روی درخواست‌های خوش‌شکل (ساخت/بازنشانیِ کلید کارِ نادری است)
  if (!(await checkRateLimit(`e2ee-key-create:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const cur = await tx.userE2EKey.findFirst({ where: { userId: me, retiredAt: null }, orderBy: { version: "desc" }, select: { id: true, version: true } });
      if ((cur?.version ?? 0) !== expected) return null;
      // نسخه‌ی تازه = expected + 1 (کلاینت همین را در AADِ پشتیبان گذاشته). یکتاییِ
      // (userId, version) نمی‌گذارد نسخه‌ی بازنشسته دوباره استفاده شود.
      if (cur) {
        await tx.userE2EKey.update({
          where: { id: cur.id },
          data: { retiredAt: new Date(), backupCiphertext: null, backupIv: null, backupSalt: null, backupIterations: null },
        });
      }
      return tx.userE2EKey.create({
        data: {
          userId: me,
          version: expected + 1,
          publicKey: b.publicKey,
          backupCiphertext: b.backup.ciphertext,
          backupIv: b.backup.iv,
          backupSalt: b.backup.salt,
          backupIterations: b.backup.iterations,
        },
        select: { version: true, publicKey: true, createdAt: true },
      });
    });
    if (!created) return NextResponse.json({ error: "کلید این حساب هم‌زمان تغییر کرد؛ صفحه را تازه کن", code: "KEY_CHANGED" }, { status: 409 });
    await prisma.auditLog
      .create({ data: { actorUserId: me, action: expected === 0 ? "e2ee.key_create" : "e2ee.key_reset", targetType: "User", targetId: me, meta: { version: created.version } } })
      .catch(() => {});
    return NextResponse.json({ key: { ...created, hasBackup: true } });
  } catch (e) {
    if (isUniqueViolation(e)) return conflict("کلید این حساب هم‌زمان تغییر کرد؛ صفحه را تازه کن");
    throw e;
  }
}
