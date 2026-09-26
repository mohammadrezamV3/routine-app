// ترجمه‌ی خطاهای SocialApi به پیامِ نمایشی. سرور برای خطاهای «قاعده‌ای»
// (بن، سقفِ نرخ، «قبلا دوست هستید»، …) متنِ فارسیِ قابلِ نمایش می‌فرسته؛
// کدهای ثابت (module_locked, rules_not_accepted, not found) این‌جا ترجمه می‌شن.
import { SOCIAL_ERROR_MODULE_LOCKED, SOCIAL_ERROR_RULES_NOT_ACCEPTED } from "@m/lib/social-contract";
import { SocialApiError } from "./api";

export const NEED_INTERNET = "نیاز به اینترنت";
export const NEED_INTERNET_LONG = "برای این کار نیاز به اینترنت داری";
export const MODULE_LOCKED_MESSAGE = "این بخش در پلن شما فعال نیست";
export const GENERIC_ERROR = "مشکلی پیش اومد — دوباره امتحان کن";

export function isOffline(err: unknown): boolean {
  return err instanceof SocialApiError ? err.status === 0 : err instanceof Error && err.message.startsWith("offline");
}

export function isModuleLocked(err: unknown): boolean {
  return err instanceof SocialApiError && err.status === 403 && err.code === SOCIAL_ERROR_MODULE_LOCKED;
}

export function isRulesNotAccepted(err: unknown): boolean {
  return err instanceof SocialApiError && err.status === 409 && err.code === SOCIAL_ERROR_RULES_NOT_ACCEPTED;
}

/** آیا متنِ خطای سرور خودش برای کاربر قابلِ نمایشه (فارسی، نه کدِ ثابت) */
function isDisplayable(code: string): boolean {
  return /[؀-ۿ]/.test(code);
}

export function describeSocialError(err: unknown): string {
  if (isOffline(err)) return NEED_INTERNET_LONG;
  if (!(err instanceof SocialApiError)) return GENERIC_ERROR;
  if (isModuleLocked(err)) return MODULE_LOCKED_MESSAGE;
  if (isRulesNotAccepted(err)) return "اول قوانینِ گفت‌وگو را بپذیر";
  if (isDisplayable(err.code)) return err.code;
  switch (err.status) {
    case 401:
      return "نشست شما منقضی شده — دوباره وارد شو";
    case 404:
      return "پیدا نشد یا دیگر در دسترس نیست";
    case 429:
      return "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن";
    default:
      return GENERIC_ERROR;
  }
}
