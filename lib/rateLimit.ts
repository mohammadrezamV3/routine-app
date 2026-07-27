// محدودکننده نرخ درخواست، ساده و در-حافظه — برای جلوگیری از حمله brute-force
// روی لاگین/ثبت‌نام. محدودیت مهم: این پیاده‌سازی فقط در سطح یک instance کار
// می‌کنه؛ اگه اپ روی چند سرور/serverless پخش بشه، باید با یک store مشترک
// (مثل Redis) جایگزین بشه. برای MVP و یک سرور تنها، همین سطح کافیه.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// هر از گاهی سطل‌های منقضی‌شده رو پاک می‌کنیم که حافظه بی‌نهایت رشد نکنه
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

/**
 * @param key شناسه یکتا برای این محدودیت، مثلاً "signup:1.2.3.4" یا "login:1.2.3.4"
 * @param limit حداکثر تعداد مجاز درخواست در بازه
 * @param windowMs طول بازه به میلی‌ثانیه
 * @returns true اگه اجازه ادامه داره، false اگه از سقف رد شده
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  sweep();
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count++;
  return true;
}

/** استخراج IP از هدرهای استاندارد پروکسی (Nginx/Cloudflare معمولاً x-forwarded-for می‌ذارن) */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) || undefined;
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") || "unknown";
}
