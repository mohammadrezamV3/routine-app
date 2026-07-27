// پورت مستقیم منطق تایم‌لاین هفتگی از فایل HTML اصلی — محاسبه درصد پرشدگی
// خط زمان هر روز و موقعیت هر آیتم روی آن، بدون تغییر در الگوریتم.

export const AWAKE_START_MIN = 9 * 60 + 30; // 09:30
export const AWAKE_END_MIN = 25 * 60 + 30; // 01:30 روز بعد (به‌صورت 25:30)
export const AWAKE_SPAN_MIN = AWAKE_END_MIN - AWAKE_START_MIN;

export function awakeFraction(minutes: number): number {
  let m = minutes;
  if (m < 6 * 60) m += 24 * 60;
  const frac = (m - AWAKE_START_MIN) / AWAKE_SPAN_MIN;
  return Math.max(0, Math.min(1, frac));
}

export function dayFillFraction(jsDay: number, order: { jsDay: number }[], now: Date): number {
  const todayPos = order.findIndex((o) => o.jsDay === now.getDay());
  const thisPos = order.findIndex((o) => o.jsDay === jsDay);
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let effectiveTodayPos = todayPos;
  let effectiveNowMin = nowMin;
  if (nowMin < 6 * 60) {
    effectiveTodayPos = (todayPos - 1 + order.length) % order.length;
    effectiveNowMin = nowMin + 24 * 60;
  }
  if (thisPos < effectiveTodayPos) return 1;
  if (thisPos > effectiveTodayPos) return 0;
  if (effectiveNowMin < AWAKE_START_MIN) return 0;
  const elapsed = effectiveNowMin - AWAKE_START_MIN;
  const frac = elapsed / AWAKE_SPAN_MIN;
  return Math.max(0, Math.min(1, frac));
}

export type PositionedTask = {
  id: string;
  name: string;
  time: string;
  custom?: boolean;
  pct: number;
  isPast: boolean;
};

const MIN_GAP = 0.22;
const EDGE_GAP = 0.13;

/**
 * محاسبه موقعیت (pct بین ۰ و ۱) هر تسکِ زمان‌دار روی خط تایم‌لاین، طوری که
 * حداقل فاصله MIN_GAP بین نقطه‌ها و EDGE_GAP از دو انتها (بیداری/خواب) حفظ شود.
 */
export function positionTimedTasks(
  timedItems: { id: string; name: string; time: string; custom?: boolean }[],
  startMinutesOf: (time: string) => number | null,
  endMinutesOf: (time: string) => number | null,
  thisPos: number,
  effTodayPos: number,
  effNowMin: number
): PositionedTask[] {
  const sorted = timedItems
    .map((t) => {
      const startMin = startMinutesOf(t.time)!;
      return { t, pct: awakeFraction(startMin), startMin };
    })
    .sort((a, b) => a.pct - b.pct);

  const n = sorted.length;
  if (n) {
    const span = 1 - 2 * EDGE_GAP;
    let gap = n > 1 ? Math.min(MIN_GAP, span / (n - 1)) : MIN_GAP;
    if (gap < 0) gap = 0;

    sorted[0].pct = Math.max(sorted[0].pct, EDGE_GAP);
    for (let i = 1; i < n; i++) {
      const minPct = sorted[i - 1].pct + gap;
      sorted[i].pct = Math.max(sorted[i].pct, minPct);
    }
    const lastIdx = n - 1;
    if (sorted[lastIdx].pct > 1 - EDGE_GAP) {
      const overflow = sorted[lastIdx].pct - (1 - EDGE_GAP);
      for (let j = 0; j < n; j++) sorted[j].pct -= overflow;
    }
  }

  return sorted.map((entry) => {
    const { t, pct, startMin } = entry;
    const endMin = endMinutesOf(t.time);
    let checkMin = endMin !== null ? endMin : startMin;
    if (checkMin < 6 * 60) checkMin += 24 * 60;
    let isPast: boolean;
    if (thisPos < effTodayPos) isPast = true;
    else if (thisPos > effTodayPos) isPast = false;
    else isPast = effNowMin >= checkMin;
    return { ...t, pct, isPast };
  });
}
