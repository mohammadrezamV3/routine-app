// پیکربندیِ اتصال به بک‌اند (Next.js — /api/mobile/*).
//
// VITE_API_BASE_URL در زمانِ build داخلِ باندل جا می‌گیره (mobile/.env.example).
// خالی/تعریف‌نشده = اپ کاملا محلی/مهمان کار می‌کنه: هیچ درخواستِ شبکه‌ای زده
// نمی‌شه، صفحه‌ی ورود پیامِ «اتصال پیکربندی نشده» نشون می‌ده و سینک خاموشه.

function normalizeBaseUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const v = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(v) ? v : "";
}

export const API_BASE_URL: string = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

/** true اگه آدرسِ سرور تنظیم شده باشه — وگرنه ورود/سینک غیرفعاله */
export const SYNC_ENABLED = API_BASE_URL !== "";

/** سقفِ زمانِ هر درخواست (میلی‌ثانیه) */
export const REQUEST_TIMEOUT_MS = 20_000;

/** تأخیرِ سینک بعد از آخرین نوشتنِ محلی */
export const LOCAL_WRITE_DEBOUNCE_MS = 2_000;

/** refresh پیش‌دستانه: اگه کمتر از این مقدار به انقضای accessToken مونده */
export const ACCESS_TOKEN_SKEW_MS = 30_000;

export { normalizeBaseUrl };

/** سقفِ زمانِ روت‌های AI (دستیارِ روتین، ساختِ برنامه/رودمپ، اسکنِ غذا) */
export const AI_REQUEST_TIMEOUT_MS = 90_000;
