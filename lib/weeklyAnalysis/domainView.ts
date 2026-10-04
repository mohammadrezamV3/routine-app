import { RADAR_MIN_AXES } from "@/lib/weeklyRadar";
import type { DayCell, DomainResult } from "./types";

// منطق خالص کارت «نمای بخش‌ها» در آنالیز هفتگی: رتبه‌بندی دامنه‌ها، محور
// رادار و بهترین/ضعیف‌ترین روز هر دامنه. بدون React تا تست‌پذیر بمونه.

/**
 * دامنه‌ها به ترتیب امتیاز نزولی؛ دامنه‌ی بدون داده (hasData=false یا
 * امتیاز null) ته فهرست و با حفظ ترتیب اصلی. مرتب‌سازی پایدار: امتیاز
 * مساوی ترتیب ورودی رو نگه می‌داره.
 */
export function rankDomains(domains: DomainResult[]): DomainResult[] {
  const has = (d: DomainResult) => d.hasData && d.score !== null;
  return domains
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      const ha = has(a.d);
      const hb = has(b.d);
      if (ha !== hb) return ha ? -1 : 1;
      if (ha && hb && a.d.score !== b.d.score) return (b.d.score as number) - (a.d.score as number);
      return a.i - b.i;
    })
    .map((x) => x.d);
}

/** محورهای رادار: فقط دامنه‌های دارای داده. کمتر از RADAR_MIN_AXES (lib/weeklyRadar) = رادار نداریم (آرایه‌ی خالی) */
export function radarAxes(
  domains: DomainResult[],
  labelOf: (d: DomainResult) => string,
): { key: string; label: string; value: number | null; prev: number | null }[] {
  const list = domains.filter((d) => d.hasData && d.score !== null);
  if (list.length < RADAR_MIN_AXES) return [];
  return list.map((d) => ({ key: d.domain, label: labelOf(d), value: d.score, prev: d.prevScore ?? null }));
}

/** بهترین و ضعیف‌ترین روز (ایندکس) از روی daily؛ روز آینده و بدون داده حساب نمی‌شه. یکتا نبودن = null */
export function bestWorstDay(daily: (number | null)[], days: Pick<DayCell, "isFuture">[]): { best: number; worst: number } | null {
  let best = -1;
  let worst = -1;
  daily.forEach((v, i) => {
    if (v === null || v === undefined || days[i]?.isFuture) return;
    if (best < 0 || v > (daily[best] as number)) best = i;
    if (worst < 0 || v < (daily[worst] as number)) worst = i;
  });
  if (best < 0 || best === worst) return null;
  if ((daily[best] as number) === (daily[worst] as number)) return null;
  return { best, worst };
}
