// ساخت لینک دعوت — تابع خالص (سمت سرور و کلاینت). لینک همیشه `/?ref=CODE` روی
// origin همون میزبانیه که کاربر روش هست؛ هیچ‌وقت آدرس داخلی یا اسلش دوتایی نمیاد.
import { REFERRAL_CODE_RE } from "./referral";

/** origin تمیز: بدون اسلش آخر؛ فقط http/https وگرنه رشته‌ی خالی */
export function cleanOrigin(raw: string | null | undefined): string {
  const o = (raw ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+$/i.test(o) ? o : "";
}

/** اگه کد نامعتبر باشه فقط خود origin برمی‌گرده */
export function buildInviteUrl(origin: string | null | undefined, code: string | null | undefined): string {
  const base = cleanOrigin(origin);
  const c = (code ?? "").trim().toUpperCase();
  return REFERRAL_CODE_RE.test(c) ? `${base}/?ref=${encodeURIComponent(c)}` : `${base}/`;
}

/** origin واقعی درخواست پشت پروکسی (Nginx): هدرهای forwarded، وگرنه fallback */
export function requestOrigin(
  headers: { get(name: string): string | null },
  fallback: string,
): string {
  const host = (headers.get("x-forwarded-host") || headers.get("host") || "").split(",")[0].trim();
  const proto = (headers.get("x-forwarded-proto") || "").split(",")[0].trim() || "https";
  if (host && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(host)) {
    const o = cleanOrigin(`${proto}://${host}`);
    if (o) return o;
  }
  return cleanOrigin(fallback);
}
