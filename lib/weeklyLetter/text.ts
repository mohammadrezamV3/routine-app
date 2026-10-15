// متن‌های قطعی «هفته‌نامه» — همه تابع خالص (بدون دیتابیس) و تست‌پذیر.
// قانون: فقط چیزی گفته می‌شه که داده پشتشه، همیشه با عدد واقعی؛ با داده‌ی
// کم کمتر می‌گیم. لحن: صمیمی و محاوره‌ای، مستقیم با خود کاربر.
import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DayCell, type DomainResult, type Grade, type WeekArchetype } from "@/lib/weeklyAnalysis/types";
import { weekFacts, type WeekFacts } from "@/lib/weeklyAnalysis/facts";
import { longestStreak } from "@/lib/weeklyAnalysis/score";
import { tr } from "@/lib/i18n";
import { pl } from "@/lib/weeklyAnalysis/plural";

const L = (d: AnalysisDomain) => ANALYSIS_DOMAIN_LABELS[d];
const abs = Math.abs;

/** واقعیت‌های هفته از روی روزهای یک آنالیز (هفته‌ی تموم‌شده: همه‌ی روزها بسته‌ن) */
export function factsOfDays(days: DayCell[]): WeekFacts {
  return weekFacts(days.map((d) => ({ details: d.details ?? {}, closed: !d.isToday && !d.isFuture })));
}

function stat(d: DomainResult, label: string): string | null {
  const v = d.stats.find((s) => s.label === label)?.value;
  return v && v !== "-" ? v : null;
}

/** جمله‌ی مقایسه با هفته‌ی قبل؛ تغییر کوچیک = تقریبا هم‌سطح */
function deltaSentence(delta: number | null): string {
  if (delta == null) return "";
  if (delta >= 5) return tr(` نسبت به هفته‌ی قبل ${delta} امتیاز بهتر شدی.`, ` You improved by ${pl(delta, "point")} compared with last week.`);
  if (delta <= -5) return tr(` نسبت به هفته‌ی قبل ${abs(delta)} امتیاز افت داشتی.`, ` You dropped ${pl(abs(delta), "point")} compared with last week.`);
  return tr(" تقریبا هم‌سطح هفته‌ی قبل بودی.", " You were about level with last week.");
}

/** بهترین و بدترین روز یک دامنه (weekday فارسی)؛ با کمتر از ۲ روز داده یا امتیاز برابر null */
export function domainBestWorst(d: DomainResult, days: DayCell[]): { best: string | null; worst: string | null } {
  const scored = d.daily.map((s, i) => ({ s, i })).filter((x): x is { s: number; i: number } => x.s != null);
  if (scored.length < 2) return { best: null, worst: null };
  const hi = scored.reduce((a, b) => (b.s > a.s ? b : a));
  const lo = scored.reduce((a, b) => (b.s < a.s ? b : a));
  if (hi.s === lo.s) return { best: null, worst: null };
  return { best: days[hi.i]?.weekday ?? null, worst: days[lo.i]?.weekday ?? null };
}

/** یک جمله‌ی تحلیلی (یا دو جمله) مخصوص یک دامنه با عدد واقعی */
export function domainNote(d: DomainResult, facts: WeekFacts): string {
  const s = d.score;
  if (s == null) return tr(`برای ${L(d.domain)} این هفته داده‌ای ثبت نشده بود.`, `No ${L(d.domain)} data was logged this week.`);
  const tail = deltaSentence(d.delta);
  switch (d.domain) {
    case "routine": {
      const r = facts.routine;
      if (!r || r.total === 0) break;
      const p = Math.round((r.done / r.total) * 100);
      const perfect = r.perfectDays > 0 ? tr(` و ${r.perfectDays} روز همه‌ی برنامه‌ها کامل انجام شد`, ` and all items were completed on ${pl(r.perfectDays, "day")}`) : "";
      return tr(`${r.done} برنامه از ${r.total} برنامه‌ی هفته رو انجام دادی (${p}%)${perfect}.${tail}`, `You completed ${r.done} of ${r.total} items this week (${p}%)${perfect}.${tail}`);
    }
    case "sleep": {
      const z = facts.sleep;
      if (!z) break;
      if (z.avgHours == null) return tr(`${z.nights} شب خوابت ثبت شده ولی ساعت دقیق خواب و بیداری نه، برای همین امتیازش بیشتر از نظم و کیفیته.${tail}`, `${pl(z.nights, "night")} of sleep were logged but not the exact sleep and wake times, so the score reflects regularity and quality more.${tail}`);
      const few = z.hourNights < 3 ? tr(`فقط ${z.hourNights} شب ثبت شده و `, `Only ${pl(z.hourNights, "night")} logged, and `) : "";
      const range = z.avgHours >= 7 && z.avgHours <= 9
        ? tr("توی بازه‌ی خوب 7 تا 9 ساعته", "within the healthy 7 to 9 hour range")
        : z.avgHours < 7 ? tr("کمتر از 7 ساعته", "under 7 hours") : tr("بیشتر از 9 ساعته", "over 9 hours");
      const q = z.avgQuality != null ? tr(` و کیفیتش رو ${z.avgQuality} از 5 دادی`, ` and you rated its quality ${z.avgQuality} out of 5`) : "";
      const clock = z.avgBed && z.avgWake ? tr(` معمولا حدود ${z.avgBed} می‌خوابیدی و حدود ${z.avgWake} بیدار می‌شدی.`, ` You usually went to bed around ${z.avgBed} and woke up around ${z.avgWake}.`) : "";
      return tr(`${few}میانگین خوابت ${z.avgHours} ساعت بود که ${range}${q}.${clock}${tail}`, `${few}${few ? "y" : "Y"}our average sleep was ${z.avgHours} hours, which is ${range}${q}.${clock}${tail}`);
    }
    case "fitness": {
      const f = facts.fitness;
      if (!f) break;
      const parts: string[] = [];
      if (f.planned > 0) parts.push(tr(`${f.done} از ${f.planned} جلسه‌ی برنامه رو تمرین کردی`, `you did ${f.done} of ${pl(f.planned, "planned session")}`));
      else if (f.extra > 0) parts.push(tr(`${f.extra} جلسه تمرین ثبت کردی`, `you logged ${pl(f.extra, "workout session")}`));
      if (f.planned > 0 && f.extra > 0) parts.push(tr(`${f.extra} جلسه‌ی اضافه هم زدی`, `you added ${pl(f.extra, "extra session")}`));
      if (f.partial > 0) parts.push(tr(`${f.partial} جلسه نیمه‌کاره موند`, `${pl(f.partial, "session")} left unfinished`));
      if (f.missed > 0) parts.push(tr(`${f.missed} جلسه جا افتاد`, `${pl(f.missed, "session")} missed`));
      if (!parts.length) break;
      const joined = parts.join(tr("، ", ", "));
      return tr(`${joined}.${tail}`, `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.${tail}`);
    }
    case "nutrition": {
      const n = facts.nutrition;
      if (!n) break;
      const tgt = n.target ? tr(` (هدفت ${n.target})`, ` (your target was ${n.target})`) : "";
      const on = n.targetDays >= 2 ? tr(`؛ ${n.onTargetDays} از ${n.targetDays} روز داخل ±10% هدف موندی`, `; you stayed within ±10% of target on ${n.onTargetDays} of ${n.targetDays} days`) : "";
      return tr(`میانگین کالریت ${n.avgKcal} بود${tgt}${on}.${tail}`, `Your average calories were ${n.avgKcal}${tgt}${on}.${tail}`);
    }
    case "trading": {
      const t = facts.trading;
      if (!t || t.count === 0) break;
      const closed = t.wins + t.losses;
      const res = closed > 0 ? tr(`، ${t.wins} برد و ${t.losses} باخت`, `, ${t.wins} won and ${t.losses} lost`) : "";
      const cur = t.currency ? ` ${t.currency}` : "";
      const net = t.net != null && !t.mixedCurrency ? tr(`؛ سود و زیان خالص ${t.net > 0 ? "+" : ""}${t.net}${cur}`, `; net profit and loss ${t.net > 0 ? "+" : ""}${t.net}${cur}`) : "";
      return tr(
        `${t.count} معامله ثبت کردی${res}${net}. امتیاز این بخش از انضباطت میاد (چک‌لیست، حدضرر، طبق پلن بودن) نه از سود.${tail}`,
        `You logged ${pl(t.count, "trade")}${res}${net}. This score comes from your discipline (checklist, stop loss, following the plan), not from profit.${tail}`,
      );
    }
    case "tasks": {
      const t = facts.tasks;
      if (!t || t.due === 0) break;
      const od = t.overdue > 0
        ? tr(` و ${t.overdue} کار عقب افتاد`, ` and ${pl(t.overdue, "task")} fell behind`)
        : t.done >= t.due ? tr(" و هیچ کاری عقب نیفتاد", " and nothing fell behind") : "";
      return tr(`${t.done} کار از ${t.due} کار سررسیدشده انجام شد${od}.${tail}`, `${t.done} of ${pl(t.due, "task")} due were completed${od}.${tail}`);
    }
    case "learning": {
      const steps = stat(d, tr("مراحل انجام‌شده", "Steps completed"));
      if (!steps) break;
      const act = stat(d, tr("فعالیت این هفته", "Activity this week"));
      const none = tr("ندارد", "None");
      return tr(
        `${steps.replace("/", " از ")} مرحله‌ی رودمپ‌هات انجام شده${act && act !== none ? ` و این هفته ${act} روی اون‌ها کار کردی` : ""}.${tail}`,
        `${steps.replace("/", " of ")} of your roadmap steps are done${act && act !== none ? ` and you worked on them for ${act} this week` : ""}.${tail}`,
      );
    }
  }
  return tr(`امتیاز ${L(d.domain)} این هفته ${s} شد.${tail}`, `Your ${L(d.domain)} score this week was ${s}.${tail}`);
}

// ───────────────────────── بردها / جای پیشرفت ─────────────────────────

export type TextInput = {
  score: number | null;
  prevScore: number | null;
  delta: number | null;
  activeDays: number;
  days: DayCell[];
  domains: DomainResult[];
};

type Cand = { text: string; priority: number; group: string };

function pick(c: Cand[], n: number): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const x of [...c].sort((a, b) => b.priority - a.priority)) {
    if (used.has(x.group)) continue;
    used.add(x.group);
    out.push(x.text);
    if (out.length >= n) break;
  }
  return out;
}

const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function buildWinsAndImprove(i: TextInput): { wins: string[]; improve: string[] } {
  const f = factsOfDays(i.days);
  const dom = new Map(i.domains.map((d) => [d.domain, d]));
  const wins: Cand[] = [];
  const bad: Cand[] = [];
  const ds = i.days.map((d) => (d.isFuture ? null : d.score));

  // ── کلی ──
  if (i.score != null && i.prevScore != null && i.delta != null) {
    if (i.delta >= 5) wins.push({ text: tr(`امتیاز کلت از ${i.prevScore} به ${i.score} رسید، ${i.delta} واحد بهتر از هفته‌ی قبل.`, `Your overall score went from ${i.prevScore} to ${i.score}, ${pl(i.delta, "point")} better than last week.`), priority: 74, group: "overall" });
    if (i.delta <= -5) bad.push({ text: tr(`امتیاز کلت از ${i.prevScore} به ${i.score} افتاد، ${abs(i.delta)} واحد کمتر از هفته‌ی قبل.`, `Your overall score fell from ${i.prevScore} to ${i.score}, ${pl(abs(i.delta), "point")} lower than last week.`), priority: 79, group: "overall" });
  }
  const streak = longestStreak(ds, 70);
  if (streak >= 3) wins.push({ text: tr(`${streak} روز پشت‌سرهم امتیازت بالای 70 بود.`, `Your score was above 70 for ${pl(streak, "day")} in a row.`), priority: 69, group: "streak" });
  if (i.activeDays >= 6) wins.push({ text: tr(`${i.activeDays} روز از 7 روز هفته چیزی ثبت کردی؛ این ثبات خودش یک برده.`, `You logged something on ${i.activeDays} of 7 days; that consistency is a win in itself.`), priority: 58, group: "active" });
  if (i.activeDays <= 4 && i.activeDays >= 1 && i.days.every((d) => !d.isFuture)) {
    bad.push({ text: tr(`فقط ${i.activeDays} روز از 7 روز هفته چیزی ثبت کردی؛ روزهای خالی تصویر هفته‌ت رو ناقص می‌کنن.`, `You logged something on only ${i.activeDays} of 7 days; the empty days make the picture of your week incomplete.`), priority: 72, group: "active" });
  }
  const scored = i.days.filter((d) => !d.isFuture && d.score != null);
  if (scored.length >= 3) {
    const best = scored.reduce((a, b) => (b.score! > a.score! ? b : a));
    const worst = scored.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (best.score! >= 85) wins.push({ text: tr(`${best.weekday} با امتیاز ${best.score} قوی‌ترین روزت بود.`, `${best.weekday} was your strongest day with a score of ${best.score}.`), priority: 50, group: "bestday" });
    if (worst.score! < 50 && best.score! - worst.score! >= 25) bad.push({ text: tr(`${worst.weekday} با امتیاز ${worst.score} ضعیف‌ترین روز هفته بود؛ ببین اون روز چی فرق داشت.`, `${worst.weekday} was the weakest day of the week with a score of ${worst.score}; see what was different that day.`), priority: 55, group: "worstday" });
  }

  // ── هر دامنه ──
  const r = f.routine;
  if (r && r.total > 0 && r.days >= 3) {
    const p = pctOf(r.done, r.total);
    if (r.perfectDays >= 1) wins.push({ text: tr(`${r.perfectDays} روز تمام برنامه‌های روتینت رو انجام دادی.`, `You completed every routine item on ${pl(r.perfectDays, "day")}.`), priority: 70 + r.perfectDays, group: "routine" });
    if (p >= 80) wins.push({ text: tr(`${p}% برنامه‌های روتین انجام شد (${r.done} از ${r.total}).`, `${p}% of your routine items were done (${r.done} of ${r.total}).`), priority: 75, group: "routine" });
    if (p < 60) bad.push({ text: tr(`فقط ${p}% برنامه‌های روتین انجام شد (${r.done} از ${r.total}).`, `Only ${p}% of your routine items were done (${r.done} of ${r.total}).`), priority: 78, group: "routine" });
  }
  const z = f.sleep;
  if (z && z.avgHours != null && z.hourNights >= 3) {
    if (z.avgHours >= 7 && z.avgHours <= 9) wins.push({ text: tr(`میانگین خوابت ${z.avgHours} ساعت بود و ${z.nights7h} شب حداقل 7 ساعت خوابیدی.`, `Your average sleep was ${z.avgHours} hours and you slept at least 7 hours on ${pl(z.nights7h, "night")}.`), priority: 72, group: "sleep" });
    if (z.avgHours < 6.5) bad.push({ text: tr(`میانگین خوابت ${z.avgHours} ساعت بود، کمتر از 7 ساعتی که بیشتر آدم‌ها بهش نیاز دارن.`, `Your average sleep was ${z.avgHours} hours, less than the 7 hours most people need.`), priority: 76, group: "sleep" });
  }
  const ft = f.fitness;
  if (ft) {
    if (ft.planned > 0 && ft.done >= ft.planned) wins.push({ text: tr(`همه‌ی ${ft.planned} جلسه‌ی تمرینت رو انجام دادی.`, `You completed all ${pl(ft.planned, "workout session")}.`), priority: 78, group: "fitness" });
    else if (ft.extra > 0) wins.push({ text: tr(`${ft.extra} جلسه بیشتر از برنامه تمرین کردی.`, `You trained ${pl(ft.extra, "session")} more than planned.`), priority: 60, group: "fitness" });
    if (ft.missed > 0) bad.push({ text: tr(`${ft.missed} جلسه از برنامه‌ی تمرینت جا موند.`, `${pl(ft.missed, "session")} from your workout plan got missed.`), priority: 74, group: "fitness" });
  }
  const nu = f.nutrition;
  if (nu) {
    if (nu.targetDays >= 3 && nu.onTargetDays >= 3) wins.push({ text: tr(`${nu.onTargetDays} روز کالریت داخل ±10% هدفت بود.`, `Your calories were within ±10% of target on ${pl(nu.onTargetDays, "day")}.`), priority: 66, group: "nutrition" });
    if (nu.target) {
      const d = Math.round(((nu.avgKcal - nu.target) / nu.target) * 100);
      if (abs(d) >= 15) bad.push({ text: tr(`میانگین کالریت ${nu.avgKcal} بود، ${abs(d)}% ${d > 0 ? "بالاتر" : "پایین‌تر"} از هدف ${nu.target}.`, `Your average calories were ${nu.avgKcal}, ${abs(d)}% ${d > 0 ? "above" : "below"} the ${nu.target} target.`), priority: 66, group: "nutrition" });
    }
  }
  const tk = f.tasks;
  if (tk && tk.due >= 3) {
    if (tk.overdue === 0) wins.push({ text: tr(`هیچ کاری عقب نیفتاد؛ ${tk.done} از ${tk.due} کار انجام شد.`, `Nothing fell behind; ${tk.done} of ${tk.due} tasks were completed.`), priority: 68, group: "tasks" });
    else bad.push({ text: tr(`${tk.overdue} کار از ${tk.due} کار این هفته عقب افتاد.`, `${tk.overdue} of ${pl(tk.due, "task")} this week fell behind.`), priority: 70, group: "tasks" });
  }
  const trd = dom.get("trading");
  if (trd && trd.score != null && f.trading && f.trading.count > 0) {
    if (trd.score >= 80) wins.push({ text: tr(`انضباط معاملاتیت ${trd.score} از 100 شد، با ${f.trading.count} معامله.`, `Your trading discipline scored ${trd.score} out of 100, across ${pl(f.trading.count, "trade")}.`), priority: 64, group: "trading" });
    if (trd.score < 60) bad.push({ text: tr(`انضباط معاملاتیت ${trd.score} از 100 بود؛ چک‌لیست، حدضرر و طبق پلن بودن رو جدی‌تر بگیر.`, `Your trading discipline scored ${trd.score} out of 100; take the checklist, stop loss and sticking to the plan more seriously.`), priority: 71, group: "trading" });
  }

  // ── جهش/افت دامنه‌ها و ضعیف‌ترین دامنه ──
  for (const d of i.domains) {
    if (d.delta != null && d.score != null) {
      if (d.delta >= 10) wins.push({ text: tr(`امتیاز ${L(d.domain)} ${d.delta} واحد بهتر شد (${d.prevScore} به ${d.score}).`, `Your ${L(d.domain)} score improved by ${pl(d.delta, "point")} (${d.prevScore} to ${d.score}).`), priority: 62, group: `d_${d.domain}` });
      if (d.delta <= -10) bad.push({ text: tr(`امتیاز ${L(d.domain)} ${abs(d.delta)} واحد افت کرد (${d.prevScore} به ${d.score}).`, `Your ${L(d.domain)} score dropped ${pl(abs(d.delta), "point")} (${d.prevScore} to ${d.score}).`), priority: 68, group: `d_${d.domain}` });
    }
  }
  const comparable = i.domains.filter((d) => d.score != null && d.daysWithData >= 2 && d.domain !== "learning");
  if (comparable.length >= 2) {
    const weakest = comparable.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (weakest.score! < 60) bad.push({ text: tr(`${L(weakest.domain)} با امتیاز ${weakest.score} ضعیف‌ترین بخش هفته بود.`, `${L(weakest.domain)} was the weakest area of the week with a score of ${weakest.score}.`), priority: 80, group: `d_${weakest.domain}` });
  }

  const w = pick(wins, 3);
  if (!w.length && i.score != null && i.activeDays >= 2) w.push(tr(`${i.activeDays} روز از هفته رو ثبت کردی؛ همین ثبت‌کردن پایه‌ی هر پیشرفتیه.`, `You logged ${pl(i.activeDays, "day")} this week; logging is the foundation of any progress.`));
  return { wins: w, improve: pick(bad, 3) };
}

// ───────────────────────── مقدمه ─────────────────────────

export type IntroInput = {
  weekLabel: string;
  score: number | null;
  grade: Grade | null;
  prevScore: number | null;
  activeDays: number;
  bestDay: DayCell | null;
  domains: DomainResult[];
  rank: { position: number; of: number } | null;
  archetype: WeekArchetype | null;
};

export function buildIntro(i: IntroInput): string {
  if (i.score == null) return tr(`برای هفته‌ی ${i.weekLabel} چیزی ثبت نشده بود، پس هنوز چیزی برای جمع‌بندی نداریم.`, `Nothing was logged for the week of ${i.weekLabel}, so there is nothing to sum up yet.`);
  const d = i.prevScore != null ? i.score - i.prevScore : null;
  const dTail =
    d == null
      ? "."
      : d >= 3
        ? tr(`، ${d} امتیاز بالاتر از هفته‌ی قبل.`, `, ${pl(d, "point")} higher than last week.`)
        : d <= -3
          ? tr(`، ${abs(d)} امتیاز پایین‌تر از هفته‌ی قبل.`, `, ${pl(abs(d), "point")} lower than last week.`)
          : tr("، تقریبا هم‌سطح هفته‌ی قبل.", ", about level with last week.");
  const s1 = tr(`هفته‌ی ${i.weekLabel} رو با امتیاز ${i.score} از 100 و نمره‌ی ${i.grade ?? "-"} بستی${dTail}`, `You closed the week of ${i.weekLabel} with a score of ${i.score} out of 100 and a grade of ${i.grade ?? "-"}${dTail}`);

  if (i.activeDays <= 2) {
    return tr(`${s1} فقط ${i.activeDays} روز از هفته چیزی ثبت شده بود، برای همین این عدد تصویر کاملی نیست؛ هرچی بیشتر ثبت کنی هفته‌نامه دقیق‌تر می‌شه.`, `${s1} Something was logged on only ${i.activeDays} days, so this number is not the full picture; the more you log, the more accurate your weekly review gets.`);
  }

  const comparable = i.domains.filter((x) => x.score != null && x.daysWithData >= 2 && x.domain !== "learning");
  const bestDom = comparable.length >= 2 ? comparable.reduce((a, b) => (b.score! > a.score! ? b : a)) : null;
  let s2 = "";
  if (i.bestDay && bestDom) s2 = tr(` قوی‌ترین روزت ${i.bestDay.weekday} بود (${i.bestDay.score}) و بهترین بخشت ${L(bestDom.domain)} با امتیاز ${bestDom.score}.`, ` Your strongest day was ${i.bestDay.weekday} (${i.bestDay.score}) and your best area was ${L(bestDom.domain)} with a score of ${bestDom.score}.`);
  else if (i.bestDay) s2 = tr(` قوی‌ترین روزت ${i.bestDay.weekday} بود (${i.bestDay.score}).`, ` Your strongest day was ${i.bestDay.weekday} (${i.bestDay.score}).`);
  else if (bestDom) s2 = tr(` بهترین بخشت ${L(bestDom.domain)} بود با امتیاز ${bestDom.score}.`, ` Your best area was ${L(bestDom.domain)} with a score of ${bestDom.score}.`);

  let s3 = "";
  if (i.rank && i.rank.of >= 4) {
    s3 = i.rank.position === 1
      ? tr(` این بهترین هفته‌ی ${i.rank.of} هفته‌ی اخیرت بود.`, ` This was the best of your last ${i.rank.of} weeks.`)
      : tr(` بین ${i.rank.of} هفته‌ی اخیرت، این هفته رتبه‌ی ${i.rank.position} رو گرفت.`, ` Among your last ${i.rank.of} weeks, this one ranked #${i.rank.position}.`);
  } else if (comparable.length >= 2) {
    const weak = comparable.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (weak.score! < 70 && weak.domain !== bestDom?.domain) s3 = tr(` بیشترین جای رشد هم ${L(weak.domain)} بود (${weak.score}).`, ` The most room to grow was in ${L(weak.domain)} (${weak.score}).`);
  }
  return `${s1}${s2}${s3}`;
}

// ───────────────────────── هفته‌ی بعد ─────────────────────────

export type NextWeek = {
  focusDomain: AnalysisDomain | null;
  focusTitle: string;
  focusText: string;
  suggestedTarget: number | null;
};

/** هدف پیشنهادی: ۱۰ امتیاز بالاتر، گرد به مضرب ۵، حداکثر ۱۰۰ */
// کف 40: برای بخشی که نزدیک صفره «هدف 10 امتیاز» عملا هدف نیست
export function suggestTarget(score: number): number {
  return Math.min(100, Math.max(40, Math.round((score + 10) / 5) * 5));
}

export function buildNextWeek(i: { score: number | null; domains: DomainResult[]; days: DayCell[] }): NextWeek {
  const cand = i.domains.filter((d) => d.score != null && d.daysWithData >= 2);
  const pool = cand.filter((d) => d.domain !== "learning");
  const list = pool.length ? pool : cand;
  if (!list.length) {
    return {
      focusDomain: null,
      focusTitle: tr("تمرکز هفته‌ی بعد: ثبت‌کردن", "Next week's focus: logging"),
      focusText: tr(
        "داده‌ی این هفته برای انتخاب یک بخش خاص کافی نبود. هفته‌ی بعد هر روز فقط یک چیز کوچیک ثبت کن (تیک روتین، خواب یا یک کار)؛ با چند روز ثبت، هفته‌نامه‌ی بعدی خیلی دقیق‌تر می‌شه.",
        "This week's data was not enough to pick a specific area. Next week, log just one small thing each day (a routine tick, sleep or a task); with a few days of logging, your next weekly review will be much more accurate.",
      ),
      suggestedTarget: null,
    };
  }
  const weak = list.reduce((a, b) => (b.score! < a.score! ? b : a));
  const s = weak.score!;
  const target = suggestTarget(s);
  const f = factsOfDays(i.days);
  const label = L(weak.domain);
  let text: string;

  if (s >= 85) {
    text = tr(
      `همه‌ی بخش‌هات بالای 85 بودن و ${label} با ${s} پایین‌ترینشون بود. هدف هفته‌ی بعد اینه که همین سطح رو نگه داری (هدف پیشنهادی: ${target} امتیاز).`,
      `All your areas were above 85, and ${label} was the lowest at ${s}. Next week the goal is to hold this level (suggested target: ${target} points).`,
    );
  } else {
    switch (weak.domain) {
      case "routine": {
        const p = f.routine && f.routine.total > 0 ? pctOf(f.routine.done, f.routine.total) : null;
        text = tr(
          `${p != null ? `فقط ${p}% برنامه‌هات انجام شد. ` : ""}برنامه‌هایی که مدام جا می‌مونن رو سبک‌تر کن یا به ساعت بهتری ببر؛ برنامه‌ی کم‌تر ولی انجام‌شده از برنامه‌ی زیاد و نیمه‌کاره بهتره.`,
          `${p != null ? `Only ${p}% of your items were done. ` : ""}Lighten the items that keep getting missed or move them to a better time; a smaller plan you finish beats a big one you half-do.`,
        );
        break;
      }
      case "sleep": {
        const h = f.sleep?.avgHours;
        text = h != null && h < 7
          ? tr(
              `میانگین خوابت ${h} ساعت بود. هفته‌ی بعد ساعت خوابت رو هر شب 15 دقیقه زودتر کن تا کم‌کم به 7 ساعت برسی.`,
              `Your average sleep was ${h} hours. Next week, move your bedtime 15 minutes earlier each night to work your way up to 7 hours.`,
            )
          : tr(
              `خوابت از نظر مدت بد نبود${h != null ? ` (${h} ساعت)` : ""}؛ امتیاز پایین‌تر بیشتر از نظم ساعت بیداری یا کیفیت خواب میاد. ساعت بیداریت رو بین روزها ثابت نگه دار.`,
              `Your sleep duration was not bad${h != null ? ` (${h} hours)` : ""}; the lower score comes more from wake-up regularity or sleep quality. Keep your wake-up time consistent across days.`,
            );
        break;
      }
      case "fitness": {
        const m = f.fitness?.missed ?? 0;
        text = m > 0
          ? tr(
              `${m} جلسه از برنامه‌ی تمرینت جا موند. جلسه‌هات رو توی روز و ساعت ثابتی بذار و اگه وقت کم بود، یک جلسه‌ی کوتاه رو هم رد نکن.`,
              `${pl(m, "session")} from your workout plan got missed. Put your sessions on a fixed day and time, and if you are short on time, do not skip a session; a short one still counts.`,
            )
          : tr(
              `امتیاز تمرینت ${s} شد. جلسه‌های برنامه رو سر وقت و کامل انجام بده، حتی کوتاه.`,
              `Your workout score was ${s}. Do your planned sessions on time and in full, even if they are short.`,
            );
        break;
      }
      case "nutrition": {
        const n = f.nutrition;
        if (n?.target) {
          const d = Math.round(((n.avgKcal - n.target) / n.target) * 100);
          text = abs(d) >= 5
            ? tr(
                `میانگین کالریت ${n.avgKcal} بود، ${abs(d)}% ${d > 0 ? "بالاتر" : "پایین‌تر"} از هدف ${n.target}. هفته‌ی بعد وعده‌هات رو ثبت کن و ببین کجا از هدف فاصله می‌گیری.`,
                `Your average calories were ${n.avgKcal}, ${abs(d)}% ${d > 0 ? "above" : "below"} the ${n.target} target. Next week, log your meals and see where you drift from the target.`,
              )
            : tr(
                `کالریت نزدیک هدف بود؛ بیشتر ثبت منظم وعده‌ها کم بود. سعی کن هر روز همه‌ی وعده‌هات رو ثبت کنی.`,
                `Your calories were close to target; what was missing was regular meal logging. Try to log all your meals every day.`,
              );
        } else text = tr("برای تغذیه هنوز هدف کالری نداری یا ثبت‌هات پراکنده بود. هفته‌ی بعد هر روز وعده‌هات رو ثبت کن.", "You do not have a calorie target for nutrition yet, or your logging was patchy. Next week, log your meals every day.");
        break;
      }
      case "trading":
        text = tr(
          `انضباط معاملاتیت ${s} شد. قبل از هر ورود چک‌لیستت رو کامل کن و حدضرر بذار؛ هدف هفته‌ی بعد رو انضباط بذار، نه سود.`,
          `Your trading discipline scored ${s}. Complete your checklist and set a stop loss before every entry; make discipline next week's goal, not profit.`,
        );
        break;
      case "tasks": {
        const od = f.tasks?.overdue ?? 0;
        text = od > 0
          ? tr(
              `${od} کار عقب افتاد. کارهای بزرگ رو به تکه‌های کوچیک تقسیم کن و برای هرکدوم سررسید واقع‌بینانه بذار.`,
              `${pl(od, "task")} fell behind. Break big tasks into small pieces and give each a realistic due date.`,
            )
          : tr(
              `امتیاز کارهات ${s} شد. هر صبح سه کار مهم اون روز رو مشخص کن و اول اون‌ها رو تموم کن.`,
              `Your tasks score was ${s}. Each morning, pick the three important tasks of the day and finish them first.`,
            );
        break;
      }
      case "learning":
        text = tr(
          `رودمپ‌هات الان ${s}% جلو رفته. هفته‌ی بعد یک مرحله‌ی کوچیک رو انتخاب کن و تا آخر هفته تمومش کن.`,
          `Your roadmaps are ${s}% along. Next week, pick one small step and finish it by the end of the week.`,
        );
        break;
    }
  }
  if (s < 85) text += tr(` هدف پیشنهادی برات: ${target} امتیاز در ${label}.`, ` Suggested target for you: ${target} points in ${label}.`);
  return { focusDomain: weak.domain, focusTitle: tr(`تمرکز هفته‌ی بعد: ${label}`, `Next week's focus: ${label}`), focusText: text, suggestedTarget: target };
}
