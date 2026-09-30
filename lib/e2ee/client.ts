"use client";

import { useEffect, useState } from "react";
import {
  E2EEDecryptError,
  decryptMessage,
  decryptMessageV2,
  deriveChatKeys,
  derivePasswordKek,
  encryptMessageV2,
  exportPkcs8,
  generateIdentityKeyPair,
  importPrivatePkcs8,
  importPublicKey,
  isE2EESupported,
  isV2,
  keyFingerprint,
  linkCode,
  messageScope,
  randomSaltB64,
  rewrapForOwnKey,
  safetyCodeForSets,
  unwrapPrivateKey,
  unwrapPrivateKeyWithKek,
  wrapPrivateKeyWithKek,
  type ChatKeys,
  type EncryptedMessage,
  type EncryptedMessageV2,
  type KeyBackup,
  type KeyRef,
  type KeyWrap,
  type OwnKey,
  type TargetKey,
} from "./core";
import { randomId } from "./encoding";
import { openNote, sealNote } from "./notes";
import type { ChatMessage } from "@/lib/mentorTypes";
import {
  deleteKek,
  deleteLocalKey,
  deletePending,
  getKek,
  getPeer,
  getPending,
  isPersistent,
  listLocalKeys,
  onWipe,
  putKek,
  putLocalKey,
  putPeer,
  putPending,
  wipeUser,
  type LocalKey,
} from "./keyStore";

// لایه‌ی کلاینتِ رمزگذاریِ سرتاسری — *خودکار*، بدونِ هیچ رمزِ جداگانه‌ای
// (docs/mentor-e2ee.md). کاربر هیچ کاری نمی‌کند:
//
//   • حسابِ رمزدار: لحظه‌ی ورود/ثبت‌نام، از همان رمزِ عبور روی دستگاه یک KEK مشتق
//     می‌شود (primeE2EEFromPassword). با آن کلیدِ SYNCED بی‌صدا ساخته یا از پشتیبان
//     باز می‌شود؛ روی هر دستگاهی که با رمز وارد شود همان کلید و همه‌ی سابقه هست.
//   • حسابِ گوگل (بی‌رمز) یا نشستی که از پیش از این تغییر باز مانده: کلیدِ DEVICEِ
//     همین دستگاه. پیام‌ها برای همه‌ی کلیدهای فعالِ دو طرف بسته‌بندی می‌شوند، پس هر
//     دستگاه از لحظه‌ی ساختِ کلیدش همه‌ی پیام‌های تازه را می‌خواند. سابقه‌ی قبلی با
//     «انتقال سابقه از دستگاه دیگر» (تایید با کدِ کوتاه روی دستگاهِ قدیمی) می‌آید.
//   • پشتیبانِ قدیمیِ «رمز گفت‌وگو»: یک بار رمزِ قدیمی خواسته و به روشِ تازه منتقل می‌شود.

export type KeyKind = "SYNCED" | "DEVICE";
export type RingKey = { version: number; kind: KeyKind; publicKey: string; privateKey: CryptoKey; retired: boolean };
export type ActiveKeyInfo = { version: number; kind: KeyKind; publicKey: string };

/**
 * کلیدِ ارسالِ این دستگاه (userId/version/publicKey/privateKey — همان شکلِ قبلی) +
 * ring: همه‌ی کلیدهای خصوصیِ این دستگاه (برای خواندنِ پیام‌های قدیمی‌تر) +
 * active: کلیدهای فعالِ خودم روی همه‌ی دستگاه‌ها (هدف‌های بسته‌بندی).
 */
export type Identity = {
  userId: string;
  version: number;
  publicKey: string;
  privateKey: CryptoKey;
  kind: KeyKind;
  ring: RingKey[];
  active: ActiveKeyInfo[];
  /** همه‌ی کلیدهای عمومیِ خودم، از جمله بازنشسته */
  known: ActiveKeyInfo[];
};

export type ServerKeyInfo = {
  version: number;
  kind: KeyKind;
  publicKey: string;
  active: boolean;
  hasBackup: boolean;
  backupKind: "PASSWORD" | "PASSCODE" | null;
  deviceLabel: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  hasMessages: boolean;
};
type LinkInfo = {
  id: string;
  targetVersion: number;
  status: "PENDING" | "DONE" | "DECLINED" | "EXPIRED";
  moved: number;
  createdAt: string;
  expiresAt: string;
};
type KeysResponse = {
  userId: string;
  hasPassword: boolean;
  kdf: { salt: string; iterations: number } | null;
  keys: ServerKeyInfo[];
  link: LinkInfo | null;
};

/** خطِ کوتاهِ اطلاع‌رسانی (نه فرم) — فقط وقتی واقعا چیزی هست که کاربر بداند */
export type E2EENotice =
  /** پشتیبانِ قدیمیِ «رمز گفت‌وگو»: یک بار رمزِ قدیمی تا پیام‌های قبلی باز و منتقل شوند */
  | { kind: "legacy-passcode"; version: number }
  /** این نشست با رمزِ عبور شروع نشده؛ پیام‌های قبلی با ورودِ دوباره روی این دستگاه باز می‌شوند */
  | { kind: "history-relogin" }
  /** حسابِ بی‌رمز روی دستگاهِ تازه: سابقه روی دستگاهِ دیگر است */
  | { kind: "history-link" };

export type LinkState =
  | { role: "requester"; id: string; code: string; status: LinkInfo["status"]; moved: number }
  | { role: "approver"; id: string; code: string; targetVersion: number; deviceLabel: string | null };

export type IdentityState =
  | { status: "loading" }
  | { status: "unsupported" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      identity: Identity;
      persistent: boolean;
      /** سازگاری: کلیدِ SYNCED با پشتیبانِ رمزِ عبور دارد */
      hasBackup: boolean;
      hasPassword: boolean;
      notice: E2EENotice | null;
      link: LinkState | null;
      devices: ServerKeyInfo[];
      /** با هر تغییرِ کلیدهای این دستگاه (انتقالِ سابقه، باز شدنِ پیام‌های قدیمی) زیاد می‌شود */
      epoch: number;
    };

export class E2EEApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}
export class WrongPasscodeError extends Error {}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  } catch {
    throw new E2EEApiError("اتصال برقرار نشد؛ دوباره تلاش کن", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new E2EEApiError(data?.error || "درخواست انجام نشد؛ دوباره تلاش کن", res.status, data?.code);
  return data as T;
}

// ───────────────────────── وضعیتِ مشترک ─────────────────────────

let state: IdentityState = { status: "loading" };
let loading: Promise<void> | null = null;
let epoch = 0;
let bgRunning = false;
const listeners = new Set<(s: IdentityState) => void>();

function setState(s: IdentityState) {
  state = s;
  listeners.forEach((l) => l(s));
}

export function getIdentityState(): IdentityState {
  return state;
}

// خروج از حساب: وضعیتِ در حافظه (کلیدِ باز، KEK) با keyStore.wipeOnLogout پاک می‌شود
onWipe(() => {
  loading = null;
  setState({ status: "loading" });
});

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "دستگاه";
  const ua = navigator.userAgent || "";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS X/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [br, os].filter(Boolean).join(" · ").slice(0, 60) || "دستگاه";
}

const legacySkipKey = (userId: string, version: number) => `arion-e2ee-legacy-skip:${userId}:${version}`;
function legacySkipped(userId: string, version: number): boolean {
  try {
    return localStorage.getItem(legacySkipKey(userId, version)) === "1";
  } catch {
    return false;
  }
}

function nextVersion(keys: ServerKeyInfo[]): number {
  return keys.reduce((m, k) => Math.max(m, k.version), 0) + 1;
}

async function toNonExtractable(k: CryptoKey): Promise<CryptoKey> {
  const pkcs8 = await exportPkcs8(k);
  try {
    return await importPrivatePkcs8(pkcs8, false);
  } finally {
    pkcs8.fill(0);
  }
}

// ───────────────────────── ساخت/باز کردنِ کلیدها ─────────────────────────

/**
 * کلیدِ SYNCEDِ تازه (بارِ اول، یا پس از بازیابیِ رمز با پیامک) — بسته‌بندی با KEK.
 * newKdf فقط در جایگزینی: نمکِ تازه اتمی با کلید ثبت می‌شود تا KEKِ کهنه‌ی دستگاه‌های
 * دیگر (رمزِ قبلی) نامعتبر شود و آن‌ها هرگز دوباره کلید عوض نکنند.
 */
async function createSynced(
  userId: string,
  me: KeysResponse,
  kek: { kek: CryptoKey; salt: string; iterations: number },
  replaceVersion: number,
  newKdf?: { salt: string; iterations: number }
): Promise<LocalKey> {
  const kp = await generateIdentityKeyPair();
  const version = nextVersion(me.keys);
  const backup = await wrapPrivateKeyWithKek(kp.privateKey, kek.kek, { userId, version, publicKey: kp.publicB64 }, kek);
  await api("/api/e2ee/keys", { method: "POST", body: JSON.stringify({ publicKey: kp.publicB64, backup, version, replaceVersion, ...(newKdf ? { kdf: newKdf } : {}) }) });
  return putLocalKey({ userId, version, kind: "SYNCED", publicKey: kp.publicB64, privateKey: await toNonExtractable(kp.privateKey) });
}

async function createDevice(userId: string, me: KeysResponse): Promise<LocalKey> {
  // غیرقابل‌استخراج از همان لحظه‌ی ساخت — این کلید هرگز از این دستگاه بیرون نمی‌رود
  const kp = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"])) as CryptoKeyPair;
  const { toB64 } = await import("./encoding");
  const publicKey = toB64(await crypto.subtle.exportKey("raw", kp.publicKey));
  const version = nextVersion(me.keys);
  await api("/api/e2ee/keys/device", { method: "POST", body: JSON.stringify({ publicKey, version, label: deviceLabel() }) });
  return putLocalKey({ userId, version, kind: "DEVICE", publicKey, privateKey: kp.privateKey });
}

async function fetchBackup(): Promise<{ version: number; publicKey: string; backupKind: "PASSWORD" | "PASSCODE"; backup: KeyBackup }> {
  return api("/api/e2ee/keys/backup");
}

async function fetchState(touch?: number): Promise<KeysResponse> {
  return api<KeysResponse>(`/api/e2ee/keys${touch ? `?touch=${touch}` : ""}`);
}

/** یک دور راه‌اندازی. KEY_CHANGED (دو دستگاه هم‌زمان) → یک بار از نو */
async function bootstrap(retry = true): Promise<void> {
  if (!isE2EESupported()) return setState({ status: "unsupported" });
  let me = await fetchState();
  const userId = me.userId;
  const serverBy = new Map(me.keys.map((k) => [k.version, k]));

  // ۱) کلیدهای محلی را با سرور هم‌خوان کن: ناشناخته → حذف؛ بازنشسته → علامت
  for (const l of await listLocalKeys(userId)) {
    const s = serverBy.get(l.version);
    if (!s || s.publicKey !== l.publicKey) await deleteLocalKey(userId, l.version);
    else if (!s.active && !l.retired) await putLocalKey({ ...l, retired: true });
  }

  // ۲) KEKِ این دستگاه (فقط اگر با نمکِ فعلیِ سرور ساخته شده باشد)
  let kek = await getKek(userId);
  if (kek && (!me.kdf || kek.salt !== me.kdf.salt)) {
    await deleteKek(userId);
    kek = null;
  }

  // ۳) پشتیبانِ تازه‌ای که پس از تغییرِ رمز نرسیده بود
  const pending = await getPending(userId);
  if (pending) {
    try {
      await api("/api/e2ee/keys/backup", { method: "PUT", body: JSON.stringify({ version: pending.version, backup: pending.backup, backupKind: "PASSWORD", kdf: pending.kdf }) });
      await deletePending(userId);
      me = await fetchState();
    } catch (e) {
      if (e instanceof E2EEApiError && (e.status === 409 || e.status === 400 || e.status === 404)) await deletePending(userId);
    }
  }

  const syncedActive = me.keys.find((k) => k.kind === "SYNCED" && k.active) ?? null;
  let local = await listLocalKeys(userId);
  let send: LocalKey | null = null;
  let notice: E2EENotice | null = null;

  try {
    if (syncedActive) {
      send = local.find((l) => l.version === syncedActive.version && !l.retired) ?? null;
      if (!send && syncedActive.backupKind === "PASSWORD" && kek) {
        const b = await fetchBackup();
        if (b.version !== syncedActive.version || b.publicKey !== syncedActive.publicKey) throw new E2EEApiError("کلید این حساب هم‌زمان تغییر کرد", 409, "KEY_CHANGED");
        try {
          const key = await unwrapPrivateKeyWithKek(b.backup, kek.kek, { userId, version: b.version, publicKey: b.publicKey });
          send = await putLocalKey({ userId, version: b.version, kind: "SYNCED", publicKey: b.publicKey, privateKey: key });
        } catch (e) {
          if (!(e instanceof E2EEDecryptError)) throw e;
          // KEKِ این دستگاه دیگر پشتیبان را باز نمی‌کند (رمز جای دیگری عوض شده). این‌جا رمز
          // را نداریم، پس هرگز کلید عوض نمی‌کنیم — فقط KEK کنار می‌رود؛ ورودِ بعدی درستش می‌کند.
          await deleteKek(userId);
          kek = null;
          notice = { kind: "history-relogin" };
        }
      } else if (!send && syncedActive.backupKind === "PASSCODE") {
        if (kek || (!me.hasPassword && !legacySkipped(userId, syncedActive.version))) notice = { kind: "legacy-passcode", version: syncedActive.version };
        else if (me.hasPassword && !kek) notice = { kind: "history-relogin" };
      }
    } else if (kek) {
      send = await createSynced(userId, me, kek, 0);
    }
  } catch (e) {
    if (retry && e instanceof E2EEApiError && e.status === 409) return bootstrap(false);
    throw e;
  }

  // ۴) بدونِ کلیدِ SYNCED روی این دستگاه → کلیدِ همین دستگاه
  if (!send) {
    local = await listLocalKeys(userId);
    const activeDevice = local.filter((l) => l.kind === "DEVICE" && !l.retired).sort((a, b) => b.version - a.version)[0];
    if (activeDevice) send = activeDevice;
    else {
      try {
        send = await createDevice(userId, me);
      } catch (e) {
        if (retry && e instanceof E2EEApiError && e.status === 409) return bootstrap(false);
        throw e;
      }
    }
  }

  // کلیدهای تازه‌ساخته → وضعیتِ سرور دوباره (هدف‌های بسته‌بندی باید دقیق باشند)
  me = await fetchState(send.kind === "DEVICE" ? send.version : undefined);
  local = await listLocalKeys(userId);
  const ringVersions = new Set(local.map((l) => l.version));
  if (!notice && send.kind === "DEVICE") {
    const unreadable = me.keys.some((k) => k.hasMessages && !ringVersions.has(k.version));
    if (unreadable) notice = me.hasPassword ? { kind: "history-relogin" } : { kind: "history-link" };
  }

  const identity: Identity = {
    userId,
    version: send.version,
    publicKey: send.publicKey,
    privateKey: send.privateKey,
    kind: send.kind,
    ring: local.map((l) => ({ version: l.version, kind: l.kind, publicKey: l.publicKey, privateKey: l.privateKey, retired: !!l.retired })),
    active: me.keys.filter((k) => k.active).map((k) => ({ version: k.version, kind: k.kind, publicKey: k.publicKey })),
    known: me.keys.map((k) => ({ version: k.version, kind: k.kind, publicKey: k.publicKey })),
  };
  const prev = state.status === "ready" ? state : null;
  const ringChanged = !prev || prev.identity.ring.map((r) => r.version).join(",") !== identity.ring.map((r) => r.version).join(",");
  if (ringChanged && prev) epoch++;
  setState({
    status: "ready",
    identity: prev && sameIdentity(prev.identity, identity) ? prev.identity : identity,
    persistent: await isPersistent(),
    hasBackup: !!syncedActive && syncedActive.backupKind === "PASSWORD",
    hasPassword: me.hasPassword,
    notice,
    link: await linkStateFor(userId, me, identity),
    devices: me.keys.filter((k) => k.active),
    epoch,
  });
  runBackground(userId, me, identity);
}

function sameIdentity(a: Identity, b: Identity): boolean {
  return (
    a.userId === b.userId &&
    a.version === b.version &&
    a.publicKey === b.publicKey &&
    a.ring.map((r) => `${r.version}${r.retired ? "r" : ""}`).join(",") === b.ring.map((r) => `${r.version}${r.retired ? "r" : ""}`).join(",") &&
    a.active.map((r) => r.version).join(",") === b.active.map((r) => r.version).join(",")
  );
}

/** وضعیتِ کلید را از سرور + دستگاه می‌خواند و هرچه لازم است بی‌صدا می‌سازد. همزمان‌ها یکی می‌شوند. */
export function refreshIdentity(): Promise<void> {
  if (loading) return loading;
  loading = bootstrap()
    .catch((e) => {
      // خطای شبکه/سرور وقتی کلید از قبل آماده است، وضعیتِ آماده را خراب نمی‌کند
      if (state.status === "ready") return;
      setState({ status: "error", message: e instanceof Error && e.message ? e.message : "رمزگذاری آماده نشد؛ دوباره تلاش کن" });
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function useE2EEIdentity(): IdentityState {
  const [s, setS] = useState<IdentityState>(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    // هر بار سوار شدن: وضعیت از سرور تازه می‌شود (کلیدِ تازه روی دستگاهِ دیگر، کاربرِ دیگر)
    refreshIdentity();
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

/** مطمئن شو کلیدِ این حساب ساخته شده (مثلا پیش از ساختِ داده‌ی آزمایشی). خطا/کندی بی‌اثر؛ حداکثر ~۸ ثانیه */
export async function ensureE2EEKeys(): Promise<void> {
  await Promise.race([refreshIdentity().catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
}

/** آماده بودنِ رمزگذاری برای UI (قفلِ کوچکِ «رمزگذاری سرتاسری»، غیرفعال کردنِ ارسال) */
export function useE2EEReady(): { ready: boolean; state: IdentityState } {
  const s = useE2EEIdentity();
  return { ready: s.status === "ready", state: s };
}

// ───────────────────────── کارهای پس‌زمینه ─────────────────────────

function runBackground(userId: string, me: KeysResponse, identity: Identity) {
  if (bgRunning) return;
  bgRunning = true;
  (async () => {
    // کلیدِ DEVICEِ این دستگاه وقتی کلیدِ SYNCED هم این‌جا هست زائد است: سابقه‌اش به
    // SYNCED منتقل و خودش بازنشسته می‌شود (پیام‌های بعدی فقط برای SYNCED بسته‌بندی می‌شوند).
    if (identity.kind === "SYNCED") {
      const target: TargetKey = { ref: { u: userId, k: identity.version }, publicKey: identity.publicKey };
      for (const d of identity.ring.filter((r) => r.kind === "DEVICE" && !r.retired)) {
        try {
          await transferHistory(userId, [{ ref: { u: userId, k: d.version }, privateKey: d.privateKey }], target);
          await api(`/api/e2ee/keys/device?version=${d.version}`, { method: "DELETE" });
          const l = (await listLocalKeys(userId)).find((x) => x.version === d.version);
          if (l) await putLocalKey({ ...l, retired: true });
        } catch {
          // دورِ بعد
        }
      }
    }
  })()
    .catch(() => {})
    .finally(() => {
      bgRunning = false;
    });
}

// ───────────────────────── ورود/تغییرِ رمز ─────────────────────────

/**
 * بعد از ورود یا ثبت‌نامِ موفق با رمزِ عبور (app/auth/login، app/auth/signup). رمز
 * فقط در همین تابع و فقط روی دستگاه به کار می‌رود — هیچ درخواستی آن را نمی‌برد؛
 * خروجی یک KEKِ غیرقابل‌استخراج است که تا خروج روی دستگاه می‌ماند. خطا هرگز
 * جلوی ورود را نمی‌گیرد (بدونِ KEK، کلیدِ همین دستگاه ساخته می‌شود).
 */
export async function primeE2EEFromPassword(userId: string, password: string): Promise<void> {
  try {
    if (!isE2EESupported() || !userId || !password) return;
    const kdf = await api<{ userId: string; salt: string; iterations: number }>("/api/e2ee/keys/kdf");
    if (kdf.userId !== userId) return;
    let kek = { userId, salt: kdf.salt, iterations: kdf.iterations, kek: await derivePasswordKek(password, userId, kdf.salt, kdf.iterations), savedAt: Date.now() };
    // پشتیبانِ فعلی با همین رمز باز می‌شود؟ اگر نه، رمز بدونِ بازبسته‌بندی عوض شده (بازیابی
    // با پیامک): تنها جایی که کلیدِ SYNCED عوض می‌شود — چون فقط این‌جا رمزِ درست را داریم.
    const me = await fetchState().catch(() => null);
    const synced = me?.keys.find((k) => k.kind === "SYNCED" && k.active && k.backupKind === "PASSWORD");
    if (me && synced) {
      const b = await fetchBackup();
      if (b.version === synced.version && b.backupKind === "PASSWORD") {
        try {
          const key = await unwrapPrivateKeyWithKek(b.backup, kek.kek, { userId, version: b.version, publicKey: b.publicKey });
          await putLocalKey({ userId, version: b.version, kind: "SYNCED", publicKey: b.publicKey, privateKey: key });
        } catch (e) {
          if (!(e instanceof E2EEDecryptError)) throw e;
          const newKdf = { salt: randomSaltB64(), iterations: kdf.iterations };
          kek = { ...kek, ...newKdf, kek: await derivePasswordKek(password, userId, newKdf.salt, newKdf.iterations) };
          await createSynced(userId, me, kek, synced.version, newKdf);
        }
      }
    }
    await putKek(kek);
    await refreshIdentity();
  } catch {
    // بی‌صدا
  }
}

/**
 * تغییرِ رمزِ عبور از پنل (کاربر رمزِ فعلی و تازه را می‌داند): *قبل از* درخواستِ تغییر،
 * پشتیبان با رمزِ فعلی باز و با رمزِ تازه (و نمکِ تازه) دوباره بسته‌بندی می‌شود؛ خروجی
 * یک commit است که *بعد از* موفقیتِ تغییرِ رمز صدا زده می‌شود. نبودِ کلید/خطا → null
 * (تغییرِ رمز بی‌وقفه انجام می‌شود؛ در بدترین حالت ورودِ بعدی کلیدِ تازه می‌سازد).
 */
export async function prepareE2EEPasswordChange(oldPassword: string, newPassword: string): Promise<(() => Promise<void>) | null> {
  try {
    if (!isE2EESupported()) return null;
    const me = await fetchState();
    const synced = me.keys.find((k) => k.kind === "SYNCED" && k.active && k.backupKind === "PASSWORD");
    if (!synced || !me.kdf) return null;
    const userId = me.userId;
    const b = await fetchBackup();
    if (b.version !== synced.version || b.backupKind !== "PASSWORD") return null;
    const oldKek = await derivePasswordKek(oldPassword, userId, b.backup.salt, b.backup.iterations);
    const key = await unwrapPrivateKeyWithKek(b.backup, oldKek, { userId, version: b.version, publicKey: b.publicKey }, true);
    const kdf = { salt: randomSaltB64(), iterations: me.kdf.iterations };
    const newKek = await derivePasswordKek(newPassword, userId, kdf.salt, kdf.iterations);
    const backup = await wrapPrivateKeyWithKek(key, newKek, { userId, version: b.version, publicKey: b.publicKey }, kdf);
    return async () => {
      await putPending({ userId, version: b.version, backup, kdf, savedAt: Date.now() });
      for (let i = 0; i < 3; i++) {
        try {
          await api("/api/e2ee/keys/backup", { method: "PUT", body: JSON.stringify({ version: b.version, backup, backupKind: "PASSWORD", kdf }) });
          await deletePending(userId);
          await putKek({ userId, salt: kdf.salt, iterations: kdf.iterations, kek: newKek, savedAt: Date.now() });
          return;
        } catch (e) {
          if (e instanceof E2EEApiError && e.status >= 400 && e.status < 500 && e.status !== 429) {
            await deletePending(userId);
            return;
          }
          await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        }
      }
      // هنوز نرسید: در pending می‌ماند و راه‌اندازیِ بعدی می‌فرستدش
    };
  } catch {
    return null;
  }
}

// ───────────────────────── پشتیبانِ قدیمیِ «رمز گفت‌وگو» ─────────────────────────

/**
 * یک بارِ آخر: پشتیبانِ قدیمی با رمزِ گفت‌وگو باز می‌شود و به روشِ تازه می‌رود —
 * حسابِ رمزدار: بسته‌بندی با KEKِ رمزِ عبور؛ حسابِ گوگل: کلیدِ همین دستگاه (پشتیبانِ
 * سرور پاک می‌شود). بعد از این هرگز رمزِ گفت‌وگو خواسته نمی‌شود.
 */
export async function unlockLegacyPasscode(passcode: string): Promise<void> {
  const me = await fetchState();
  const userId = me.userId;
  const b = await fetchBackup();
  if (b.backupKind !== "PASSCODE") return refreshIdentity();
  const ctx = { userId, version: b.version, publicKey: b.publicKey };
  let key: CryptoKey;
  try {
    key = await unwrapPrivateKey(b.backup, passcode, ctx, true);
  } catch (e) {
    if (e instanceof E2EEDecryptError) throw new WrongPasscodeError("این رمز درست نیست");
    throw e;
  }
  const kek = await getKek(userId);
  if (kek && me.kdf && kek.salt === me.kdf.salt) {
    const backup = await wrapPrivateKeyWithKek(key, kek.kek, ctx, kek);
    await api("/api/e2ee/keys/backup", { method: "PUT", body: JSON.stringify({ version: b.version, backup, backupKind: "PASSWORD" }) });
    await putLocalKey({ userId, version: b.version, kind: "SYNCED", publicKey: b.publicKey, privateKey: await toNonExtractable(key) });
  } else {
    await api("/api/e2ee/keys/backup", { method: "PUT", body: JSON.stringify({ version: b.version, convertToDevice: true, label: deviceLabel() }) });
    await putLocalKey({ userId, version: b.version, kind: "DEVICE", publicKey: b.publicKey, privateKey: await toNonExtractable(key) });
  }
  await refreshIdentity();
}

/** «از پیام‌های قبلی بگذر»: حسابِ رمزدار کلیدِ SYNCEDِ تازه می‌گیرد؛ حسابِ گوگل فقط دیگر پرسیده نمی‌شود */
export async function skipLegacyPasscode(version: number): Promise<void> {
  const me = await fetchState();
  const kek = await getKek(me.userId);
  if (kek && me.kdf && kek.salt === me.kdf.salt) {
    await createSynced(me.userId, me, kek, version);
  } else {
    try {
      localStorage.setItem(legacySkipKey(me.userId, version), "1");
    } catch {
      // ignore
    }
  }
  await refreshIdentity();
}

// ───────────────────────── انتقالِ سابقه ─────────────────────────

type HistoryItem = { messageId: string; mentorshipId: string; clientId: string; from: KeyRef; wraps: KeyWrap[] };
type HistoryPage = { items: HistoryItem[]; keys: Record<string, { version: number; publicKey: string }[]>; next: string | null };
type NoteRow = { id: string; studentId: string; body: string };

/**
 * CEKِ هر پیامی که برای یکی از sources بسته‌بندی شده، برای target (کلیدِ دیگرِ
 * خودم) هم بسته‌بندی می‌شود؛ یادداشت‌های خصوصیِ منتور هم برای کلیدهای فعالِ فعلی
 * دوباره رمز می‌شوند. متنِ پیام دست نمی‌خورد (فرانکینگ همان می‌ماند).
 */
export async function transferHistory(userId: string, sources: OwnKey[], target: TargetKey, onProgress?: (n: number) => void): Promise<number> {
  let moved = 0;
  for (const src of sources) {
    if (src.ref.k === target.ref.k) continue;
    let cursor: string | null = null;
    for (let guard = 0; guard < 200; guard++) {
      const page: HistoryPage = await api<HistoryPage>(`/api/e2ee/history?from=${src.ref.k}&to=${target.ref.k}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      const publicOf = (r: KeyRef) => page.keys[r.u]?.find((x) => x.version === r.k)?.publicKey ?? null;
      const wraps: { messageId: string; wrap: KeyWrap }[] = [];
      for (const it of page.items) {
        try {
          const w = await rewrapForOwnKey(it.wraps, it.from, src, target, publicOf, messageScope(it.mentorshipId, it.clientId));
          if (w) wraps.push({ messageId: it.messageId, wrap: w });
        } catch {
          // پیامی که باز نمی‌شود منتقل نمی‌شود
        }
      }
      if (wraps.length) {
        const r = await api<{ added: number }>("/api/e2ee/history", { method: "POST", body: JSON.stringify({ target: target.ref.k, wraps }) });
        moved += r.added;
        onProgress?.(moved);
      }
      if (!page.next) break;
      cursor = page.next;
    }
  }
  moved += await resealNotes(userId, sources, target);
  return moved;
}

async function resealNotes(userId: string, sources: OwnKey[], target: TargetKey): Promise<number> {
  const { notes } = await api<{ notes: NoteRow[]; active: ActiveKeyInfo[] }>("/api/e2ee/history?notes=1").catch(() => ({ notes: [] as NoteRow[], active: [] }));
  if (!notes.length) return 0;
  const me = await fetchState();
  const active = me.keys.filter((k) => k.active).map((k) => ({ version: k.version, kind: k.kind, publicKey: k.publicKey }));
  const src = sources[0];
  const srcInfo = me.keys.find((k) => k.version === src.ref.k);
  if (!srcInfo) return 0;
  const known = me.keys.map((k) => ({ version: k.version, kind: k.kind, publicKey: k.publicKey }));
  const writer = { userId, version: src.ref.k, publicKey: srcInfo.publicKey, privateKey: src.privateKey, ring: sources.map((s) => ({ version: s.ref.k, publicKey: me.keys.find((k) => k.version === s.ref.k)?.publicKey || "", privateKey: s.privateKey })), active, known };
  const out: { id: string; prev: string; body: string }[] = [];
  for (const n of notes) {
    if (n.body.startsWith("e2e2:") && n.body.includes(`"k":${target.ref.k},"w"`)) continue;
    const o = await openNote(writer, n.studentId, n.body);
    if (o.kind !== "text" && o.kind !== "legacy") continue;
    out.push({ id: n.id, prev: n.body, body: await sealNote(writer, n.studentId, o.text) });
  }
  if (!out.length) return 0;
  const r = await api<{ notes: number }>("/api/e2ee/history", { method: "POST", body: JSON.stringify({ target: target.ref.k, notes: out }) });
  return r.notes;
}

async function linkStateFor(userId: string, me: KeysResponse, identity: Identity): Promise<LinkState | null> {
  const l = me.link;
  if (!l) return null;
  const mine = identity.ring.some((r) => r.version === l.targetVersion);
  const target = me.keys.find((k) => k.version === l.targetVersion);
  if (!target) return null;
  const code = await linkCode(userId, l.targetVersion, target.publicKey, l.id);
  if (mine) return { role: "requester", id: l.id, code, status: l.status, moved: l.moved };
  // تاییدکننده فقط دستگاهی است که کلیدِ دیگری (با سابقه) دارد
  if (l.status !== "PENDING" || !target.active || !identity.ring.some((r) => r.version !== l.targetVersion)) return null;
  return { role: "approver", id: l.id, code, targetVersion: l.targetVersion, deviceLabel: target.deviceLabel };
}

/** دستگاهِ تازه: درخواستِ انتقالِ سابقه → کدِ کوتاهی که روی دستگاهِ قدیمی هم دیده می‌شود */
export async function requestHistoryLink(): Promise<void> {
  if (state.status !== "ready") return;
  await api("/api/e2ee/link", { method: "POST", body: JSON.stringify({ targetVersion: state.identity.version }) });
  await refreshIdentity();
}

export async function cancelHistoryLink(id: string): Promise<void> {
  await api(`/api/e2ee/link/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ action: "decline" }) }).catch(() => {});
  await refreshIdentity();
}

/** دستگاهِ قدیمی، پس از تطبیقِ کد: سابقه برای کلیدِ دستگاهِ تازه بسته‌بندی می‌شود */
export async function approveHistoryLink(link: Extract<LinkState, { role: "approver" }>, onProgress?: (n: number) => void): Promise<number> {
  if (state.status !== "ready") throw new E2EEApiError("رمزگذاری آماده نیست", 409);
  const { identity } = state;
  const me = await fetchState();
  const target = me.keys.find((k) => k.version === link.targetVersion && k.active);
  if (!target) throw new E2EEApiError("دستگاه تازه دیگر فعال نیست", 409);
  const sources = identity.ring.filter((r) => r.version !== link.targetVersion).map((r) => ({ ref: { u: identity.userId, k: r.version }, privateKey: r.privateKey }));
  const moved = await transferHistory(identity.userId, sources, { ref: { u: identity.userId, k: target.version }, publicKey: target.publicKey }, onProgress);
  await api(`/api/e2ee/link/${encodeURIComponent(link.id)}`, { method: "POST", body: JSON.stringify({ action: "done", moved }) });
  await refreshIdentity();
  return moved;
}

// ───────────────────────── دستگاه‌ها ─────────────────────────

/** حذفِ کلیدهای این حساب از همین مرورگر (کلیدِ این دستگاه روی سرور هم بازنشسته می‌شود) */
export async function forgetThisDevice(userId: string): Promise<void> {
  if (state.status === "ready" && state.identity.kind === "DEVICE") {
    await api(`/api/e2ee/keys/device?version=${state.identity.version}`, { method: "DELETE" }).catch(() => {});
  }
  await wipeUser(userId);
  await refreshIdentity();
}

/** بیرون کردنِ یک دستگاهِ دیگر (پیام‌های بعدی دیگر برایش بسته‌بندی نمی‌شوند) */
export async function removeDevice(version: number): Promise<void> {
  await api(`/api/e2ee/keys/device?version=${version}`, { method: "DELETE" });
  await refreshIdentity();
}

// ───────────────────────── گفت‌وگو ─────────────────────────

export type PublicKeyRow = { version: number; publicKey: string; current: boolean; kind?: KeyKind };
export type ConversationKeys = { mentorId: string; studentId: string; keys: Record<string, PublicKeyRow[]> };

export type WireMessage = ChatMessage;

export type OpenedMessage =
  | { kind: "text"; text: string; frankingKey: string; committed: boolean }
  | { kind: "legacy"; text: string }
  /** برای هیچ‌کدام از کلیدهای این دستگاه رمز نشده (کلیدِ قبلیِ حساب، یا دستگاهِ دیگر) */
  | { kind: "old-key" }
  | { kind: "failed" };

/**
 * کلیدهای دو طرفِ یک گفت‌وگو. ردیف‌های خودِ کاربر طوری مرتب می‌شوند که کلیدِ ارسالِ
 * همین دستگاه اولین ردیفِ جاری باشد (سازگاری با چکِ «کلیدِ من هنوز همین است» در MentorChat).
 */
export async function fetchConversationKeys(mentorshipId: string): Promise<ConversationKeys> {
  const k = await api<ConversationKeys>(`/api/mentorships/${mentorshipId}/messages/keys`);
  if (state.status === "ready") {
    const { userId, version } = state.identity;
    const rows = k.keys[userId];
    if (rows) k.keys[userId] = [...rows].sort((a, b) => Number(b.version === version && b.current) - Number(a.version === version && a.current));
  }
  return k;
}

/** کلیدِ ارسالِ این دستگاه هنوز در فهرستِ کلیدهای فعالِ سرور هست؟ */
export function sendKeyStillActive(identity: Identity, k: ConversationKeys): boolean {
  return (k.keys[identity.userId] || []).some((r) => r.current && r.version === identity.version && r.publicKey === identity.publicKey);
}

/**
 * رمز/رمزگشاییِ یک گفت‌وگو. پیامِ تازه: scheme 2 برای *همه‌ی* کلیدهای فعالِ دو طرف.
 * خواندن: scheme 2 با هر کلیدی از ring که بسته‌بندی دارد؛ scheme 1 با کلیدِ همان نسخه.
 */
export class ConversationCipher {
  private cache = new Map<string, Promise<ChatKeys>>();
  readonly peerId: string;
  readonly role: "MENTOR" | "STUDENT";
  private ring: RingKey[];

  constructor(private me: Identity, readonly mentorshipId: string, private k: ConversationKeys) {
    this.role = k.mentorId === me.userId ? "MENTOR" : "STUDENT";
    this.peerId = this.role === "MENTOR" ? k.studentId : k.mentorId;
    this.ring = me.ring?.length ? me.ring : [{ version: me.version, kind: me.kind ?? "SYNCED", publicKey: me.publicKey, privateKey: me.privateKey, retired: false }];
  }

  peerCurrent(): PublicKeyRow | null {
    return (this.k.keys[this.peerId] || []).find((r) => r.current) ?? null;
  }

  private current(userId: string): PublicKeyRow[] {
    return (this.k.keys[userId] || []).filter((r) => r.current);
  }

  private publicOf = (r: KeyRef): string | null => {
    if (r.u === this.me.userId) {
      const own = this.ring.find((x) => x.version === r.k);
      if (own) return own.publicKey;
    }
    return (this.k.keys[r.u] || []).find((x) => x.version === r.k)?.publicKey ?? null;
  };

  private ownKeys(): OwnKey[] {
    return this.ring.map((r) => ({ ref: { u: this.me.userId, k: r.version }, privateKey: r.privateKey }));
  }

  private targets(): TargetKey[] {
    return [this.k.mentorId, this.k.studentId].flatMap((u) => this.current(u).map((r) => ({ ref: { u, k: r.version }, publicKey: r.publicKey })));
  }

  async encrypt(text: string, clientId = randomId()): Promise<EncryptedMessageV2 & { frankingKey: string }> {
    return this.encryptAs(this.me.userId, text, clientId);
  }

  /** senderId ≠ من فقط برای بازرمزگذاریِ پیامِ قدیمیِ طرفِ مقابل (بسته‌بندی‌ها را کلیدِ من می‌سازد) */
  private async encryptAs(senderId: string, text: string, clientId: string) {
    if (!this.peerCurrent()) throw new E2EEApiError("طرف مقابل هنوز کلید رمزگذاری ندارد", 409, "PEER_NO_KEY");
    const from: OwnKey = { ref: { u: this.me.userId, k: this.me.version }, privateKey: this.me.privateKey };
    return encryptMessageV2(text, { mentorshipId: this.mentorshipId, senderId, clientId }, from, this.targets());
  }

  private keysFor(own: RingKey, mentorV: number, studentV: number): Promise<ChatKeys> {
    const id = `${mentorV}:${studentV}`;
    let p = this.cache.get(id);
    if (!p) {
      const peerV = this.role === "MENTOR" ? studentV : mentorV;
      const row = (this.k.keys[this.peerId] || []).find((r) => r.version === peerV);
      p = row
        ? importPublicKey(row.publicKey).then((pub) =>
            deriveChatKeys(own.privateKey, pub, {
              mentorshipId: this.mentorshipId,
              mentorId: this.k.mentorId,
              studentId: this.k.studentId,
              mentorKeyVersion: mentorV,
              studentKeyVersion: studentV,
            })
          )
        : Promise.reject(new E2EEDecryptError("کلید طرف مقابل پیدا نشد"));
      p.catch(() => this.cache.delete(id));
      this.cache.set(id, p);
    }
    return p;
  }

  async open(m: WireMessage): Promise<OpenedMessage> {
    if (m.legacyBody != null) return { kind: "legacy", text: m.legacyBody };
    const enc = m.enc as EncryptedMessage | null;
    if (!enc) return { kind: "failed" };
    try {
      if (isV2(enc)) {
        const d = await decryptMessageV2(enc, { mentorshipId: this.mentorshipId, senderId: m.senderId }, this.ownKeys(), this.publicOf);
        if (!d) return { kind: "old-key" };
        return { kind: "text", text: d.text, frankingKey: d.frankingKey, committed: d.committed };
      }
      // scheme 1: کلیدِ جفتیِ نسخه‌دار
      const fromMentor = m.senderId === this.k.mentorId;
      const mentorV = fromMentor ? enc.senderKeyVersion : enc.recipientKeyVersion;
      const studentV = fromMentor ? enc.recipientKeyVersion : enc.senderKeyVersion;
      const myV = this.role === "MENTOR" ? mentorV : studentV;
      const own = this.ring.find((r) => r.version === myV);
      if (!own) return { kind: "old-key" };
      const keys = await this.keysFor(own, mentorV, studentV);
      const d = await decryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, enc, {
        mentorshipId: this.mentorshipId,
        senderId: m.senderId,
        clientId: enc.clientId,
        senderKeyVersion: enc.senderKeyVersion,
        recipientKeyVersion: enc.recipientKeyVersion,
      });
      return { kind: "text", text: d.text, frankingKey: d.frankingKey, committed: d.committed };
    } catch {
      return { kind: "failed" };
    }
  }

  /** بسته‌ی بازرمزگذاریِ پیام‌های قدیمیِ متن‌ساده (هر دو طرف باید کلید داشته باشند) */
  async reencryptLegacy(ms: WireMessage[]): Promise<(EncryptedMessageV2 & { id: string; frankingKey: string })[]> {
    if (!this.peerCurrent()) return [];
    const out: (EncryptedMessageV2 & { id: string; frankingKey: string })[] = [];
    for (const m of ms) {
      if (m.legacyBody == null) continue;
      const e = await this.encryptAs(m.senderId, m.legacyBody, randomId());
      out.push({ ...e, id: m.id });
    }
    return out;
  }

  /** کدِ امنیتی روی همه‌ی کلیدهای فعالِ دو طرف (هر دستگاهِ جعلی کد را عوض می‌کند) */
  async safetyCode(): Promise<string | null> {
    const peer = this.current(this.peerId);
    const mine = this.current(this.me.userId);
    if (!peer.length || !mine.length) return null;
    return safetyCodeForSets({ userId: this.me.userId, publicKeys: mine.map((r) => r.publicKey) }, { userId: this.peerId, publicKeys: peer.map((r) => r.publicKey) });
  }

  private async peerPrints(): Promise<string[]> {
    return Promise.all(this.current(this.peerId).map((r) => keyFingerprint(this.peerId, r.publicKey)));
  }

  /**
   * TOFU روی مجموعه‌ی کلیدهای فعالِ طرفِ مقابل: بارِ اول به خاطر سپرده می‌شود. فقط
   * *کلیدِ تازه‌ای* که قبلا دیده نشده (دستگاهِ تازه، یا کلیدِ تازه پس از بازیابیِ رمز)
   * true می‌دهد؛ کم شدنِ کلید (خروجِ یک دستگاه) بی‌صدا ثبت می‌شود.
   */
  async peerKeyChanged(): Promise<boolean> {
    const prints = await this.peerPrints();
    if (!prints.length) return false;
    const seen = await getPeer(this.peerId);
    const known = new Set((seen?.fingerprint || "").split(",").filter(Boolean));
    if (!seen || known.size === 0) {
      await putPeer({ userId: this.peerId, fingerprint: prints.sort().join(","), version: prints.length, seenAt: Date.now() });
      return false;
    }
    if (prints.every((p) => known.has(p))) {
      if (prints.length !== known.size) await putPeer({ userId: this.peerId, fingerprint: [...prints].sort().join(","), version: prints.length, seenAt: Date.now() });
      return false;
    }
    return true;
  }

  async acceptPeerKey(): Promise<void> {
    const prints = await this.peerPrints();
    if (!prints.length) return;
    await putPeer({ userId: this.peerId, fingerprint: prints.sort().join(","), version: prints.length, seenAt: Date.now() });
  }
}

/** رمزکننده‌ی «ارسال گروهی» برای یک شاگرد، با فهرستِ کلیدهای فعالِ من و او از GET /api/mentor/broadcast */
export function broadcastCipher(
  identity: Identity,
  mentorshipId: string,
  studentId: string,
  studentKeys: { version: number; publicKey: string }[],
  myKeys: { version: number; publicKey: string }[]
): ConversationCipher {
  return new ConversationCipher(identity, mentorshipId, {
    mentorId: identity.userId,
    studentId,
    keys: {
      [identity.userId]: myKeys.map((r) => ({ version: r.version, publicKey: r.publicKey, current: true })),
      [studentId]: studentKeys.map((r) => ({ version: r.version, publicKey: r.publicKey, current: true })),
    },
  });
}
