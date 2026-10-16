// چیدمان برچسب‌های نقشه‌ی ثبات (ماه‌ها بالای ستون‌ها، روز هفته کنار ردیف‌ها) —
// منطق خالص و بدون ری‌اکت تا تست‌پذیر باشه. برچسب‌ها توی همون گرید خانه‌ها می‌شینن
// (گرید ستون‌ها)، پس با اندازه‌ی سیال خانه‌ها مقیاس می‌شن.

import { jalaliOfIso } from "./dashboardCompute";

export type HeatMonthMark = {
  /** ایندکس ستون (صفرمبنا) که برچسب از اونجا شروع می‌شه */
  col: number;
  /** چند ستون جا می‌گیره (برای gridColumn: span) */
  span: number;
  /** ماه شمسی، صفرمبنا (برای jMonthName) */
  month: number;
  label: string;
};

/** تقریب پهنای برچسب بر حسب ستون: هر نویسه حدود 0.28 ستون (در تنگ‌ترین حالت پرده) */
const COLS_PER_CHAR = 0.28;

export function labelCols(label: string): number {
  return Math.max(1, Math.ceil(label.length * COLS_PER_CHAR));
}

/**
 * ماه‌های شمسی بالای ستون‌ها: اسم هر ماه بالای اولین ستونی که روز اول اون ماه
 * توشه. ماه ناقص اول (ستون صفر) فقط وقتی اسم می‌گیره که جا باشه تا به برچسب بعدی
 * نرسه. برچسبی که از انتهای گرید بیرون می‌زنه به لبه‌ی انتهایی میچسبه و اگه با
 * قبلی هم‌پوشانی داشته باشه حذف می‌شه. هیچ ماهی دوبار نمیاد.
 */
export function heatMonthMarks(heat: { iso: string }[][], nameOf: (month0: number) => string): HeatMonthMark[] {
  const cols = heat.length;
  if (!cols) return [];
  const starts: { col: number; month: number; partial: boolean }[] = [];
  heat.forEach((col, ci) => {
    const first = col.find((c) => jalaliOfIso(c.iso)[2] === 1);
    if (first) starts.push({ col: ci, month: jalaliOfIso(first.iso)[1] - 1, partial: false });
  });
  if (!starts.length || starts[0].col > 0) {
    starts.unshift({ col: 0, month: jalaliOfIso(heat[0][0].iso)[1] - 1, partial: true });
  }

  const out: HeatMonthMark[] = [];
  starts.forEach((s, i) => {
    const label = nameOf(s.month);
    if (!label) return;
    const span = Math.min(labelCols(label), cols);
    let col = s.col;
    if (s.partial) {
      const next = starts[i + 1];
      if (next ? next.col < span : cols < span) return;
    } else if (col + span > cols) {
      col = cols - span;
    }
    const prev = out[out.length - 1];
    if (prev && (prev.month === s.month || col < prev.col + prev.span)) return;
    out.push({ col, span, month: s.month, label });
  });
  return out;
}

/**
 * روز هفته (JS getDay) هر ردیف، از روی تاریخ واقعی همون ردیف در ستون اول؛ پس
 * برچسب هیچ‌وقت از ترتیب واقعی ردیف‌ها (شنبه بالا) جدا نمی‌افته.
 */
export function heatRowWeekdays(heat: { iso: string }[][]): number[] {
  return Array.from({ length: 7 }, (_, ri) => {
    const iso = heat[0]?.[ri]?.iso;
    if (!iso) return (6 + ri) % 7;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  });
}

/** ردیف‌هایی که برچسب روز می‌گیرن: یکی در میان از اولین ردیف (شنبه، دوشنبه، چهارشنبه، جمعه) */
export function heatLabelledRows(): number[] {
  return [0, 2, 4, 6];
}
