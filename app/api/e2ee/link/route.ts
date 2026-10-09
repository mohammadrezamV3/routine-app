import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { LINK_TTL_MS } from "@/lib/e2ee/keyServer";
import { tr } from "@/lib/i18n";

// POST /api/e2ee/link { targetVersion } → { id }
// «انتقال سابقه از دستگاه دیگر»: دستگاه تازه (کلید targetVersion) درخواست می‌دهد. یکی از
// دستگاه‌های قدیمی همین کاربر آن را در GET /api/e2ee/keys می‌بیند، کد کوتاه را (که از
// کلید عمومی دستگاه تازه مشتق است) با صفحه‌ی دستگاه تازه تطبیق می‌دهد و تایید می‌کند.
// سرور فقط هماهنگ می‌کند؛ کلیدی جابه‌جا نمی‌شود (فقط CEKها برای کلید تازه بسته‌بندی می‌شوند).
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const parsed = await readJsonBody(req, 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const v = parsed.body?.targetVersion;
  if (!Number.isInteger(v) || v < 1) return badRequest(tr("نسخه‌ی کلید نامعتبر است", "Invalid key version"));
  if (!(await checkRateLimit(`e2ee-link:${me}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: tr("تعداد درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن", "There were too many requests; try again shortly") }, { status: 429 });
  }
  const key = await prisma.userE2EKey.findFirst({ where: { userId: me, version: v, retiredAt: null }, select: { id: true } });
  if (!key) return badRequest(tr("کلید این دستگاه فعال نیست", "This device's key is not active"));
  const link = await prisma.$transaction(async (tx) => {
    await tx.e2EDeviceLink.updateMany({ where: { userId: me, status: "PENDING" }, data: { status: "DECLINED", completedAt: new Date() } });
    return tx.e2EDeviceLink.create({ data: { userId: me, targetVersion: v, expiresAt: new Date(Date.now() + LINK_TTL_MS) }, select: { id: true } });
  });
  return NextResponse.json({ id: link.id });
}
