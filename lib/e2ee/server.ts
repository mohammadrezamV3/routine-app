// فقط سمتِ سرور (node:crypto + prisma) — هرگز از کامپوننتِ کلاینت import نشود.
import nodeCrypto from "crypto";
import { prisma } from "@/lib/prisma";
import { b64ByteLength } from "./encoding";
import { COMMITMENT_BYTES, GCM_TAG_BYTES, IV_BYTES, type EncryptedMessage } from "./core";

// کمک‌های سمتِ سرورِ رمزگذاری. سرور هیچ کلیدِ خصوصیِ کاربری ندارد؛ این فایل فقط:
//   ۱) برچسبِ سرور روی تعهدِ فرانکینگ (HMAC با رازِ سرور) می‌سازد/تأیید می‌کند،
//   ۲) رمزگذاریِ «در حالِ سکون» (at-rest) برای داده‌ای که سرور *باید* پردازش کند
//      یا ادمین *باید* ببیند (متنِ پیامِ گزارش‌شده) انجام می‌دهد،
//   ۳) ورودیِ رمزشده را اعتبارسنجیِ شکلی می‌کند.

// ───────────────────────── رازها ─────────────────────────
//
// قالبِ env: «kid:base64(32 بایت)» و برای چرخش چندتا با کاما — اولی فعال است،
// بقیه فقط برای خواندنِ داده‌ی قدیمی. نبودِ env → کلید از NEXTAUTH_SECRET با
// HKDF مشتق می‌شود (kid = "n0") تا هیچ‌چیز نشکند؛ ولی در production باید
// کلیدِ مستقل تنظیم شود (docs/mentor-e2ee.md).

type Keyring = { active: { kid: string; key: Buffer }; all: Map<string, Buffer> };
const rings = new Map<string, Keyring>();

function deriveFallback(label: string): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error(`${label} و NEXTAUTH_SECRET هر دو خالی‌اند`);
  return Buffer.from(nodeCrypto.hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from("arion/mentor-e2ee"), Buffer.from(label), 32));
}

function keyring(envName: "MENTOR_DATA_KEY" | "MENTOR_FRANKING_SECRET"): Keyring {
  const raw = (process.env[envName] || "").trim();
  const cacheKey = `${envName}=${raw}|${raw ? "" : process.env.NEXTAUTH_SECRET || ""}`;
  const hit = rings.get(cacheKey);
  if (hit) return hit;
  const all = new Map<string, Buffer>();
  let active: Keyring["active"] | null = null;
  if (raw) {
    for (const part of raw.split(",")) {
      const [kid, b64] = part.trim().split(":");
      const key = b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
      if (!kid || !/^[A-Za-z0-9_-]{1,16}$/.test(kid) || key.length !== 32) {
        throw new Error(`${envName} بدشکل است؛ قالب: kid:base64(32 بایت)[,kid:base64...]`);
      }
      all.set(kid, key);
      if (!active) active = { kid, key };
    }
  } else {
    const key = deriveFallback(envName);
    all.set("n0", key);
    active = { kid: "n0", key };
  }
  const ring = { active: active!, all };
  rings.set(cacheKey, ring);
  return ring;
}

function lpBuf(...parts: (string | number)[]): Buffer {
  const chunks: Buffer[] = [];
  for (const p of parts) {
    const b = Buffer.from(String(p), "utf8");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(b.length, 0);
    chunks.push(len, b);
  }
  return Buffer.concat(chunks);
}

// ───────────────────────── برچسبِ سرور روی تعهد ─────────────────────────

export type FrankingContext = { mentorshipId: string; senderId: string; clientId: string; commitment: string; createdAt: Date };

function tagInput(c: FrankingContext): Buffer {
  return lpBuf("arion/frank-server/v1", c.mentorshipId, c.senderId, c.clientId, c.commitment, c.createdAt.toISOString());
}

/**
 * برچسبِ سرور: HMAC(رازِ سرور، تعهد + فرستنده‌ی احرازشده + زمان). یعنی «سرور
 * این تعهد را در این لحظه از این فرستنده گرفت». با آن، حتی کسی که به دیتابیس
 * دسترسیِ نوشتن دارد نمی‌تواند پیامِ قابلِ گزارشِ جعلی به نامِ دیگری بسازد.
 */
export function serverFrankingTag(c: FrankingContext): string {
  const { kid, key } = keyring("MENTOR_FRANKING_SECRET").active;
  return `${kid}:${nodeCrypto.createHmac("sha256", key).update(tagInput(c)).digest("base64")}`;
}

export function verifyServerFrankingTag(tag: string | null | undefined, c: FrankingContext): boolean {
  if (!tag) return false;
  const i = tag.indexOf(":");
  if (i <= 0) return false;
  const key = keyring("MENTOR_FRANKING_SECRET").all.get(tag.slice(0, i));
  if (!key) return false;
  const expected = nodeCrypto.createHmac("sha256", key).update(tagInput(c)).digest();
  const got = Buffer.from(tag.slice(i + 1), "base64");
  return got.length === expected.length && nodeCrypto.timingSafeEqual(got, expected);
}

// ───────────────────────── رمزگذاریِ در حالِ سکون ─────────────────────────
//
// قالبِ ذخیره: «enc1:<kid>:<iv b64>:<ct+tag b64>». AAD = زمینه‌ی فیلد (مثلا
// ["MentorReport.reportedText", reportId]) تا مقدارِ رمزشده به ردیف/ستونِ
// دیگری منتقل نشود. مقدارِ بدونِ پیشوند = دادهِ قدیمیِ پیش از رمزگذاری
// (فقط خوانده می‌شود).

const AT_REST_PREFIX = "enc1:";

export function sealAtRest(plain: string, aad: (string | number)[]): string {
  const { kid, key } = keyring("MENTOR_DATA_KEY").active;
  const iv = nodeCrypto.randomBytes(12);
  const c = nodeCrypto.createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(lpBuf("arion/at-rest/v1", ...aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final(), c.getAuthTag()]);
  return `${AT_REST_PREFIX}${kid}:${iv.toString("base64")}:${ct.toString("base64")}`;
}

export function isSealedAtRest(v: string | null | undefined): boolean {
  return typeof v === "string" && v.startsWith(AT_REST_PREFIX);
}

/** باز کردن؛ مقدارِ قدیمیِ بی‌پیشوند همان‌طور برمی‌گردد. دست‌کاری/کلیدِ ناموجود → null */
export function openAtRest(v: string | null | undefined, aad: (string | number)[]): string | null {
  if (v == null) return null;
  if (!v.startsWith(AT_REST_PREFIX)) return v;
  const [kid, ivB64, ctB64] = v.slice(AT_REST_PREFIX.length).split(":");
  const key = kid ? keyring("MENTOR_DATA_KEY").all.get(kid) : undefined;
  if (!key || !ivB64 || !ctB64) return null;
  try {
    const iv = Buffer.from(ivB64, "base64");
    const buf = Buffer.from(ctB64, "base64");
    if (iv.length !== 12 || buf.length < 16) return null;
    const d = nodeCrypto.createDecipheriv("aes-256-gcm", key, iv);
    d.setAAD(lpBuf("arion/at-rest/v1", ...aad));
    d.setAuthTag(buf.subarray(buf.length - 16));
    return Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ───────────────────────── اعتبارسنجیِ ورودیِ رمزشده ─────────────────────────

/** سقفِ متنِ رمزشده: ۲۰۰۰ نویسه × ۴ بایت + JSON + padding، به base64 */
export const CIPHERTEXT_B64_MAX = 12_000;
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{16,40}$/;

export type EncryptedInput = EncryptedMessage;

export function parseEncryptedMessage(v: unknown): { ok: true; data: EncryptedInput } | { ok: false; error: string } {
  if (!v || typeof v !== "object") return { ok: false, error: "پیام رمزشده لازم است" };
  const b = v as Record<string, unknown>;
  if ("body" in b || "text" in b) return { ok: false, error: "متن ساده پذیرفته نمی‌شود؛ پیام باید روی دستگاه رمزگذاری شود" };
  if (typeof b.clientId !== "string" || !CLIENT_ID_RE.test(b.clientId)) return { ok: false, error: "شناسه‌ی پیام نامعتبر است" };
  if (typeof b.ciphertext !== "string" || b.ciphertext.length > CIPHERTEXT_B64_MAX) return { ok: false, error: "پیام رمزشده نامعتبر است" };
  const ctLen = b64ByteLength(b.ciphertext);
  if (ctLen === null || ctLen < GCM_TAG_BYTES + 16) return { ok: false, error: "پیام رمزشده نامعتبر است" };
  if (typeof b.iv !== "string" || b64ByteLength(b.iv) !== IV_BYTES) return { ok: false, error: "IV نامعتبر است" };
  if (typeof b.commitment !== "string" || b64ByteLength(b.commitment) !== COMMITMENT_BYTES) return { ok: false, error: "تعهد پیام نامعتبر است" };
  const sv = b.senderKeyVersion;
  const rv = b.recipientKeyVersion;
  if (!Number.isInteger(sv) || !Number.isInteger(rv) || (sv as number) < 1 || (rv as number) < 1 || (sv as number) > 1e6 || (rv as number) > 1e6) {
    return { ok: false, error: "نسخه‌ی کلید نامعتبر است" };
  }
  return {
    ok: true,
    data: {
      clientId: b.clientId,
      ciphertext: b.ciphertext,
      iv: b.iv,
      commitment: b.commitment,
      senderKeyVersion: sv as number,
      recipientKeyVersion: rv as number,
    },
  };
}

// ───────────────────────── دفترچه‌ی کلیدِ عمومی ─────────────────────────

export type PublicKeyRow = { version: number; publicKey: string; current: boolean; createdAt: Date };

/** کلیدِ جاری (بازنشسته‌نشده) یک کاربر */
export async function currentE2EKey(userId: string): Promise<{ version: number; publicKey: string } | null> {
  return prisma.userE2EKey.findFirst({
    where: { userId, retiredAt: null },
    orderBy: { version: "desc" },
    select: { version: true, publicKey: true },
  });
}

/** همه‌ی نسخه‌های کلیدِ عمومیِ چند کاربر — نسخه‌ی قدیمیِ طرفِ مقابل برای خواندنِ پیام‌های قبل از بازنشانی‌اش لازم است */
export async function publicKeysFor(userIds: string[]): Promise<Record<string, PublicKeyRow[]>> {
  const rows = await prisma.userE2EKey.findMany({
    where: { userId: { in: userIds } },
    orderBy: { version: "asc" },
    select: { userId: true, version: true, publicKey: true, retiredAt: true, createdAt: true },
  });
  const out: Record<string, PublicKeyRow[]> = Object.fromEntries(userIds.map((u) => [u, []]));
  for (const r of rows) out[r.userId].push({ version: r.version, publicKey: r.publicKey, current: !r.retiredAt, createdAt: r.createdAt });
  return out;
}
