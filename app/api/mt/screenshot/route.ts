import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { hashSecret } from "@/lib/metatrader";
import { parseMtShotBody, recordShotDiag, savePendingShot, storeShotOnEntry } from "@/lib/mtScreenshots";
import { publishDataChanged } from "@/lib/realtime";

// POST /api/mt/screenshot — اکسپرت (نسخه‌ی 1.40 به بعد؛ 1.41 خط‌شکن base64 رو خودش پاک می‌کنه) از چارت همون نماد در لحظه‌ی
// ورود/خروج معامله اسکرین می‌گیره و اینجا می‌فرسته تا به همون معامله‌ی ژورنال وصل بشه.
//   Authorization: Bearer <token>
//   { ticket, kind: "entry" | "exit", image: "data:image/png;base64,..." }
//
// مثل /api/mt/sync احراز هویت فقط با توکن EA. معامله با (accountId, externalId) پیدا
// می‌شه؛ اگه هنوز با sync ساخته نشده، اسکرین منتظر می‌مونه (TradeMtPendingShot) و sync
// بعدی وصلش می‌کنه — قبلا 404 می‌داد و بعد از چند تلاش اکسپرت دورش می‌ریخت.
// هر نوع (ورود/خروج) یک تصویر خودکار داره که با کپشن ثابت شناخته می‌شه و دوباره‌فرستادن
// جایگزینش می‌کنه (نه تصویر تازه). سقف تصویر هر معامله رعایت می‌شه و تصویرهای دستی
// کاربر هیچ‌وقت پاک یا جایگزین نمی‌شن.

const LIMIT_PER_TOKEN = 30;
const LIMIT_PER_IP = 300;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(`mt-shot:${ip}`, LIMIT_PER_IP, WINDOW_MS))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const link = await prisma.tradeMtLink.findUnique({
    where: { tokenHash: hashSecret(token) },
    select: { id: true, userId: true, accountId: true, revokedAt: true },
  });
  if (!link || link.revokedAt) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // اتصال متاتریدر از پنل ادمین خاموشه (برای صاحب حساب) → اکسپرت همون ۴۰۳ رو می‌گیره
  { const off = await featureBlocked("metatrader", link.userId); if (off) return off; }
  if (!(await checkRateLimit(`mt-shot-token:${link.id}`, LIMIT_PER_TOKEN, WINDOW_MS))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  // بدنه خام خونده می‌شه (نه req.json) تا خط‌شکن base64 اکسپرت رد نشه — lib/mtScreenshots.ts
  const raw = await req.text().catch(() => "");
  const shot = parseMtShotBody(raw);
  if (typeof shot === "string") {
    // رد سرور روی اتصال ثبت می‌شه تا پنل اتصال دلیلش رو نشون بده (قبلا بی‌صدا گم می‌شد
    // و اکسپرت هم 400/413 رو «تمام‌شده» حساب می‌کرد)
    await recordShotDiag(link.id, { error: `server:${shot}:${raw.length}` });
    if (shot === "too large") return NextResponse.json({ error: "image too large" }, { status: 413 });
    return NextResponse.json({ error: shot }, { status: 400 });
  }

  const entry = await prisma.tradeEntry.findUnique({
    where: { accountId_externalId: { accountId: link.accountId, externalId: shot.ticket } },
    select: { id: true, userId: true },
  });
  if (entry && entry.userId !== link.userId) return NextResponse.json({ error: "trade not found" }, { status: 404 });
  if (!entry) {
    // معامله هنوز sync نشده: نگه می‌داریم و 200 می‌دیم تا اکسپرت دوباره نفرسته
    await savePendingShot(link.userId, link.accountId, shot);
    await recordShotDiag(link.id, { received: true });
    return NextResponse.json({ ok: true, stored: false, pending: true });
  }

  await recordShotDiag(link.id, { received: true });
  if (!(await storeShotOnEntry(entry.id, shot.kind, shot.image))) {
    // جای خالی نیست و تصویرهای کاربر دست نمی‌خورن؛ اکسپرت دیگه این رو نمی‌فرسته
    return NextResponse.json({ ok: true, stored: false, reason: "full" });
  }
  void publishDataChanged(link.userId, ["trade"]);
  return NextResponse.json({ ok: true, stored: true });
}
