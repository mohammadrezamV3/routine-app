import { toJalali, pad } from "@/lib/jalali";

// تاریخ‌های خروجی: ISO میلادی (UTC) + یک ستون جلالی. ارقام همیشه لاتین.

/** ستون‌های @db.Date در UTC نیمه‌شب ذخیره می‌شن */
export function isoDay(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function isoTime(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** "2026-03-21" → "1405-01-01" (تبدیل بر اساس همان روز UTC) */
export function jalaliDay(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const [jy, jm, jd] = toJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return `${jy}-${pad(jm)}-${pad(jd)}`;
}
