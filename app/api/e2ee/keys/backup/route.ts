import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { KDF_SALT_BYTES, PBKDF2_MAX_ITERATIONS, PBKDF2_MIN_ITERATIONS, isKeyBackupShape } from "@/lib/e2ee/core";
import { b64ByteLength } from "@/lib/e2ee/encoding";
import { keyChangedResponse } from "@/lib/e2ee/keyServer";
import { tr } from "@/lib/i18n";

// پشتیبان رمزشده‌ی کلید SYNCED — فقط برای باز کردن روی دستگاهی که با رمز عبور وارد
// شده. سرور نمی‌تواند بازش کند؛ امنیتش در برابر حدس آفلاین = قدرت رمز عبور + PBKDF2
// (۶۰۰هزار دور، نمک اختصاصی). سقف دریافت جلوی جمع‌آوری خودکار با نشست دزدیده‌شده را
// می‌گیرد (برای گرداننده‌ی سرور که خود جدول را دارد بی‌اثر است؛ docs/mentor-e2ee.md).

const FETCH_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

// GET /api/e2ee/keys/backup → { version, publicKey, backupKind, backup }
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!(await checkRateLimit(`e2ee-backup-fetch:${me}`, FETCH_LIMIT, WINDOW_MS))) {
    return NextResponse.json({ error: tr(tr("تعداد درخواست‌ها زیاد بوده؛ یک ساعت دیگر دوباره تلاش کن", "Too many requests; try again in an hour"), "Too many requests; try again in an hour") }, { status: 429 });
  }
  const k = await prisma.userE2EKey.findFirst({
    where: { userId: me, kind: "SYNCED", retiredAt: null },
    select: { version: true, publicKey: true, backupKind: true, backupCiphertext: true, backupIv: true, backupSalt: true, backupIterations: true },
  });
  if (!k || !k.backupCiphertext || !k.backupIv || !k.backupSalt || !k.backupIterations) return notFound();
  return NextResponse.json({
    version: k.version,
    publicKey: k.publicKey,
    backupKind: k.backupKind ?? "PASSCODE",
    backup: { kdf: "PBKDF2-SHA256", iterations: k.backupIterations, salt: k.backupSalt, iv: k.backupIv, ciphertext: k.backupCiphertext },
  });
}

// PUT /api/e2ee/keys/backup
//   { version, backup, backupKind: "PASSWORD", kdf? } → بسته‌بندی دوباره‌ی همان کلید با KEK رمز عبور:
//       انتقال از «رمز گفت‌وگو»ی قدیمی (kdf = نمک فعلی)، یا تغییر رمز عبور (kdf = نمک تازه، اتمی با پشتیبان)
//   { version, convertToDevice: true, label } → حساب بی‌رمز: کلید قدیمی «رمز گفت‌وگو» کلید همین دستگاه می‌شود و پشتیبان پاک
export async function PUT(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!(await checkRateLimit(`e2ee-backup-put:${me}`, 10, WINDOW_MS))) {
    return NextResponse.json({ error: tr(tr("تعداد تلاش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "Too many attempts; try again shortly"), "Too many attempts; try again shortly") }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (!Number.isInteger(b.version) || b.version < 1) return badRequest(tr(tr("نسخه‌ی کلید نامعتبر است", "Invalid key version"), "Invalid key version"));

  if (b.convertToDevice === true) {
    const label = typeof b.label === "string" ? b.label.trim().slice(0, 60) || null : null;
    const r = await prisma.userE2EKey.updateMany({
      where: { userId: me, version: b.version, kind: "SYNCED", retiredAt: null, backupKind: "PASSCODE" },
      data: { kind: "DEVICE", activeSyncedFor: null, deviceLabel: label, lastSeenAt: new Date(), backupKind: null, backupCiphertext: null, backupIv: null, backupSalt: null, backupIterations: null },
    });
    if (r.count === 0) return keyChangedResponse();
    await prisma.auditLog.create({ data: { actorUserId: me, action: "e2ee.legacy_to_device", targetType: "User", targetId: me, meta: { version: b.version } } }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (b.backupKind !== "PASSWORD") return badRequest(tr(tr("نوع پشتیبان نامعتبر است", "Invalid backup type"), "Invalid backup type"));
  if (!isKeyBackupShape(b.backup)) return badRequest(tr(tr("پشتیبان کلید نامعتبر است", "Invalid key backup"), "Invalid key backup"));
  const newKdf = b.kdf as { salt?: unknown; iterations?: unknown } | undefined;
  if (newKdf !== undefined) {
    if (!newKdf || typeof newKdf.salt !== "string" || b64ByteLength(newKdf.salt) !== KDF_SALT_BYTES) return badRequest(tr(tr("نمک نامعتبر است", "Invalid salt"), "Invalid salt"));
    if (!Number.isInteger(newKdf.iterations) || (newKdf.iterations as number) < PBKDF2_MIN_ITERATIONS || (newKdf.iterations as number) > PBKDF2_MAX_ITERATIONS) return badRequest(tr("پارامتر KDF نامعتبر است", "Invalid KDF parameter"));
  }
  const user = await prisma.user.findUnique({ where: { id: me }, select: { passwordHash: true } });
  if (!user?.passwordHash) return badRequest(tr(tr("این حساب رمز عبور ندارد", "This account has no password"), "This account has no password"));

  const ok = await prisma.$transaction(async (tx) => {
    const cur = await tx.userE2EKdf.findUnique({ where: { userId: me } });
    const salt = newKdf ? (newKdf.salt as string) : cur?.salt;
    const iterations = newKdf ? (newKdf.iterations as number) : cur?.iterations;
    if (!salt || b.backup.salt !== salt || b.backup.iterations !== iterations) return "BAD_KDF" as const;
    const r = await tx.userE2EKey.updateMany({
      where: { userId: me, version: b.version, kind: "SYNCED", retiredAt: null },
      data: { backupKind: "PASSWORD", backupCiphertext: b.backup.ciphertext, backupIv: b.backup.iv, backupSalt: b.backup.salt, backupIterations: b.backup.iterations },
    });
    if (r.count === 0) return "CHANGED" as const;
    if (newKdf) await tx.userE2EKdf.upsert({ where: { userId: me }, create: { userId: me, salt, iterations: iterations! }, update: { salt, iterations: iterations! } });
    return "OK" as const;
  });
  if (ok === "BAD_KDF") return badRequest(tr(tr("پشتیبان با پارامترهای این حساب نمی‌خواند", "The backup can't be read with this account's parameters"), "The backup can't be read with this account's parameters"));
  if (ok === "CHANGED") return keyChangedResponse();
  await prisma.auditLog.create({ data: { actorUserId: me, action: newKdf ? "e2ee.password_rewrap" : "e2ee.passcode_migrate", targetType: "User", targetId: me, meta: { version: b.version } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
