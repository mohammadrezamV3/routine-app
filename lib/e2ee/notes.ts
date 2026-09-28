// یادداشتِ خصوصیِ منتور درباره‌ی شاگرد — رمزگذاریِ سرتاسری «فقط برای خودم».
// ایزومورفیک (کلاینت + تست). هیچ‌کس جز دارنده‌ی کلیدهای خصوصیِ منتور — نه شاگرد،
// نه سرور، نه Owner — نمی‌تواند بخواندش.
//
// قالب‌ها در MentorStudentNote.body:
//   e2e2:<JSON {i, c, f:{k}, w:[{u,k,w}]}>  — CEKِ تصادفی، بسته‌بندی برای همه‌ی کلیدهای
//                                           فعالِ خودِ منتور (هر دستگاه)؛ پیش‌فرضِ تازه
//   e2e1:<version>:<iv>:<ct>                — قدیمی: ECDH(خصوصی، عمومیِ خودم) با یک نسخه
//   بی‌پیشوند                               — پیش از رمزگذاری؛ کلاینت خودکار بازرمزش می‌کند

import { deriveSelfKey, findCek, importPublicKey, openEnvelope, openText, sealEnvelope, WRAP_BYTES, type KeyWrap } from "./core";
import { b64ByteLength, fromUtf8, lp, utf8 } from "./encoding";

export const NOTE_PREFIX = "e2e1:";
export const NOTE_PREFIX_V2 = "e2e2:";
const NOTE_RE = /^e2e1:(\d{1,6}):([A-Za-z0-9+/]{16}):([A-Za-z0-9+/]+={0,2})$/;
/** سقفِ طولِ پاکتِ رمزشده (۲۰۰۰ نویسه × ۴ بایت + padding + بسته‌بندی‌ها، به base64) */
export const SEALED_NOTE_MAX = 16_000;

type NoteKey = { version: number; publicKey: string; privateKey: CryptoKey };
/** کلیدِ ارسالِ همین دستگاه + (اختیاری) همه‌ی کلیدهای این دستگاه و کلیدهای فعالِ منتور روی همه‌ی دستگاه‌ها */
export type NoteIdentity = NoteKey & {
  userId: string;
  ring?: NoteKey[];
  active?: { version: number; publicKey: string }[];
  /** همه‌ی کلیدهای عمومیِ خودم، از جمله بازنشسته (سازنده‌ی بسته‌بندیِ یادداشت‌های قدیمی) */
  known?: { version: number; publicKey: string }[];
};

type NoteV2 = { i: string; c: string; f: { k: number }; w: KeyWrap[] };

const scope = (userId: string, studentId: string) => ["note", userId, studentId];
const aadV2 = (userId: string, studentId: string) => lp("arion/mentor-note/v2", userId, studentId);

async function noteKeyV1(me: NoteKey & { userId: string }, studentId: string, version: number) {
  return deriveSelfKey(me.privateKey, await importPublicKey(me.publicKey), ["mentor-notes", me.userId, studentId, version]);
}

function pad(b: Uint8Array): Uint8Array {
  const target = Math.ceil((b.length + 1) / 128) * 128;
  const out = new Uint8Array(target).fill(0x20);
  out.set(b, 0);
  return out;
}

export async function sealNote(me: NoteIdentity, studentId: string, text: string): Promise<string> {
  const targets = (me.active?.length ? me.active : [{ version: me.version, publicKey: me.publicKey }]).map((k) => ({ ref: { u: me.userId, k: k.version }, publicKey: k.publicKey }));
  if (!targets.some((t) => t.ref.k === me.version)) targets.push({ ref: { u: me.userId, k: me.version }, publicKey: me.publicKey });
  const env = await sealEnvelope(pad(utf8(JSON.stringify({ v: 1, t: text }))), aadV2(me.userId, studentId), scope(me.userId, studentId), { ref: { u: me.userId, k: me.version }, privateKey: me.privateKey }, targets);
  const v: NoteV2 = { i: env.iv, c: env.ct, f: { k: me.version }, w: env.wraps };
  return NOTE_PREFIX_V2 + JSON.stringify(v);
}

export type OpenedNote = { kind: "text"; text: string } | { kind: "legacy"; text: string } | { kind: "old-key" } | { kind: "failed" };

function parseV2(stored: string): NoteV2 | null {
  try {
    const o = JSON.parse(stored.slice(NOTE_PREFIX_V2.length));
    if (!o || typeof o.i !== "string" || typeof o.c !== "string" || !o.f || !Number.isInteger(o.f.k) || !Array.isArray(o.w) || o.w.length === 0 || o.w.length > 20) return null;
    if (b64ByteLength(o.i) !== 12 || (b64ByteLength(o.c) ?? 0) < 32) return null;
    for (const w of o.w) {
      if (!w || typeof w.u !== "string" || !Number.isInteger(w.k) || typeof w.w !== "string" || b64ByteLength(w.w) !== WRAP_BYTES) return null;
      if (w.via !== undefined && !Number.isInteger(w.via)) return null;
    }
    return o as NoteV2;
  } catch {
    return null;
  }
}

export async function openNote(me: NoteIdentity, studentId: string, stored: string): Promise<OpenedNote> {
  const ring: NoteKey[] = me.ring?.length ? me.ring : [me];
  if (stored.startsWith(NOTE_PREFIX_V2)) {
    const n = parseV2(stored);
    if (!n) return { kind: "failed" };
    try {
      const publicOf = (r: { u: string; k: number }) =>
        r.u !== me.userId
          ? null
          : ring.find((x) => x.version === r.k)?.publicKey ?? me.active?.find((x) => x.version === r.k)?.publicKey ?? me.known?.find((x) => x.version === r.k)?.publicKey ?? null;
      const cek = await findCek(n.w, ring.map((r) => ({ ref: { u: me.userId, k: r.version }, privateKey: r.privateKey })), { u: me.userId, k: n.f.k }, publicOf, scope(me.userId, studentId));
      if (!cek) return { kind: "old-key" };
      const plain = await openEnvelope(cek, { ct: n.c, iv: n.i }, aadV2(me.userId, studentId));
      cek.fill(0);
      const o = JSON.parse(fromUtf8(plain));
      if (!o || o.v !== 1 || typeof o.t !== "string") return { kind: "failed" };
      return { kind: "text", text: o.t };
    } catch {
      return { kind: "failed" };
    }
  }
  if (!stored.startsWith(NOTE_PREFIX)) return { kind: "legacy", text: stored };
  const m = NOTE_RE.exec(stored);
  if (!m) return { kind: "failed" };
  const version = Number(m[1]);
  const own = ring.find((r) => r.version === version);
  if (!own) return { kind: "old-key" };
  try {
    return { kind: "text", text: await openText(await noteKeyV1({ ...own, userId: me.userId }, studentId, version), { iv: m[2], ct: m[3] }, ["note", me.userId, studentId]) };
  } catch {
    return { kind: "failed" };
  }
}

/** شکلِ پاکت (سمتِ سرور): فقط رمزشده پذیرفته می‌شود */
export function isSealedNote(v: unknown): v is string {
  if (typeof v !== "string" || v.length > SEALED_NOTE_MAX) return false;
  if (v.startsWith(NOTE_PREFIX_V2)) return parseV2(v) !== null;
  return NOTE_RE.test(v);
}
