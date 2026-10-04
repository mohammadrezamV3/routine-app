// هندسه‌ی خالص رادار (spider) هفتگی — مشترک آنالیز هفتگی و هفته‌نامه.
// مختصات در یک بوم مربعی 200x200 (مرکز 100,100)؛ محور اول بالا و به ترتیب
// ساعت‌گرد. بدون وابستگی به React تا تست‌پذیر بمونه.

export const RADAR_VIEW = 200;
export const RADAR_C = RADAR_VIEW / 2;
/** شعاع بیرونی حلقه‌ی 100 */
export const RADAR_R = 64;
export const RADAR_RINGS = [25, 50, 75, 100] as const;
/** حداقل تعداد محور برای رسم رادار */
export const RADAR_MIN_AXES = 3;

export type RadarAxis = { key: string; label: string; value: number | null; prev: number | null };
export type RadarPoint = { x: number; y: number };

/** زاویه‌ی محور i از n (رادیان): صفر = بالا، ساعت‌گرد */
export function radarAngle(i: number, n: number): number {
  return n > 0 ? (i / n) * Math.PI * 2 : 0;
}

export function clampScore(v: number | null | undefined): number {
  if (v === null || v === undefined || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/** نقطه‌ی محور i در شعاع متناسب با مقدار (0..100) */
export function radarPoint(i: number, n: number, value: number, r = RADAR_R, c = RADAR_C): RadarPoint {
  const a = radarAngle(i, n);
  const d = (clampScore(value) / 100) * r;
  return { x: round2(c + Math.sin(a) * d), y: round2(c - Math.cos(a) * d) };
}

/** بردار یکه‌ی جهت محور (x راست مثبت، y پایین مثبت) */
export function radarDir(i: number, n: number): RadarPoint {
  const a = radarAngle(i, n);
  return { x: round2(Math.sin(a)), y: round2(-Math.cos(a)) };
}

export function radarPoints(values: (number | null)[], r = RADAR_R, c = RADAR_C): RadarPoint[] {
  return values.map((v, i) => radarPoint(i, values.length, v ?? 0, r, c));
}

export function pointsToPath(pts: RadarPoint[]): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") + " Z";
}

/** مسیر حلقه‌ی شبکه در سطح level (0..100) برای n محور */
export function ringPath(level: number, n: number, r = RADAR_R, c = RADAR_C): string {
  return pointsToPath(Array.from({ length: n }, (_, i) => radarPoint(i, n, level, r, c)));
}

/** آیا داده‌ی کافی برای رادار هست؟ (حداقل 3 محور با مقدار) */
export function radarHasData(axes: RadarAxis[]): boolean {
  return axes.filter((a) => a.value !== null && Number.isFinite(a.value)).length >= RADAR_MIN_AXES;
}

/** فقط محورهایی که برای این هفته داده دارن، با حفظ ترتیب */
export function radarAxesWithData<T extends { value: number | null }>(axes: T[]): T[] {
  return axes.filter((a) => a.value !== null && Number.isFinite(a.value));
}

/** موقعیت برچسب محور به درصد بوم (برای HTML روی SVG) */
export function radarLabelPos(i: number, n: number, gap = 13): RadarPoint {
  const d = radarDir(i, n);
  const rr = RADAR_R + gap;
  return { x: round2(((RADAR_C + d.x * rr) / RADAR_VIEW) * 100), y: round2(((RADAR_C + d.y * rr) / RADAR_VIEW) * 100) };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
