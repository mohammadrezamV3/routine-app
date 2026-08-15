// پورت مستقیم منطق تایم‌لاین هفتگی از فایل HTML اصلی — محاسبه درصد پرشدگی
// خط زمان هر روز و موقعیت هر آیتم روی آن، بدون تغییر در الگوریتم.
// ساعت بیداری/خواب دیگه ثابت نیست — پارامتر اختیاریه که از تنظیمات واقعی
// کاربر (lib/wakeSleep.ts) میاد؛ اگه داده نشه همون پیش‌فرض قبلی رو نگه می‌داره.

export const AWAKE_START_MIN = 9 * 60 + 30; // 09:30 — پیش‌فرض/fallback
export const AWAKE_END_MIN = 25 * 60 + 30; // 01:30 روز بعد (به‌صورت 25:30) — پیش‌فرض/fallback

export function awakeFraction(minutes: number, awakeStartMin = AWAKE_START_MIN, awakeEndMin = AWAKE_END_MIN): number {
  let m = minutes;
  if (m < 6 * 60) m += 24 * 60;
  const span = awakeEndMin - awakeStartMin;
  const frac = (m - awakeStartMin) / span;
  return Math.max(0, Math.min(1, frac));
}

export function dayFillFraction(
  jsDay: number,
  order: { jsDay: number }[],
  now: Date,
  awakeStartMin = AWAKE_START_MIN,
  awakeEndMin = AWAKE_END_MIN
): number {
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
  if (effectiveNowMin < awakeStartMin) return 0;
  const span = awakeEndMin - awakeStartMin;
  const elapsed = effectiveNowMin - awakeStartMin;
  const frac = elapsed / span;
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
// قبلاً ۰٫۱۳ بود — آیتم‌هایی که ساعتشون خیلی نزدیک به بیداری/خواب بود
// می‌رفتن زیرِ لیبلِ همون نقطه‌ی انتهایی و روش overlap می‌کردن. فاصله‌ی
// بیشتر یعنی همیشه یه حداقل فضای امن بینِ اولین/آخرین آیتم و دو تا انتها.
const EDGE_GAP = 0.19;

// وقتی تعداد آیتم‌های زمان‌دار یک روز زیاد می‌شه، gap (که همیشه بین ۰ تا
// MIN_GAP از سهمِ عرض track است) کوچیک‌تر می‌شه؛ اگه عرضِ خودِ track ثابت
// بمونه، فاصله‌ی واقعیِ پیکسلی بینِ دو آیتم از عرضِ جعبه‌ی متنشون (بازه‌ی
// ساعت + اسمِ برنامه، حدود ۵۶px) کمتر می‌شه و متن‌ها روی هم می‌افتن — دقیقاً
// همون باگِ گزارش‌شده. راه‌حل: عرضِ track رو متناسب با تعدادِ آیتم‌ها زیاد
// می‌کنیم تا فاصله‌ی پیکسلیِ هر جفت آیتمِ کنار هم همیشه حداقل MIN_PX_GAP
// بمونه؛ week-timeline از قبل overflow-x:auto داره، پس عرضِ بیشتر یعنی
// اسکرولِ افقیِ بیشتر، نه شکستنِ چیدمان.
const MIN_PX_GAP = 92;
const BASE_TRACK_WIDTH = 520;

export function timelineTrackMinWidth(itemCount: number): number {
  if (itemCount <= 1) return BASE_TRACK_WIDTH;
  const span = 1 - 2 * EDGE_GAP;
  const gap = Math.min(MIN_GAP, span / (itemCount - 1));
  if (gap <= 0) return BASE_TRACK_WIDTH;
  return Math.max(BASE_TRACK_WIDTH, Math.ceil(MIN_PX_GAP / gap));
}

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
  effNowMin: number,
  awakeStartMin = AWAKE_START_MIN,
  awakeEndMin = AWAKE_END_MIN
): PositionedTask[] {
  const sorted = timedItems
    .map((t) => {
      const startMin = startMinutesOf(t.time)!;
      return { t, pct: awakeFraction(startMin, awakeStartMin, awakeEndMin), startMin };
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
