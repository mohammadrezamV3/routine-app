// منطق زمان‌بندی روزانه. برنامه از خالی شروع می‌شه — کاربر خودش درس/برنامه
// اضافه می‌کنه (از دکمه + توی برنامه هفتگی)؛ اینجا فقط customOccurrences و
// removedOccurrences رو پردازش می‌کنیم. در آینده این تابع باید از مدل
// RoutineItem (schema.prisma) هم بخونه تا برنامه‌های تکرارشونده واقعاً در
// دیتابیس ذخیره بشن، نه فقط localStorage/UserSetting.

export type ScheduleTask = {
  id: string;
  name: string;
  time: string; // نمایش فارسی، مثلاً "۱۰:۳۰ – ۱۹:۳۰"
  custom?: boolean;
};

const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const faDigitMap: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function toEnDigits(s: string): string {
  return String(s).replace(/[۰-۹]/g, (ch) => faDigitMap[ch] ?? ch);
}

export function toFaDigits(s: string): string {
  return String(s).replace(/[0-9]/g, (ch) => faDigits[+ch]);
}

export function timeStartMinutes(timeStr: string): number | null {
  const en = toEnDigits(timeStr);
  const m = /(\d{1,2}):(\d{2})/.exec(en);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return null;
}

export function timeEndMinutes(timeStr: string): number | null {
  const en = toEnDigits(timeStr);
  const parts = en.split(/[–—-]/);
  if (parts.length === 2) {
    const m = /(\d{1,2}):(\d{2})/.exec(parts[1]);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  return null;
}

export function splitTimeRange(t: string): { start: string | null; full: string } {
  const parts = String(t).split(/[–—-]/);
  if (parts.length === 2 && /\d/.test(parts[0]) && /\d/.test(parts[1])) {
    return { start: parts[0].trim(), full: t };
  }
  return { start: null, full: t };
}

export function sortTasksByTime(list: ScheduleTask[]): ScheduleTask[] {
  return list
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const ta = timeStartMinutes(a.item.time);
      const tb = timeStartMinutes(b.item.time);
      if (ta === null && tb === null) return a.idx - b.idx;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb || a.idx - b.idx;
    })
    .map((w) => w.item);
}

/**
 * برنامه‌ی یک روز مشخص — فقط بر اساس آیتم‌های سفارشی‌ای که خود کاربر اضافه
 * کرده (customOccurrences)، منهای مواردی که حذف کرده (removedOccurrences).
 * دیگه هیچ آیتم پیش‌فرض/آزمایشی‌ای اینجا سخت‌کد نشده.
 */
export function tasksForDate(
  d: Date,
  opts?: { removedOccurrences?: Set<string>; customOccurrences?: { id: string; name: string; jsDay: number; time: string }[] }
): ScheduleTask[] {
  const day = d.getDay();
  let filtered: ScheduleTask[] = [];

  if (opts?.customOccurrences) {
    opts.customOccurrences.forEach((c) => {
      if (c.jsDay === day) filtered.push({ id: c.id, name: c.name, time: c.time, custom: true });
    });
  }
  if (opts?.removedOccurrences) {
    filtered = filtered.filter((t) => !opts.removedOccurrences!.has(t.id + "|" + day));
  }
  return sortTasksByTime(filtered);
}

export function isWakeOnTime(iso: string): boolean {
  const d = new Date(iso);
  const h = d.getHours(),
    m = d.getMinutes();
  return h < 9 || (h === 9 && m <= 30);
}

export const WEEK_ORDER = [
  { name: "شنبه", short: "ش", jsDay: 6 },
  { name: "یکشنبه", short: "ی", jsDay: 0 },
  { name: "دوشنبه", short: "د", jsDay: 1 },
  { name: "سه‌شنبه", short: "س", jsDay: 2 },
  { name: "چهارشنبه", short: "چ", jsDay: 3 },
  { name: "پنجشنبه", short: "پ", jsDay: 4 },
  { name: "جمعه", short: "ج", jsDay: 5 },
];
