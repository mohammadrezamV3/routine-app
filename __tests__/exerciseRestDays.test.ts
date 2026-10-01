import { describe, expect, it } from "vitest";
import { computeExerciseStreak, exerciseDayDone, isRestDay, type ExerciseLogRange } from "@/lib/exerciseStats";
import { FA_WEEKDAY } from "@/lib/jalali";

const nameOf = (d: Date) => FA_WEEKDAY[d.getDay()];
const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const nameOfIso = (iso: string) => nameOf(day(iso));

// 2026-09-26 شنبه است؛ روزهای باشگاه: شنبه، دوشنبه، چهارشنبه
const GYM = [FA_WEEKDAY[6], FA_WEEKDAY[1], FA_WEEKDAY[3]];

describe("روز استراحت", () => {
  it("روزی که در gymDays نیست استراحت است؛ بدون پلن هیچ روزی استراحت نیست", () => {
    expect(isRestDay(GYM, FA_WEEKDAY[0])).toBe(true);
    expect(isRestDay(GYM, FA_WEEKDAY[6])).toBe(false);
    expect(isRestDay([], FA_WEEKDAY[0])).toBe(false);
    expect(isRestDay(null, FA_WEEKDAY[0])).toBe(false);
    expect(isRestDay(new Set(GYM), FA_WEEKDAY[2])).toBe(true);
  });

  it("استراحت تا امروز خودکار انجام شده، آینده نه؛ روز باشگاه فقط با completed", () => {
    const today = "2026-09-30";
    expect(day("2026-09-26").getDay()).toBe(6);
    expect(exerciseDayDone(GYM, nameOfIso("2026-09-27"), "2026-09-27", today, undefined)).toBe(true);
    expect(exerciseDayDone(GYM, nameOfIso("2026-09-29"), "2026-09-29", "2026-09-29", undefined)).toBe(true);
    expect(exerciseDayDone(GYM, nameOfIso("2026-10-01"), "2026-10-01", today, undefined)).toBe(false);
    expect(exerciseDayDone(GYM, nameOfIso("2026-09-28"), "2026-09-28", today, undefined)).toBe(false);
    expect(exerciseDayDone(GYM, nameOfIso("2026-09-28"), "2026-09-28", today, { completed: true, completedItems: [] })).toBe(true);
  });

  it("روزهای استراحت استریک را نمی‌شکنند و به عدد جلسه اضافه نمی‌شوند", () => {
    const logs: ExerciseLogRange = {};
    for (const iso of ["2026-09-26", "2026-09-28", "2026-09-30"]) logs[iso] = { completed: true, completedItems: [] };
    // پنجشنبه 2026-10-01 روز استراحت است: سه جلسه‌ی پشت‌سرهم با فاصله‌ی استراحت
    expect(computeExerciseStreak(GYM, nameOf, logs, day("2026-10-01"))).toBe(3);
    // با یک روز باشگاه جامانده، استریک قطع می‌شود
    delete logs["2026-09-28"];
    expect(computeExerciseStreak(GYM, nameOf, logs, day("2026-10-01"))).toBe(1);
  });
});
