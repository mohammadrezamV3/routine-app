import { jMonthName, toJalali } from "@/lib/jalali";

/** تاریخ ISO را به شمسی با ارقام لاتین برمی‌گرداند، مثلا «7 مرداد 1404» (یا «7 Mordad 1404» در انگلیسی) */
export function blogDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [jy, jm, jd] = toJalali(Number(m[1]), Number(m[2]), Number(m[3]));
  return `${jd} ${jMonthName(jm - 1)} ${jy}`;
}
