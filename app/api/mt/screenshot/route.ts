import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { MT_SHOT_CAPTION, hashSecret } from "@/lib/metatrader";
import { MAX_IMAGE_DATA_URL_LEN } from "@/lib/tradeServer";
import { MAX_IMAGES_PER_TRADE } from "@/lib/tradeTypes";
import { publishDataChanged } from "@/lib/realtime";

// POST /api/mt/screenshot — اکسپرت (نسخه‌ی 1.40 به بعد) از چارت همون نماد در لحظه‌ی
// ورود/خروج معامله اسکرین می‌گیره و اینجا می‌فرسته تا به همون معامله‌ی ژورنال وصل بشه.
//   Authorization: Bearer <token>
//   { ticket, kind: "entry" | "exit", image: "data:image/png;base64,..." }
//
// مثل /api/mt/sync احراز هویت فقط با توکن EA. معامله با (accountId, externalId) پیدا
// می‌شه؛ اگه هنوز با sync ساخته نشده 404 برمی‌گرده و اکسپرت دفعه‌ی بعد دوباره می‌فرسته.
// هر نوع (ورود/خروج) یک تصویر خودکار داره که با کپشن ثابت شناخته می‌شه و دوباره‌فرستادن
// جایگزینش می‌کنه (نه تصویر تازه). سقف تصویر هر معامله رعایت می‌شه و تصویرهای دستی
// کاربر هیچ‌وقت پاک یا جایگزین نمی‌شن.

const LIMIT_PER_TOKEN = 30;
const LIMIT_PER_IP = 300;
const WINDOW_MS = 60_000;
const DATA_URL_RE = /^data:image\/(png|gif|jpeg|bmp);base64,[A-Za-z0-9+/=]+$/;

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
  if (!(await checkRateLimit(`mt-shot-token:${link.id}`, LIMIT_PER_TOKEN, WINDOW_MS))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const ticket = String(body?.ticket ?? "").trim().slice(0, 40);
  const kind = body?.kind === "exit" ? "exit" : body?.kind === "entry" ? "entry" : null;
  const image = typeof body?.image === "string" ? body.image.replace(/\s+/g, "") : "";
  if (!ticket || !kind) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!DATA_URL_RE.test(image)) return NextResponse.json({ error: "invalid image" }, { status: 400 });
  if (image.length > MAX_IMAGE_DATA_URL_LEN) return NextResponse.json({ error: "image too large" }, { status: 413 });

  const entry = await prisma.tradeEntry.findUnique({
    where: { accountId_externalId: { accountId: link.accountId, externalId: ticket } },
    select: { id: true, userId: true, images: { select: { id: true, caption: true, order: true } } },
  });
  // هنوز sync نشده — اکسپرت دوباره امتحان می‌کنه
  if (!entry || entry.userId !== link.userId) return NextResponse.json({ error: "trade not found" }, { status: 404 });

  const caption = MT_SHOT_CAPTION[kind];
  const same = entry.images.find((i) => i.caption === caption);
  if (same) {
    await prisma.tradeImage.update({ where: { id: same.id }, data: { dataUrl: image } });
  } else {
    if (entry.images.length >= MAX_IMAGES_PER_TRADE) {
      // جای خالی نیست و تصویرهای کاربر دست نمی‌خورن؛ اکسپرت دیگه این رو نمی‌فرسته
      return NextResponse.json({ ok: true, stored: false, reason: "full" });
    }
    const order = entry.images.reduce((m, i) => Math.max(m, i.order), -1) + 1;
    await prisma.tradeImage.create({ data: { entryId: entry.id, dataUrl: image, caption, order } });
  }
  void publishDataChanged(link.userId, ["trade"]);
  return NextResponse.json({ ok: true, stored: true });
}
