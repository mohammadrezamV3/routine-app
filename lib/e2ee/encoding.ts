// کدگذاری‌های کمکیِ لایه‌ی رمزگذاریِ سرتاسری — ایزومورفیک (مرورگر + Node ≥ 20).
// هیچ وابستگی‌ای به Buffer ندارد تا همین فایل در باندلِ کلاینت هم بی‌هزینه باشد.

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });

export function utf8(s: string): Uint8Array {
  return enc.encode(s);
}

/** UTF-8 سخت‌گیر: بایتِ نامعتبر = خطا (نه جایگزینیِ بی‌صدا با �) */
export function fromUtf8(b: Uint8Array | ArrayBuffer): string {
  return dec.decode(b instanceof Uint8Array ? b : new Uint8Array(b));
}

export function toB64(b: Uint8Array | ArrayBuffer): string {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + 0x8000)));
  return btoa(s);
}

const B64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

/** base64 استاندارد؛ ورودیِ بدشکل → null (هرگز استثنا به سمتِ روت نمی‌رود) */
export function fromB64(s: string): Uint8Array | null {
  if (typeof s !== "string" || s.length % 4 !== 0 || !B64_RE.test(s)) return null;
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** طولِ بایتیِ یک رشته‌ی base64 معتبر، بدونِ دیکد (برای اعتبارسنجیِ ارزان) */
export function b64ByteLength(s: string): number | null {
  if (typeof s !== "string" || s.length % 4 !== 0 || !B64_RE.test(s)) return null;
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return (s.length / 4) * 3 - pad;
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * سریال‌سازیِ یکتا و بی‌ابهامِ چند فیلد (هر فیلد = طولِ ۴ بایتیِ big-endian +
 * بایت‌ها). برای AAD، ورودیِ HKDF و متنِ تعهدِ فرانکینگ — با الحاقِ ساده‌ی
 * رشته‌ها («a|bc» و «ab|c») دو زمینه‌ی متفاوت می‌توانستند یکی شوند.
 */
export function lp(...parts: (string | number | Uint8Array)[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const p of parts) {
    const b = p instanceof Uint8Array ? p : utf8(typeof p === "number" ? String(p) : p);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, b.length, false);
    chunks.push(len, b);
  }
  return concat(...chunks);
}

/** مقایسه‌ی زمان‌ثابت برای دو آرایه‌ی هم‌طول (برای جاهایی که subtle.verify در دسترس نیست) */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/** شناسه‌ی تصادفیِ URL-safe (پیش‌فرض ۱۲۸ بیت) — clientIdِ پیام */
export function randomId(bytes = 16): string {
  const b = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(b);
  return toB64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** تبدیلِ ارقامِ فارسی/عربی به لاتین — برای رمزِ گفت‌وگو روی کیبوردهای مختلف */
export function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
