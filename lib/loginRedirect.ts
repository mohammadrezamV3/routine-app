"use client";

import { invalidateStorageCache, publishSessionState } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { invalidateFeatures } from "@/lib/useFeatures";
import { setAuthHintCookie } from "@/lib/preload";
import { resolveHomePath, DEFAULT_HOME } from "@/lib/homePath";

/**
 * بعد از هر ورود موفق (رمز، کد پیامک ورود دومرحله‌ای، ورود خودکار بعد از
 * ثبت‌نام) — یک‌جا، قرینه‌ی lib/logout.ts.
 *
 * باگ «بعد از ورود سرور آپدیت نمی‌شه و هنوز فکر می‌کنه وارد نشدم»: قبلا هر
 * صفحه بعد از signIn با `router.push` (ناوبری کلاینتی) می‌رفت. ولی:
 *   1) layout ریشه در ناوبری کلاینتی دوباره رندر نمی‌شه؛ پس همه‌ی چیزهایی که
 *      سرور لحظه‌ی لود اول برای «مهمان» ساخته بود (session اولیه‌ی
 *      AuthSessionProvider، InlineBootstrap که برای مهمان خالیه، تم حساب)
 *      تا ریلود دستی همون حالت مهمان می‌موندن.
 *   2) کش روتر Next 14 (پیش‌فرض staleTimes.dynamic = 30 ثانیه) پاسخ RSC
 *      صفحه‌هایی که همین چند لحظه پیش به‌عنوان مهمان دیده شده بودن رو دوباره
 *      نشون می‌داد. مسیر واقعی گزارش: مهمان /dashboard رو باز می‌کنه
 *      (گیت «برای دیدن داشبورد وارد شوید»)، می‌زنه «وارد شوید»، وارد می‌شه و
 *      router.push("/dashboard") همون گیت مهمان کش‌شده رو برمی‌گردونه.
 *   3) کش‌های سطح ماژول (storage، حساب، فلگ‌ها، …) و وضعیت سشن لایه‌ی داده
 *      بعد از invalidate تا 3 ثانیه منتظر پلی می‌موندن که دیگه خبر نمی‌داد.
 *
 * حالا: کش‌ها پاک، کوکی راهنما ست (تا لود بعدی داده رو داخل HTML بگیره)،
 * کلید رمزگذاری سرتاسری منتور با سقف زمانی کامل می‌شه (ناوبری کامل اجرای
 * نیمه‌کاره‌اش رو قطع می‌کرد) و بعد ناوبری *کامل* با `location.replace` —
 * یعنی layout، سشن، کش روتر و همه‌ی کش‌ها از نو با کوکی واقعی ساخته می‌شن.
 * `replace` تا «برگشت» دوباره صفحه‌ی ورود رو نشون نده.
 */

/** سقف انتظار برای آماده‌شدن کلید منتور؛ ورود هیچ‌وقت پشتش گیر نمی‌کنه */
export const E2EE_PRIME_WAIT_MS = 6000;

let redirecting = false;

export type LoginRedirectOptions = {
  /** شناسه‌ی کاربری که getSession واقعی برگردونده (نه خروجی signIn) */
  userId: string;
  /** فقط برای مشتق‌کردن کلید منتور روی همین دستگاه؛ به هیچ درخواستی نمی‌ره */
  password?: string;
  /** کمترین زمان قبل از ناوبری (مثلا تا انیمیشن تیک دیده بشه) */
  minDelayMs?: number;
};

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export async function loginAndRedirect(opts: LoginRedirectOptions): Promise<void> {
  if (redirecting) return;
  redirecting = true;
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-logging-in", "");

  // هویت عوض شد: هر چیزی که در حالت مهمان کش شده دور ریخته می‌شه، و لایه‌ی داده
  // همین الان می‌دونه کاربر واردشده‌ست (نه بعد از سقف 3 ثانیه‌ای پل سشن).
  invalidateStorageCache();
  invalidateAccountCache();
  invalidateFeatures();
  publishSessionState(true);
  setAuthHintCookie();

  const prime = opts.password
    ? withTimeout(
        import("@/lib/e2ee/client").then((m) => m.primeE2EEFromPassword(opts.userId, opts.password!)),
        E2EE_PRIME_WAIT_MS,
        undefined,
      )
    : Promise.resolve();

  // مقصد: صفحه‌ی اصلی کاربر (lib/homePath.ts، خودش سقف زمانی داره)
  const [home] = await Promise.all([
    withTimeout(resolveHomePath(), 2000, DEFAULT_HOME),
    prime,
    new Promise((r) => setTimeout(r, opts.minDelayMs ?? 0)),
  ]);

  // تور ایمنی: اگه به هر دلیلی ناوبری انجام نشد، قفل ورود دوباره برای همیشه نمی‌مونه
  setTimeout(() => {
    redirecting = false;
    if (typeof document !== "undefined") document.documentElement.removeAttribute("data-logging-in");
  }, 10_000);

  window.location.replace(home);
}

/** فقط برای تست */
export function __resetLoginRedirectForTests() {
  redirecting = false;
}
