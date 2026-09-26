// ترجمه‌ی خطاهای سرور به پیامِ فارسیِ نمایشی — طبقِ قراردادِ کلیِ
// api-contract («روی status code بساز، نه متنِ error»)، بجز کدِ ثابتِ
// module_locked که خودِ قرارداد به‌صراحت گفته «ثابت، نه فارسی».
import { RoadmapApiError } from "./api";

export const MODULE_LOCKED_MESSAGE = "این بخش در پلن شما فعال نیست";
export const RATE_LIMIT_MESSAGE = "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن";
export const AI_TIMEOUT_MESSAGE = "ساختِ مسیر با هوش مصنوعی موقتاً جواب نداد — دوباره امتحان کن";
export const GENERIC_ERROR_MESSAGE = "مشکلی پیش اومد — دوباره امتحان کن";
export const OFFLINE_MESSAGE = "برای این کار نیاز به اینترنت داری";

export function isModuleLocked(err: unknown): boolean {
  return err instanceof RoadmapApiError && err.status === 403;
}

/** پیامِ فارسیِ قابلِ‌نمایش برای هر خطایی که از RoadmapApi برمی‌گرده. */
export function describeRoadmapError(err: unknown): string {
  if (err instanceof RoadmapApiError) {
    switch (err.status) {
      case 403:
        return MODULE_LOCKED_MESSAGE;
      case 429:
        return RATE_LIMIT_MESSAGE;
      case 502:
        return AI_TIMEOUT_MESSAGE;
      case 401:
        return "نشست شما منقضی شده — دوباره وارد شو";
      case 400:
        return "ورودی نامعتبره — دوباره بررسی کن";
      default:
        return GENERIC_ERROR_MESSAGE;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}
