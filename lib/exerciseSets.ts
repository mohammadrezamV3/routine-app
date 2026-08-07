// استخراجِ تعدادِ ست از متنِ یک آیتمِ برنامه (مثلاً «اسکوات هالتر ۵×۵» → ۵ ست)
// و اسمِ پایه بدونِ ست/تکرار/زمان — برای پاپ‌آپِ ردیابیِ ست‌به‌ست و پیداکردنِ
// حرکتِ متناظر توی کاتالوگ («مشاهده نحوه انجام»).

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

/** «اسکوات هالتر ۵×۵» → ۵. اگه الگوی ست×تکرار توی متن نبود (مثلاً حرکاتِ کاردیوی زمان‌محور)، ۱ برمی‌گردونه. */
export function parseSetCount(item: string): number {
  const m = item.match(/([۰-۹0-9]+)\s*[×xX]/);
  if (!m) return 1;
  const n = parseInt(faToEnDigits(m[1]), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 1;
}
