// متن‌های قطعی «هفته‌نامه» — همه تابع خالص (بدون دیتابیس) و تست‌پذیر.
// قانون: فقط چیزی گفته می‌شه که داده پشتشه، همیشه با عدد واقعی؛ با داده‌ی
// کم کمتر می‌گیم. لحن: صمیمی و محاوره‌ای، مستقیم با خود کاربر.
import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain, type DayCell, type DomainResult, type Grade, type WeekArchetype } from "@/lib/weeklyAnalysis/types";
import { weekFacts, type WeekFacts } from "@/lib/weeklyAnalysis/facts";
import { longestStreak } from "@/lib/weeklyAnalysis/score";

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
  if (delta >= 5) return ` نسبت به هفته‌ی قبل ${delta} امتیاز بهتر شدی.`;
  if (delta <= -5) return ` نسبت به هفته‌ی قبل ${abs(delta)} امتیاز افت داشتی.`;
  return " تقریبا هم‌سطح هفته‌ی قبل بودی.";
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
  if (s == null) return `برای ${L(d.domain)} این هفته داده‌ای ثبت نشده بود.`;
  const tail = deltaSentence(d.delta);
  switch (d.domain) {
    case "routine": {
      const r = facts.routine;
      if (!r || r.total === 0) break;
      const p = Math.round((r.done / r.total) * 100);
      const perfect = r.perfectDays > 0 ? ` و ${r.perfectDays} روز همه‌ی برنامه‌ها کامل انجام شد` : "";
      return `${r.done} برنامه از ${r.total} برنامه‌ی هفته رو انجام دادی (${p}%)${perfect}.${tail}`;
    }
    case "sleep": {
      const z = facts.sleep;
      if (!z) break;
      if (z.avgHours == null) return `${z.nights} شب خوابت ثبت شده ولی ساعت دقیق خواب و بیداری نه، برای همین امتیازش بیشتر از نظم و کیفیته.${tail}`;
      const few = z.hourNights < 3 ? `فقط ${z.hourNights} شب ثبت شده و ` : "";
      const range = z.avgHours >= 7 && z.avgHours <= 9 ? "توی بازه‌ی خوب 7 تا 9 ساعته" : z.avgHours < 7 ? "کمتر از 7 ساعته" : "بیشتر از 9 ساعته";
      const q = z.avgQuality != null ? ` و کیفیتش رو ${z.avgQuality} از 5 دادی` : "";
      const clock = z.avgBed && z.avgWake ? ` معمولا حدود ${z.avgBed} می‌خوابیدی و حدود ${z.avgWake} بیدار می‌شدی.` : "";
      return `${few}میانگین خوابت ${z.avgHours} ساعت بود که ${range}${q}.${clock}${tail}`;
    }
    case "fitness": {
      const f = facts.fitness;
      if (!f) break;
      const parts: string[] = [];
      if (f.planned > 0) parts.push(`${f.done} از ${f.planned} جلسه‌ی برنامه رو تمرین کردی`);
      else if (f.extra > 0) parts.push(`${f.extra} جلسه تمرین ثبت کردی`);
      if (f.planned > 0 && f.extra > 0) parts.push(`${f.extra} جلسه‌ی اضافه هم زدی`);
      if (f.partial > 0) parts.push(`${f.partial} جلسه نیمه‌کاره موند`);
      if (f.missed > 0) parts.push(`${f.missed} جلسه جا افتاد`);
      if (!parts.length) break;
      return `${parts.join("، ")}.${tail}`;
    }
    case "nutrition": {
      const n = facts.nutrition;
      if (!n) break;
      const tgt = n.target ? ` (هدفت ${n.target})` : "";
      const on = n.targetDays >= 2 ? `؛ ${n.onTargetDays} از ${n.targetDays} روز داخل ±10% هدف موندی` : "";
      return `میانگین کالریت ${n.avgKcal} بود${tgt}${on}.${tail}`;
    }
    case "trading": {
      const t = facts.trading;
      if (!t || t.count === 0) break;
      const closed = t.wins + t.losses;
      const res = closed > 0 ? `، ${t.wins} برد و ${t.losses} باخت` : "";
      const net = t.net != null && !t.mixedCurrency ? `؛ سود و زیان خالص ${t.net > 0 ? "+" : ""}${t.net}${t.currency ? ` ${t.currency}` : ""}` : "";
      return `${t.count} معامله ثبت کردی${res}${net}. امتیاز این بخش از انضباطت میاد (چک‌لیست، حدضرر، طبق پلن بودن) نه از سود.${tail}`;
    }
    case "tasks": {
      const t = facts.tasks;
      if (!t || t.due === 0) break;
      const od = t.overdue > 0 ? ` و ${t.overdue} کار عقب افتاد` : t.done >= t.due ? " و هیچ کاری عقب نیفتاد" : "";
      return `${t.done} کار از ${t.due} کار سررسیدشده انجام شد${od}.${tail}`;
    }
    case "learning": {
      const steps = stat(d, "مراحل انجام‌شده");
      if (!steps) break;
      const act = stat(d, "فعالیت این هفته");
      return `${steps.replace("/", " از ")} مرحله‌ی رودمپ‌هات انجام شده${act && act !== "ندارد" ? ` و این هفته ${act} روی اون‌ها کار کردی` : ""}.${tail}`;
    }
  }
  return `امتیاز ${L(d.domain)} این هفته ${s} شد.${tail}`;
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
    if (i.delta >= 5) wins.push({ text: `امتیاز کلت از ${i.prevScore} به ${i.score} رسید، ${i.delta} واحد بهتر از هفته‌ی قبل.`, priority: 74, group: "overall" });
    if (i.delta <= -5) bad.push({ text: `امتیاز کلت از ${i.prevScore} به ${i.score} افتاد، ${abs(i.delta)} واحد کمتر از هفته‌ی قبل.`, priority: 79, group: "overall" });
  }
  const streak = longestStreak(ds, 70);
  if (streak >= 3) wins.push({ text: `${streak} روز پشت‌سرهم امتیازت بالای 70 بود.`, priority: 69, group: "streak" });
  if (i.activeDays >= 6) wins.push({ text: `${i.activeDays} روز از 7 روز هفته چیزی ثبت کردی؛ این ثبات خودش یک برده.`, priority: 58, group: "active" });
  if (i.activeDays <= 4 && i.activeDays >= 1 && i.days.every((d) => !d.isFuture)) {
    bad.push({ text: `فقط ${i.activeDays} روز از 7 روز هفته چیزی ثبت کردی؛ روزهای خالی تصویر هفته‌ت رو ناقص می‌کنن.`, priority: 72, group: "active" });
  }
  const scored = i.days.filter((d) => !d.isFuture && d.score != null);
  if (scored.length >= 3) {
    const best = scored.reduce((a, b) => (b.score! > a.score! ? b : a));
    const worst = scored.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (best.score! >= 85) wins.push({ text: `${best.weekday} با امتیاز ${best.score} قوی‌ترین روزت بود.`, priority: 50, group: "bestday" });
    if (worst.score! < 50 && best.score! - worst.score! >= 25) bad.push({ text: `${worst.weekday} با امتیاز ${worst.score} ضعیف‌ترین روز هفته بود؛ ببین اون روز چی فرق داشت.`, priority: 55, group: "worstday" });
  }

  // ── هر دامنه ──
  const r = f.routine;
  if (r && r.total > 0 && r.days >= 3) {
    const p = pctOf(r.done, r.total);
    if (r.perfectDays >= 1) wins.push({ text: `${r.perfectDays} روز تمام برنامه‌های روتینت رو انجام دادی.`, priority: 70 + r.perfectDays, group: "routine" });
    if (p >= 80) wins.push({ text: `${p}% برنامه‌های روتین انجام شد (${r.done} از ${r.total}).`, priority: 75, group: "routine" });
    if (p < 60) bad.push({ text: `فقط ${p}% برنامه‌های روتین انجام شد (${r.done} از ${r.total}).`, priority: 78, group: "routine" });
  }
  const z = f.sleep;
  if (z && z.avgHours != null && z.hourNights >= 3) {
    if (z.avgHours >= 7 && z.avgHours <= 9) wins.push({ text: `میانگین خوابت ${z.avgHours} ساعت بود و ${z.nights7h} شب حداقل 7 ساعت خوابیدی.`, priority: 72, group: "sleep" });
    if (z.avgHours < 6.5) bad.push({ text: `میانگین خوابت ${z.avgHours} ساعت بود، کمتر از 7 ساعتی که بیشتر آدم‌ها بهش نیاز دارن.`, priority: 76, group: "sleep" });
  }
  const ft = f.fitness;
  if (ft) {
    if (ft.planned > 0 && ft.done >= ft.planned) wins.push({ text: `همه‌ی ${ft.planned} جلسه‌ی تمرینت رو انجام دادی.`, priority: 78, group: "fitness" });
    else if (ft.extra > 0) wins.push({ text: `${ft.extra} جلسه بیشتر از برنامه تمرین کردی.`, priority: 60, group: "fitness" });
    if (ft.missed > 0) bad.push({ text: `${ft.missed} جلسه از برنامه‌ی تمرینت جا موند.`, priority: 74, group: "fitness" });
  }
  const nu = f.nutrition;
  if (nu) {
    if (nu.targetDays >= 3 && nu.onTargetDays >= 3) wins.push({ text: `${nu.onTargetDays} روز کالریت داخل ±10% هدفت بود.`, priority: 66, group: "nutrition" });
    if (nu.target) {
      const d = Math.round(((nu.avgKcal - nu.target) / nu.target) * 100);
      if (abs(d) >= 15) bad.push({ text: `میانگین کالریت ${nu.avgKcal} بود، ${abs(d)}% ${d > 0 ? "بالاتر" : "پایین‌تر"} از هدف ${nu.target}.`, priority: 66, group: "nutrition" });
    }
  }
  const tk = f.tasks;
  if (tk && tk.due >= 3) {
    if (tk.overdue === 0) wins.push({ text: `هیچ کاری عقب نیفتاد؛ ${tk.done} از ${tk.due} کار انجام شد.`, priority: 68, group: "tasks" });
    else bad.push({ text: `${tk.overdue} کار از ${tk.due} کار این هفته عقب افتاد.`, priority: 70, group: "tasks" });
  }
  const trd = dom.get("trading");
  if (trd && trd.score != null && f.trading && f.trading.count > 0) {
    if (trd.score >= 80) wins.push({ text: `انضباط معاملاتیت ${trd.score} از 100 شد، با ${f.trading.count} معامله.`, priority: 64, group: "trading" });
    if (trd.score < 60) bad.push({ text: `انضباط معاملاتیت ${trd.score} از 100 بود؛ چک‌لیست، حدضرر و طبق پلن بودن رو جدی‌تر بگیر.`, priority: 71, group: "trading" });
  }

  // ── جهش/افت دامنه‌ها و ضعیف‌ترین دامنه ──
  for (const d of i.domains) {
    if (d.delta != null && d.score != null) {
      if (d.delta >= 10) wins.push({ text: `امتیاز ${L(d.domain)} ${d.delta} واحد بهتر شد (${d.prevScore} به ${d.score}).`, priority: 62, group: `d_${d.domain}` });
      if (d.delta <= -10) bad.push({ text: `امتیاز ${L(d.domain)} ${abs(d.delta)} واحد افت کرد (${d.prevScore} به ${d.score}).`, priority: 68, group: `d_${d.domain}` });
    }
  }
  const comparable = i.domains.filter((d) => d.score != null && d.daysWithData >= 2 && d.domain !== "learning");
  if (comparable.length >= 2) {
    const weakest = comparable.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (weakest.score! < 60) bad.push({ text: `${L(weakest.domain)} با امتیاز ${weakest.score} ضعیف‌ترین بخش هفته بود.`, priority: 80, group: `d_${weakest.domain}` });
  }

  const w = pick(wins, 3);
  if (!w.length && i.score != null && i.activeDays >= 2) w.push(`${i.activeDays} روز از هفته رو ثبت کردی؛ همین ثبت‌کردن پایه‌ی هر پیشرفتیه.`);
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
  if (i.score == null) return `برای هفته‌ی ${i.weekLabel} چیزی ثبت نشده بود، پس هنوز چیزی برای جمع‌بندی نداریم.`;
  const d = i.prevScore != null ? i.score - i.prevScore : null;
  const dTail =
    d == null ? "." : d >= 3 ? `، ${d} امتیاز بالاتر از هفته‌ی قبل.` : d <= -3 ? `، ${abs(d)} امتیاز پایین‌تر از هفته‌ی قبل.` : "، تقریبا هم‌سطح هفته‌ی قبل.";
  const s1 = `هفته‌ی ${i.weekLabel} رو با امتیاز ${i.score} از 100 و نمره‌ی ${i.grade ?? "-"} بستی${dTail}`;

  if (i.activeDays <= 2) {
    return `${s1} فقط ${i.activeDays} روز از هفته چیزی ثبت شده بود، برای همین این عدد تصویر کاملی نیست؛ هرچی بیشتر ثبت کنی هفته‌نامه دقیق‌تر می‌شه.`;
  }

  const comparable = i.domains.filter((x) => x.score != null && x.daysWithData >= 2 && x.domain !== "learning");
  const bestDom = comparable.length >= 2 ? comparable.reduce((a, b) => (b.score! > a.score! ? b : a)) : null;
  let s2 = "";
  if (i.bestDay && bestDom) s2 = ` قوی‌ترین روزت ${i.bestDay.weekday} بود (${i.bestDay.score}) و بهترین بخشت ${L(bestDom.domain)} با امتیاز ${bestDom.score}.`;
  else if (i.bestDay) s2 = ` قوی‌ترین روزت ${i.bestDay.weekday} بود (${i.bestDay.score}).`;
  else if (bestDom) s2 = ` بهترین بخشت ${L(bestDom.domain)} بود با امتیاز ${bestDom.score}.`;

  let s3 = "";
  if (i.rank && i.rank.of >= 4) {
    s3 = i.rank.position === 1
      ? ` این بهترین هفته‌ی ${i.rank.of} هفته‌ی اخیرت بود.`
      : ` بین ${i.rank.of} هفته‌ی اخیرت، این هفته رتبه‌ی ${i.rank.position} رو گرفت.`;
  } else if (comparable.length >= 2) {
    const weak = comparable.reduce((a, b) => (b.score! < a.score! ? b : a));
    if (weak.score! < 70 && weak.domain !== bestDom?.domain) s3 = ` بیشترین جای رشد هم ${L(weak.domain)} بود (${weak.score}).`;
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
      focusTitle: "تمرکز هفته‌ی بعد: ثبت‌کردن",
      focusText: "داده‌ی این هفته برای انتخاب یک بخش خاص کافی نبود. هفته‌ی بعد هر روز فقط یک چیز کوچیک ثبت کن (تیک روتین، خواب یا یک کار)؛ با چند روز ثبت، هفته‌نامه‌ی بعدی خیلی دقیق‌تر می‌شه.",
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
    text = `همه‌ی بخش‌هات بالای 85 بودن و ${label} با ${s} پایین‌ترینشون بود. هدف هفته‌ی بعد اینه که همین سطح رو نگه داری (هدف پیشنهادی: ${target} امتیاز).`;
  } else {
    switch (weak.domain) {
      case "routine": {
        const p = f.routine && f.routine.total > 0 ? pctOf(f.routine.done, f.routine.total) : null;
        text = `${p != null ? `فقط ${p}% برنامه‌هات انجام شد. ` : ""}برنامه‌هایی که مدام جا می‌مونن رو سبک‌تر کن یا به ساعت بهتری ببر؛ برنامه‌ی کم‌تر ولی انجام‌شده از برنامه‌ی زیاد و نیمه‌کاره بهتره.`;
        break;
      }
      case "sleep": {
        const h = f.sleep?.avgHours;
        text = h != null && h < 7
          ? `میانگین خوابت ${h} ساعت بود. هفته‌ی بعد ساعت خوابت رو هر شب 15 دقیقه زودتر کن تا کم‌کم به 7 ساعت برسی.`
          : `خوابت از نظر مدت بد نبود${h != null ? ` (${h} ساعت)` : ""}؛ امتیاز پایین‌تر بیشتر از نظم ساعت بیداری یا کیفیت خواب میاد. ساعت بیداریت رو بین روزها ثابت نگه دار.`;
        break;
      }
      case "fitness": {
        const m = f.fitness?.missed ?? 0;
        text = m > 0
          ? `${m} جلسه از برنامه‌ی تمرینت جا موند. جلسه‌هات رو توی روز و ساعت ثابتی بذار و اگه وقت کم بود، یک جلسه‌ی کوتاه رو هم رد نکن.`
          : `امتیاز تمرینت ${s} شد. جلسه‌های برنامه رو سر وقت و کامل انجام بده، حتی کوتاه.`;
        break;
      }
      case "nutrition": {
        const n = f.nutrition;
        if (n?.target) {
          const d = Math.round(((n.avgKcal - n.target) / n.target) * 100);
          text = abs(d) >= 5
            ? `میانگین کالریت ${n.avgKcal} بود، ${abs(d)}% ${d > 0 ? "بالاتر" : "پایین‌تر"} از هدف ${n.target}. هفته‌ی بعد وعده‌هات رو ثبت کن و ببین کجا از هدف فاصله می‌گیری.`
            : `کالریت نزدیک هدف بود؛ بیشتر ثبت منظم وعده‌ها کم بود. سعی کن هر روز همه‌ی وعده‌هات رو ثبت کنی.`;
        } else text = "برای تغذیه هنوز هدف کالری نداری یا ثبت‌هات پراکنده بود. هفته‌ی بعد هر روز وعده‌هات رو ثبت کن.";
        break;
      }
      case "trading":
        text = `انضباط معاملاتیت ${s} شد. قبل از هر ورود چک‌لیستت رو کامل کن و حدضرر بذار؛ هدف هفته‌ی بعد رو انضباط بذار، نه سود.`;
        break;
      case "tasks": {
        const od = f.tasks?.overdue ?? 0;
        text = od > 0
          ? `${od} کار عقب افتاد. کارهای بزرگ رو به تکه‌های کوچیک تقسیم کن و برای هرکدوم سررسید واقع‌بینانه بذار.`
          : `امتیاز کارهات ${s} شد. هر صبح سه کار مهم اون روز رو مشخص کن و اول اون‌ها رو تموم کن.`;
        break;
      }
      case "learning":
        text = `رودمپ‌هات الان ${s}% جلو رفته. هفته‌ی بعد یک مرحله‌ی کوچیک رو انتخاب کن و تا آخر هفته تمومش کن.`;
        break;
    }
  }
  if (s < 85) text += ` هدف پیشنهادی برات: ${target} امتیاز در ${label}.`;
  return { focusDomain: weak.domain, focusTitle: `تمرکز هفته‌ی بعد: ${label}`, focusText: text, suggestedTarget: target };
}
