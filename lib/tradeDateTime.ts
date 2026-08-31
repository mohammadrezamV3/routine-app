// تبدیل‌های زمانِ ماژولِ ترید.
//
// قرارداد: در دیتابیس همیشه UTC ذخیره می‌شود؛ در UI همیشه ساعتِ محلیِ خودِ
// مرورگرِ کاربر نشان داده و گرفته می‌شود. این فایل تنها جایی است که این دو
// به هم تبدیل می‌شوند، تا هیچ کامپوننتی خودش رشته‌ی تاریخ نسازد (اشتباهی که
// در نسخه‌ی قبل باعث شد همه‌ی معاملات ساعتِ ۱۲:۰۰ ثبت شوند و آمارِ جلسه
// عملاً غیرممکن شود).

import { J_MONTHS, faNum, toJalali } from "./jalali";
import { G_MONTHS } from "./gregorian";
import type { CalSystem } from "./tradeTypes";

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → مقدارِ فیلدِ فرم (`YYYY-MM-DDTHH:mm`) به وقتِ محلی */
export function toLocalInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** مقدارِ فیلدِ فرم → ISOِ UTC برای ارسال به سرور */
export function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** بخشِ تاریخِ یک مقدارِ فرم (برای دیت‌پیکر) */
export function splitLocalInput(v: string): { date: string; time: string } {
  const [date = "", time = "00:00"] = v.split("T");
  return { date, time: time.slice(0, 5) };
}

export function joinLocalInput(date: string, time: string): string {
  return `${date}T${(time || "00:00").slice(0, 5)}`;
}

/** «۸ شهریور ۱۴۰۵ — ۱۵:۴۹» با ارقامِ فارسی */
export function formatTradeDateTime(iso: string, cal: CalSystem, withTime = true): string {
  const d = new Date(iso);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const datePart =
    cal === "jalali"
      ? (() => { const j = toJalali(y, m, day); return `${faNum(j[2])} ${J_MONTHS[j[1] - 1]} ${faNum(j[0])}`; })()
      : `${faNum(day)} ${G_MONTHS[m - 1]} ${faNum(y)}`;
  if (!withTime) return datePart;
  return `${datePart} — ${faNum(pad(d.getHours()))}:${faNum(pad(d.getMinutes()))}`;
}

/** فقط ساعت، برای ردیف‌های فشرده‌ی لیست */
export function formatTradeTime(iso: string): string {
  const d = new Date(iso);
  return `${faNum(pad(d.getHours()))}:${faNum(pad(d.getMinutes()))}`;
}
