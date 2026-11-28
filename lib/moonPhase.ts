// فاز ماه از روی تاریخ (محاسبه‌ی خالص، تقریب دوره‌ی هلالی میانگین) برای آیکون ماه
// در کارت ساعت خواب. p بین 0 (ماه نو) تا 1؛ 0.5 = ماه کامل.

const SYNODIC = 29.530588853;
// ماه نو مرجع: 2000-01-06 18:14 UTC
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export function moonPhase(date: Date): number {
  const days = (date.getTime() - REF_NEW_MOON_MS) / 86_400_000;
  const p = (days / SYNODIC) % 1;
  return p < 0 ? p + 1 : p;
}

export type MoonName = "new" | "waxCrescent" | "firstQuarter" | "waxGibbous" | "full" | "wanGibbous" | "lastQuarter" | "wanCrescent";
const NAMES: MoonName[] = ["new", "waxCrescent", "firstQuarter", "waxGibbous", "full", "wanGibbous", "lastQuarter", "wanCrescent"];

export function moonName(p: number): MoonName {
  return NAMES[Math.floor(((p % 1) + 1) % 1 * 8 + 0.5) % 8];
}

/** درصد روشنایی 0..1 */
export function moonIllumination(p: number): number {
  return (1 - Math.cos(2 * Math.PI * p)) / 2;
}

/**
 * مسیر SVG بخش روشن ماه (دایره‌ای به شعاع r در مرکز cx,cy). رو به رشد = لبه‌ی راست روشن،
 * رو به محاق = لبه‌ی چپ. خط جداکننده یک بیضی به نیم‌قطر r*|cos(2πp)|ه.
 */
export function moonLitPath(p: number, cx: number, cy: number, r: number): string {
  const waning = p > 0.5;
  const cos = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(cos) * r;
  const f = (v: number) => Math.round(v * 100) / 100;
  const limbSweep = waning ? 0 : 1;
  const termSweep = cos > 0 ? (waning ? 1 : 0) : waning ? 0 : 1;
  return `M${f(cx)} ${f(cy - r)}A${f(r)} ${f(r)} 0 0 ${limbSweep} ${f(cx)} ${f(cy + r)}A${f(rx)} ${f(r)} 0 0 ${termSweep} ${f(cx)} ${f(cy - r)}Z`;
}
