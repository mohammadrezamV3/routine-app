// این فایل از instrumentation.ts (که هم رانتایمِ nodejs هم edge بیلد می‌شه)
// هم قابل‌دسترسیه — حتی با گاردِ runtime، webpack موقعِ بیلدِ باندلِ edge
// بازم استاتیک آنالیزش می‌کنه — پس نباید هیچ ماژولِ داخلیِ نود (مثلِ `os`)
// اینجا import بشه، وگرنه بیلدِ edge می‌شکنه. برای همین به‌جای os.cpus() یک
// پیش‌فرضِ ثابت داریم؛ چون docker-compose.yml همیشه WEB_CONCURRENCY رو
// صریح ست می‌کنه (پیش‌فرضِ ۲)، این fallback فقط برای dev/اجرای بدونِ
// docker-composeه، نه دیپلویِ واقعی.
function defaultWorkerCount(env: Record<string, string | undefined>): number {
  const explicit = Number(env.WEB_CONCURRENCY);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, Math.floor(explicit));
  return 2;
}

/**
 * تنظیمِ کانکشن‌پولِ Prisma روی DATABASE_URL.
 *
 * چرا لازمه: وقتی `connection_limit` صریح داده نشه، Prisma خودش
 * `تعداد هسته × ۲ + ۱` می‌ذاره. روی یه VPSِ تک‌هسته‌ای این یعنی **۳ کانکشن**
 * برای کلِ اپ. کوئری‌های ما I/O-bound هستن (نه CPU-bound)، پس ۳ تا خیلی کمه:
 * به‌محضِ اینکه چند درخواستِ هم‌زمان بیاد، بقیه توی صف می‌مونن تا
 * `pool_timeout` (پیش‌فرض ۱۰ ثانیه) و بعد خطا می‌خورن — از بیرون دقیقاً
 * شبیهِ «سایت بالا نمیاد، چندبار ریلود می‌زنم درست می‌شه» دیده می‌شه.
 *
 * از وقتی اپ زیرِ cluster.js با چند worker اجرا می‌شه (هر worker یک
 * PrismaClientِ کاملاً جدا با پولِ خودشه)، اگه هر worker پیش‌فرضِ قبلی رو
 * جدا می‌گرفت، مجموعِ کانکشن‌های واقعی به Postgres N برابرِ قبل می‌شد (با
 * ۲ worker یعنی ۲۰ به‌جای ۱۰) — روی VPSِ کوچیک به سقفِ `max_connections`ی
 * Postgres نزدیک‌تر می‌شه بدونِ اینکه کسی صریح خواسته باشه. برای همین
 * پیش‌فرض یک بودجه‌ی کلِ اپ (نه هرworker) رو در نظر می‌گیره و بینِ workerها
 * تقسیم می‌کنه — مجموع تقریباً همون قبلی می‌مونه، صرف‌نظر از تعدادِ worker.
 *
 * سه تصمیمِ عمدی این‌جا:
 *  ۱) اگه اپراتور خودش پارامتری رو توی DATABASE_URL گذاشته، دست نمی‌زنیم.
 *  ۲) اگه `DB_CONNECTION_LIMIT` صریح ست شده، همون رو *به‌ازای هر worker*
 *     می‌ذاریم (بدونِ تقسیم) — چون این قبلاً معنیِ per-process/per-worker
 *     داشت و نباید رفتارِ یه env موجود رو زیرِ پا اپراتور عوض کنیم.
 *  ۳) به‌جای بازسازیِ URL با `new URL()` فقط رشته رو append می‌کنیم — چون
 *     رمزِ دیتابیس داخلِ همین URLه و re-encode شدنش می‌تونه بشکنتش.
 */
export function tuneDatabaseUrl(
  raw: string | undefined,
  env: Record<string, string | undefined> = process.env
): string | undefined {
  if (!raw) return raw;
  const additions: string[] = [];
  const add = (key: string, value: string) => {
    if (!new RegExp(`[?&]${key}=`).test(raw)) additions.push(`${key}=${value}`);
  };
  const TOTAL_APP_BUDGET = 10;
  const perWorkerDefault = Math.max(3, Math.floor(TOTAL_APP_BUDGET / defaultWorkerCount(env)));
  add("connection_limit", env.DB_CONNECTION_LIMIT || String(perWorkerDefault));
  // چقدر یه درخواست حاضره توی صفِ پول منتظر بمونه. ۲۰ ثانیه از
  // proxy_read_timeoutِ nginx (۱۵ ثانیه) بیشتره تا nginx همیشه زودتر
  // تصمیم بگیره و کاربر روی صفحه‌ی سفید معطل نمونه.
  add("pool_timeout", env.DB_POOL_TIMEOUT || "20");
  // اگه Postgres بالا نیومده باشه، به‌جای هنگ‌کردنِ نامحدود سریع خطا بده.
  add("connect_timeout", env.DB_CONNECT_TIMEOUT || "10");
  if (!additions.length) return raw;
  return raw + (raw.includes("?") ? "&" : "?") + additions.join("&");
}
