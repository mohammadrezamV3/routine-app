// هسته‌ی رمزنگاریِ سرتاسریِ گفت‌وگوی منتور — فقط WebCrypto (بدونِ وابستگیِ جدید).
// ایزومورفیک: همین کد در مرورگر (کلاینت)، در Node ≥ 20 (تست‌ها، داده‌ی آزمایشی)
// و در سرور (فقط برای «تاییدِ» تعهدِ فرانکینگ؛ سرور هیچ کلیدِ خصوصی‌ای ندارد) اجرا می‌شود.
//
// طرحِ کامل و دلیلِ هر انتخاب: docs/mentor-e2ee.md. خلاصه:
//   • کلیدِ هویت: ECDH P-256 به‌ازای هر کاربر (نسخه‌دار). کلیدِ عمومی روی سرور.
//   • کلیدِ گفت‌وگو: ECDH(خصوصیِ من، عمومیِ طرف) → HKDF-SHA256 با info شاملِ
//     mentorshipId، شناسه‌ی هر دو طرف، نسخه‌ی هر دو کلید و *جهتِ ارسال* →
//     دو کلیدِ AES-256-GCM (منتور→شاگرد و شاگرد→منتور).
//   • هر پیام: IVِ تصادفیِ ۹۶ بیتی، AAD = (mentorshipId, senderId, clientId, نسخه‌ها).
//   • فرانکینگ: کلیدِ تصادفیِ ۳۲ بایتی داخلِ متنِ رمزشده؛ تعهد = HMAC(fk, زمینه‖متن).
//   • پیامِ scheme 2 (چنددستگاهی): کلیدِ محتوای تصادفی (CEK) متن را رمز می‌کند و CEK برای
//     *هر* کلیدِ فعالِ دو طرف جدا بسته‌بندی می‌شود: ECDH(کلیدِ فرستنده، کلیدِ هدف) → HKDF با
//     زمینه‌ی کامل → AES-256-GCM. همان الگوی Signal/WhatsApp برای چند دستگاه.
//   • پشتیبانِ کلیدِ SYNCED: کلیدِ بسته‌بندیِ مشتق از رمزِ عبورِ حساب روی خودِ دستگاه
//     (PBKDF2-SHA256، ۶۰۰هزار دور، نمکِ اختصاصی + زمینه‌ی جدا) → AES-256-GCM.
//     پشتیبانِ قدیمیِ «رمز گفت‌وگو» (PBKDF2 ≥ ۶۰۰هزار دور) فقط برای یک بار باز کردن می‌ماند.

import { concat, fromB64, fromUtf8, lp, normalizeDigits, toB64, utf8 } from "./encoding";

export class E2EEUnsupportedError extends Error {
  constructor() {
    super("WebCrypto در این مرورگر در دسترس نیست");
  }
}
/** رمزگشایی/احرازِ اصالت شکست خورد (کلیدِ اشتباه، داده‌ی دست‌کاری‌شده، رمزِ نادرست) */
export class E2EEDecryptError extends Error {}

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new E2EEUnsupportedError();
  return c.subtle;
}

export function isE2EESupported(): boolean {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return !!c?.subtle && typeof c.getRandomValues === "function";
}

// TS 5.9: Uint8Array<ArrayBufferLike> مستقیم BufferSource نیست
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function random(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

// ───────────────────────── ثابت‌ها ─────────────────────────

export const E2EE_SCHEME = "v1";
const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;
const HKDF_SALT = utf8("arion/mentor-e2ee/v1/hkdf-salt");
export const PUBLIC_KEY_BYTES = 65; // نقطه‌ی فشرده‌نشده‌ی P-256 (0x04‖X‖Y)
export const IV_BYTES = 12;
export const FRANKING_KEY_BYTES = 32;
export const COMMITMENT_BYTES = 32;
export const GCM_TAG_BYTES = 16;
/** OWASP 2023 برای PBKDF2-HMAC-SHA256 حداقل ۶۰۰هزار؛ ما با حاشیه ۱ میلیون */
export const PBKDF2_ITERATIONS = 1_000_000;
export const PBKDF2_MIN_ITERATIONS = 600_000;
/** سقف تا سرورِ بدخواه نتواند با عددِ عظیم مرورگر را قفل کند */
export const PBKDF2_MAX_ITERATIONS = 5_000_000;
export const BACKUP_SALT_BYTES = 16;
/** طولِ متنِ رمزشده به مضربِ این عدد گرد می‌شود تا طولِ دقیقِ پیام نشت نکند */
const PAD_BLOCK = 128;

// ───────────────────────── کلیدِ هویت ─────────────────────────

export type IdentityKeyPair = { privateKey: CryptoKey; publicKey: CryptoKey; publicB64: string };

/**
 * جفت‌کلیدِ هویتِ تازه. خصوصی فقط برای یک بار (ساختِ پشتیبانِ رمزشده) قابلِ
 * export است؛ نسخه‌ای که روی دستگاه ذخیره می‌شود با importNonExtractable
 * دوباره ساخته می‌شود (غیرقابل‌استخراج).
 */
export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const kp = (await subtle().generateKey(CURVE, true, ["deriveBits"])) as CryptoKeyPair;
  const raw = new Uint8Array(await subtle().exportKey("raw", kp.publicKey));
  return { privateKey: kp.privateKey, publicKey: kp.publicKey, publicB64: toB64(raw) };
}

/** کلیدِ عمومیِ base64 (raw، ۶۵ بایت) → CryptoKey. import خودش «روی منحنی بودن» را چک می‌کند */
export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = fromB64(b64);
  if (!raw || raw.length !== PUBLIC_KEY_BYTES || raw[0] !== 0x04) throw new E2EEDecryptError("کلید عمومی نامعتبر است");
  return subtle().importKey("raw", bs(raw), CURVE, true, []);
}

/** شکلِ سطحیِ کلیدِ عمومی (سمتِ سرور، بدونِ WebCrypto) */
export function isPublicKeyShape(b64: unknown): b64 is string {
  if (typeof b64 !== "string" || b64.length !== 88) return false;
  const raw = fromB64(b64);
  return !!raw && raw.length === PUBLIC_KEY_BYTES && raw[0] === 0x04;
}

export async function exportPkcs8(privateKey: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await subtle().exportKey("pkcs8", privateKey));
}

export async function importPrivatePkcs8(pkcs8: Uint8Array, extractable = false): Promise<CryptoKey> {
  return subtle().importKey("pkcs8", bs(pkcs8), CURVE, extractable, ["deriveBits"]);
}

/** کلیدِ عمومیِ متناظر با یک کلیدِ خصوصیِ PKCS8 (از x,yِ JWK) — برای چکِ سازگاریِ پشتیبان با کلیدِ منتشرشده */
async function publicB64FromPkcs8(pkcs8: Uint8Array): Promise<string> {
  const k = await importPrivatePkcs8(pkcs8, true);
  const jwk = await subtle().exportKey("jwk", k);
  const x = b64urlToBytes(jwk.x || "");
  const y = b64urlToBytes(jwk.y || "");
  if (x.length !== 32 || y.length !== 32) throw new E2EEDecryptError("کلید خصوصی نامعتبر است");
  return toB64(concat(new Uint8Array([4]), x, y));
}

function b64urlToBytes(s: string): Uint8Array {
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  return fromB64(std + "=".repeat((4 - (std.length % 4)) % 4)) ?? new Uint8Array();
}

// ───────────────────────── اثرِ انگشت و کدِ امنیتی ─────────────────────────

async function sha256(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest("SHA-256", bs(b)));
}

/**
 * کدِ امنیتیِ یک گفت‌وگو: ۲۴ رقم (۶ گروهِ ۴تایی) از SHA-256ِ هر دو کلیدِ
 * عمومی و شناسه‌ها، مستقل از این‌که کدام طرف حسابش می‌کند. اگر دو طرف
 * (حضوری یا از کانالی دیگر) کدِ یکسان ببینند، سرور کلیدِ جعلی جا نزده است.
 */
export async function safetyCode(a: { userId: string; publicKey: string }, b: { userId: string; publicKey: string }): Promise<string> {
  const [x, y] = a.userId < b.userId ? [a, b] : [b, a];
  const h = await sha256(lp("arion/safety-code/v1", x.userId, x.publicKey, y.userId, y.publicKey));
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) groups.push(String(((h[i * 3] << 16) | (h[i * 3 + 1] << 8) | h[i * 3 + 2]) % 10000).padStart(4, "0"));
  return groups.join(" ");
}

/** اثرِ انگشتِ کوتاهِ یک کلیدِ عمومی (برای تشخیصِ تغییرِ کلیدِ طرفِ مقابل، TOFU) */
export async function keyFingerprint(userId: string, publicKey: string): Promise<string> {
  return toB64((await sha256(lp("arion/key-fp/v1", userId, publicKey))).subarray(0, 16));
}

// ───────────────────────── مشتقِ کلید ─────────────────────────

async function ecdhHkdfKey(myPrivate: CryptoKey, peerPublic: CryptoKey, info: Uint8Array): Promise<CryptoKey> {
  const shared = await subtle().deriveBits({ name: "ECDH", public: peerPublic }, myPrivate, 256);
  const ikm = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: bs(HKDF_SALT), info: bs(info) },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export type ChatKeyContext = {
  mentorshipId: string;
  mentorId: string;
  studentId: string;
  mentorKeyVersion: number;
  studentKeyVersion: number;
};

export type ChatKeys = { fromMentor: CryptoKey; fromStudent: CryptoKey };

/**
 * دو کلیدِ جهت‌دارِ یک گفت‌وگو. هر دو طرف به همین دو کلید می‌رسند
 * (ECDH متقارن است). info همه‌ی شناسه‌ها و نسخه‌ها را می‌بندد، پس کلیدِ یک
 * گفت‌وگو هرگز برای گفت‌وگوی دیگر (یا نسخه‌ی دیگرِ کلید) کار نمی‌کند.
 */
export async function deriveChatKeys(myPrivate: CryptoKey, peerPublic: CryptoKey, c: ChatKeyContext): Promise<ChatKeys> {
  const base = ["arion/mentor-chat/v1", c.mentorshipId, c.mentorId, c.studentId, c.mentorKeyVersion, c.studentKeyVersion] as const;
  const [fromMentor, fromStudent] = await Promise.all([
    ecdhHkdfKey(myPrivate, peerPublic, lp(...base, "mentor->student")),
    ecdhHkdfKey(myPrivate, peerPublic, lp(...base, "student->mentor")),
  ]);
  return { fromMentor, fromStudent };
}

/**
 * کلیدِ جفتیِ یک «کاربرد» مشخص (مثلا جواب‌های پذیرش: scope = ["intake", mentorId, studentId]).
 * برای فیلدهای متنیِ غیرِ پیام که فقط دو طرف باید بخوانند.
 */
export async function derivePairKey(myPrivate: CryptoKey, peerPublic: CryptoKey, scope: (string | number)[]): Promise<CryptoKey> {
  return ecdhHkdfKey(myPrivate, peerPublic, lp("arion/mentor-pair/v1", ...scope));
}

/**
 * کلیدِ «فقط خودم» (مثلا یادداشتِ خصوصیِ منتور): ECDH کلیدِ خصوصی با
 * عمومیِ خودِ کاربر. فقط دارنده‌ی کلیدِ خصوصی به آن می‌رسد.
 */
export async function deriveSelfKey(myPrivate: CryptoKey, myPublic: CryptoKey, scope: (string | number)[]): Promise<CryptoKey> {
  return ecdhHkdfKey(myPrivate, myPublic, lp("arion/mentor-self/v1", ...scope));
}

// ───────────────────────── رمزِ متن (عمومی) ─────────────────────────

export type SealedText = { ct: string; iv: string };

function pad(b: Uint8Array): Uint8Array {
  // JSON.parse فاصله‌ی انتهایی را نادیده می‌گیرد؛ پس با فاصله پر می‌کنیم
  const target = Math.ceil((b.length + 1) / PAD_BLOCK) * PAD_BLOCK;
  const out = new Uint8Array(target).fill(0x20);
  out.set(b, 0);
  return out;
}

async function aesEncrypt(key: CryptoKey, plain: Uint8Array, aad: Uint8Array): Promise<SealedText> {
  const iv = random(IV_BYTES);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: bs(iv), additionalData: bs(aad), tagLength: 128 }, key, bs(plain));
  return { ct: toB64(ct), iv: toB64(iv) };
}

async function aesDecrypt(key: CryptoKey, s: SealedText, aad: Uint8Array): Promise<Uint8Array> {
  const iv = fromB64(s.iv);
  const ct = fromB64(s.ct);
  if (!iv || iv.length !== IV_BYTES || !ct || ct.length < GCM_TAG_BYTES) throw new E2EEDecryptError("داده‌ی رمزشده بدشکل است");
  try {
    return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: bs(iv), additionalData: bs(aad), tagLength: 128 }, key, bs(ct)));
  } catch {
    throw new E2EEDecryptError("رمزگشایی ممکن نشد");
  }
}

/** رمزِ یک فیلدِ متنی با کلیدِ جفتی/خودی. aad = زمینه‌ی آن فیلد (مثلا ["note", noteId]) */
export async function sealText(key: CryptoKey, text: string, aad: (string | number)[]): Promise<SealedText> {
  return aesEncrypt(key, pad(utf8(JSON.stringify({ v: 1, t: text }))), lp("arion/mentor-field/v1", ...aad));
}

export async function openText(key: CryptoKey, s: SealedText, aad: (string | number)[]): Promise<string> {
  const plain = await aesDecrypt(key, s, lp("arion/mentor-field/v1", ...aad));
  const obj = parsePayload(plain);
  if (typeof obj.t !== "string") throw new E2EEDecryptError("محتوای رمزشده بدشکل است");
  return obj.t;
}

function parsePayload(plain: Uint8Array): Record<string, unknown> {
  try {
    const o = JSON.parse(fromUtf8(plain));
    if (!o || typeof o !== "object" || o.v !== 1) throw new Error();
    return o as Record<string, unknown>;
  } catch {
    throw new E2EEDecryptError("محتوای رمزشده بدشکل است");
  }
}

// ───────────────────────── پیام + فرانکینگ ─────────────────────────

export type MessageContext = {
  mentorshipId: string;
  senderId: string;
  /** شناسه‌ی تصادفیِ سمتِ کلاینت؛ سرور یکتاییِ (mentorshipId, clientId) را اجبار می‌کند → ضدِ replay */
  clientId: string;
  senderKeyVersion: number;
  recipientKeyVersion: number;
};

/** قالبِ scheme 1 (کلیدِ جفتیِ نسخه‌دار) — فقط برای خواندنِ پیام‌های قدیمی و تست‌ها */
export type EncryptedMessageV1 = {
  v?: 1;
  clientId: string;
  ciphertext: string;
  iv: string;
  senderKeyVersion: number;
  recipientKeyVersion: number;
  /** تعهدِ فرانکینگ (base64، ۳۲ بایت) — تنها چیزِ مشتق از متن که سرور می‌بیند، و بدونِ fk هیچ اطلاعی نمی‌دهد */
  commitment: string;
};

export function messageAad(c: MessageContext): Uint8Array {
  return lp("arion/mentor-msg/v1", c.mentorshipId, c.senderId, c.clientId, c.senderKeyVersion, c.recipientKeyVersion);
}

function frankingInput(c: Pick<MessageContext, "mentorshipId" | "senderId" | "clientId">, text: string): Uint8Array {
  return lp("arion/mentor-frank/v1", c.mentorshipId, c.senderId, c.clientId, text);
}

async function hmacKey(fk: Uint8Array, usage: "sign" | "verify"): Promise<CryptoKey> {
  return subtle().importKey("raw", bs(fk), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function computeCommitment(fk: Uint8Array, c: Pick<MessageContext, "mentorshipId" | "senderId" | "clientId">, text: string): Promise<Uint8Array> {
  return new Uint8Array(await subtle().sign("HMAC", await hmacKey(fk, "sign"), bs(frankingInput(c, text))));
}

/**
 * تاییدِ تعهد (زمان‌ثابت، با subtle.verify). هم کلاینتِ گیرنده بعد از رمزگشایی
 * صدایش می‌زند (پیامِ «غیرقابل‌گزارش» نمایش داده نشود) و هم سرور هنگامِ گزارش.
 */
export async function verifyCommitment(
  fkB64: string,
  commitmentB64: string,
  c: Pick<MessageContext, "mentorshipId" | "senderId" | "clientId">,
  text: string
): Promise<boolean> {
  const fk = fromB64(fkB64);
  const cm = fromB64(commitmentB64);
  if (!fk || fk.length !== FRANKING_KEY_BYTES || !cm || cm.length !== COMMITMENT_BYTES) return false;
  try {
    return await subtle().verify("HMAC", await hmacKey(fk, "verify"), bs(cm), bs(frankingInput(c, text)));
  } catch {
    return false;
  }
}

export async function encryptMessage(key: CryptoKey, text: string, c: MessageContext): Promise<EncryptedMessageV1 & { frankingKey: string }> {
  const fk = random(FRANKING_KEY_BYTES);
  const commitment = await computeCommitment(fk, c, text);
  const payload = pad(utf8(JSON.stringify({ v: 1, t: text, f: toB64(fk) })));
  const { ct, iv } = await aesEncrypt(key, payload, messageAad(c));
  return {
    clientId: c.clientId,
    ciphertext: ct,
    iv,
    senderKeyVersion: c.senderKeyVersion,
    recipientKeyVersion: c.recipientKeyVersion,
    commitment: toB64(commitment),
    frankingKey: toB64(fk),
  };
}

export type DecryptedMessage = {
  text: string;
  frankingKey: string;
  /** تعهدِ ذخیره‌شده روی سرور با متن و fkِ داخلِ پیام می‌خواند (پیام قابلِ گزارش است) */
  committed: boolean;
};

export async function decryptMessage(
  key: CryptoKey,
  m: { ciphertext: string; iv: string; commitment: string },
  c: MessageContext
): Promise<DecryptedMessage> {
  const plain = await aesDecrypt(key, { ct: m.ciphertext, iv: m.iv }, messageAad(c));
  const o = parsePayload(plain);
  if (typeof o.t !== "string" || typeof o.f !== "string") throw new E2EEDecryptError("محتوای رمزشده بدشکل است");
  const committed = await verifyCommitment(o.f, m.commitment, c, o.t);
  return { text: o.t, frankingKey: o.f, committed };
}

// ───────────────────────── پشتیبانِ کلید با رمزِ گفت‌وگو ─────────────────────────

export type KeyBackup = {
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string; // base64، ۱۶ بایت
  iv: string; // base64، ۱۲ بایت
  ciphertext: string; // base64، PKCS8ِ رمزشده
};

/** یکسان‌سازیِ رمز: NFC + ارقامِ فارسی/عربی → لاتین (تا روی هر کیبوردی همان کلید ساخته شود) */
export function normalizePasscode(p: string): string {
  return normalizeDigits(p.normalize("NFC"));
}

async function passcodeKey(passcode: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", bs(utf8(normalizePasscode(passcode))), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: bs(salt), iterations }, base, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function backupAad(userId: string, version: number, publicKey: string): Uint8Array {
  return lp("arion/e2ee-backup/v1", userId, version, publicKey);
}

/** بسته‌بندیِ کلیدِ خصوصی با رمزِ گفت‌وگو. privateKey باید extractable باشد (فقط لحظه‌ی ساخت/تغییرِ رمز) */
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  passcode: string,
  ctx: { userId: string; version: number; publicKey: string },
  iterations = PBKDF2_ITERATIONS
): Promise<KeyBackup> {
  const salt = random(BACKUP_SALT_BYTES);
  const key = await passcodeKey(passcode, salt, iterations);
  const pkcs8 = await exportPkcs8(privateKey);
  const { ct, iv } = await aesEncrypt(key, pkcs8, backupAad(ctx.userId, ctx.version, ctx.publicKey));
  pkcs8.fill(0);
  return { kdf: "PBKDF2-SHA256", iterations, salt: toB64(salt), iv, ciphertext: ct };
}

/**
 * باز کردنِ پشتیبان. رمزِ نادرست → E2EEDecryptError. کلیدِ به‌دست‌آمده باید
 * با کلیدِ عمومیِ منتشرشده بخواند (وگرنه خطا) — AAD هم userId/نسخه/کلیدِ عمومی
 * را می‌بندد، پس پشتیبانِ یک کاربر/نسخه جای دیگری پذیرفته نمی‌شود.
 */
export async function unwrapPrivateKey(
  b: KeyBackup,
  passcode: string,
  ctx: { userId: string; version: number; publicKey: string },
  extractable = false
): Promise<CryptoKey> {
  if (b.kdf !== "PBKDF2-SHA256" || !Number.isInteger(b.iterations) || b.iterations < PBKDF2_MIN_ITERATIONS || b.iterations > PBKDF2_MAX_ITERATIONS) {
    throw new E2EEDecryptError("پشتیبان کلید نامعتبر است");
  }
  const salt = fromB64(b.salt);
  if (!salt || salt.length !== BACKUP_SALT_BYTES) throw new E2EEDecryptError("پشتیبان کلید نامعتبر است");
  const key = await passcodeKey(passcode, salt, b.iterations);
  const pkcs8 = await aesDecrypt(key, { ct: b.ciphertext, iv: b.iv }, backupAad(ctx.userId, ctx.version, ctx.publicKey));
  try {
    if ((await publicB64FromPkcs8(pkcs8)) !== ctx.publicKey) throw new E2EEDecryptError("پشتیبان با کلید منتشرشده نمی‌خواند");
    return await importPrivatePkcs8(pkcs8, extractable);
  } finally {
    pkcs8.fill(0);
  }
}

/** شکلِ سطحیِ پشتیبان (سمتِ سرور) */
export function isKeyBackupShape(v: unknown): v is KeyBackup {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  const salt = typeof b.salt === "string" ? fromB64(b.salt) : null;
  const iv = typeof b.iv === "string" ? fromB64(b.iv) : null;
  const ct = typeof b.ciphertext === "string" && b.ciphertext.length <= 1024 ? fromB64(b.ciphertext) : null;
  return (
    b.kdf === "PBKDF2-SHA256" &&
    Number.isInteger(b.iterations) &&
    (b.iterations as number) >= PBKDF2_MIN_ITERATIONS &&
    (b.iterations as number) <= PBKDF2_MAX_ITERATIONS &&
    !!salt && salt.length === BACKUP_SALT_BYTES &&
    !!iv && iv.length === IV_BYTES &&
    !!ct && ct.length > GCM_TAG_BYTES + 32
  );
}

// ═══════════════════════ scheme 2: چنددستگاهی ═══════════════════════
//
// هر کاربر می‌تواند چند کلیدِ فعال داشته باشد (یک SYNCED + کلیدِ هر دستگاه). متن یک بار
// با CEKِ تصادفی رمز می‌شود و CEK برای هر کلیدِ فعالِ هر دو طرف (از جمله دستگاه‌های
// دیگرِ خودِ فرستنده) جدا بسته‌بندی می‌شود. سرور تعدادِ بسته‌بندی‌ها و صاحبِ هرکدام را
// می‌بیند (یعنی تعدادِ دستگاه‌ها را)، نه محتوا را.

/** اشاره به یک کلیدِ مشخص: کاربر + نسخه (نسخه در هر کاربر یکتاست) */
export type KeyRef = { u: string; k: number };
/** CEKِ بسته‌بندی‌شده برای کلیدِ (u, k). via = انتقالِ سابقه با کلیدِ via از *همان* کاربر */
export type KeyWrap = { u: string; k: number; w: string; via?: number };
export const CEK_BYTES = 32;
export const WRAP_BYTES = IV_BYTES + CEK_BYTES + GCM_TAG_BYTES;
/** سقفِ کلیدهای فعالِ یک کاربر که پیام برایشان بسته‌بندی می‌شود (۱ SYNCED + دستگاه‌ها) */
export const MAX_ACTIVE_KEYS = 10;
const HKDF_SALT_V2 = utf8("arion/mentor-e2ee/v2/hkdf-salt");

export type EncryptedMessageV2 = {
  v: 2;
  clientId: string;
  ciphertext: string;
  iv: string;
  commitment: string;
  /** کلیدی که بسته‌بندی‌ها را ساخته (معمولا کلیدِ فرستنده روی دستگاهِ ارسال) */
  from: KeyRef;
  wraps: KeyWrap[];
};
export type EncryptedMessage = EncryptedMessageV1 | EncryptedMessageV2;

export function isV2(m: EncryptedMessage | null | undefined): m is EncryptedMessageV2 {
  return !!m && (m as EncryptedMessageV2).v === 2;
}

/** کلیدِ خصوصیِ در دسترس روی این دستگاه */
export type OwnKey = { ref: KeyRef; privateKey: CryptoKey };
/** کلیدِ عمومیِ یک هدف */
export type TargetKey = { ref: KeyRef; publicKey: string };

// ECDH گران‌ترین قدم است؛ پایه‌ی HKDFِ هر جفت (کلیدِ خصوصی، کلیدِ عمومی) یک بار ساخته
// و در حافظه (نه روی دیسک) نگه داشته می‌شود. غیرقابل‌استخراج.
const pairBaseCache = new WeakMap<CryptoKey, Map<string, Promise<CryptoKey>>>();

function pairBase(myPrivate: CryptoKey, peerPublicB64: string): Promise<CryptoKey> {
  let m = pairBaseCache.get(myPrivate);
  if (!m) {
    m = new Map();
    pairBaseCache.set(myPrivate, m);
  }
  let p = m.get(peerPublicB64);
  if (!p) {
    const cache = m;
    p = (async () => {
      const pub = await importPublicKey(peerPublicB64);
      const shared = await subtle().deriveBits({ name: "ECDH", public: pub }, myPrivate, 256);
      return subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
    })();
    p.catch(() => cache.delete(peerPublicB64));
    m.set(peerPublicB64, p);
  }
  return p;
}

/** scope = کاربردِ بسته‌بندی (مثلا ["msg", mentorshipId, clientId]) — کلیدِ هر پیام/یادداشت جداست */
async function wrapKeyFor(base: CryptoKey, scope: (string | number)[], from: KeyRef, to: KeyRef): Promise<CryptoKey> {
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: bs(HKDF_SALT_V2), info: bs(lp("arion/e2ee-wrap/v2", scope.length, ...scope, from.u, from.k, to.u, to.k)) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function wrapAad(scope: (string | number)[], from: KeyRef, to: KeyRef): Uint8Array {
  return lp("arion/e2ee-wrap-aad/v2", scope.length, ...scope, from.u, from.k, to.u, to.k);
}

/** بسته‌بندیِ CEK برای یک هدف با کلیدِ from (خصوصیِ from روی همین دستگاه است) */
export async function wrapCek(cek: Uint8Array, from: OwnKey, to: TargetKey, scope: (string | number)[], via?: number): Promise<KeyWrap> {
  if (cek.length !== CEK_BYTES) throw new E2EEDecryptError("کلید محتوا نامعتبر است");
  const key = await wrapKeyFor(await pairBase(from.privateKey, to.publicKey), scope, from.ref, to.ref);
  const iv = random(IV_BYTES);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: bs(iv), additionalData: bs(wrapAad(scope, from.ref, to.ref)), tagLength: 128 }, key, bs(cek)));
  const w: KeyWrap = { u: to.ref.u, k: to.ref.k, w: toB64(concat(iv, ct)) };
  if (via !== undefined) w.via = via;
  return w;
}

/** باز کردنِ بسته‌بندی با کلیدِ خصوصیِ هدف؛ fromPublic = کلیدِ عمومیِ سازنده‌ی بسته‌بندی */
export async function unwrapCek(w: KeyWrap, mine: OwnKey, from: TargetKey, scope: (string | number)[]): Promise<Uint8Array> {
  if (w.u !== mine.ref.u || w.k !== mine.ref.k) throw new E2EEDecryptError("این بسته‌بندی برای کلید دیگری است");
  const raw = fromB64(w.w);
  if (!raw || raw.length !== WRAP_BYTES) throw new E2EEDecryptError("بسته‌بندی بدشکل است");
  const key = await wrapKeyFor(await pairBase(mine.privateKey, from.publicKey), scope, from.ref, mine.ref);
  try {
    return new Uint8Array(
      await subtle().decrypt(
        { name: "AES-GCM", iv: bs(raw.subarray(0, IV_BYTES)), additionalData: bs(wrapAad(scope, from.ref, mine.ref)), tagLength: 128 },
        key,
        bs(raw.subarray(IV_BYTES))
      )
    );
  } catch {
    throw new E2EEDecryptError("بسته‌بندی باز نشد");
  }
}

async function cekKey(cek: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey("raw", bs(cek), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** رمزِ یک محتوا با CEKِ تازه + بسته‌بندی برای همه‌ی هدف‌ها */
export async function sealEnvelope(
  plain: Uint8Array,
  aad: Uint8Array,
  scope: (string | number)[],
  from: OwnKey,
  targets: TargetKey[]
): Promise<{ ct: string; iv: string; wraps: KeyWrap[] }> {
  const seen = new Set<string>();
  for (const t of targets) {
    const id = `${t.ref.u}:${t.ref.k}`;
    if (seen.has(id)) throw new E2EEDecryptError("هدفِ تکراری");
    seen.add(id);
  }
  const cek = random(CEK_BYTES);
  try {
    const { ct, iv } = await aesEncrypt(await cekKey(cek), plain, aad);
    const wraps = await Promise.all(targets.map((t) => wrapCek(cek, from, t, scope)));
    return { ct, iv, wraps };
  } finally {
    cek.fill(0);
  }
}

/**
 * پیدا کردنِ CEK: بسته‌بندی‌ای که برای یکی از کلیدهای من است. fromOf نسخه‌ی عمومیِ
 * سازنده‌ی بسته‌بندی را می‌دهد (via → کلیدِ دیگرِ خودم؛ وگرنه from پیام). null = هیچ
 * بسته‌بندی‌ای برای کلیدهای این دستگاه نیست.
 */
export async function findCek(
  wraps: KeyWrap[],
  mine: OwnKey[],
  from: KeyRef,
  publicOf: (ref: KeyRef) => string | null,
  scope: (string | number)[]
): Promise<Uint8Array | null> {
  let tried = false;
  for (const w of wraps) {
    const own = mine.find((m) => m.ref.u === w.u && m.ref.k === w.k);
    if (!own) continue;
    const src: KeyRef = w.via !== undefined ? { u: w.u, k: w.via } : from;
    const pub = publicOf(src);
    if (!pub) continue;
    tried = true;
    try {
      return await unwrapCek(w, own, { ref: src, publicKey: pub }, scope);
    } catch {
      // بسته‌بندیِ بعدی (مثلا هم مستقیم هم via)
    }
  }
  if (tried) throw new E2EEDecryptError("بسته‌بندی باز نشد");
  return null;
}

export async function openEnvelope(cek: Uint8Array, s: SealedText, aad: Uint8Array): Promise<Uint8Array> {
  return aesDecrypt(await cekKey(cek), s, aad);
}

export function messageScope(mentorshipId: string, clientId: string): (string | number)[] {
  return ["msg", mentorshipId, clientId];
}

function messageAadV2(c: Pick<MessageContext, "mentorshipId" | "senderId" | "clientId">): Uint8Array {
  return lp("arion/mentor-msg/v2", c.mentorshipId, c.senderId, c.clientId);
}

/**
 * پیامِ scheme 2. senderId = فرستنده‌ی پیام (در AAD و تعهد)؛ from = کلیدی که
 * بسته‌بندی‌ها را می‌سازد (معمولا کلیدِ همان فرستنده؛ در بازرمزگذاریِ پیامِ قدیمی
 * می‌تواند کلیدِ طرفِ دیگر باشد).
 */
export async function encryptMessageV2(
  text: string,
  c: { mentorshipId: string; senderId: string; clientId: string },
  from: OwnKey,
  targets: TargetKey[],
  frankingKey?: Uint8Array
): Promise<EncryptedMessageV2 & { frankingKey: string }> {
  const fk = frankingKey ?? random(FRANKING_KEY_BYTES);
  const commitment = await computeCommitment(fk, c, text);
  const payload = pad(utf8(JSON.stringify({ v: 1, t: text, f: toB64(fk) })));
  const env = await sealEnvelope(payload, messageAadV2(c), messageScope(c.mentorshipId, c.clientId), from, targets);
  return { v: 2, clientId: c.clientId, ciphertext: env.ct, iv: env.iv, commitment: toB64(commitment), from: from.ref, wraps: env.wraps, frankingKey: toB64(fk) };
}

/** رمزگشاییِ پیامِ scheme 2. null = این دستگاه هیچ کلیدی برای این پیام ندارد */
export async function decryptMessageV2(
  m: EncryptedMessageV2,
  c: { mentorshipId: string; senderId: string },
  mine: OwnKey[],
  publicOf: (ref: KeyRef) => string | null
): Promise<DecryptedMessage | null> {
  const ctx = { ...c, clientId: m.clientId };
  const cek = await findCek(m.wraps, mine, m.from, publicOf, messageScope(c.mentorshipId, m.clientId));
  if (!cek) return null;
  try {
    const plain = await openEnvelope(cek, { ct: m.ciphertext, iv: m.iv }, messageAadV2(ctx));
    const o = parsePayload(plain);
    if (typeof o.t !== "string" || typeof o.f !== "string") throw new E2EEDecryptError("محتوای رمزشده بدشکل است");
    const committed = await verifyCommitment(o.f, m.commitment, ctx, o.t);
    return { text: o.t, frankingKey: o.f, committed };
  } finally {
    cek.fill(0);
  }
}

/**
 * انتقالِ سابقه: CEKِ یک پیام را با یکی از کلیدهای من باز و برای کلیدِ دیگرِ *خودم*
 * بسته‌بندی می‌کند (via = کلیدِ منبع). متنِ پیام دست نمی‌خورد، پس تعهدِ فرانکینگ و
 * گزارش‌پذیری همان می‌ماند.
 */
export async function rewrapForOwnKey(
  wraps: KeyWrap[],
  from: KeyRef,
  source: OwnKey,
  target: TargetKey,
  publicOf: (ref: KeyRef) => string | null,
  scope: (string | number)[]
): Promise<KeyWrap | null> {
  if (source.ref.u !== target.ref.u) throw new E2EEDecryptError("انتقال فقط بینِ کلیدهای یک کاربر");
  const cek = await findCek(wraps, [source], from, publicOf, scope);
  if (!cek) return null;
  try {
    return await wrapCek(cek, source, target, scope, source.ref.k);
  } finally {
    cek.fill(0);
  }
}

// ───────────────────────── کدِ امنیتیِ چنددستگاهی ─────────────────────────

/**
 * کدِ امنیتیِ یک گفت‌وگو روی *همه‌ی* کلیدهای فعالِ دو طرف (مرتب‌شده). اگر سرور
 * دستگاهِ جعلی به فهرستِ یکی اضافه کند، کد روی دو دستگاه فرق می‌کند.
 */
export async function safetyCodeForSets(a: { userId: string; publicKeys: string[] }, b: { userId: string; publicKeys: string[] }): Promise<string> {
  const [x, y] = a.userId < b.userId ? [a, b] : [b, a];
  const xs = [...x.publicKeys].sort();
  const ys = [...y.publicKeys].sort();
  const h = await sha256(lp("arion/safety-code/v2", x.userId, xs.length, ...xs, y.userId, ys.length, ...ys));
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) groups.push(String(((h[i * 3] << 16) | (h[i * 3 + 1] << 8) | h[i * 3 + 2]) % 10000).padStart(4, "0"));
  return groups.join(" ");
}

/** کدِ کوتاهِ «انتقال سابقه»: از کلیدِ عمومیِ دستگاهِ تازه — هر دو دستگاه باید همین را ببینند */
export async function linkCode(userId: string, targetVersion: number, targetPublicKey: string, requestId: string): Promise<string> {
  const h = await sha256(lp("arion/e2ee-link-code/v1", userId, targetVersion, targetPublicKey, requestId));
  const n = ((h[0] << 16) | (h[1] << 8) | h[2]) % 1_000_000;
  const s = String(n).padStart(6, "0");
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

// ═══════════════════════ کلیدِ بسته‌بندیِ مشتق از رمزِ عبور ═══════════════════════
//
// فقط روی دستگاه، لحظه‌ی ورود/ثبت‌نام/تغییرِ رمز (همان رمزی که به‌هرحال به
// /api/auth/callback می‌رود؛ هیچ درخواستِ تازه‌ای رمز را نمی‌برد). ورودیِ PBKDF2
// با برچسبِ جدا + شناسه‌ی کاربر + نمکِ تصادفیِ اختصاصی است، پس با bcryptِ سرور یا
// هر مشتقِ دیگری یکی نمی‌شود. خروجی غیرقابل‌استخراج است.

export const PASSWORD_KDF_ITERATIONS = 600_000;
export const KDF_SALT_BYTES = 16;

export async function derivePasswordKek(password: string, userId: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const salt = fromB64(saltB64);
  if (!salt || salt.length !== KDF_SALT_BYTES) throw new E2EEDecryptError("نمک نامعتبر است");
  if (!Number.isInteger(iterations) || iterations < PBKDF2_MIN_ITERATIONS || iterations > PBKDF2_MAX_ITERATIONS) throw new E2EEDecryptError("پارامترِ KDF نامعتبر است");
  if (!password) throw new E2EEDecryptError("رمز خالی است");
  const base = await subtle().importKey("raw", bs(utf8(password)), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: bs(lp("arion/e2ee-password-kek/v2", userId, salt)), iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function randomSaltB64(): string {
  return toB64(random(KDF_SALT_BYTES));
}

function kekBackupAad(userId: string, version: number, publicKey: string): Uint8Array {
  return lp("arion/e2ee-backup/v2-password", userId, version, publicKey);
}

/** بسته‌بندیِ کلیدِ SYNCED با کلیدِ مشتق از رمزِ عبور (privateKey باید extractable باشد) */
export async function wrapPrivateKeyWithKek(
  privateKey: CryptoKey,
  kek: CryptoKey,
  ctx: { userId: string; version: number; publicKey: string },
  kdf: { salt: string; iterations: number }
): Promise<KeyBackup> {
  const pkcs8 = await exportPkcs8(privateKey);
  try {
    const { ct, iv } = await aesEncrypt(kek, pkcs8, kekBackupAad(ctx.userId, ctx.version, ctx.publicKey));
    return { kdf: "PBKDF2-SHA256", iterations: kdf.iterations, salt: kdf.salt, iv, ciphertext: ct };
  } finally {
    pkcs8.fill(0);
  }
}

export async function unwrapPrivateKeyWithKek(
  b: KeyBackup,
  kek: CryptoKey,
  ctx: { userId: string; version: number; publicKey: string },
  extractable = false
): Promise<CryptoKey> {
  const pkcs8 = await aesDecrypt(kek, { ct: b.ciphertext, iv: b.iv }, kekBackupAad(ctx.userId, ctx.version, ctx.publicKey));
  try {
    if ((await publicB64FromPkcs8(pkcs8)) !== ctx.publicKey) throw new E2EEDecryptError("پشتیبان با کلید منتشرشده نمی‌خواند");
    return await importPrivatePkcs8(pkcs8, extractable);
  } finally {
    pkcs8.fill(0);
  }
}
