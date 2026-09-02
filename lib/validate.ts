// اعتبارسنجی مشترک ورودی‌ها — تا هر روت مجبور نباشه دوباره regex بنویسه.
// هدف: رد کردن زودهنگام ورودی‌های بدشکل قبل از رسیدن به دیتابیس.

import { passwordTier, passwordTierError } from "./passwordStrength";

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

// شماره موبایل ایران: 09xxxxxxxxx (۱۱ رقم، با صفر شروع)
export function isValidIranPhone(v: string): boolean {
  return /^09\d{9}$/.test(v);
}

// یوزرنیم: فقط حروف انگلیسی/عدد/آندرلاین، ۳ تا ۲۰ کاراکتر — تا هم از
// تزریق کاراکترهای عجیب جلوگیری بشه هم شبیه شناسه واقعی بمونه.
export function isValidUsername(v: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(v);
}

/**
 * سیاست رمز عبور: حداقل ۸ کاراکتر، و از نظر zxcvbn (سنجش واقعی قدرت رمز، نه
 * فقط شمارش نوع کاراکتر) حداقل در سطح «خوب» باشه.
 * برمی‌گردونه: null اگه معتبر بود، وگرنه پیام خطا برای نمایش به کاربر.
 */
export async function validatePassword(v: string, userInputs: string[] = []): Promise<string | null> {
  if (v.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (v.length > 128) return "رمز عبور خیلی طولانی است";
  return passwordTierError(await passwordTier(v, userInputs));
}

/** رشته‌های آزاد ورودی کاربر (اسم، یادداشت و ...) رو به یک طول منطقی محدود می‌کنه */
export function clampText(v: string, maxLen: number): string {
  return String(v).slice(0, maxLen);
}

// ─────────────────────────────────────────────────────────────────────────
// ورودی‌های تاریخ‌محور و بدنه‌ی درخواست
//
// چرا اضافه شد: قبلا همه‌ی روت‌هایی که تاریخ می‌گرفتن مستقیم
// `new Date(userInput)` می‌کردن. `new Date("garbage")` یه `Invalid Date`
// می‌ده که Prisma باهاش throw می‌کنه و روت با **HTTP 500 هندل‌نشده** می‌افته
// (تست‌شده: `?date=garbage`، `?date=9999-99-99` هردو ۵۰۰ می‌دادن). این هم
// یه راه ارزون خراب‌کردن سرویسه هم استک خطا رو توی لاگ می‌ریزه.
// ─────────────────────────────────────────────────────────────────────────

/**
 * فقط `YYYY-MM-DD` واقعی رو قبول می‌کنه — نه هر چیزی که `new Date` بتونه
 * حدس بزنه. تاریخ‌های بدشکل تقویمی (مثل `2026-02-31`) هم رد می‌شن، چون
 * جاوااسکریپت بی‌صدا سرریزشون می‌کنه به ماه بعد.
 * خروجی روی UTC نیم‌شب ساخته می‌شه تا با ستون‌های `@db.Date` جور باشه و
 * نتیجه به تایم‌زون سرور وابسته نباشه.
 */
export function parseIsoDate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  // سرریز تقویمی رو می‌گیره: Date.UTC(2026, 1, 31) می‌شه ۳ مارس
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** سقف طول بازه‌ی تاریخی که یک درخواست می‌تونه بخواد (روز) */
export const MAX_RANGE_DAYS = 400;

/**
 * بازه‌ی `from`/`to` رو اعتبارسنجی می‌کنه. علاوه بر بدشکل‌بودن، بازه‌های
 * بی‌انتها (`from=0001-01-01&to=9999-12-31` — تست‌شده، قبلا ۲۰۰ می‌داد و
 * عملا یه full-table scan بود) رو هم رد می‌کنه.
 */
export function parseDateRange(
  fromRaw: unknown,
  toRaw: unknown,
  maxDays: number = MAX_RANGE_DAYS
): { from: Date; to: Date } | { error: string } {
  const from = parseIsoDate(fromRaw);
  const to = parseIsoDate(toRaw);
  if (!from || !to) return { error: "بازه‌ی تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)" };
  if (from > to) return { error: "شروع بازه بعد از پایان آن است" };
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days > maxDays) return { error: `بازه‌ی درخواستی طولانی‌تر از ${maxDays} روز است` };
  return { from, to };
}

/** رشته‌ی جستجوی کاربر — بریده‌شده تا یه `q`ی چندصدکیلوبایتی به دیتابیس نره */
export function clampQuery(v: unknown, maxLen = 100): string {
  return typeof v === "string" ? v.trim().slice(0, maxLen) : "";
}

/** سقف پیش‌فرض بدنه‌ی JSON — ۲۵۶ کیلوبایت برای هر چیزی که این اپ می‌نویسه فراوونه */
export const MAX_JSON_BODY_BYTES = 256 * 1024;

/**
 * بدنه‌ی JSON رو با سقف حجم می‌خونه. Next برای route handlerها هیچ سقف
 * پیش‌فرضی نمی‌ذاره، پس بدون این، یک کاربر لاگین‌کرده می‌تونست چندمگابایت
 * بفرسته (تست‌شده: ۳MB روی `/api/settings/*` قبول و ذخیره می‌شد).
 * `Content-Length` اول چک می‌شه (ارزون)، ولی چون قابل جعل/نبودنه، خود
 * بایت‌های خوانده‌شده هم شمرده می‌شن.
 */
export async function readJsonBody<T = any>(
  req: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<{ ok: true; body: T } | { ok: false; status: number; error: string }> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    return { ok: false, status: 413, error: "حجم درخواست بیش از حد مجاز است" };
  }
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: "بدنه‌ی درخواست خوانده نشد" };
  }
  // طول رشته کاراکتره نه بایت؛ برای متن فارسی بایت‌ها بیشترن، پس واقعیش رو می‌سنجیم
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, status: 413, error: "حجم درخواست بیش از حد مجاز است" };
  }
  try {
    return { ok: true, body: (text ? JSON.parse(text) : {}) as T };
  } catch {
    return { ok: false, status: 400, error: "بدنه‌ی درخواست JSON معتبر نیست" };
  }
}
