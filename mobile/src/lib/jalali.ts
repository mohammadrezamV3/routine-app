// توابع تبدیل تقویم جلالی — پورت مستقیم از وب (lib/jalali.ts)، بدون هیچ
// وابستگی به next/*. عمدا همون الگوریتم ساده (بدون تصحیح کبیسه پیچیده)
// نگه داشته شده تا رفتار یکسان با وب داشته باشه.

export type JalaliDate = [number, number, number]; // [year, month, day]

export function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

// طول ماه‌های جلالی به‌صورت ساده‌شده (تصحیح کبیسه عمدا حذف شده، مطابق نسخه وب)
export function jalaliMonthLength(jm: number): number {
  return jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
}

// تبدیل تقریبی جلالی -> میلادی (فرض بر نوروز = ۲۱ مارس، بدون تصحیح کبیسه)
export function jalaliToGregorianApprox(jy: number, jm: number, jd: number): Date {
  const gyBase = jy + 621;
  const d = new Date(gyBase, 2, 21);
  let offset = 0;
  for (let i = 1; i < jm; i++) offset += jalaliMonthLength(i);
  offset += jd - 1;
  d.setDate(d.getDate() + offset);
  return d;
}

/**
 * تبدیلِ *دقیقِ* جلالی → ISO محلی. با تقریب شروع می‌کنیم و با toJalali
 * (که دقیقه) تا ±۲ روز اصلاحش می‌کنیم. null یعنی چنین تاریخِ جلالی‌ای
 * وجود نداره (مثلا ۳۱ مهر).
 */
export function jalaliToIso(jy: number, jm: number, jd: number): string | null {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  const base = jalaliToGregorianApprox(jy, jm, jd);
  for (const delta of [0, -1, 1, -2, 2]) {
    const d = new Date(base);
    d.setDate(d.getDate() + delta);
    const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (j[0] === jy && j[1] === jm && j[2] === jd) return isoLocal(d);
  }
  return null;
}

export const J_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

// index = JS getDay()
export const FA_WEEKDAY = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
export const FA_WEEKDAY_SHORT = ["ی", "د", "س", "چ", "پ", "ج", "ش"];

// ترتیب هفته ایرانی: شنبه..جمعه به مقادیر JS getDay
export const CAL_WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

export function faNum(n: number | string): string {
  return String(n);
}

// نمایش تاریخ جلالی به شکل "۱۴۰۴/۰۵/۰۷" (سال/ماه/روز — همون دلیل وب: رشته‌ی
// خالص رقم و اسلش همیشه چپ‌به‌راست رندر می‌شه، پس خواندن از راست در RTL
// می‌شه روز/ماه/سال).
export function formatJalali(j: JalaliDate): string {
  return `${j[0]}/${pad(j[1])}/${pad(j[2])}`;
}
