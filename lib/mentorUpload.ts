import { createHash } from "crypto";
import { tr } from "@/lib/i18n";

// اعتبارسنجی فایل مدارک منتور (هویت/مدرک) — سمت سرور و از روی *محتوا*.
// نوع اعلام‌شده توسط کلاینت (Content-Type/پسوند) قابل‌اعتماد نیست؛ فقط
// magic bytes تصمیم می‌گیره. هر چیزی غیر از JPEG/PNG/WebP/PDF (مثلا اجرایی،
// HTML، SVG که می‌تونه اسکریپت داشته باشه) رد می‌شه.

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type DocumentMime = (typeof ALLOWED_DOCUMENT_MIME)[number];

export function sniffDocumentMime(buf: Uint8Array): DocumentMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "application/pdf";
  return null;
}

/** اسم فایل فقط برای نمایش — بدون مسیر، کاراکتر کنترلی یا طول بی‌حد */
export function sanitizeFileName(name: unknown, mime: DocumentMime): string {
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1].replace("jpeg", "jpg");
  const base = typeof name === "string" ? name.split(/[\\/]/).pop() || "" : "";
  const clean = base.replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}_\- ]+/gu, "").trim().slice(0, 60);
  return `${clean || "document"}.${ext}`;
}

export type ValidatedDocument = { data: Buffer; mimeType: DocumentMime; sizeBytes: number; sha256: string; fileName: string };

export function validateDocument(bytes: ArrayBuffer | Uint8Array, name: unknown): { ok: true; doc: ValidatedDocument } | { ok: false; error: string; status: number } {
  const buf = Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  if (buf.length === 0) return { ok: false, error: tr("فایل خالیه", "The file is empty"), status: 400 };
  if (buf.length > MAX_DOCUMENT_BYTES) return { ok: false, error: tr("حجم فایل حداکثر 5 مگابایت است", "The file can be at most 5 MB"), status: 413 };
  const mime = sniffDocumentMime(buf);
  if (!mime) return { ok: false, error: tr("فقط تصویر (JPG/PNG/WebP) یا PDF قابل قبوله", "Only images (JPG/PNG/WebP) or PDF files are accepted"), status: 415 };
  return {
    ok: true,
    doc: { data: buf, mimeType: mime, sizeBytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), fileName: sanitizeFileName(name, mime) },
  };
}
