// فقط سمتِ سرور (node:crypto + prisma) — هرگز از کامپوننتِ کلاینت import نشود.
import nodeCrypto from "crypto";
import { prisma } from "@/lib/prisma";
import { b64ByteLength } from "./encoding";
import { COMMITMENT_BYTES, GCM_TAG_BYTES, IV_BYTES, MAX_ACTIVE_KEYS, WRAP_BYTES, type EncryptedMessageV2, type KeyWrap } from "./core";

// کمک‌های سمتِ سرورِ رمزگذاری. سرور هیچ کلیدِ خصوصیِ کاربری ندارد؛ این فایل فقط:
//   ۱) برچسبِ سرور روی تعهدِ فرانکینگ (HMAC با رازِ سرور) می‌سازد/تایید می‌کند،
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

export type EncryptedInput = EncryptedMessageV2;

const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const isVersion = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 1e6;

/**
 * فقط scheme 2 (چنددستگاهی) برای پیامِ تازه پذیرفته می‌شود. شکلِ هر بسته‌بندی چک
 * می‌شود؛ این‌که بسته‌بندی‌ها دقیقا کلیدهای فعالِ دو طرف را پوشش دهند را
 * checkWrapTargets (همین فایل) با دیتابیس می‌سنجد.
 */
export function parseEncryptedMessage(v: unknown): { ok: true; data: EncryptedInput } | { ok: false; error: string } {
  if (!v || typeof v !== "object") return { ok: false, error: "پیام رمزشده لازم است" };
  const b = v as Record<string, unknown>;
  if ("body" in b || "text" in b) return { ok: false, error: "متن ساده پذیرفته نمی‌شود؛ پیام باید روی دستگاه رمزگذاری شود" };
  if (b.v !== 2) return { ok: false, error: "نسخه‌ی رمزگذاری پیام قدیمی است؛ صفحه را تازه کن" };
  if (typeof b.clientId !== "string" || !CLIENT_ID_RE.test(b.clientId)) return { ok: false, error: "شناسه‌ی پیام نامعتبر است" };
  if (typeof b.ciphertext !== "string" || b.ciphertext.length > CIPHERTEXT_B64_MAX) return { ok: false, error: "پیام رمزشده نامعتبر است" };
  const ctLen = b64ByteLength(b.ciphertext);
  if (ctLen === null || ctLen < GCM_TAG_BYTES + 16) return { ok: false, error: "پیام رمزشده نامعتبر است" };
  if (typeof b.iv !== "string" || b64ByteLength(b.iv) !== IV_BYTES) return { ok: false, error: "IV نامعتبر است" };
  if (typeof b.commitment !== "string" || b64ByteLength(b.commitment) !== COMMITMENT_BYTES) return { ok: false, error: "تعهد پیام نامعتبر است" };
  const from = b.from as Record<string, unknown> | null;
  if (!from || typeof from !== "object" || typeof from.u !== "string" || !USER_ID_RE.test(from.u) || !isVersion(from.k)) {
    return { ok: false, error: "کلید فرستنده نامعتبر است" };
  }
  const wraps = parseWraps(b.wraps, 2 * MAX_ACTIVE_KEYS, false);
  if (!wraps) return { ok: false, error: "بسته‌بندی کلید نامعتبر است" };
  return {
    ok: true,
    data: { v: 2, clientId: b.clientId, ciphertext: b.ciphertext, iv: b.iv, commitment: b.commitment, from: { u: from.u, k: from.k as number }, wraps },
  };
}

/** فهرستِ بسته‌بندی‌ها: شکلِ هرکدام + بی‌تکرار بودنِ (u, k). allowVia فقط برای انتقالِ سابقه */
export function parseWraps(v: unknown, max: number, allowVia: boolean): KeyWrap[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > max) return null;
  const seen = new Set<string>();
  const out: KeyWrap[] = [];
  for (const w of v) {
    if (!w || typeof w !== "object") return null;
    const x = w as Record<string, unknown>;
    if (typeof x.u !== "string" || !USER_ID_RE.test(x.u) || !isVersion(x.k) || typeof x.w !== "string" || b64ByteLength(x.w) !== WRAP_BYTES) return null;
    if (x.via !== undefined && (!allowVia || !isVersion(x.via))) return null;
    const id = `${x.u}:${x.k}`;
    if (seen.has(id)) return null;
    seen.add(id);
    out.push(x.via !== undefined ? { u: x.u, k: x.k as number, w: x.w, via: x.via as number } : { u: x.u, k: x.k as number, w: x.w });
  }
  return out;
}

// ───────────────────────── دفترچه‌ی کلیدِ عمومی ─────────────────────────

export type PublicKeyRow = { version: number; publicKey: string; current: boolean; kind: "SYNCED" | "DEVICE"; createdAt: Date };
export type ActiveKey = { version: number; publicKey: string; kind: "SYNCED" | "DEVICE" };

/** یکی از کلیدهای فعالِ کاربر (SYNCED ترجیح دارد) — فقط برای «کلید دارد یا نه» */
export async function currentE2EKey(userId: string): Promise<ActiveKey | null> {
  const rows = await activeKeysFor([userId]);
  return rows[userId][0] ?? null;
}

/** همه‌ی کلیدهای فعالِ چند کاربر؛ SYNCED اول، بعد به ترتیبِ نسخه */
export async function activeKeysFor(userIds: string[]): Promise<Record<string, ActiveKey[]>> {
  const rows = await prisma.userE2EKey.findMany({
    where: { userId: { in: userIds }, retiredAt: null },
    orderBy: { version: "asc" },
    select: { userId: true, version: true, publicKey: true, kind: true },
  });
  const out: Record<string, ActiveKey[]> = Object.fromEntries(userIds.map((u) => [u, []]));
  for (const r of rows) out[r.userId].push({ version: r.version, publicKey: r.publicKey, kind: r.kind });
  for (const u of userIds) out[u].sort((a, b) => (a.kind === b.kind ? a.version - b.version : a.kind === "SYNCED" ? -1 : 1));
  return out;
}

export type WrapCheck = "ok" | "NO_KEY" | "PEER_NO_KEY" | "KEY_CHANGED";

/**
 * بسته‌بندی‌های یک پیام باید *دقیقا* کلیدهای فعالِ همه‌ی participants را پوشش دهند
 * (نه کمتر: دستگاهی جا نماند؛ نه بیشتر: کلیدِ ناشناس/بازنشسته) و from یکی از کلیدهای
 * فعالِ fromUserId باشد. ناهمخوانی = KEY_CHANGED تا کلاینت کلیدها را تازه کند.
 */
export async function checkWrapTargets(input: Pick<EncryptedInput, "from" | "wraps">, fromUserId: string, participants: string[]): Promise<WrapCheck> {
  const active = await activeKeysFor(participants);
  if (!active[fromUserId]?.length) return "NO_KEY";
  if (participants.some((u) => !active[u].length)) return "PEER_NO_KEY";
  if (input.from.u !== fromUserId || !active[fromUserId].some((k) => k.version === input.from.k)) return "KEY_CHANGED";
  const want = new Set(participants.flatMap((u) => active[u].map((k) => `${u}:${k.version}`)));
  if (input.wraps.length !== want.size) return "KEY_CHANGED";
  for (const w of input.wraps) if (w.via !== undefined || !want.has(`${w.u}:${w.k}`)) return "KEY_CHANGED";
  return "ok";
}

/** همه‌ی نسخه‌های کلیدِ عمومیِ چند کاربر — نسخه‌ی قدیمیِ طرفِ مقابل برای خواندنِ پیام‌های قبل از بازنشانی‌اش لازم است */
export async function publicKeysFor(userIds: string[]): Promise<Record<string, PublicKeyRow[]>> {
  const rows = await prisma.userE2EKey.findMany({
    where: { userId: { in: userIds } },
    orderBy: { version: "asc" },
    select: { userId: true, version: true, publicKey: true, retiredAt: true, kind: true, createdAt: true },
  });
  const out: Record<string, PublicKeyRow[]> = Object.fromEntries(userIds.map((u) => [u, []]));
  for (const r of rows) out[r.userId].push({ version: r.version, publicKey: r.publicKey, current: !r.retiredAt, kind: r.kind, createdAt: r.createdAt });
  return out;
}
