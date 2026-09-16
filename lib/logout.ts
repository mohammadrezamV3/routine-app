import { signOut } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";

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
  signOut({ callbackUrl: "/" });
}
