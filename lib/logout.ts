import { signOut } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";
import { wipeOnLogout } from "@/lib/e2ee/keyStore";

/**
 * خروج از حساب — یک‌جا، چون هم سایدبارِ پنل کاربری و هم دکمه‌ی موبایلِ
 * صفحه‌ی اولِ پنل صدایش می‌زنند. نکته‌ی مهم: هر سه کش باید *قبل* از
 * `signOut` باطل شوند، وگرنه کاربرِ بعدی روی همان مرورگر داده‌ی کاربرِ قبلی
 * را برای یک لحظه می‌بیند.
 */
export function logoutAndRedirect() {
  invalidateStorageCache();
  invalidateAccountCache();
  clearAuthHintCookie();
  // رمزگذاریِ سرتاسریِ منتور: کلیدِ باز در حافظه، KEKِ رمزِ عبور و کلیدِ SYNCEDِ جاری
  // پاک می‌شوند (با ورودِ بعدی با رمز بی‌صدا برمی‌گردند)؛ کلیدِ این دستگاه و نسخه‌های
  // قدیمی می‌مانند چون جای دیگری ندارند (lib/e2ee/keyStore.ts). خطا مانعِ خروج نمی‌شود.
  const timeout = new Promise<void>((r) => setTimeout(r, 800));
  Promise.race([wipeOnLogout().catch(() => {}), timeout]).finally(() => signOut({ callbackUrl: "/" }));
}
