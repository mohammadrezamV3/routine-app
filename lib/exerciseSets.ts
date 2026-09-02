// استخراج تعداد ست از متن یک آیتم برنامه (مثلا «اسکوات هالتر ۵×۵» → ۵ ست)
// و اسم پایه بدون ست/تکرار/زمان — برای پاپ‌آپ ردیابی ست‌به‌ست و پیداکردن
// حرکت متناظر توی کاتالوگ («مشاهده نحوه انجام»).

const SET_REP_SUFFIX = /\s*[۰-۹0-9]+\s*[×xX]\s*[۰-۹0-9]+.*$/;
const TIME_SUFFIX = /\s*[۰-۹0-9]+\s*(دقیقه|ثانیه).*$/;
const PER_LIMB_SUFFIX = /\s*(هر\s*پا|هر\s*طرف)\s*$/;
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function faToEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

/** «اسکوات هالتر ۵×۵ هر پا» → «اسکوات هالتر» */
export function stripSetSuffix(item: string): string {
  return item.replace(PER_LIMB_SUFFIX, "").replace(SET_REP_SUFFIX, "").replace(TIME_SUFFIX, "").trim();
}

/** «اسکوات هالتر ۵×۵» → ۵. اگه الگوی ست×تکرار توی متن نبود (مثلا حرکات کاردیوی زمان‌محور)، ۱ برمی‌گردونه. */
export function parseSetCount(item: string): number {
  const m = item.match(/([۰-۹0-9]+)\s*[×xX]/);
  if (!m) return 1;
  const n = parseInt(faToEnDigits(m[1]), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 1;
}

export type ExerciseItemSpec = {
  baseName: string;
  sets: number;
  /** true یعنی هر ست/کل حرکت با شمارش‌معکوس زمانی انجام می‌شه (پلانک، کاردیو)، نه با تکرار شمارشی */
  isTimed: boolean;
  /** برای حرکات تکرارمحور: تعداد تکرار هر ست (مثلا «۶» توی «۴×۶») */
  reps: string | null;
  /** برای حرکات زمان‌محور: طول هر ست/کل حرکت به ثانیه (مثلا پلانک ۳۰ ثانیه‌ای، یا دویدن ۲۵ دقیقه‌ای) */
  seconds: number | null;
};

const SET_TIME_PATTERN = /([۰-۹0-9]+)\s*[×xX]\s*([۰-۹0-9]+)\s*(دقیقه|ثانیه)/;
const SET_REP_PATTERN = /([۰-۹0-9]+)\s*[×xX]\s*([۰-۹0-9]+)/;
const SOLO_TIME_PATTERN = /([۰-۹0-9]+)\s*(دقیقه|ثانیه)/;

/** متن خام یک آیتم برنامه رو به اجزاش (اسم/تعداد ست/تکرار یا زمان) می‌شکنه — برای نمایش جدولی و تشخیص حرکات زمان‌محور */
export function parseExerciseItem(item: string): ExerciseItemSpec {
  const baseName = stripSetSuffix(item);

  const setTimeMatch = item.match(SET_TIME_PATTERN);
  if (setTimeMatch) {
    const sets = Math.min(parseInt(faToEnDigits(setTimeMatch[1]), 10) || 1, 12);
    const amount = parseInt(faToEnDigits(setTimeMatch[2]), 10) || 0;
    const seconds = setTimeMatch[3] === "دقیقه" ? amount * 60 : amount;
    return { baseName, sets, isTimed: true, reps: null, seconds };
  }

  const setRepMatch = item.match(SET_REP_PATTERN);
  if (setRepMatch) {
    const sets = Math.min(parseInt(faToEnDigits(setRepMatch[1]), 10) || 1, 12);
    return { baseName, sets, isTimed: false, reps: setRepMatch[2], seconds: null };
  }

  const soloTimeMatch = item.match(SOLO_TIME_PATTERN);
  if (soloTimeMatch) {
    const amount = parseInt(faToEnDigits(soloTimeMatch[1]), 10) || 0;
    const seconds = soloTimeMatch[2] === "دقیقه" ? amount * 60 : amount;
    return { baseName, sets: 1, isTimed: true, reps: null, seconds };
  }

  return { baseName, sets: 1, isTimed: false, reps: null, seconds: null };
}
