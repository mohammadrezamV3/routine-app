// قراردادهای خالص سمت کلاینت برای کادرهای جستجو (بدون React) — تست‌پذیر.
import { tr } from "@/lib/i18n";

export const MAX_COOLDOWN_SEC = 60;
export const DEFAULT_COOLDOWN_SEC = 10;

/** مقدار Retry-After (ثانیه‌ی عددی) با سقف و پیش‌فرض امن؛ تاریخ HTTP هم پذیرفته می‌شه. */
export function parseRetryAfterSec(header: string | null | undefined, now = Date.now()): number {
  if (!header) return DEFAULT_COOLDOWN_SEC;
  const n = Number(header);
  if (Number.isFinite(n) && n >= 0) return Math.min(MAX_COOLDOWN_SEC, Math.max(1, Math.ceil(n)));
  const t = Date.parse(header);
  if (Number.isFinite(t)) return Math.min(MAX_COOLDOWN_SEC, Math.max(1, Math.ceil((t - now) / 1000)));
  return DEFAULT_COOLDOWN_SEC;
}

export function isBackoffStatus(status: number): boolean {
  return status === 429 || status === 503;
}

export function limitNotice(status: number, waitSec: number): string {
  return status === 503
    ? tr(`سرور شلوغه؛ ${waitSec} ثانیه دیگه دوباره جست‌وجو می‌شه`, `The server is busy; searching again in ${waitSec}s`)
    : tr(`درخواست‌های زیاد؛ ${waitSec} ثانیه دیگه دوباره جست‌وجو می‌شه`, `Too many requests; searching again in ${waitSec}s`);
}

/** آیا این ورودی اصلا باید درخواست بزنه؟ (بعد از trim) */
export function shouldSearch(q: string, minLength: number): boolean {
  return q.trim().length >= minLength;
}
