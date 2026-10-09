import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest, notFound } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isUniqueViolation } from "@/lib/mentorServer";
import { isPublicKeyShape } from "@/lib/e2ee/core";
import { enforceDeviceCap, keyChangedResponse, nextVersionOk } from "@/lib/e2ee/keyServer";
import { tr } from "@/lib/i18n";

// کلید یک دستگاه (DEVICE): کلید خصوصی روی همان دستگاه ساخته می‌شود و هرگز — حتی
// رمزشده — به سرور نمی‌آید. پیام‌ها برای همه‌ی کلیدهای فعال بسته‌بندی می‌شوند.

// POST /api/e2ee/keys/device { publicKey, version, label }
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const parsed = await readJsonBody(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  if (!isPublicKeyShape(b.publicKey)) return badRequest(tr("کلید عمومی نامعتبر است", "Invalid public key"));
  if (!Number.isInteger(b.version) || b.version < 1) return badRequest(tr("نسخه‌ی کلید نامعتبر است", "Invalid key version"));
  const label = typeof b.label === "string" ? b.label.trim().slice(0, 60) || null : null;
  if (!(await checkRateLimit(`e2ee-device-create:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("تعداد تلاش‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "Too many attempts; try again shortly") }, { status: 429 });
  }
  try {
    const created = await prisma.$transaction(async (tx) => {
      if (!(await nextVersionOk(tx, me, b.version))) return null;
      const k = await tx.userE2EKey.create({
        data: { userId: me, version: b.version, kind: "DEVICE", publicKey: b.publicKey, deviceLabel: label, lastSeenAt: new Date() },
        select: { version: true, publicKey: true, kind: true },
      });
      await enforceDeviceCap(tx, me);
      return k;
    });
    if (!created) return keyChangedResponse();
    await prisma.auditLog.create({ data: { actorUserId: me, action: "e2ee.device_add", targetType: "User", targetId: me, meta: { version: created.version } } }).catch(() => {});
    return NextResponse.json({ key: created });
  } catch (e) {
    if (isUniqueViolation(e)) return keyChangedResponse();
    throw e;
  }
}

// DELETE /api/e2ee/keys/device?version=N → بازنشسته کردن کلید یکی از دستگاه‌های خودم
export async function DELETE(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const version = Number(req.nextUrl.searchParams.get("version"));
  if (!Number.isInteger(version) || version < 1) return badRequest(tr("نسخه‌ی کلید نامعتبر است", "Invalid key version"));
  const r = await prisma.userE2EKey.updateMany({ where: { userId: me, version, kind: "DEVICE", retiredAt: null }, data: { retiredAt: new Date() } });
  if (r.count === 0) return notFound();
  await prisma.auditLog.create({ data: { actorUserId: me, action: "e2ee.device_remove", targetType: "User", targetId: me, meta: { version } } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
