// خواب — منطقِ خالصِ مشترکِ کلاینت و سرور (بدونِ fetch/prisma).
//
// معماری:
//   • هر شب یک SleepEntry با کلیدِ (userId, date)؛ date = روزِ *بیدارشدن*.
//   • زمان‌ها ISO ِ کامل ذخیره می‌شن؛ کاربر فقط «ساعتِ خواب» و «ساعتِ بیداری»
//     وارد می‌کنه و buildSleepTimes لحظه‌ی واقعی رو می‌سازه (خوابِ قبل از
//     نیمه‌شب مالِ دیروزه).
//   • هدف از همون wakeSleepTimes ِ «روتین من» میاد (یک منبع برای ساعتِ بیداری/خواب).
//   • persistence از lib/storage.ts (مهمان → localStorage، کاربر → /api/sleep).
//   • اچیومنت‌های خواب (lib/achievements.ts) از همین ردیف‌ها سمتِ سرور حساب می‌شن.

export type SleepRecord = {
  /** روزِ بیدارشدن YYYY-MM-DD */
  date: string;
  sleptAt: string;
  wokeAt: string;
  quality: number | null;
  note: string | null;
};

export const SLEEP_MIN_MIN = 30;
export const SLEEP_MAX_MIN = 20 * 60;
/** بازه‌ی سالم (دقیقه) — هم‌راستا با اچیومنتِ «خوابِ کافی» */
export const SLEEP_GOAL_MIN = 7 * 60;
export const SLEEP_GOAL_MAX = 9 * 60;

function hm(v: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : [h, mi];
}

/**
 * از «روزِ بیداری» + ساعت‌های HH:mm، دو لحظه‌ی واقعی (محلی) می‌سازه. اگه ساعتِ
 * خواب از ساعتِ بیداری دیرتر باشه (مثلا 23:30 → 07:00) خواب مالِ شبِ قبله.
 */
export function buildSleepTimes(wakeDateIso: string, bed: string, wake: string): { sleptAt: Date; wokeAt: Date } | null {
  const b = hm(bed), w = hm(wake);
  const [y, mo, d] = wakeDateIso.split("-").map(Number);
  if (!b || !w || !y) return null;
  const wokeAt = new Date(y, mo - 1, d, w[0], w[1]);
  let sleptAt = new Date(y, mo - 1, d, b[0], b[1]);
  if (sleptAt >= wokeAt) sleptAt = new Date(y, mo - 1, d - 1, b[0], b[1]);
  return { sleptAt, wokeAt };
}

export function sleepMinutes(r: Pick<SleepRecord, "sleptAt" | "wokeAt">): number {
  return Math.round((new Date(r.wokeAt).getTime() - new Date(r.sleptAt).getTime()) / 60000);
}

export function clockOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** «7 ساعت و 20 دقیقه» */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} دقیقه`;
  return m ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`;
}

/** میانگینِ دایره‌ایِ ساعت‌ها (میانگینِ 23:00 و 01:00 = 00:00، نه 12:00) */
export function circularMeanMinutes(mins: number[]): number | null {
  if (!mins.length) return null;
  let x = 0, y = 0;
  for (const m of mins) {
    const a = (m / 1440) * 2 * Math.PI;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  const a = Math.atan2(y / mins.length, x / mins.length);
  return Math.round((((a / (2 * Math.PI)) * 1440) + 1440) % 1440);
}

export function minutesToClock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export type SleepSummary = {
  nights: number;
  avgMin: number | null;
  avgBed: string | null;
  avgWake: string | null;
  /** درصدِ شب‌هایی که بینِ ۷ تا ۹ ساعت بوده */
  goalPct: number | null;
  /** ۰..۱۰۰ — هرچی ساعتِ خواب ثابت‌تر، بالاتر (بر اساسِ انحرافِ دایره‌ای از میانگین) */
  consistency: number | null;
  /** بدهیِ خواب نسبت به ۸ ساعت در همین بازه (دقیقه، ≥۰) */
  debtMin: number;
};

export function summarizeSleep(entries: SleepRecord[]): SleepSummary {
  const list = entries.filter((e) => sleepMinutes(e) > 0);
  if (!list.length) return { nights: 0, avgMin: null, avgBed: null, avgWake: null, goalPct: null, consistency: null, debtMin: 0 };
  const durs = list.map(sleepMinutes);
  const beds = list.map((e) => { const d = new Date(e.sleptAt); return d.getHours() * 60 + d.getMinutes(); });
  const wakes = list.map((e) => { const d = new Date(e.wokeAt); return d.getHours() * 60 + d.getMinutes(); });
  const meanBed = circularMeanMinutes(beds)!;
  const dev = beds.reduce((s, b) => { const d = Math.abs(b - meanBed) % 1440; return s + Math.min(d, 1440 - d); }, 0) / beds.length;
  return {
    nights: list.length,
    avgMin: Math.round(durs.reduce((s, x) => s + x, 0) / durs.length),
    avgBed: minutesToClock(meanBed),
    avgWake: minutesToClock(circularMeanMinutes(wakes)!),
    goalPct: Math.round((durs.filter((x) => x >= SLEEP_GOAL_MIN && x <= SLEEP_GOAL_MAX).length / durs.length) * 100),
    // ۰ دقیقه انحراف → ۱۰۰، ۹۰ دقیقه یا بیشتر → ۰
    consistency: Math.max(0, Math.round(100 - (dev / 90) * 100)),
    debtMin: Math.max(0, durs.reduce((s, x) => s + (480 - x), 0)),
  };
}
