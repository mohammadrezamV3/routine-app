"use client";

import { useEffect, useState } from "react";
import {
  E2EEDecryptError,
  decryptMessage,
  deriveChatKeys,
  encryptMessage,
  generateIdentityKeyPair,
  importPrivatePkcs8,
  exportPkcs8,
  importPublicKey,
  isE2EESupported,
  keyFingerprint,
  safetyCode,
  unwrapPrivateKey,
  wrapPrivateKey,
  type ChatKeys,
  type EncryptedMessage,
  type KeyBackup,
} from "./core";
import { randomId } from "./encoding";
import type { ChatMessage } from "@/lib/mentorTypes";
import { deleteLocalIdentity, getLocalIdentity, getPeer, isPersistent, putLocalIdentity, putPeer } from "./keyStore";

// لایه‌ی کلاینتِ رمزگذاریِ سرتاسری: وضعیتِ کلیدِ هویتِ کاربر (مشترک بینِ همه‌ی
// کامپوننت‌ها)، راه‌اندازی/باز کردن/بازنشانی با «رمز گفت‌وگو»، و رمز/رمزگشاییِ
// پیام‌های یک گفت‌وگو. docs/mentor-e2ee.md.

export type Identity = { userId: string; version: number; publicKey: string; privateKey: CryptoKey };
export type ServerKey = { version: number; publicKey: string; hasBackup: boolean };

export type IdentityState =
  | { status: "loading" }
  | { status: "unsupported" }
  | { status: "error"; message: string }
  /** سرور کلیدی ندارد → راه‌اندازیِ اول */
  | { status: "none"; userId: string }
  /** کلید روی سرور هست ولی روی این دستگاه نه → باز کردن با رمز (یا بازنشانی) */
  | { status: "locked"; userId: string; server: ServerKey }
  | { status: "ready"; identity: Identity; persistent: boolean; hasBackup: boolean };

export class E2EEApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

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
const listeners = new Set<(s: IdentityState) => void>();

function setState(s: IdentityState) {
  state = s;
  listeners.forEach((l) => l(s));
}

export function getIdentityState(): IdentityState {
  return state;
}

/** وضعیتِ کلید را از سرور + دستگاه می‌خواند. همزمان‌ها یک درخواست می‌شوند. */
export function refreshIdentity(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    if (!isE2EESupported()) return setState({ status: "unsupported" });
    try {
      const me = await api<{ userId: string; key: ServerKey | null }>("/api/e2ee/keys");
      if (!me.key) {
        await deleteLocalIdentity(me.userId);
        return setState({ status: "none", userId: me.userId });
      }
      const local = await getLocalIdentity(me.userId);
      if (local && local.version === me.key.version && local.publicKey === me.key.publicKey) {
        return setState({
          status: "ready",
          identity: { userId: me.userId, version: local.version, publicKey: local.publicKey, privateKey: local.privateKey },
          persistent: await isPersistent(),
          hasBackup: me.key.hasBackup,
        });
      }
      // کلیدِ محلیِ کهنه (بعد از بازنشانی روی دستگاهِ دیگر) دیگر به کار نمی‌آید
      if (local) await deleteLocalIdentity(me.userId);
      setState({ status: "locked", userId: me.userId, server: me.key });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "وضعیت رمزگذاری دریافت نشد" });
    }
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export function useE2EEIdentity(): IdentityState {
  const [s, setS] = useState<IdentityState>(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    // هر بار سوار شدن: وضعیت از سرور تازه می‌شود (بازنشانی روی دستگاهِ دیگر، کاربرِ دیگر)
    refreshIdentity();
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

async function storeReady(userId: string, version: number, publicKey: string, privateKey: CryptoKey) {
  await putLocalIdentity({ userId, version, publicKey, privateKey, savedAt: Date.now() });
  setState({ status: "ready", identity: { userId, version, publicKey, privateKey }, persistent: await isPersistent(), hasBackup: true });
}

/** کلیدِ خصوصیِ extractable → نسخه‌ی غیرقابل‌استخراج برای نگه‌داری روی دستگاه */
async function toNonExtractable(k: CryptoKey): Promise<CryptoKey> {
  const pkcs8 = await exportPkcs8(k);
  try {
    return await importPrivatePkcs8(pkcs8, false);
  } finally {
    pkcs8.fill(0);
  }
}

/** راه‌اندازیِ اول (expectedVersion = 0) یا بازنشانی (expectedVersion = نسخه‌ی جاری) */
async function createIdentity(userId: string, passcode: string, expectedVersion: number): Promise<void> {
  const kp = await generateIdentityKeyPair();
  const version = expectedVersion + 1;
  const backup = await wrapPrivateKey(kp.privateKey, passcode, { userId, version, publicKey: kp.publicB64 });
  const res = await api<{ key: { version: number; publicKey: string } }>("/api/e2ee/keys", {
    method: "POST",
    body: JSON.stringify({ publicKey: kp.publicB64, backup, expectedVersion }),
  });
  if (res.key.version !== version || res.key.publicKey !== kp.publicB64) throw new E2EEApiError("پاسخ سرور با کلید ساخته‌شده نمی‌خواند", 500);
  await storeReady(userId, version, kp.publicB64, await toNonExtractable(kp.privateKey));
}

export function setupIdentity(userId: string, passcode: string): Promise<void> {
  return createIdentity(userId, passcode, 0);
}

/** کلیدِ تازه؛ پیام‌هایی که با کلیدِ قبلی به تو رسیده دیگر خوانده نمی‌شوند */
export function resetIdentity(userId: string, currentVersion: number, passcode: string): Promise<void> {
  return createIdentity(userId, passcode, currentVersion);
}

export class WrongPasscodeError extends Error {}

async function fetchBackup(): Promise<{ version: number; publicKey: string; backup: KeyBackup }> {
  return api("/api/e2ee/keys/backup");
}

export async function unlockIdentity(userId: string, passcode: string): Promise<void> {
  const b = await fetchBackup();
  let key: CryptoKey;
  try {
    key = await unwrapPrivateKey(b.backup, passcode, { userId, version: b.version, publicKey: b.publicKey });
  } catch (e) {
    if (e instanceof E2EEDecryptError) throw new WrongPasscodeError("رمز گفت‌وگو درست نیست");
    throw e;
  }
  await storeReady(userId, b.version, b.publicKey, key);
}

export async function changePasscode(identity: Identity, oldPasscode: string, newPasscode: string): Promise<void> {
  const b = await fetchBackup();
  if (b.version !== identity.version) throw new E2EEApiError("کلید این حساب تغییر کرده؛ صفحه را تازه کن", 409, "KEY_CHANGED");
  let key: CryptoKey;
  try {
    key = await unwrapPrivateKey(b.backup, oldPasscode, { userId: identity.userId, version: b.version, publicKey: b.publicKey }, true);
  } catch (e) {
    if (e instanceof E2EEDecryptError) throw new WrongPasscodeError("رمز فعلی درست نیست");
    throw e;
  }
  const backup = await wrapPrivateKey(key, newPasscode, { userId: identity.userId, version: b.version, publicKey: b.publicKey });
  await api("/api/e2ee/keys/backup", { method: "PUT", body: JSON.stringify({ version: b.version, backup }) });
}

/** حذفِ کلید از همین دستگاه (کلید روی سرور و دستگاه‌های دیگر می‌ماند) */
export async function forgetThisDevice(userId: string): Promise<void> {
  await deleteLocalIdentity(userId);
  await refreshIdentity();
}

// ───────────────────────── گفت‌وگو ─────────────────────────

export type PublicKeyRow = { version: number; publicKey: string; current: boolean };
export type ConversationKeys = { mentorId: string; studentId: string; keys: Record<string, PublicKeyRow[]> };

export type WireMessage = ChatMessage;

export type OpenedMessage =
  | { kind: "text"; text: string; frankingKey: string; committed: boolean }
  | { kind: "legacy"; text: string }
  /** با کلیدی رمز شده که این حساب دیگر ندارد (پس از بازنشانی) */
  | { kind: "old-key" }
  | { kind: "failed" };

/**
 * رمز/رمزگشاییِ یک گفت‌وگو با کلیدِ هویتِ من و کلیدهای عمومیِ طرفِ مقابل.
 * کلیدهای مشتق‌شده به‌ازای (نسخه‌ی منتور، نسخه‌ی شاگرد) کش می‌شوند.
 */
export class ConversationCipher {
  private cache = new Map<string, Promise<ChatKeys>>();
  readonly peerId: string;
  readonly role: "MENTOR" | "STUDENT";

  constructor(private me: Identity, readonly mentorshipId: string, private k: ConversationKeys) {
    this.role = k.mentorId === me.userId ? "MENTOR" : "STUDENT";
    this.peerId = this.role === "MENTOR" ? k.studentId : k.mentorId;
  }

  peerCurrent(): PublicKeyRow | null {
    return (this.k.keys[this.peerId] || []).find((r) => r.current) ?? null;
  }

  private keysFor(mentorV: number, studentV: number): Promise<ChatKeys> {
    const id = `${mentorV}:${studentV}`;
    let p = this.cache.get(id);
    if (!p) {
      const peerV = this.role === "MENTOR" ? studentV : mentorV;
      const row = (this.k.keys[this.peerId] || []).find((r) => r.version === peerV);
      p = row
        ? importPublicKey(row.publicKey).then((pub) =>
            deriveChatKeys(this.me.privateKey, pub, {
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

  async encrypt(text: string, clientId = randomId()): Promise<EncryptedMessage & { frankingKey: string }> {
    return this.encryptAs(this.me.userId, text, clientId);
  }

  /** senderId ≠ من فقط برای بازرمزگذاریِ پیامِ قدیمیِ طرفِ مقابل */
  private async encryptAs(senderId: string, text: string, clientId: string) {
    const peer = this.peerCurrent();
    if (!peer) throw new E2EEApiError("طرف مقابل هنوز رمزگذاری سرتاسری را فعال نکرده", 409, "PEER_NO_KEY");
    const mentorV = this.role === "MENTOR" ? this.me.version : peer.version;
    const studentV = this.role === "STUDENT" ? this.me.version : peer.version;
    const keys = await this.keysFor(mentorV, studentV);
    const fromMentor = senderId === this.k.mentorId;
    return encryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, text, {
      mentorshipId: this.mentorshipId,
      senderId,
      clientId,
      senderKeyVersion: fromMentor ? mentorV : studentV,
      recipientKeyVersion: fromMentor ? studentV : mentorV,
    });
  }

  async open(m: WireMessage): Promise<OpenedMessage> {
    if (m.legacyBody != null) return { kind: "legacy", text: m.legacyBody };
    if (!m.enc) return { kind: "failed" };
    const fromMentor = m.senderId === this.k.mentorId;
    const mentorV = fromMentor ? m.enc.senderKeyVersion : m.enc.recipientKeyVersion;
    const studentV = fromMentor ? m.enc.recipientKeyVersion : m.enc.senderKeyVersion;
    const myV = this.role === "MENTOR" ? mentorV : studentV;
    if (myV !== this.me.version) return { kind: "old-key" };
    try {
      const keys = await this.keysFor(mentorV, studentV);
      const d = await decryptMessage(fromMentor ? keys.fromMentor : keys.fromStudent, m.enc, {
        mentorshipId: this.mentorshipId,
        senderId: m.senderId,
        clientId: m.enc.clientId,
        senderKeyVersion: m.enc.senderKeyVersion,
        recipientKeyVersion: m.enc.recipientKeyVersion,
      });
      return { kind: "text", text: d.text, frankingKey: d.frankingKey, committed: d.committed };
    } catch {
      return { kind: "failed" };
    }
  }

  /** بسته‌ی بازرمزگذاریِ پیام‌های قدیمیِ متن‌ساده (هر دو طرف باید کلید داشته باشند) */
  async reencryptLegacy(ms: WireMessage[]): Promise<(EncryptedMessage & { id: string; frankingKey: string })[]> {
    if (!this.peerCurrent()) return [];
    const out: (EncryptedMessage & { id: string; frankingKey: string })[] = [];
    for (const m of ms) {
      if (m.legacyBody == null) continue;
      const e = await this.encryptAs(m.senderId, m.legacyBody, randomId());
      out.push({ ...e, id: m.id });
    }
    return out;
  }

  async safetyCode(): Promise<string | null> {
    const peer = this.peerCurrent();
    if (!peer) return null;
    return safetyCode({ userId: this.me.userId, publicKey: this.me.publicKey }, { userId: this.peerId, publicKey: peer.publicKey });
  }

  /**
   * TOFU: اولین بار کلیدِ طرفِ مقابل را به خاطر می‌سپارد؛ اگر بعدا عوض شده باشد
   * true برمی‌گرداند (تا UI اطلاع بدهد). acceptPeerKey آن را تأیید می‌کند.
   */
  async peerKeyChanged(): Promise<boolean> {
    const peer = this.peerCurrent();
    if (!peer) return false;
    const fp = await keyFingerprint(this.peerId, peer.publicKey);
    const seen = await getPeer(this.peerId);
    if (!seen) {
      await putPeer({ userId: this.peerId, fingerprint: fp, version: peer.version, seenAt: Date.now() });
      return false;
    }
    return seen.fingerprint !== fp;
  }

  async acceptPeerKey(): Promise<void> {
    const peer = this.peerCurrent();
    if (!peer) return;
    await putPeer({ userId: this.peerId, fingerprint: await keyFingerprint(this.peerId, peer.publicKey), version: peer.version, seenAt: Date.now() });
  }
}

export async function fetchConversationKeys(mentorshipId: string): Promise<ConversationKeys> {
  return api(`/api/mentorships/${mentorshipId}/messages/keys`);
}

// ───────────────────────── قوانینِ رمزِ گفت‌وگو ─────────────────────────

export const PASSCODE_MIN = 10;

/**
 * رمزِ گفت‌وگو باید در برابرِ حدسِ آفلاین (حتی توسطِ گرداننده‌ی سرور که پشتیبانِ
 * رمزشده را دارد) مقاوم باشد: حداقل ۱۰ نویسه و سطحِ «خوب» در zxcvbn.
 */
export async function passcodeProblem(passcode: string, userInputs: string[] = []): Promise<string | null> {
  if (passcode.length < PASSCODE_MIN) return `حداقل ${PASSCODE_MIN.toLocaleString("fa-IR")} نویسه لازم است`;
  const { passwordTier, isPasswordAcceptable } = await import("@/lib/passwordStrength");
  const tier = await passwordTier(passcode, userInputs);
  if (!isPasswordAcceptable(tier)) return "این رمز قابل حدس است؛ چند کلمه‌ی نامرتبط یا ترکیب طولانی‌تری انتخاب کن";
  return null;
}
