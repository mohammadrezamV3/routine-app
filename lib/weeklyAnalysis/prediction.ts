import type { Prediction } from "./types";
import { clamp, gradeFor, mean, stdDev } from "./score";

// پیش‌بینیِ امتیازِ پایانِ هفته — فقط هفته‌ی جاری و از روز دوم به بعد.
// روزهای باقی‌مونده با ترکیبِ «روندِ همین هفته» و «میانگینِ ۴ هفته‌ی اخیر»
// تخمین زده می‌شن؛ هرچی روزهای بیشتری گذشته، وزنِ همین هفته بیشتره.
// بازه‌ی low/high از پراکندگیِ امتیازِ روزها و تعدادِ روزهای باقی‌مونده میاد.

export type PredictionInput = {
  isCurrentWeek: boolean;
  daysElapsed: number; // 1..7
  currentScore: number | null; // امتیازِ کلِ تا این لحظه
  dayScores: (number | null)[]; // ۷تایی، آینده null
  baseline: (number | null)[]; // امتیازِ هفته‌های قبل (جدیدترین آخر)؛ ۴تای آخر استفاده می‌شه
};

const GRADE_FLOOR: Record<string, number> = { A: 80, S: 90, B: 65, C: 50 };
const NEXT_GRADE: Record<string, string | null> = { D: "C", C: "B", B: "A", A: "S", S: null };

export function predictWeek(input: PredictionInput): Prediction {
  if (!input.isCurrentWeek || input.daysElapsed < 2) return null;
  const elapsed = input.dayScores.slice(0, input.daysElapsed).filter((s): s is number => s != null);
  if (elapsed.length < 2) return null;
  const current = input.currentScore ?? Math.round(mean(elapsed)!);
  const remaining = 7 - Math.min(7, input.daysElapsed);

  const base = input.baseline.filter((b): b is number => b != null).slice(-4);
  const baseAvg = base.length ? mean(base)! : current;
  const w = input.daysElapsed / 7;
  const restAvg = w * current + (1 - w) * baseAvg;
  const projected = Math.round(clamp((current * input.daysElapsed + restAvg * remaining) / 7));

  const sd = elapsed.length >= 2 ? stdDev(elapsed)! : 12;
  const spread = Math.round((Math.max(sd, 5) * Math.sqrt(remaining / 7)) + 2);
  const low = Math.round(clamp(projected - spread));
  const high = Math.round(clamp(projected + spread));

  const grade = gradeFor(projected)!;
  let message = remaining === 0
    ? `هفته با امتیاز حدود ${projected} (نمره‌ی ${grade}) تموم می‌شه.`
    : `با همین روند، هفته رو با حدود ${projected} (نمره‌ی ${grade}) تموم می‌کنی.`;
  const next = NEXT_GRADE[grade];
  if (next && remaining > 0) {
    const gap = GRADE_FLOOR[next] - projected;
    if (gap > 0 && gap <= 6) message += ` فقط ${gap} امتیاز تا نمره‌ی ${next} فاصله داری.`;
  }
  return { projectedScore: projected, low, high, message };
}
