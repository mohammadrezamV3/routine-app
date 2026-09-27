// یادداشتِ خصوصیِ منتور درباره‌ی شاگرد — رمزگذاریِ سرتاسری «فقط برای خودم».
// ایزومورفیک (کلاینت + تست). کلید: ECDH(خصوصیِ منتور، عمومیِ خودِ منتور) → HKDF
// با scope = (mentor-notes, mentorId, studentId, نسخه‌ی کلید). هیچ‌کس جز دارنده‌ی
// کلیدِ خصوصیِ منتور — نه شاگرد، نه سرور، نه Owner — نمی‌تواند بخواندش.
//
// قالبِ ذخیره در MentorStudentNote.body:  e2e1:<version>:<iv b64>:<ct b64>
// (مقدارِ بی‌پیشوند = یادداشتِ قدیمیِ پیش از رمزگذاری؛ کلاینت خودکار بازرمزش می‌کند)

import { deriveSelfKey, importPublicKey, openText, sealText } from "./core";

export const NOTE_PREFIX = "e2e1:";
const NOTE_RE = /^e2e1:(\d{1,6}):([A-Za-z0-9+/]{16}):([A-Za-z0-9+/]+={0,2})$/;
/** سقفِ طولِ پاکتِ رمزشده (۲۰۰۰ نویسه × ۴ بایت + padding، به base64) */
export const SEALED_NOTE_MAX = 12_000;

export type NoteIdentity = { userId: string; version: number; publicKey: string; privateKey: CryptoKey };

async function noteKey(me: NoteIdentity, studentId: string, version: number) {
  return deriveSelfKey(me.privateKey, await importPublicKey(me.publicKey), ["mentor-notes", me.userId, studentId, version]);
}

export async function sealNote(me: NoteIdentity, studentId: string, text: string): Promise<string> {
  const s = await sealText(await noteKey(me, studentId, me.version), text, ["note", me.userId, studentId]);
  return `${NOTE_PREFIX}${me.version}:${s.iv}:${s.ct}`;
}

export type OpenedNote = { kind: "text"; text: string } | { kind: "legacy"; text: string } | { kind: "old-key" } | { kind: "failed" };

export async function openNote(me: NoteIdentity, studentId: string, stored: string): Promise<OpenedNote> {
  if (!stored.startsWith(NOTE_PREFIX)) return { kind: "legacy", text: stored };
  const m = NOTE_RE.exec(stored);
  if (!m) return { kind: "failed" };
  const version = Number(m[1]);
  if (version !== me.version) return { kind: "old-key" };
  try {
    return { kind: "text", text: await openText(await noteKey(me, studentId, version), { iv: m[2], ct: m[3] }, ["note", me.userId, studentId]) };
  } catch {
    return { kind: "failed" };
  }
}

/** شکلِ پاکت (سمتِ سرور): فقط رمزشده پذیرفته می‌شود */
export function isSealedNote(v: unknown): v is string {
  return typeof v === "string" && v.length <= SEALED_NOTE_MAX && NOTE_RE.test(v);
}
