import { isoLocal } from "./jalali";

// بخش خالص و بی‌وابستگی یادآوری دارو (بدون lib/storage که next-auth/react
// و کش کلاینت رو می‌کشه) — تا زمان‌بند سمت سرور (lib/pushReminders.ts) هم
// دقیقا با همین منطق نوبت‌ها رو حساب کنه، نه یه کپی جدا که دریفت کنه.
// lib/medications.ts همه‌ی این‌ها رو دوباره export می‌کنه.

export type Medication = {
  id: string;
  name: string;
  /** چند بار در روز — فاصله‌ی بین نوبت‌ها از همین حساب می‌شه (۴ بار = هر ۶ ساعت) */
  timesPerDay: number;
  /** ساعت اولین نوبت هر روز، «HH:MM» با ارقام لاتین */
  firstDoseTime: string;
  /** ISO (YYYY-MM-DD) — روز شروع دوره */
  startDate: string;
  /** طول دوره به روز */
  durationDays: number;
  /** false یعنی یادآوری همین دارو خاموشه (خود دارو در لیست می‌مونه) */
  notify?: boolean;
  /** یادداشت اختیاری (مثلا «بعد از غذا») */
  note?: string;
};

export const MIN_TIMES_PER_DAY = 1;
export const MAX_TIMES_PER_DAY = 12;

/** «HH:MM» → دقیقه از نیمه‌شب. ورودی نامعتبر → ۸:۰۰ صبح. */
export function doseTimeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 8 * 60;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

export function minutesToDoseTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * ساعت‌های نوبت یک روز، به دقیقه از نیمه‌شب.
 *
 * «۴ بار در روز» دقیقا یعنی «هر ۶ ساعت» (درخواست صریح کاربر): بازه‌ی
 * ۲۴ساعته بر تعداد نوبت‌ها تقسیم می‌شه و نوبت اول سر `firstDoseTime`ه.
 * پس ۴ بار با شروع ۰۸:۰۰ می‌شه ۰۸:۰۰ / ۱۴:۰۰ / ۲۰:۰۰ / ۰۲:۰۰.
 */
export function doseMinutesOfDay(med: Medication): number[] {
  const times = Math.min(MAX_TIMES_PER_DAY, Math.max(MIN_TIMES_PER_DAY, Math.round(med.timesPerDay)));
  const step = 1440 / times;
  const start = doseTimeToMinutes(med.firstDoseTime);
  return Array.from({ length: times }, (_, i) => Math.round(start + i * step) % 1440).sort((a, b) => a - b);
}

/** فاصله‌ی بین نوبت‌ها به ساعت — برای متن «هر ۶ ساعت» */
export function doseIntervalHours(med: Medication): number {
  const times = Math.min(MAX_TIMES_PER_DAY, Math.max(MIN_TIMES_PER_DAY, Math.round(med.timesPerDay)));
  return 24 / times;
}

/** آخرین روز دوره (شامل خودش)، ISO */
export function medicationEndDate(med: Medication): string {
  const [y, m, d] = med.startDate.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  end.setDate(end.getDate() + Math.max(1, Math.round(med.durationDays)) - 1);
  return isoLocal(end);
}

/** آیا این تاریخ داخل دوره‌ی دارو هست؟ */
export function isMedicationActiveOn(med: Medication, iso: string): boolean {
  return iso >= med.startDate && iso <= medicationEndDate(med);
}
