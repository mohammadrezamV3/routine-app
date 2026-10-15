import type { WeekNumber } from "./types";
import type { WeekFacts } from "./facts";
import { tr } from "@/lib/i18n";
import { pl } from "./plural";

// «اعداد هفته» — کاشی‌های عددی آماده‌ی نمایش. تابع خالص روی WeekFacts
// (این هفته و هفته‌ی قبل). فقط دامنه‌هایی که داده دارن کاشی می‌گیرن؛
// hint فقط وقتی هفته‌ی قبل هم داده داشته و تفاوت معنادار بوده.

export const MAX_NUMBERS = 12;

export type NumbersInput = {
  cur: WeekFacts;
  prev: WeekFacts | null;
  activeDays: number;
  prevActiveDays: number | null;
  learning: { done: number; total: number; activeDays: number } | null;
};

type Tile = WeekNumber & { priority: number };

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function buildNumbers(i: NumbersInput): WeekNumber[] {
  const out: Tile[] = [];
  const { cur, prev } = i;

  // ── روتین ──
  if (cur.routine && cur.routine.total > 0) {
    const r = cur.routine;
    const p = pct(r.done, r.total);
    let hint: string | undefined;
    let tone: WeekNumber["tone"] = p >= 70 ? "good" : p < 40 ? "bad" : "neutral";
    if (prev?.routine && prev.routine.total > 0) {
      if (prev.routine.total === r.total) {
        const d = r.done - prev.routine.done;
        if (d !== 0) hint = tr(`${Math.abs(d)} برنامه ${d > 0 ? "بیشتر" : "کمتر"} از هفته‌ی قبل`, `${Math.abs(d)} ${d > 0 ? "more" : "fewer"} than last week`);
      } else {
        const d = p - pct(prev.routine.done, prev.routine.total);
        if (Math.abs(d) >= 3) hint = tr(`${Math.abs(d)} درصد ${d > 0 ? "بالاتر" : "پایین‌تر"} از هفته‌ی قبل`, `${Math.abs(d)} points ${d > 0 ? "higher" : "lower"} than last week`);
      }
    }
    if (!hint) hint = tr(`${p}% برنامه‌ها انجام شد`, `${p}% of items done`);
    out.push({ key: "routine_done", label: tr("برنامه‌های انجام‌شده", "Items completed"), value: `${r.done}/${r.total}`, domain: "routine", tone, hint, priority: 100 });
    out.push({
      key: "routine_perfect",
      label: tr("روزهای کامل", "Perfect days"),
      value: `${r.perfectDays}`,
      unit: tr("روز", "days"),
      domain: "routine",
      tone: r.perfectDays > 0 ? "good" : "neutral",
      hint: tr(`از ${r.days} روز دارای برنامه`, `out of ${pl(r.days, "day")} with items`),
      priority: 90,
    });
  }

  // ── روزهای فعال ──
  {
    let hint: string | undefined;
    if (i.prevActiveDays != null) {
      const d = i.activeDays - i.prevActiveDays;
      if (d !== 0) hint = tr(`${Math.abs(d)} روز ${d > 0 ? "بیشتر" : "کمتر"} از هفته‌ی قبل`, `${pl(Math.abs(d), "day")} ${d > 0 ? "more" : "fewer"} than last week`);
    }
    out.push({
      key: "active_days",
      label: tr("روزهای فعال", "Active days"),
      value: `${i.activeDays}/7`,
      domain: null,
      tone: i.activeDays >= 6 ? "good" : i.activeDays <= 2 ? "bad" : "neutral",
      hint,
      priority: 95,
    });
  }

  // ── خواب ──
  if (cur.sleep) {
    const s = cur.sleep;
    if (s.avgHours != null) {
      let hint = tr(`در ${s.hourNights} شب ثبت‌شده`, `logged over ${pl(s.hourNights, "night")}`);
      if (prev?.sleep?.avgHours != null) {
        const d = r1(s.avgHours - prev.sleep.avgHours);
        if (Math.abs(d) >= 0.2) hint = tr(`${Math.abs(d)} ساعت ${d > 0 ? "بیشتر" : "کمتر"} از هفته‌ی قبل`, `${Math.abs(d)} ${Math.abs(d) === 1 ? "hour" : "hours"} ${d > 0 ? "more" : "less"} than last week`);
      }
      out.push({
        key: "sleep_avg",
        label: tr("میانگین خواب", "Average sleep"),
        value: `${s.avgHours}`,
        unit: tr("ساعت", "hours"),
        domain: "sleep",
        tone: s.avgHours >= 7 && s.avgHours <= 9 ? "good" : s.avgHours < 6 ? "bad" : "neutral",
        hint,
        priority: 85,
      });
    }
    if (s.avgBed) out.push({ key: "sleep_bed", label: tr("میانگین ساعت خواب", "Average bedtime"), value: s.avgBed, domain: "sleep", tone: "neutral", hint: tr(`در ${s.nights} شب`, `over ${pl(s.nights, "night")}`), priority: 60 });
    if (s.avgWake) out.push({ key: "sleep_wake", label: tr("میانگین بیداری", "Average wake-up"), value: s.avgWake, domain: "sleep", tone: "neutral", hint: tr(`در ${s.nights} شب`, `over ${pl(s.nights, "night")}`), priority: 59 });
  }

  // ── بدنسازی ──
  if (cur.fitness && (cur.fitness.planned > 0 || cur.fitness.extra > 0)) {
    const f = cur.fitness;
    const planned = f.planned;
    const value = planned > 0 ? `${f.done}/${planned}` : `${f.extra}`;
    const hints: string[] = [];
    if (planned > 0 && f.extra > 0) hints.push(tr(`${f.extra} جلسه‌ی اضافه`, `${pl(f.extra, "extra session")}`));
    if (f.missed > 0) hints.push(tr(`${f.missed} جلسه جا موند`, `${pl(f.missed, "session")} missed`));
    out.push({
      key: "fitness_sessions",
      label: tr("جلسات تمرین", "Workout sessions"),
      value,
      domain: "fitness",
      tone: planned > 0 ? (f.done >= planned ? "good" : f.missed >= 2 ? "bad" : "neutral") : "good",
      hint: hints.length ? hints.join(tr("، ", ", ")) : undefined,
      priority: 80,
    });
  }

  // ── تغذیه ──
  if (cur.nutrition) {
    const n = cur.nutrition;
    let hint: string | undefined;
    let tone: WeekNumber["tone"] = "neutral";
    if (n.target) {
      const d = Math.round(((n.avgKcal - n.target) / n.target) * 100);
      hint = Math.abs(d) < 3
        ? tr(`نزدیک هدف ${n.target}`, `close to the ${n.target} target`)
        : tr(`${Math.abs(d)}% ${d > 0 ? "بالاتر" : "پایین‌تر"} از هدف ${n.target}`, `${Math.abs(d)}% ${d > 0 ? "above" : "below"} the ${n.target} target`);
      tone = Math.abs(d) <= 10 ? "good" : Math.abs(d) > 25 ? "bad" : "neutral";
    }
    out.push({ key: "nutrition_kcal", label: tr("میانگین کالری روزانه", "Average daily calories"), value: `${n.avgKcal}`, unit: "kcal", domain: "nutrition", tone, hint, priority: 70 });
    if (n.targetDays >= 2) {
      out.push({
        key: "nutrition_on_target",
        label: tr("روزهای نزدیک هدف", "Days near target"),
        value: `${n.onTargetDays}/${n.targetDays}`,
        domain: "nutrition",
        tone: n.onTargetDays * 2 >= n.targetDays ? "good" : "neutral",
        priority: 55,
      });
    }
  }

  // ── ترید ──
  if (cur.trading && cur.trading.count > 0) {
    const t = cur.trading;
    const closed = t.wins + t.losses;
    out.push({
      key: "trade_count",
      label: tr("معاملات", "Trades"),
      value: `${t.count}`,
      domain: "trading",
      tone: "neutral",
      hint: closed > 0 ? tr(`${t.wins} برد، ${t.losses} باخت`, `${t.wins} won, ${t.losses} lost`) : undefined,
      priority: 75,
    });
    if (closed >= 3) {
      const wr = pct(t.wins, closed);
      out.push({ key: "trade_winrate", label: tr("نرخ برد", "Win rate"), value: `${wr}%`, domain: "trading", tone: wr >= 50 ? "good" : "bad", priority: 50 });
    }
    if (t.net != null) {
      out.push({
        key: "trade_net",
        label: tr("سود و زیان خالص", "Net profit and loss"),
        value: `${t.net > 0 ? "+" : ""}${t.net}`,
        unit: t.currency ?? undefined,
        domain: "trading",
        tone: t.net > 0 ? "good" : t.net < 0 ? "bad" : "neutral",
        hint: t.mixedCurrency ? tr("حساب‌ها ارزهای متفاوت دارن", "Your accounts use different currencies") : undefined,
        priority: 52,
      });
    }
  }

  // ── کارها ──
  if (cur.tasks && cur.tasks.due > 0) {
    const t = cur.tasks;
    out.push({
      key: "tasks_done",
      label: tr("کارهای انجام‌شده", "Tasks completed"),
      value: `${t.done}/${t.due}`,
      domain: "tasks",
      tone: pct(t.done, t.due) >= 80 ? "good" : pct(t.done, t.due) < 40 ? "bad" : "neutral",
      hint: t.overdue > 0 ? tr(`${t.overdue} کار عقب افتاد`, `${pl(t.overdue, "task")} fell behind`) : t.done >= t.due ? tr("هیچ کاری عقب نیفتاد", "Nothing fell behind") : undefined,
      priority: 65,
    });
  }

  // ── یادگیری ──
  if (i.learning && i.learning.total > 0) {
    const l = i.learning;
    out.push({
      key: "learning_steps",
      label: tr("مراحل رودمپ", "Roadmap steps"),
      value: `${l.done}/${l.total}`,
      domain: "learning",
      tone: "neutral",
      hint: l.activeDays > 0 ? tr(`${l.activeDays} روز این هفته فعال بودی`, `active on ${pl(l.activeDays, "day")} this week`) : undefined,
      priority: 45,
    });
  }

  return out
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_NUMBERS)
    .map(({ priority: _p, ...n }) => n);
}
