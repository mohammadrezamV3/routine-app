import { getCsrfToken, signOut } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";
import { wipeOnLogout } from "@/lib/e2ee/keyStore";

/**
 * خروج از حساب — یک‌جا، چون هم سایدبار پنل کاربری و هم دکمه‌ی موبایل
 * صفحه‌ی اول پنل صدایش می‌زنند. نکته‌ی مهم: هر سه کش باید *قبل* از
 * `signOut` باطل شوند، وگرنه کاربر بعدی روی همان مرورگر داده‌ی کاربر قبلی
 * را برای یک لحظه می‌بیند.
 */
let loggingOut = false;

export function logoutAndRedirect() {
  // باگ «لگ/قفل و به‌هم‌ریختن بک‌گراند»: قبلا اول تا ۸۰۰ms منتظر پاک‌کردن
  // کلیدها می‌موند، بعد signOut که کل اپ رو یک‌بار در حالت مهمان رندر
  // می‌کرد (تم/داشبورد/انیمیشن خروج پاپ‌آپ‌ها) و تازه ریدایرکت می‌شد؛ کلیک
  // دوباره هم یک خروج دیگه شروع می‌کرد. حالا: یک پرده‌ی تار فورا روی صفحه،
  // پاک‌سازی و درخواست خروج هم‌زمان، و بعد مستقیم رفتن به «/» (بدون رندر
  // میانی حالت مهمان).
  if (loggingOut) return;
  loggingOut = true;
  document.documentElement.setAttribute("data-logging-out", "");

  invalidateStorageCache();
  invalidateAccountCache();
  clearAuthHintCookie();
  // رمزگذاری سرتاسری منتور: کلید باز در حافظه، KEK رمز عبور و کلید SYNCED جاری
  // پاک می‌شوند (با ورود بعدی با رمز بی‌صدا برمی‌گردند)؛ کلید این دستگاه و نسخه‌های
  // قدیمی می‌مانند چون جای دیگری ندارند (lib/e2ee/keyStore.ts). خطا مانع خروج نمی‌شود.
  const wipe = Promise.race([
    wipeOnLogout().catch(() => {}),
    new Promise<void>((r) => setTimeout(r, 800)),
  ]);
  // باگ «موقع خروج صفحه گیر می‌کنه»: درخواست خروج هیچ سقف زمانی نداشت؛ روی
  // شبکه‌ی کند/قطع، پرده‌ی تار (pointer-events:none) برای همیشه روی صفحه می‌موند.
  // حالا هر مرحله سقف داره و در بدترین حالت پرده برداشته می‌شه تا کاربر گیر نکنه.
  // کوکی نشست حالا بین زیردامنه‌ها مشترکه (Domain=.base). پاسخ signout همون کوکی دامنه‌دار رو منقضی
  // می‌کنه و روت next-auth (app/api/auth/[...nextauth]/route.ts → lib/authCookies.ts) نسخه‌ی
  // host-only قدیمی هم‌اسمش رو هم منقضی می‌کنه؛ پس خروج واقعا از همه‌ی زیردامنه‌ها انجام می‌شه.
  // کوکی نشست httpOnlyه و از کلاینت قابل پاک‌کردن نیست، برای همین اینجا کار اضافه‌ای لازم نیست.
  const ctrl = new AbortController();
  const abortTimer = setTimeout(() => ctrl.abort(), 6000);
  const serverSignOut = (async () => {
    const csrfToken = await getCsrfToken();
    const res = await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrfToken ?? "", callbackUrl: "/", json: "true" }),
      signal: ctrl.signal,
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("signout failed");
  })().finally(() => clearTimeout(abortTimer));

  // تور ایمنی: اگه تا ۱۲ ثانیه هیچ ناوبری‌ای انجام نشد، قفل صفحه باز می‌شه
  const unstick = setTimeout(() => {
    loggingOut = false;
    document.documentElement.removeAttribute("data-logging-out");
  }, 12_000);

  Promise.all([wipe, serverSignOut]).then(
    () => window.location.replace("/"),
    // مسیر دستی شکست خورد → همون مسیر استاندارد next-auth (که خودش ریدایرکت می‌کنه)
    () => signOut({ callbackUrl: "/" }).catch(() => {
      clearTimeout(unstick);
      loggingOut = false;
      document.documentElement.removeAttribute("data-logging-out");
    })
  );
}
