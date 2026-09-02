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
 * @param key شناسه یکتا برای این محدودیت، مثلا "signup:1.2.3.4" یا "login:1.2.3.4"
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

/**
 * استخراج IP کلاینت از هدرهای پروکسی.
 *
 * هشدار امنیتی: `X-Forwarded-For` را خود کلاینت می‌تواند جعل کند. اگر اپ
 * پشت یک پروکسی مورداعتماد (Nginx/Cloudflare/Vercel) باشد، آن پروکسی این
 * هدر را با IP واقعی بازنویسی می‌کند و قابل‌اعتماد است؛ ولی اگر اپ مستقیم
 * در معرض اینترنت باشد، مهاجم با هر درخواست یک IP جعلی تازه می‌گذارد و همه‌ی
 * محدودیت‌های نرخ مبتنی‌بر IP را دور می‌زند (ثبت‌نام انبوه، password-spraying).
 *
 * برای همین فقط وقتی به این هدر اعتماد می‌کنیم که به‌صراحت با
 * `TRUST_PROXY_HEADERS=1` اعلام شده باشد که یک پروکسی مورداعتماد جلوی اپ هست.
 * در غیر این صورت هدر را نادیده می‌گیریم و همه‌ی درخواست‌ها زیر کلید ثابت
 * "direct" شمرده می‌شوند — این یعنی محدودیت سخت‌گیرانه‌تر می‌شود، نه دورزدنی.
 */
const TRUST_PROXY = process.env.TRUST_PROXY_HEADERS === "1";

export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  if (!TRUST_PROXY) return "direct";
  const get = (name: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(name) || undefined;
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") || "unknown";
}
