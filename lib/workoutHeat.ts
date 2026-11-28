// نقشه‌ی ثبات بخش ورزش (تمرین و کالری) — منطق خالص روزانه، مشترک سرور و کلاینت.
// خروجی هر روز یک درصد (0..100) یا null (بی‌برنامه / قبل از شروع) است تا همان
// HeatCell و کامپوننت نقشه‌ی ثبات روتین (DashboardHeatmap) بدون تغییر ازش تغذیه کنه.
// هیچ import سروری یا ری‌اکتی این‌جا نیست.

import type { HeatCell } from "./dashboardCompute";

export const WORKOUT_HEAT_DAYS = 90;
export const WORKOUT_HEAT_WEEKS = 13;

export type HeatDay = { iso: string; pct: number | null };

/** مرز «رسیدن به هدف کالری»: فاصله‌ی تا 10 درصد هدف کامل حساب می‌شه */
export const CALORIE_MET_TOLERANCE = 0.1;

export type ExerciseDayInput = {
  /** روز باشگاه پلن؟ */
  isGymDay: boolean;
  /** روز استراحت (خودکار انجام‌شده، exerciseDayDone) */
  isRest: boolean;
  /** پلن اصلا وجود داره؟ */
  hasPlan: boolean;
  /** روز قبل از شروع پلن */
  beforePlan: boolean;
  /** اجتماع جلسه‌های روز: حداقل یک جلسه پایان خورده (foldSessions) */
  completed: boolean;
  doneItems: number;
  plannedItems: number;
};

/**
 * تمرین: بدون پلن یا قبل از شروعش → null؛ روز استراحت → 100 (هم‌قاعده‌ی
 * exerciseDayDone)؛ روز باشگاه با پایان تمرین → 100؛ وگرنه نسبت حرکت‌های
 * تیک‌خورده (حداکثر 99 تا فقط «پایان» کامل حساب بشه).
 */
export function exerciseDayPct(d: ExerciseDayInput): number | null {
  if (!d.hasPlan || d.beforePlan) return null;
  if (d.isRest && !d.isGymDay) return 100;
  if (d.completed) return 100;
  if (d.plannedItems <= 0 || d.doneItems <= 0) return 0;
  return Math.min(99, Math.round((d.doneItems / d.plannedItems) * 100));
}

/**
 * کالری: ثبت‌نشده = 0؛ با هدف: فاصله‌ی نسبی تا هدف تا 10 درصد = 100 و بعدش
 * خطی کم می‌شه (حداقل 10 چون ثبت شده)؛ بدون هدف: ثبت‌شده = 100.
 */
export function calorieDayPct(kcal: number, targetKcal: number | null, logged: boolean): number {
  if (!logged || !(kcal > 0)) return 0;
  if (!targetKcal || targetKcal <= 0) return 100;
  const dev = Math.abs(kcal - targetKcal) / targetKcal;
  if (dev <= CALORIE_MET_TOLERANCE) return 100;
  return Math.max(10, Math.min(99, Math.round(100 - (dev - CALORIE_MET_TOLERANCE) * 200)));
}

/** آخرین `days` روز تا امروز (قدیمی به جدید) از یک تابع روزانه */
export function heatDays(todayIso: string, days: number, pctOf: (iso: string) => number | null, isoAdd: (iso: string, n: number) => string): HeatDay[] {
  return Array.from({ length: days }, (_, i) => {
    const iso = isoAdd(todayIso, i - (days - 1));
    return { iso, pct: pctOf(iso) };
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * ستون‌های هفتگی (شنبه تا جمعه، آخرین ستون هفته‌ی جاری) برای `weeks` هفته —
 * همان ساختار buildHeatmap روتین. روز بدون مقدار = pct null.
 */
export function buildPctHeat(today: Date, weeks: number, byIso: Record<string, number | null | undefined>): HeatCell[][] {
  const todayIso = isoOf(today);
  const diffToSat = (today.getDay() + 1) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToSat - (weeks - 1) * 7);
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = isoOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i));
      const future = iso > todayIso;
      col.push({ iso, pct: future ? null : byIso[iso] ?? null, future, today: iso === todayIso });
    }
    cols.push(col);
  }
  return cols;
}

export function heatDaysToMap(days: HeatDay[] | null | undefined): Record<string, number | null> {
  const m: Record<string, number | null> = {};
  for (const d of days ?? []) m[d.iso] = d.pct;
  return m;
}
