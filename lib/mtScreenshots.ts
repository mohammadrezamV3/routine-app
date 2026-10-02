// اسکرین ورود/خروج اکسپرت: پارس بدنه، جای تصویر روی معامله، و وصل‌کردن
// اسکرین‌هایی که قبل از خود معامله رسیدن. روت /api/mt/screenshot و /api/mt/sync
// هر دو از همین‌جا استفاده می‌کنن تا قاعده‌ی «یک تصویر خودکار برای هر نوع، تصویر
// دستی کاربر هیچ‌وقت جایگزین نمی‌شه، سقف MAX_IMAGES_PER_TRADE» یک جا بمونه.

import { prisma } from "./prisma";
import { MT_SHOT_CAPTION } from "./metatrader";
import { MAX_IMAGE_DATA_URL_LEN } from "./tradeServer";
import { MAX_IMAGES_PER_TRADE } from "./tradeTypes";

export type MtShotKind = "entry" | "exit";

const DATA_URL_RE = /^data:image\/(png|gif|jpeg|bmp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** اسکرین‌های منتظر هر حساب بیشتر از این نمی‌شن (قدیمی‌ترها پاک می‌شن) */
export const MAX_PENDING_SHOTS_PER_ACCOUNT = 40;
/** اسکرین منتظری که تا این مدت معامله‌اش نرسید دیگه نمی‌رسه */
export const PENDING_SHOT_TTL_MS = 14 * 24 * 60 * 60_000;

export type ParsedShot = { ticket: string; kind: MtShotKind; image: string };

/**
 * بدنه‌ی خام درخواست اکسپرت → اسکرین معتبر یا کد خطا.
 *
 * خروجی CryptEncode(CRYPT_BASE64) متاتریدر می‌تونه مثل MIME خط‌شکن CRLF داشته
 * باشه و اکسپرت 1.40 همون رو خام لای رشته‌ی JSON می‌ذاشت. خط‌شکن خام
 * داخل رشته JSON نامعتبره، پس req.json() کل بدنه رو رد می‌کرد، روت 400 می‌داد و
 * اکسپرت (که 400 رو «تمام‌شده» حساب می‌کنه) اسکرین رو برای همیشه دور می‌ریخت —
 * ریشه‌ی «هیچ معامله‌ای عکس نداره». JSON معتبر هیچ‌وقت CR/LF خام داخل رشته
 * نداره و بیرون رشته هم فقط فاصله‌ست، پس حذفشون قبل از پارس همیشه امنه.
 */
export function parseMtShotBody(raw: string): ParsedShot | "invalid" | "invalid image" | "too large" {
  let body: any;
  try {
    body = JSON.parse(raw.replace(/[\r\n]+/g, ""));
  } catch {
    return "invalid";
  }
  const ticket = String(body?.ticket ?? "").trim().slice(0, 40);
  const kind: MtShotKind | null = body?.kind === "exit" ? "exit" : body?.kind === "entry" ? "entry" : null;
  if (!ticket || ticket === "0" || !kind) return "invalid";
  const image = typeof body?.image === "string" ? body.image.replace(/\s+/g, "") : "";
  if (image.length > MAX_IMAGE_DATA_URL_LEN) return "too large";
  if (!DATA_URL_RE.test(image)) return "invalid image";
  return { ticket, kind, image };
}

type ExistingImage = { id: string; caption: string | null; order: number };

/** جای اسکرین روی معامله: جایگزین همون نوع، تصویر تازه، یا جا نیست */
export function planShotPlacement(
  images: ExistingImage[],
  kind: MtShotKind,
  max = MAX_IMAGES_PER_TRADE,
): { action: "update"; id: string } | { action: "create"; order: number } | { action: "full" } {
  const same = images.find((i) => i.caption === MT_SHOT_CAPTION[kind]);
  if (same) return { action: "update", id: same.id };
  if (images.length >= max) return { action: "full" };
  return { action: "create", order: images.reduce((m, i) => Math.max(m, i.order), -1) + 1 };
}

/** اسکرین رو روی معامله می‌ذاره؛ false یعنی جای خالی نبود */
export async function storeShotOnEntry(entryId: string, kind: MtShotKind, dataUrl: string): Promise<boolean> {
  const images = await prisma.tradeImage.findMany({
    where: { entryId },
    select: { id: true, caption: true, order: true },
  });
  const plan = planShotPlacement(images, kind);
  if (plan.action === "full") return false;
  if (plan.action === "update") {
    await prisma.tradeImage.update({ where: { id: plan.id }, data: { dataUrl } });
  } else {
    await prisma.tradeImage.create({ data: { entryId, dataUrl, caption: MT_SHOT_CAPTION[kind], order: plan.order } });
  }
  return true;
}

/** اسکرینی که معامله‌اش هنوز sync نشده — نگه داشته می‌شه تا sync بعدی */
export async function savePendingShot(userId: string, accountId: string, shot: ParsedShot): Promise<void> {
  await prisma.tradeMtPendingShot.upsert({
    where: { accountId_externalId_kind: { accountId, externalId: shot.ticket, kind: shot.kind } },
    create: { userId, accountId, externalId: shot.ticket, kind: shot.kind, dataUrl: shot.image },
    update: { dataUrl: shot.image, userId },
  });
  // سقف و انقضا: حساب نباید با اسکرین تیکت‌های ساختگی دیتابیس رو پر کنه
  const stale = await prisma.tradeMtPendingShot.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    skip: MAX_PENDING_SHOTS_PER_ACCOUNT,
    select: { id: true },
  });
  await prisma.tradeMtPendingShot.deleteMany({
    where: {
      accountId,
      OR: [{ id: { in: stale.map((s) => s.id) } }, { createdAt: { lt: new Date(Date.now() - PENDING_SHOT_TTL_MS) } }],
    },
  });
}

/**
 * بعد از هر sync: اسکرین‌های منتظر این حساب که معامله‌شون الان هست وصل می‌شن.
 * فقط معامله‌ی همون کاربر و همون حساب (کلید یکتای accountId+externalId).
 * تعداد اسکرین‌های وصل‌شده رو برمی‌گردونه.
 */
export async function attachPendingShots(userId: string, accountId: string): Promise<number> {
  const pending = await prisma.tradeMtPendingShot.findMany({
    where: { accountId, userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, externalId: true, kind: true, dataUrl: true },
  });
  if (!pending.length) return 0;
  const entries = await prisma.tradeEntry.findMany({
    where: { accountId, userId, externalId: { in: Array.from(new Set(pending.map((p) => p.externalId))) } },
    select: { id: true, externalId: true },
  });
  const byExt = new Map(entries.map((e) => [e.externalId!, e.id]));
  let attached = 0;
  for (const p of pending) {
    const entryId = byExt.get(p.externalId);
    if (!entryId) continue;
    const kind: MtShotKind = p.kind === "exit" ? "exit" : "entry";
    if (await storeShotOnEntry(entryId, kind, p.dataUrl)) attached++;
    // وصل شد یا جا نبود — در هر دو حالت دیگه منتظر نمی‌مونه
    await prisma.tradeMtPendingShot.delete({ where: { id: p.id } }).catch(() => {});
  }
  return attached;
}
