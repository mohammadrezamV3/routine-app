import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isKeyBackupShape } from "@/lib/e2ee/core";

// پشتیبانِ رمزشده‌ی کلیدِ خصوصی — فقط برای باز کردن روی دستگاهِ تازه.
// سرور نمی‌تواند بازش کند؛ امنیتش در برابرِ حدسِ آفلاین = قدرتِ رمزِ گفت‌وگو +
// PBKDF2 با ≥ ۶۰۰هزار دور. سقفِ دریافت جلوی جمع‌آوریِ خودکار با نشستِ دزدیده‌شده را
// می‌گیرد (برای گرداننده‌ی سرور که خودِ جدول را دارد بی‌اثر است؛ docs/mentor-e2ee.md).

const FETCH_LIMIT = 10;
const FETCH_WINDOW_MS = 60 * 60 * 1000;

// GET /api/e2ee/keys/backup → { version, publicKey, backup }
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!(await checkRateLimit(`e2ee-backup-fetch:${me}`, FETCH_LIMIT, FETCH_WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها برای باز کردن رمز گفت‌وگو زیاد بوده؛ یک ساعت دیگر دوباره تلاش کن" }, { status: 429 });
  }
  const k = await prisma.userE2EKey.findFirst({
    where: { userId: me, retiredAt: null },
    orderBy: { version: "desc" },
    select: { version: true, publicKey: true, backupCiphertext: true, backupIv: true, backupSalt: true, backupIterations: true },
  });
  if (!k || !k.backupCiphertext || !k.backupIv || !k.backupSalt || !k.backupIterations) return notFound();
  return NextResponse.json({
    version: k.version,
    publicKey: k.publicKey,
    backup: { kdf: "PBKDF2-SHA256", iterations: k.backupIterations, salt: k.backupSalt, iv: k.backupIv, ciphertext: k.backupCiphertext },
  });
}

// PUT /api/e2ee/keys/backup { version, backup } → تغییرِ رمزِ گفت‌وگو (همان کلید، بسته‌بندیِ تازه)
export async function PUT(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!(await checkRateLimit(`e2ee-backup-put:${me}`, 5, FETCH_WINDOW_MS))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (!Number.isInteger(b.version) || b.version < 1) return badRequest("نسخه‌ی کلید نامعتبر است");
  if (!isKeyBackupShape(b.backup)) return badRequest("پشتیبان کلید نامعتبر است");

  const r = await prisma.userE2EKey.updateMany({
    where: { userId: me, version: b.version, retiredAt: null },
    data: { backupCiphertext: b.backup.ciphertext, backupIv: b.backup.iv, backupSalt: b.backup.salt, backupIterations: b.backup.iterations },
  });
  if (r.count === 0) return NextResponse.json({ error: "کلید این حساب تغییر کرده؛ صفحه را تازه کن", code: "KEY_CHANGED" }, { status: 409 });
  await prisma.auditLog.create({ data: { actorUserId: me, action: "e2ee.passcode_change", targetType: "User", targetId: me, meta: { version: b.version } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
