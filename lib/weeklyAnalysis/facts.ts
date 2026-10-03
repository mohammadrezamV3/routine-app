import type { DayDetails } from "./types";

// «واقعیت‌های هفته» — جمع‌بندی خالص روی DayCell.details (همون جزئیات روزبه‌روز)،
// تا اعداد هفته، یادداشت دامنه‌ها و بردها/جای پیشرفت هفته‌نامه همه از یک
// منبع بیان بشن و با چیزی که در برگه‌ی روز دیده می‌شه دقیقا یکی باشن.

export type FactDay = {
  details: Partial<DayDetails>;
  /** روز تموم شده (نه امروز، نه آینده) */
  closed: boolean;
};

export type WeekFacts = {
  routine: { done: number; total: number; perfectDays: number; days: number } | null;
  sleep: { nights: number; hourNights: number; avgHours: number | null; avgBed: string | null; avgWake: string | null; avgQuality: number | null; nights7h: number } | null;
  fitness: { done: number; extra: number; partial: number; missed: number; rest: number; planned: number } | null;
  nutrition: { days: number; avgKcal: number; avgProtein: number | null; target: number | null; onTargetDays: number; targetDays: number } | null;
  trading: { days: number; count: number; wins: number; losses: number; net: number | null; currency: string | null; mixedCurrency: boolean } | null;
  tasks: { days: number; done: number; due: number; overdue: number } | null;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (n: number) => Math.round(n * 10) / 10;

function toMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function fromMin(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** میانگین ساعت خواب: ساعت‌های بعد از نیمه‌شب (قبل از ظهر) به شب قبلش چسبیده حساب می‌شن */
export function avgBedtime(times: string[]): string | null {
  const mins = times.map(toMin).filter((x): x is number => x != null).map((m) => (m < 720 ? m + 1440 : m));
  const a = avg(mins);
  return a == null ? null : fromMin(a);
}

export function avgClock(times: string[]): string | null {
  const mins = times.map(toMin).filter((x): x is number => x != null);
  const a = avg(mins);
  return a == null ? null : fromMin(a);
}

export function weekFacts(days: FactDay[]): WeekFacts {
  const out: WeekFacts = { routine: null, sleep: null, fitness: null, nutrition: null, trading: null, tasks: null };

  // روتین
  const rt = days.filter((d) => d.details.routine && (d.closed || d.details.routine.done > 0)).map((d) => d.details.routine!);
  if (rt.length) {
    out.routine = {
      done: rt.reduce((a, r) => a + r.done, 0),
      total: rt.reduce((a, r) => a + r.total, 0),
      perfectDays: rt.filter((r) => r.done === r.total).length,
      days: rt.length,
    };
  }

  // خواب
  const sl = days.map((d) => d.details.sleep).filter((x): x is NonNullable<typeof x> => !!x);
  if (sl.length) {
    const hours = sl.map((s) => s.hours).filter((h): h is number => h != null);
    const q = sl.map((s) => s.quality).filter((x): x is number => x != null);
    const ah = avg(hours);
    const aq = avg(q);
    out.sleep = {
      nights: sl.length,
      hourNights: hours.length,
      avgHours: ah == null ? null : r1(ah),
      avgBed: avgBedtime(sl.map((s) => s.sleptAt).filter((x): x is string => !!x)),
      avgWake: avgClock(sl.map((s) => s.wokeAt).filter((x): x is string => !!x)),
      avgQuality: aq == null ? null : r1(aq),
      nights7h: hours.filter((h) => h >= 7).length,
    };
  }

  // بدنسازی
  const ft = days.map((d) => d.details.fitness?.status).filter((x): x is NonNullable<typeof x> => !!x);
  if (ft.length) {
    const c = (s: string) => ft.filter((x) => x === s).length;
    out.fitness = { done: c("done"), extra: c("extra"), partial: c("partial"), missed: c("missed"), rest: c("rest"), planned: c("done") + c("partial") + c("missed") };
  }

  // تغذیه
  const nu = days.map((d) => d.details.nutrition).filter((x): x is NonNullable<typeof x> => !!x);
  if (nu.length) {
    const withTarget = nu.filter((n) => n.target && n.target > 0);
    const prot = nu.map((n) => n.protein).filter((x): x is number => x != null);
    const lastTarget = [...withTarget].pop()?.target ?? null;
    out.nutrition = {
      days: nu.length,
      avgKcal: Math.round(avg(nu.map((n) => n.kcal))!),
      avgProtein: prot.length ? Math.round(avg(prot)!) : null,
      target: lastTarget,
      targetDays: withTarget.length,
      onTargetDays: withTarget.filter((n) => Math.abs(n.kcal - n.target!) / n.target! <= 0.1).length,
    };
  }

  // ترید
  const tr = days.map((d) => d.details.trading).filter((x): x is NonNullable<typeof x> => !!x);
  if (tr.length) {
    const nets = tr.filter((t) => t.net != null);
    const curs = new Set(tr.filter((t) => t.net != null).map((t) => t.currency));
    const single = curs.size === 1 && !curs.has(null);
    out.trading = {
      days: tr.length,
      count: tr.reduce((a, t) => a + t.count, 0),
      wins: tr.reduce((a, t) => a + t.wins, 0),
      losses: tr.reduce((a, t) => a + t.losses, 0),
      net: nets.length ? Math.round(nets.reduce((a, t) => a + t.net!, 0) * 100) / 100 : null,
      currency: single ? ([...curs][0] as string) : null,
      mixedCurrency: curs.size > 1 || curs.has(null),
    };
  }

  // کارها
  const tk = days.filter((d) => d.details.tasks).map((d) => ({ ...d.details.tasks!, closed: d.closed }));
  if (tk.length) {
    out.tasks = {
      days: tk.length,
      done: tk.reduce((a, t) => a + t.done, 0),
      due: tk.reduce((a, t) => a + t.due, 0),
      overdue: tk.filter((t) => t.closed).reduce((a, t) => a + Math.max(0, t.due - t.done), 0),
    };
  }
  return out;
}
