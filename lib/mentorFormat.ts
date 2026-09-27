// قالب‌بندیِ تاریخ/زمان برای صفحه‌های منتور — همان الگوی صفحه‌ی پشتیبانی
// (روز + نامِ ماهِ جلالی + ساعت)، با faNum تا هرجا اپ رقم‌ها را عوض کرد
// این‌جا هم هم‌زمان عوض شود.
import { toJalali, faNum, J_MONTHS, FA_WEEKDAY, isoLocal } from "@/lib/jalali";

function hm(d: Date): string {
  return `${faNum(String(d.getHours()).padStart(2, "0"))}:${faNum(String(d.getMinutes()).padStart(2, "0"))}`;
}

/** «۵ مهر ۱۴۰۵» */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T00:00:00") : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`;
}

/** تاریخِ روزِ @db.Date (UTC نیمه‌شب) بدونِ جابه‌جاییِ منطقه‌ی زمانی */
export function fmtDay(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "";
  return fmtDate(dateOnly.slice(0, 10));
}

/** «۵ مهر، ۱۸:۲۰» — برای پیام‌ها/اعلان‌ها */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${faNum(jd)} ${J_MONTHS[jm - 1]}، ${hm(d)}`;
}

/** فقط ساعت اگر امروز است، وگرنه روز و ساعت */
export function fmtMsgTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return isoLocal(d) === isoLocal(new Date()) ? hm(d) : fmtDateTime(iso);
}

/** «۳ روز پیش» و مشابه — برای «آخرین فعالیت» */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "نامشخص";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "نامشخص";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 5) return "همین حالا";
  if (min < 60) return `${faNum(min)} دقیقه پیش`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${faNum(days)} روز پیش`;
  return fmtDate(iso);
}

/** «شنبه ۵ مهر» برای سرِ ستون/ردیفِ یک روز (ورودی YYYY-MM-DD محلی) */
export function fmtWeekday(dayIso: string): string {
  const d = new Date(dayIso + "T00:00:00");
  const [, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${FA_WEEKDAY[d.getDay()]} ${faNum(jd)} ${J_MONTHS[jm - 1]}`;
}

/** خطای fetch → پیامِ دوستانه (۴۰۳/۴۰۴ هیچ‌وقت صفحه‌ی خالی نمی‌دهند) */
export async function readApiError(res: Response, fallback = "انجام نشد — دوباره تلاش کن"): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body.error === "string" && body.error) return body.error;
  if (res.status === 404) return "پیدا نشد یا به آن دسترسی نداری";
  if (res.status === 403) return "اجازه‌ی این کار را نداری";
  if (res.status === 409) return "وضعیت تغییر کرده — صفحه را تازه کن";
  if (res.status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کن";
  return fallback;
}

export const NETWORK_ERROR = "ارتباط با سرور برقرار نشد";
