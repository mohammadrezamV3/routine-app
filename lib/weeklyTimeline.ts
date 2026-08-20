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
    const lastIdx = n - 1;

    // پیش‌کلمپ: هر آیتم اول توی بازه‌ی مجازِ [EDGE_GAP, 1-EDGE_GAP] جا می‌گیره —
    // بدونِ این، آیتمِ آخری که ساعتش خیلی نزدیکِ خوابه یه pct خامِ نزدیکِ ۱
    // داره که پاسِ رفتِ زیر رو رد می‌کنه و مجبور به «شیفتِ یکجای همه به عقب»
    // می‌شد؛ اون شیفت آیتمِ اول (نزدیکِ بیداری) رو زیرِ EDGE_GAP می‌فرستاد و
    // دقیقاً باعثِ همون باگِ گزارش‌شده می‌شد (افتادنِ روی کلمه‌ی «بیداری»).
    for (let i = 0; i < n; i++) {
      sorted[i].pct = Math.min(Math.max(sorted[i].pct, EDGE_GAP), 1 - EDGE_GAP);
    }
    // پاسِ رفت: هرکدوم حداقل gap بعدِ قبلی
    sorted[0].pct = Math.max(sorted[0].pct, EDGE_GAP);
    for (let i = 1; i < n; i++) sorted[i].pct = Math.max(sorted[i].pct, sorted[i - 1].pct + gap);
    // پاسِ برگشت: هرکدوم حداقل gap قبلِ بعدی — وقتی پاسِ رفت آخری رو از سقف
    // رد کرده بود (چند آیتمِ نزدیکِ همِ ته لیست)
    sorted[lastIdx].pct = Math.min(sorted[lastIdx].pct, 1 - EDGE_GAP);
    for (let i = lastIdx - 1; i >= 0; i--) sorted[i].pct = Math.min(sorted[i].pct, sorted[i + 1].pct - gap);
    // پاسِ رفتِ دوم: پاسِ برگشت ممکنه آیتمِ اول رو زیرِ EDGE_GAP برده باشه
    sorted[0].pct = Math.max(sorted[0].pct, EDGE_GAP);
    for (let i = 1; i < n; i++) sorted[i].pct = Math.max(sorted[i].pct, sorted[i - 1].pct + gap);
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
