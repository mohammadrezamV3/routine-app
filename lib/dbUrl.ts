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
 * دو تصمیمِ عمدی این‌جا:
 *  ۱) اگه اپراتور خودش پارامتری رو توی DATABASE_URL گذاشته، دست نمی‌زنیم.
 *  ۲) به‌جای بازسازیِ URL با `new URL()` فقط رشته رو append می‌کنیم — چون
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
  add("connection_limit", env.DB_CONNECTION_LIMIT || "10");
  // چقدر یه درخواست حاضره توی صفِ پول منتظر بمونه. ۲۰ ثانیه از
  // proxy_read_timeoutِ nginx (۱۵ ثانیه) بیشتره تا nginx همیشه زودتر
  // تصمیم بگیره و کاربر روی صفحه‌ی سفید معطل نمونه.
  add("pool_timeout", env.DB_POOL_TIMEOUT || "20");
  // اگه Postgres بالا نیومده باشه، به‌جای هنگ‌کردنِ نامحدود سریع خطا بده.
  add("connect_timeout", env.DB_CONNECT_TIMEOUT || "10");
  if (!additions.length) return raw;
  return raw + (raw.includes("?") ? "&" : "?") + additions.join("&");
}
