import { prisma } from "@/lib/prisma";
import { countRowProgress } from "@/lib/roadmapPlan";
import type { AnalysisDomain, DomainResult } from "./types";
import { clamp, mean } from "./score";
import { addDaysIso, isoToUtcDate, isoWeekday, localIso, localMinuteOfDay, utcIso } from "./week";
import { FA_WEEKDAY } from "@/lib/jalali";

// محاسبه‌ی امتیازِ هر دامنه از داده‌ی واقعی.
//
// الگو برای همه یکیه: loadX یک‌بار (یک کوئری، فقط فیلدهای لازم) کلِ بازه‌ی
// چندهفته‌ای رو می‌کشه، و xWeeks (تابعِ خالص) اون ردیف‌ها رو روی هر هفته
// bucket می‌کنه. یعنی ۸ هفته‌ی ترند = همون یک کوئری، نه ۸×۷ تا.
//
// قانونِ مشترک: «داده نداریم» ≠ «صفر». روزِ آینده همیشه null، و امروز فقط
// وقتی امتیاز می‌گیره که چیزی واقعا ثبت شده باشه (نصفِ روز نباید صفر حساب بشه).

export type WeekSpec = { weekStartIso: string; days: string[] }; // days: ۷ ISO، شنبه..جمعه
export type DomainEnv = { timezone: string; todayIso: string };
export type DomainBase = Omit<DomainResult, "prevScore" | "delta">;
// اعدادِ خامِ هر دامنه برای achievements — توی خروجیِ API نمی‌ره.
export type DomainMeta = Record<string, number>;
export type DomainWeek = { result: DomainBase; meta: DomainMeta };

type DayState = "past" | "today" | "future";
function dayState(iso: string, env: DomainEnv): DayState {
  return iso < env.todayIso ? "past" : iso === env.todayIso ? "today" : "future";
}

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

function spanOf(weeks: WeekSpec[]) {
  const startIso = weeks[0].weekStartIso;
  const endIso = weeks[weeks.length - 1].days[6];
  return {
    startIso,
    endIso,
    start: isoToUtcDate(startIso),
    end: isoToUtcDate(endIso),
    // برای ستون‌های timestamp (نه @db.Date): یک روز حاشیه از هر طرف، چون
    // «روزِ محلی» تا ±۱۴ ساعت با روزِ UTC فرق داره؛ بعدا با localIso فیلتر می‌شه.
    tsFrom: isoToUtcDate(addDaysIso(startIso, -1)),
    tsTo: isoToUtcDate(addDaysIso(endIso, 2)),
  };
}

function finalize(
  domain: AnalysisDomain,
  daily: (number | null)[],
  stats: DomainBase["stats"],
  meta: DomainMeta,
  override?: { score: number | null; hasData?: boolean; daysWithData?: number }
): DomainWeek {
  const vals = daily.filter((v): v is number => v != null);
  const daysWithData = override?.daysWithData ?? vals.length;
  const score = override ? override.score : vals.length ? r0(mean(vals)!) : null;
  const hasData = override?.hasData ?? score != null;
  return {
    result: {
      domain,
      active: true,
      hasData,
      score: hasData ? score : null,
      daysWithData,
      daily: daily.map((v) => (v == null ? null : r0(clamp(v)))),
      stats,
    },
    meta,
  };
}

function groupBy<T>(rows: T[], key: (r: T) => string | null): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k == null) continue;
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
}

// ════════════════════════════════════════════════════════════════════
// روتین — DailyEntry.completedItems کلِ چک‌لیستِ همون روز رو با true/false
// نگه می‌داره؛ درصدِ روز = تیک‌خورده ÷ کل.
// ════════════════════════════════════════════════════════════════════
export type RoutineRow = { date: Date; completedItems: unknown };

export function routineWeeks(rows: RoutineRow[], weeks: WeekSpec[], env: DomainEnv): DomainWeek[] {
  const byDate = new Map(rows.map((r) => [utcIso(r.date), r.completedItems]));
  return weeks.map((w) => {
    let perfectDays = 0;
    const daily = w.days.map((iso) => {
      const st = dayState(iso, env);
      if (st === "future") return null;
      const items = byDate.get(iso);
      if (!items || typeof items !== "object" || Array.isArray(items)) return null;
      const vals = Object.values(items as Record<string, unknown>);
      if (!vals.length) return null;
      const done = vals.filter((v) => v === true).length;
      // امروز با صفر تیک هنوز «شروع‌نشده»ست، نه «صفر»
      if (st === "today" && done === 0) return null;
      const pct = (done / vals.length) * 100;
      if (pct >= 100) perfectDays++;
      return pct;
    });
    const vals = daily.filter((v): v is number => v != null);
    const avg = mean(vals);
    return finalize(
      "routine",
      daily,
      [
        { label: "میانگین انجام", value: avg == null ? "-" : `${r0(avg)}%`, tone: avg == null ? "neutral" : avg >= 70 ? "good" : avg < 40 ? "bad" : "neutral" },
        { label: "روزهای کامل", value: `${perfectDays}`, tone: perfectDays > 0 ? "good" : "neutral" },
        { label: "روزهای ثبت‌شده", value: `${vals.length}/7` },
      ],
      { perfectDays, maxDay: vals.length ? Math.max(...vals) : 0 }
    );
  });
}

async function loadRoutine(userId: string, weeks: WeekSpec[]) {
  const s = spanOf(weeks);
  return prisma.dailyEntry.findMany({
    where: { userId, date: { gte: s.start, lte: s.end } },
    select: { date: true, completedItems: true },
  });
}

// ════════════════════════════════════════════════════════════════════
// خواب — سه جزء: نزدیکیِ مدت به هدف (یا ۷ تا ۹ ساعت)، نظمِ ساعتِ بیداری
// (نسبت به هدف، یا میانه‌ی همون هفته)، و کیفیتِ خودارزیابی. هر جزئی که
// نبود، وزنش بین بقیه پخش می‌شه.
// ════════════════════════════════════════════════════════════════════
export type SleepRow = {
  date: Date;
  sleptAt: Date | null;
  wokeAt: Date | null;
  targetSleptAt: Date | null;
  targetWokeAt: Date | null;
  quality: number | null;
};

function circDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

/** امتیازِ مدتِ خواب: داخلِ بازه/±نیم‌ساعتِ هدف 100، هر ساعت فاصله ۳۵ امتیاز کم. */
export function sleepDurationScore(hours: number, targetHours: number | null): number {
  const dist = targetHours
    ? Math.max(0, Math.abs(hours - targetHours) - 0.5)
    : hours < 7 ? 7 - hours : hours > 9 ? hours - 9 : 0;
  return clamp(100 - dist * 35);
}

export function sleepWeeks(rows: SleepRow[], weeks: WeekSpec[], env: DomainEnv): DomainWeek[] {
  const tz = env.timezone;
  const byDate = new Map(rows.map((r) => [utcIso(r.date), r]));
  return weeks.map((w) => {
    const entries = w.days.map((iso) => (dayState(iso, env) === "future" ? undefined : byDate.get(iso)));
    const wakeMins = entries.filter((e) => e?.wokeAt).map((e) => localMinuteOfDay(tz, e!.wokeAt!));
    const sorted = [...wakeMins].sort((a, b) => a - b);
    const medianWake = sorted.length >= 2 ? sorted[Math.floor(sorted.length / 2)] : null;

    const hoursList: number[] = [];
    const qualities: number[] = [];
    const wakeDevs: number[] = [];
    let days7h = 0;

    const daily = entries.map((e) => {
      if (!e) return null;
      const parts: { v: number; w: number }[] = [];
      if (e.sleptAt && e.wokeAt) {
        const h = (e.wokeAt.getTime() - e.sleptAt.getTime()) / 3_600_000;
        if (h > 0 && h <= 16) {
          let target: number | null = null;
          if (e.targetSleptAt && e.targetWokeAt) {
            const t = ((localMinuteOfDay(tz, e.targetWokeAt) - localMinuteOfDay(tz, e.targetSleptAt) + 1440) % 1440) / 60;
            if (t >= 3 && t <= 14) target = t;
          }
          parts.push({ v: sleepDurationScore(h, target), w: 0.5 });
          hoursList.push(h);
          if (h >= 7) days7h++;
        }
      }
      if (e.wokeAt) {
        const ref = e.targetWokeAt ? localMinuteOfDay(tz, e.targetWokeAt) : medianWake;
        if (ref != null) {
          const dev = circDiff(localMinuteOfDay(tz, e.wokeAt), ref);
          wakeDevs.push(dev);
          // ۶۰ دقیقه انحراف → 50، دو ساعت → 0
          parts.push({ v: clamp(100 - dev * (50 / 60)), w: 0.25 });
        }
      }
      if (e.quality != null && e.quality >= 1 && e.quality <= 5) {
        qualities.push(e.quality);
        parts.push({ v: ((e.quality - 1) / 4) * 100, w: 0.25 });
      }
      if (!parts.length) return null;
      const tw = parts.reduce((a, p) => a + p.w, 0);
      return parts.reduce((a, p) => a + p.v * p.w, 0) / tw;
    });

    const avgH = mean(hoursList);
    const avgQ = mean(qualities);
    const avgDev = mean(wakeDevs);
    const stats: DomainBase["stats"] = [
      { label: "میانگین خواب", value: avgH == null ? "-" : `${r1(avgH)} ساعت`, tone: avgH == null ? "neutral" : avgH >= 7 && avgH <= 9 ? "good" : avgH < 6 ? "bad" : "neutral" },
      { label: "کیفیت خواب", value: avgQ == null ? "-" : `${r1(avgQ)} از 5`, tone: avgQ == null ? "neutral" : avgQ >= 4 ? "good" : avgQ < 2.5 ? "bad" : "neutral" },
      { label: "نظم بیداری", value: avgDev == null ? "-" : `±${r0(avgDev)} دقیقه`, tone: avgDev == null ? "neutral" : avgDev <= 30 ? "good" : avgDev > 75 ? "bad" : "neutral" },
    ];
    return finalize("sleep", daily, stats, { days7h, avgHours: avgH ?? 0 });
  });
}

async function loadSleep(userId: string, weeks: WeekSpec[]) {
  const s = spanOf(weeks);
  return prisma.sleepEntry.findMany({
    where: { userId, date: { gte: s.start, lte: s.end } },
    select: { date: true, sleptAt: true, wokeAt: true, targetSleptAt: true, targetWokeAt: true, quality: true },
  });
}

// ════════════════════════════════════════════════════════════════════
// کارها — درصدِ کارهای سررسیدِ هر روز که انجام شدن. انجامِ دیرتر از
// سررسید نصف امتیاز داره. امروز فقط وقتی امتیاز داره که حداقل یکی انجام شده.
// ════════════════════════════════════════════════════════════════════
export type TaskRow = { dueDate: Date | null; completedAt: Date | null };

export function tasksWeeks(rows: TaskRow[], weeks: WeekSpec[], env: DomainEnv): DomainWeek[] {
  const tz = env.timezone;
  const withLocal = rows.map((r) => ({
    due: r.dueDate ? localIso(tz, r.dueDate) : null,
    done: r.completedAt ? localIso(tz, r.completedAt) : null,
  }));
  const byDue = groupBy(withLocal, (r) => r.due);
  return weeks.map((w) => {
    const first = w.days[0];
    const last = w.days[6];
    let overdue = 0;
    let dueCount = 0;
    let onTime = 0;
    const daily = w.days.map((iso) => {
      const st = dayState(iso, env);
      const due = byDue.get(iso) ?? [];
      if (st === "future" || !due.length) return null;
      let credit = 0;
      let doneN = 0;
      for (const t of due) {
        if (t.done) {
          doneN++;
          if (t.done <= iso) { credit += 1; onTime++; } else credit += 0.5;
        } else if (st === "past") overdue++;
      }
      if (st === "today" && doneN === 0) return null;
      dueCount += due.length;
      return (credit / due.length) * 100;
    });
    const completed = withLocal.filter((t) => t.done && t.done >= first && t.done <= last).length;
    const onTimePct = dueCount ? r0((onTime / dueCount) * 100) : null;
    return finalize(
      "tasks",
      daily,
      [
        { label: "انجام‌شده", value: `${completed}`, tone: completed > 0 ? "good" : "neutral" },
        { label: "عقب‌افتاده", value: `${overdue}`, tone: overdue > 0 ? "bad" : "good" },
        { label: "به‌موقع", value: onTimePct == null ? "-" : `${onTimePct}%`, tone: onTimePct == null ? "neutral" : onTimePct >= 80 ? "good" : onTimePct < 50 ? "bad" : "neutral" },
      ],
      { completed, overdue, dueCount }
    );
  });
}

async function loadTasks(userId: string, weeks: WeekSpec[]) {
  const s = spanOf(weeks);
  return prisma.task.findMany({
    where: {
      userId,
      OR: [{ dueDate: { gte: s.tsFrom, lt: s.tsTo } }, { completedAt: { gte: s.tsFrom, lt: s.tsTo } }],
    },
    select: { dueDate: true, completedAt: true },
  });
}

// ════════════════════════════════════════════════════════════════════
// بدنسازی — ExerciseLog در برابر روزهای باشگاهِ پلن (gymDays = نام فارسیِ
// روزها). چون پلن‌ها تاریخچه‌ی «کِی غیرفعال شدم» ندارن، برای هر روز
// آخرین پلنی که تا اون روز شروع شده و (فعاله یا بعد از اون روز آپدیت شده)
// ملاکه — تقریبی ولی برای هفته‌های قبلی هم معنا داره.
// روزِ باشگاهِ گذشته بدون لاگ = 0، ولی فقط اگه کاربر توی این بازه اصلا
// لاگی ثبت کرده باشه (وگرنه پلنِ فراموش‌شده کل هفته رو صفر می‌کرد).
// ════════════════════════════════════════════════════════════════════
export type ExerciseLogRow = { date: Date; completed: boolean; completedItems: unknown };
export type ExercisePlanRow = { startDate: Date; updatedAt: Date; isActive: boolean; gymDays: unknown };

const normFa = (s: string) => s.replace(/[‌\s]/g, "").replace(/ي/g, "ی");
const FA_WEEKDAY_NORM = FA_WEEKDAY.map(normFa);

export function fitnessWeeks(
  data: { logs: ExerciseLogRow[]; plans: ExercisePlanRow[] },
  weeks: WeekSpec[],
  env: DomainEnv
): DomainWeek[] {
  const tz = env.timezone;
  const byDate = groupBy(data.logs, (l) => utcIso(l.date));
  const engaged = data.logs.length > 0;
  const plans = data.plans
    .map((p) => ({
      start: localIso(tz, p.startDate),
      until: p.isActive ? null : localIso(tz, p.updatedAt),
      days: new Set(
        (Array.isArray(p.gymDays) ? p.gymDays : []).filter((x): x is string => typeof x === "string").map(normFa)
      ),
    }))
    .sort((a, b) => (a.start < b.start ? 1 : -1)); // جدیدترین اول

  const isPlanned = (iso: string) => {
    const p = plans.find((pl) => pl.start <= iso && (pl.until == null || pl.until >= iso));
    return !!p && p.days.has(FA_WEEKDAY_NORM[isoWeekday(iso)]);
  };

  return weeks.map((w) => {
    let planned = 0;
    let done = 0;
    let extra = 0;
    let hasLog = false;
    const daily = w.days.map((iso): number | null => {
      const st = dayState(iso, env);
      const planDay = isPlanned(iso);
      if (planDay) planned++;
      if (st === "future") return null;
      const logs = byDate.get(iso) ?? [];
      if (logs.length) hasLog = true;
      const completed = logs.some((l) => l.completed);
      const partial = logs.some((l) => Array.isArray(l.completedItems) && l.completedItems.length > 0);
      if (completed) {
        if (planDay) done++;
        else extra++;
        return 100;
      }
      if (partial) return 50;
      if (planDay && st === "past" && engaged) return 0;
      return null;
    });
    const hasData = hasLog || (engaged && daily.some((v) => v != null));
    const vals = daily.filter((v): v is number => v != null);
    return finalize(
      "fitness",
      daily,
      [
        { label: "جلسات", value: planned ? `${done}/${planned}` : `${done + extra}`, tone: planned && done >= planned ? "good" : "neutral" },
        { label: "جلسه‌ی اضافه", value: `${extra}`, tone: extra > 0 ? "good" : "neutral" },
      ],
      { planned, done, extra },
      { score: hasData && vals.length ? r0(mean(vals)!) : null, hasData: hasData && vals.length > 0 }
    );
  });
}

async function loadFitness(userId: string, weeks: WeekSpec[]) {
  const s = spanOf(weeks);
  const [logs, plans] = await Promise.all([
    prisma.exerciseLog.findMany({
      where: { userId, date: { gte: s.start, lte: s.end } },
      select: { date: true, completed: true, completedItems: true },
    }),
    prisma.exercisePlan.findMany({
      where: { userId, startDate: { lt: s.tsTo } },
      select: { startDate: true, updatedAt: true, isActive: true, gymDays: true },
    }),
  ]);
  return { logs, plans };
}

// ════════════════════════════════════════════════════════════════════
// تغذیه — کالریِ روز در برابر هدفِ همون روز (CalorieTarget.effectiveFrom).
// ±۵٪ = 100، بعدش هر ۱٪ فاصله ۲ امتیاز. امروز حساب نمی‌شه چون روز تموم
// نشده و کالریِ نصفه‌ی روز همیشه «زیرِ هدف» دیده می‌شد. بدون هدف، امتیاز =
// نسبتِ روزهای ثبت‌شده (فقط نظمِ ثبت قابل‌قضاوته).
// ════════════════════════════════════════════════════════════════════
export type FoodRow = {
  date: Date;
  grams: number;
  customCalories: number | null;
  proteinG: number | null;
  foodItem: { caloriesPer100g: number; proteinPer100g: number | null } | null;
};
export type CalorieTargetRow = { effectiveFrom: Date; dailyTargetKcal: number };

export function nutritionDayScore(kcal: number, target: number): number {
  const diff = Math.abs(kcal - target) / target;
  return clamp(100 - Math.max(0, diff - 0.05) * 200);
}

export function nutritionWeeks(
  data: { logs: FoodRow[]; targets: CalorieTargetRow[] },
  weeks: WeekSpec[],
  env: DomainEnv
): DomainWeek[] {
  const tz = env.timezone;
  const kcalBy = new Map<string, number>();
  const protBy = new Map<string, number>();
  for (const l of data.logs) {
    const iso = utcIso(l.date);
    const kcal = l.customCalories ?? (l.foodItem ? (l.foodItem.caloriesPer100g * l.grams) / 100 : 0);
    kcalBy.set(iso, (kcalBy.get(iso) ?? 0) + kcal);
    const p = l.proteinG ?? (l.foodItem?.proteinPer100g != null ? (l.foodItem.proteinPer100g * l.grams) / 100 : null);
    if (p != null) protBy.set(iso, (protBy.get(iso) ?? 0) + p);
  }
  const targets = data.targets
    .map((t) => ({ from: localIso(tz, t.effectiveFrom), kcal: t.dailyTargetKcal }))
    .filter((t) => t.kcal > 0)
    .sort((a, b) => (a.from < b.from ? -1 : 1));
  // روزهای قبل از اولین هدف هم با اولین هدف سنجیده می‌شن — کاربری که
  // بعدا هدف گذاشته، ثبت‌های قبلی‌ش نباید بی‌امتیاز بمونن.
  const targetFor = (iso: string) => {
    let t = targets[0]?.kcal ?? null;
    for (const x of targets) if (x.from <= iso) t = x.kcal;
    return t;
  };

  return weeks.map((w) => {
    const kcals: number[] = [];
    const prots: number[] = [];
    let onTargetDays = 0;
    let elapsed = 0;
    let target: number | null = null;
    const daily = w.days.map((iso) => {
      if (dayState(iso, env) !== "past") return null;
      elapsed++;
      const kcal = kcalBy.get(iso);
      if (kcal == null) return null;
      kcals.push(kcal);
      const p = protBy.get(iso);
      if (p != null) prots.push(p);
      const t = targetFor(iso);
      target = t ?? target;
      if (!t) return null;
      const s = nutritionDayScore(kcal, t);
      if (s >= 90) onTargetDays++;
      return s;
    });
    const avgK = mean(kcals);
    const avgP = mean(prots);
    const stats: DomainBase["stats"] = [
      { label: "میانگین کالری", value: avgK == null ? "-" : `${r0(avgK)} kcal` },
      { label: "هدف روزانه", value: target ? `${target} kcal` : "تعیین نشده", tone: target ? "neutral" : "bad" },
      { label: "روزهای ثبت", value: `${kcals.length}/${Math.max(elapsed, 1)}`, tone: kcals.length >= Math.max(1, elapsed - 1) ? "good" : "neutral" },
    ];
    if (avgP != null) stats.push({ label: "میانگین پروتئین", value: `${r0(avgP)} گرم` });
    const meta = { onTargetDays, loggedDays: kcals.length };
    if (!targets.length && kcals.length) {
      return finalize("nutrition", daily, stats, meta, {
        score: r0((kcals.length / Math.max(elapsed, 1)) * 100),
        hasData: true,
        daysWithData: kcals.length,
      });
    }
    return finalize("nutrition", daily, stats, meta);
  });
}

async function loadNutrition(userId: string, weeks: WeekSpec[]) {
  const s = spanOf(weeks);
  const [logs, targets] = await Promise.all([
    prisma.foodLogEntry.findMany({
      where: { userId, date: { gte: s.start, lte: s.end } },
      select: {
        date: true, grams: true, customCalories: true, proteinG: true,
        foodItem: { select: { caloriesPer100g: true, proteinPer100g: true } },
      },
    }),
    prisma.calorieTarget.findMany({
      where: { userId, effectiveFrom: { lt: s.tsTo } },
      select: { effectiveFrom: true, dailyTargetKcal: true },
    }),
  ]);
  return { logs, targets };
}

// ════════════════════════════════════════════════════════════════════
// ترید — امتیاز از *انضباط* ساخته می‌شه، نه سود: پایبندی به چک‌لیست
// (اسنپ‌شاتِ لحظه‌ی ثبت)، «طبق پلن»، ورودِ غیرهیجانی (FOMO/انتقام)، حدضرر،
// و حالِ روحیِ قبل از ورود. معامله‌ی CANCELED یعنی ستاپ باطل شد و وارد
// نشدی — خودش انضباطه (100). حساب‌های آرشیوشده از آمار بیرون‌ان.
// ════════════════════════════════════════════════════════════════════
export type TradeRow = {
  openedAt: Date;
  status: "OPEN" | "CLOSED" | "CANCELED";
  result: "PROFIT" | "LOSS" | "BREAKEVEN";
  pnl: number;
  symbol: string;
  checklistDone: number | null;
  checklistTotal: number | null;
  followedPlan: boolean | null;
  stopLoss: number | null;
  entryReasons: string[];
  exitReasons: string[];
  emotionBefore: string | null;
  account: { currency: string };
};

const EMOTION_SCORE: Record<string, number> = { CALM: 100, NEUTRAL: 100, EXCITED: 65, ANXIOUS: 65, ANGRY: 25, OVERCONFIDENT: 30 };

export function tradeDisciplineScore(t: TradeRow): number {
  if (t.status === "CANCELED") return 100;
  const parts: { v: number; w: number }[] = [];
  if (t.checklistTotal && t.checklistTotal > 0) {
    parts.push({ v: clamp(((t.checklistDone ?? 0) / t.checklistTotal) * 100), w: 0.35 });
  }
  if (t.followedPlan != null) parts.push({ v: t.followedPlan ? 100 : 0, w: 0.25 });
  if (t.entryReasons.length) {
    const impulsive = t.entryReasons.some((r) => r === "FOMO" || r === "REVENGE");
    parts.push({ v: impulsive ? 0 : 100, w: 0.15 });
  }
  parts.push({ v: t.stopLoss != null ? 100 : 30, w: 0.15 });
  let emo = t.emotionBefore ? EMOTION_SCORE[t.emotionBefore] ?? 100 : null;
  if (t.exitReasons.includes("EMOTIONAL")) emo = Math.min(emo ?? 100, 30);
  if (emo != null) parts.push({ v: emo, w: 0.1 });
  const tw = parts.reduce((a, p) => a + p.w, 0);
  return parts.reduce((a, p) => a + p.v * p.w, 0) / tw;
}

export function tradingWeeks(rows: TradeRow[], weeks: WeekSpec[], env: DomainEnv): DomainWeek[] {
  const tz = env.timezone;
  const byDay = groupBy(rows, (t) => localIso(tz, t.openedAt));
  return weeks.map((w) => {
    const weekTrades: TradeRow[] = [];
    const daily = w.days.map((iso) => {
      if (dayState(iso, env) === "future") return null;
      const trades = byDay.get(iso) ?? [];
      if (!trades.length) return null;
      weekTrades.push(...trades);
      const avg = mean(trades.map(tradeDisciplineScore))!;
      // اورترید: بیشتر از ۵ معامله‌ی واقعی در یک روز، هرکدوم ۵ امتیاز کم
      const real = trades.filter((t) => t.status !== "CANCELED").length;
      return avg - Math.max(0, real - 5) * 5;
    });

    const real = weekTrades.filter((t) => t.status !== "CANCELED");
    const closed = real.filter((t) => t.status === "CLOSED");
    const wins = closed.filter((t) => t.result === "PROFIT").length;
    const losses = closed.filter((t) => t.result === "LOSS").length;
    const winRate = wins + losses ? r0((wins / (wins + losses)) * 100) : null;
    const net = closed.reduce((a, t) => a + t.pnl, 0);
    const currencies = new Set(closed.map((t) => t.account.currency));
    const bySymbol = new Map<string, number>();
    for (const t of closed) bySymbol.set(t.symbol, (bySymbol.get(t.symbol) ?? 0) + t.pnl);
    let best: string | null = null;
    let bestPnl = 0;
    for (const [s, p] of bySymbol) if (p > bestPnl) { best = s; bestPnl = p; }
    const withChecklist = real.filter((t) => t.checklistTotal && t.checklistTotal > 0);
    const fullChecklist = withChecklist.filter((t) => (t.checklistDone ?? 0) >= (t.checklistTotal ?? 0)).length;
    const adherence = withChecklist.length
      ? r0(mean(withChecklist.map((t) => ((t.checklistDone ?? 0) / t.checklistTotal!) * 100))!)
      : null;
    // ارزها اگه قاطی باشن جمعِ عددی بی‌معناست، ولی بی‌واحد نشونش می‌دیم
    const cur = currencies.size === 1 ? ` ${[...currencies][0]}` : "";

    const stats: DomainBase["stats"] = [
      { label: "معاملات", value: `${real.length}` },
      { label: "نرخ برد", value: winRate == null ? "-" : `${winRate}%`, tone: winRate == null ? "neutral" : winRate >= 50 ? "good" : "bad" },
      { label: "سود/زیان خالص", value: closed.length ? `${net > 0 ? "+" : ""}${Math.round(net * 100) / 100}${cur}` : "-", tone: !closed.length ? "neutral" : net > 0 ? "good" : net < 0 ? "bad" : "neutral" },
      { label: "پایبندی به چک‌لیست", value: adherence == null ? "-" : `${adherence}%`, tone: adherence == null ? "neutral" : adherence >= 80 ? "good" : adherence < 50 ? "bad" : "neutral" },
    ];
    if (best) stats.push({ label: "بهترین نماد", value: best, tone: "good" });
    return finalize("trading", daily, stats, {
      trades: real.length,
      withChecklist: withChecklist.length,
      fullChecklist,
      winRate: winRate ?? -1,
    });
  });
}

async function loadTrading(userId: string, weeks: WeekSpec[]): Promise<TradeRow[]> {
  const s = spanOf(weeks);
  const rows = await prisma.tradeEntry.findMany({
    where: { userId, openedAt: { gte: s.tsFrom, lt: s.tsTo }, account: { archived: false } },
    select: {
      openedAt: true, status: true, result: true, pnl: true, symbol: true,
      checklistDone: true, checklistTotal: true, followedPlan: true, stopLoss: true,
      entryReasons: true, exitReasons: true, emotionBefore: true,
      account: { select: { currency: true } },
    },
  });
  return rows as TradeRow[];
}

// ════════════════════════════════════════════════════════════════════
// یادگیری — Roadmap.progress فقط وضعیتِ *فعلیِ* تیک‌ها رو داره، نه تاریخِ
// تیک‌خوردن. پس امتیاز = درصدِ پیشرفتِ کلِ رودمپ‌هایی که تا آخرِ اون هفته
// ساخته شده بودن (برای هفته‌های قبل هم همین عددِ فعلی — صادقانه تقریبیه)،
// daily همه null (تا امتیازِ روزها رو آلوده نکنه) و daysWithData = روزهایی
// از هفته که رودمپی آپدیت شده (فقط آخرین آپدیتِ هر رودمپ معلومه).
// ════════════════════════════════════════════════════════════════════
export type RoadmapRow = { createdAt: Date; updatedAt: Date; steps: unknown; progress: unknown };

export function learningWeeks(rows: RoadmapRow[], weeks: WeekSpec[], env: DomainEnv): DomainWeek[] {
  const tz = env.timezone;
  const rms = rows.map((r) => ({
    created: localIso(tz, r.createdAt),
    updated: localIso(tz, r.updatedAt),
    ...countRowProgress(r.steps, r.progress),
  }));
  return weeks.map((w) => {
    const last = w.days[6];
    const existing = rms.filter((r) => r.created <= last && r.total > 0);
    const total = existing.reduce((a, r) => a + r.total, 0);
    const done = existing.reduce((a, r) => a + r.done, 0);
    const activeDays = new Set(existing.map((r) => r.updated).filter((d) => d >= w.days[0] && d <= last)).size;
    const daily = Array<number | null>(7).fill(null);
    const stats: DomainBase["stats"] = [
      { label: "رودمپ‌ها", value: `${existing.length}` },
      { label: "مراحل انجام‌شده", value: `${done}/${total}` },
      { label: "فعالیت این هفته", value: activeDays ? `${activeDays} روز` : "ندارد", tone: activeDays ? "good" : "neutral" },
    ];
    return finalize("learning", daily, stats, { activeDays, done, total }, {
      score: total ? r0((done / total) * 100) : null,
      hasData: total > 0,
      daysWithData: activeDays,
    });
  });
}

async function loadLearning(userId: string, weeks: WeekSpec[]) {
  const s = spanOf(weeks);
  return prisma.roadmap.findMany({
    where: { userId, createdAt: { lt: s.tsTo } },
    select: { createdAt: true, updatedAt: true, steps: true, progress: true },
  });
}

// ════════════════════════════════════════════════════════════════════
// ورودیِ واحد: یک دامنه، چند هفته، یک‌بار کوئری.
// ════════════════════════════════════════════════════════════════════
export async function computeDomainWeeks(
  domain: AnalysisDomain,
  userId: string,
  weeks: WeekSpec[],
  env: DomainEnv
): Promise<DomainWeek[]> {
  switch (domain) {
    case "routine":
      return routineWeeks(await loadRoutine(userId, weeks), weeks, env);
    case "sleep":
      return sleepWeeks(await loadSleep(userId, weeks), weeks, env);
    case "tasks":
      return tasksWeeks(await loadTasks(userId, weeks), weeks, env);
    case "fitness":
      return fitnessWeeks(await loadFitness(userId, weeks), weeks, env);
    case "nutrition":
      return nutritionWeeks(await loadNutrition(userId, weeks), weeks, env);
    case "trading":
      return tradingWeeks(await loadTrading(userId, weeks), weeks, env);
    case "learning":
      return learningWeeks(await loadLearning(userId, weeks), weeks, env);
  }
}

