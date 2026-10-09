// قالب‌بندی تاریخ/زمان برای صفحه‌های منتور — همان الگوی صفحه‌ی پشتیبانی
// (روز + نام ماه جلالی + ساعت)، با faNum تا هرجا اپ رقم‌ها را عوض کرد
// این‌جا هم هم‌زمان عوض شود.
import { toJalali, faNum, jMonthName, weekdayName, isoLocal } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

function hm(d: Date): string {
  return `${faNum(String(d.getHours()).padStart(2, "0"))}:${faNum(String(d.getMinutes()).padStart(2, "0"))}`;
}

/** «۵ مهر ۱۴۰۵» */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T00:00:00") : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(jd)} ${jMonthName(jm - 1)} ${faNum(jy)}`;
}

/** تاریخ روز @db.Date (UTC نیمه‌شب) بدون جابه‌جایی منطقه‌ی زمانی */
export function fmtDay(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "";
  return fmtDate(dateOnly.slice(0, 10));
}

/** «۵ مهر، ۱۸:۲۰» — برای پیام‌ها/اعلان‌ها */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(jd)} ${jMonthName(jm - 1)}، ${hm(d)}`;
}

/** فقط ساعت اگر امروز است، وگرنه روز و ساعت */
export function fmtMsgTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return isoLocal(d) === isoLocal(new Date()) ? hm(d) : fmtDateTime(iso);
}

/** «۳ روز پیش» و مشابه — برای «آخرین فعالیت» */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return tr("نامشخص", "Unknown");
  const t = new Date(iso).getTime();
  if (isNaN(t)) return tr("نامشخص", "Unknown");
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 5) return tr("چند دقیقه پیش", "A few minutes ago");
  if (min < 60) return tr(`${faNum(min)} دقیقه پیش`, `${faNum(min)} min ago`);
  const h = Math.floor(min / 60);
  if (h < 24) return tr(`${faNum(h)} ساعت پیش`, `${faNum(h)} ${h === 1 ? "hour" : "hours"} ago`);
  const days = Math.floor(h / 24);
  if (days < 30) return tr(`${faNum(days)} روز پیش`, `${faNum(days)} ${days === 1 ? "day" : "days"} ago`);
  return fmtDate(iso);
}

/** «شنبه ۵ مهر» برای سر ستون/ردیف یک روز (ورودی YYYY-MM-DD محلی) */
export function fmtWeekday(dayIso: string): string {
  const d = new Date(dayIso + "T00:00:00");
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${weekdayName(d.getDay())} ${faNum(jd)} ${jMonthName(jm - 1)}`;
}

/** خطای fetch → پیام دوستانه (۴۰۳/۴۰۴ هیچ‌وقت صفحه‌ی خالی نمی‌دهند) */
export async function readApiError(res: Response, fallback = tr("انجام نشد؛ دوباره تلاش کن", "Something went wrong. Try again.")): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body.error === "string" && body.error) return body.error;
  if (res.status === 404) return tr("پیدا نشد یا به آن دسترسی نداری", "Not found, or you do not have access to it");
  if (res.status === 403) return tr("اجازه‌ی این کار را نداری", "You are not allowed to do this");
  if (res.status === 409) return tr("وضعیت تغییر کرده است؛ صفحه را تازه کن", "Things have changed. Refresh the page.");
  if (res.status === 429) return tr("تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد دوباره تلاش کن", "Too many requests. Try again in a few minutes.");
  return fallback;
}

/** نسخه‌ی تک‌زبانه (فارسی)؛ برای متن به زبان جاری از networkError() استفاده کن */
export const NETWORK_ERROR = "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کن";
export function networkError(): string {
  return tr(NETWORK_ERROR, "Could not reach the server. Check your internet connection.");
}
