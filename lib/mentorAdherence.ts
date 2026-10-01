// محاسبه‌ی روزبه‌روز پایبندی برای گزارش هفتگی و هشدار منتور — تابع‌های
// خالص روی داده‌ای که از قبل خوانده شده (برنامه‌ها، آیتم‌ها، لاگ‌ها). خود
// لاگ‌ها را سیستم از ردیابی روتین/تمرین شاگرد می‌سازد؛ این‌جا فقط خوانده
// می‌شوند و هیچ منطقی برای «انجام شد یا نه» دوباره نوشته نمی‌شود.

export type LogStatus = "COMPLETED" | "PARTIAL" | "MISSED";

export type SchedItem = { id: string; title: string; days: number[] };
/** بازه‌ی مؤثر برنامه (شروع = دیرترین تاریخ شروع و روز فعال‌شدن؛ پایان = زودترین پایان و روز تمام‌شدن) */
export type SchedProgram = { id: string; fromIso: string | null; toIso: string | null; items: SchedItem[] };
export type LogLite = { itemId: string; date: string; status: LogStatus };

export type DayRoll = {
  date: string;
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  /** روز گذشته‌ی برنامه‌دار که برای آیتمش هیچ ثبتی نیست */
  unlogged: number;
};

function jsDay(iso: string): number {
  return new Date(iso + "T00:00:00.000Z").getUTCDay();
}

function inRange(date: string, p: SchedProgram): boolean {
  return (!p.fromIso || date >= p.fromIso) && (!p.toIso || date <= p.toIso);
}

/**
 * جمع‌بندی هر روز. `todayIso`: آیتم امروزی که هنوز ثبتی ندارد «ثبت‌نشده»
 * حساب نمی‌شود (روز تمام نشده)، فقط اگر ثبت شده باشد در شمارش می‌آید.
 */
export function rollupDays(programs: SchedProgram[], logs: LogLite[], dates: string[], todayIso: string): DayRoll[] {
  const byKey = new Map<string, LogStatus>();
  for (const l of logs) byKey.set(`${l.itemId}|${l.date}`, l.status);
  return dates.map((date) => {
    const r: DayRoll = { date, scheduled: 0, completed: 0, partial: 0, missed: 0, unlogged: 0 };
    const js = jsDay(date);
    for (const p of programs) {
      if (!inRange(date, p)) continue;
      for (const it of p.items) {
        if (!it.days.includes(js)) continue;
        const st = byKey.get(`${it.id}|${date}`);
        if (!st && date >= todayIso) continue;
        r.scheduled++;
        if (st === "COMPLETED") r.completed++;
        else if (st === "PARTIAL") r.partial++;
        else if (st === "MISSED") r.missed++;
        else r.unlogged++;
      }
    }
    return r;
  });
}

/** روزی که برنامه داشت و همه‌ی آیتم‌هایش انجام (کامل یا ناقص) شد */
function dayDone(r: DayRoll): boolean {
  return r.scheduled > 0 && r.completed + r.partial === r.scheduled;
}

/** روزی که برنامه داشت و هیچ آیتمی انجام نشد */
function dayIdle(r: DayRoll): boolean {
  return r.scheduled > 0 && r.completed + r.partial === 0;
}

/**
 * زنجیره‌ی روزهای کامل تا امروز (روزهای بی‌برنامه نادیده گرفته می‌شوند).
 * امروز اگر هنوز کامل نشده زنجیره را نمی‌شکند؛ از دیروز شمرده می‌شود.
 * `days` صعودی است.
 */
export function doneStreak(days: DayRoll[], todayIso: string): number {
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const r = days[i];
    if (r.scheduled === 0) continue;
    if (dayDone(r)) { n++; continue; }
    if (r.date === todayIso) continue;
    break;
  }
  return n;
}

/**
 * چند روز برنامه‌دار پشت‌سرهم (تا دیروز) هیچ آیتمی انجام نشده، و اولین
 * آن روزها. امروز حساب نمی‌شود چون هنوز تمام نشده.
 */
export function idleRun(days: DayRoll[], todayIso: string): { days: number; since: string | null } {
  let n = 0;
  let since: string | null = null;
  for (let i = days.length - 1; i >= 0; i--) {
    const r = days[i];
    if (r.date >= todayIso) continue;
    if (r.scheduled === 0) continue;
    if (!dayIdle(r)) break;
    n++;
    since = r.date;
  }
  return { days: n, since };
}

/** آیتم‌هایی که در بازه بیشتر از همه انجام نشده‌اند (MISSED یا ثبت‌نشده) */
export function topMissedItems(programs: SchedProgram[], logs: LogLite[], dates: string[], todayIso: string, limit = 3): { title: string; count: number }[] {
  const byKey = new Map<string, LogStatus>();
  for (const l of logs) byKey.set(`${l.itemId}|${l.date}`, l.status);
  const counts = new Map<string, { title: string; count: number }>();
  for (const date of dates) {
    if (date >= todayIso) continue;
    const js = jsDay(date);
    for (const p of programs) {
      if (!inRange(date, p)) continue;
      for (const it of p.items) {
        if (!it.days.includes(js)) continue;
        const st = byKey.get(`${it.id}|${date}`);
        if (st === "COMPLETED" || st === "PARTIAL") continue;
        const c = counts.get(it.id) ?? { title: it.title, count: 0 };
        c.count++;
        counts.set(it.id, c);
      }
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/** YYYY-MM-DDهای [from, to] (حداکثر ۴۰۰ روز) */
export function isoRange(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  let t = Date.parse(fromIso + "T00:00:00.000Z");
  const end = Date.parse(toIso + "T00:00:00.000Z");
  while (t <= end && out.length < 400) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

/** حداقل و حداکثر مجاز برای آستانه‌ی هشدار (روز) */
export const ALERT_MIN_DAYS = 2;
export const ALERT_MAX_DAYS = 14;
