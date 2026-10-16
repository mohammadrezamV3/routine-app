// حرکت‌های برنامه‌ی تمرینی دستی به شکل متن ذخیره می‌شن («اسکوات 3×10» یا
// «پلانک 30 ثانیه») و عددهای ست/تکرار/مدت داخل همین متنن، نه ستون جدا. این‌جا
// همون عددها با سقف‌های مشترک (lib/numberLimits.ts) سنجیده می‌شن تا «999999×999999»
// یا «5000000 ثانیه» ذخیره نشه.

import { tr } from "./i18n";
import { toEnglishDigits } from "./validate";
import { limitError, MAX_EXERCISE_ITEMS_PER_DAY, NUMBER_LIMITS } from "./numberLimits";

export { MAX_EXERCISE_ITEMS_PER_DAY };
/** سقف طول متن یک حرکت */
export const MAX_EXERCISE_ITEM_LEN = 160;

/** null اگه معتبر بود، وگرنه پیام خطا */
export function validateExerciseItem(raw: string): string | null {
  const t = toEnglishDigits(String(raw));
  if (t.length > MAX_EXERCISE_ITEM_LEN) return tr("نام حرکت خیلی طولانی است", "The exercise name is too long");

  // ست×تکرار: «3×10»، «3x10»، «3 * 10»
  const sr = /(\d+)\s*[×xX*]\s*(\d+)/.exec(t);
  if (sr) {
    const sets = Number(sr[1]);
    const reps = Number(sr[2]);
    if (sets < NUMBER_LIMITS.sets.min || sets > NUMBER_LIMITS.sets.max) return limitError("sets");
    if (reps < NUMBER_LIMITS.reps.min || reps > NUMBER_LIMITS.reps.max) return limitError("reps");
    return null;
  }

  // مدت: «30 ثانیه»، «5 دقیقه»، «30 sec»، «5 min»
  const sec = /(\d+)\s*(?:ثانیه|sec(?:onds?)?\b)/i.exec(t);
  if (sec) {
    const n = Number(sec[1]);
    if (n < NUMBER_LIMITS.exerciseSeconds.min || n > NUMBER_LIMITS.exerciseSeconds.max) return limitError("exerciseSeconds");
    return null;
  }
  const min = /(\d+)\s*(?:دقیقه|min(?:utes?)?\b)/i.exec(t);
  if (min) {
    const n = Number(min[1]);
    if (n < NUMBER_LIMITS.exerciseMinutes.min || n > NUMBER_LIMITS.exerciseMinutes.max) return limitError("exerciseMinutes");
  }
  return null;
}
