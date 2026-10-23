// «هفته‌ی تمرین و تغذیه» — محاسبه‌ی خالص و تست‌پذیر مخصوص بخش ورزش در آنالیز
// هفتگی. هیچ import سروری (پریزما/کاتالوگ) نداره تا در باندل کلاینت هم امن باشه؛
// ورودی‌ها (وضعیت روزها، لاگ جلسه‌ها، ردیف‌های غذا، هدف‌ها و تابع نگاشت
// حرکت به عضله) رو لایه‌ی سرور (fitWeekServer.ts) می‌سازه.
//
// قانون صداقت: ستون ست/تکرار/وزنه در دیتابیس نیست، پس هیچ حجم تمرین یا رکوردی
// ساخته نمی‌شه؛ فقط چیزی که ثبت شده (حرکت‌های تیک‌خورده، جلسه، غذا) شمرده می‌شه.
// حرکت‌هایی که اسمشون در کاتالوگ پیدا نشه در آمار عضله نادیده گرفته می‌شن.
import { stripSetSuffix } from "@/lib/exerciseSets";

/** عضله‌های قابل نمایش (همون کلیدهای تقسیم هفتگی lib/exerciseSplit.ts) */
export const FIT_MUSCLES = [
  "chest", "back", "shoulders", "biceps", "triceps", "quads",
  "hamstrings", "glutes", "calves", "abs", "forearms", "traps",
] as const;
export type FitMuscle = (typeof FIT_MUSCLES)[number];

export type FitStatus = "done" | "extra" | "rest" | "missed" | "partial";
export type FitGoal = "cut" | "gain" | "maintain";
export type FitMealKey = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type FitBalanceVerdict = "aligned" | "over" | "under";

/** کیلوکالری معادل یک کیلوگرم تغییر وزن — فقط برای برآورد (نه اندازه‌گیری) */
export const KCAL_PER_KG = 7700;

// ───────────────────────── ورودی ─────────────────────────

export type FitDayInput = {
  date: string; // YYYY-MM-DD محلی
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  status?: FitStatus;
  nutrition?: { kcal: number; target: number | null; protein: number | null; carbs?: number | null; fat?: number | null };
  sleepHours?: number | null;
};

export type FitPrevDay = { status?: FitStatus; nutrition?: { kcal: number; target: number | null; protein: number | null } };

/** یک جلسه‌ی ثبت‌شده (ExerciseLog) */
export type FitSessionRow = { date: string; completed: boolean; items: string[]; startMin: number | null };

/** یک ردیف غذای ثبت‌شده، کالری و درشت‌مغذی‌ها از قبل محاسبه‌شده (null = ثبت نشده) */
export type FitFoodRow = { date: string; mealType: string | null; kcal: number; protein: number | null; carbs: number | null; fat: number | null };

export type FitTargets = {
  goal: FitGoal | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type FitWeekInput = {
  days: FitDayInput[]; // 7 تا، شنبه تا جمعه
  prevDays: FitPrevDay[] | null; // 7 تا یا null
  sessions: FitSessionRow[];
  /** تاریخ → اسم حرکت‌های برنامه‌ی اون روز (فقط روزهای باشگاه) */
  plannedByDate: Record<string, string[]>;
  food: FitFoodRow[];
  targets: FitTargets;
  /** اسم حرکت → عضله‌ی اصلی (یا []) — تابع تزریقی چون کاتالوگ فقط سمت سرور لود می‌شه */
  muscleOf: (name: string) => FitMuscle[];
  hasFitness: boolean;
  hasNutrition: boolean;
};

// ───────────────────────── خروجی ─────────────────────────

export type FitTrainingDay = {
  date: string;
  weekday: string;
  status: FitStatus | "future" | "none";
  /** حرکت‌های تیک‌خورده / حرکت‌های برنامه‌ی اون روز (null = نامشخص) */
  exDone: number | null;
  exPlanned: number | null;
};

export type FitTraining = {
  sessions: { done: number; planned: number; extra: number; partial: number; missed: number; rest: number };
  prevSessions: { done: number; planned: number; extra: number } | null;
  adherence: number | null; // 0..100
  prevAdherence: number | null;
  days: FitTrainingDay[];
  exercises: { done: number; planned: number; pct: number | null };
  top: { name: string; count: number }[]; // حداکثر 5، بیشترین تکرار اول
  muscles: { key: FitMuscle; count: number; planned: number }[];
  skipped: FitMuscle[]; // در برنامه بود ولی هیچ حرکتی ازش انجام نشد
  longestStreak: number; // جلسه‌ی پیاپی (استراحت زنجیره رو نمی‌شکنه)
  start: { morning: number; afternoon: number; evening: number; avgMin: number | null } | null;
};

export type FitFuelDay = {
  date: string;
  weekday: string;
  kcal: number | null;
  target: number | null;
  protein: number | null;
  within: boolean | null;
  closed: boolean;
  training: boolean | null;
};

export type FitFuel = {
  goal: FitGoal | null;
  target: number | null;
  days: FitFuelDay[];
  loggedDays: number;
  avgKcal: number | null;
  within: { days: number; of: number };
  balance: { totalDelta: number; days: number; avgPct: number; estKg: number; verdict: FitBalanceVerdict } | null;
  macros: {
    protein: { avg: number | null; target: number | null; hitDays: number; loggedDays: number };
    carbs: { avg: number | null; target: number | null };
    fat: { avg: number | null; target: number | null };
  };
  meals: { key: FitMealKey; pct: number }[] | null;
  trainVsRest: { trainDays: number; restDays: number; trainKcal: number; restKcal: number; trainProtein: number | null; restProtein: number | null } | null;
  weekend: { weekendAvg: number; weekdayAvg: number; weekendDays: number; weekdayDays: number } | null;
  prev: { avgKcal: number; withinDays: number; withinOf: number; avgProtein: number | null } | null;
};

export type FitRecovery = {
  trainAvg: number; trainN: number;
  missedAvg: number; missedN: number;
  diff: number; // trainAvg - missedAvg (ساعت)
};

export type FitWeek = {
  v: 1;
  training: FitTraining | null;
  fuel: FitFuel | null;
  recovery: FitRecovery | null;
};

// ───────────────────────── ابزارها ─────────────────────────

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** کلید مقایسه‌ی اسم حرکت: بدون پسوند ست/تکرار، ی/ک عربی، فاصله و نیم‌فاصله */
export function exerciseKey(item: string): string {
  return stripSetSuffix(String(item ?? ""))
    .replace(/[‌\s]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase();
}

/** نام روز هفته‌ی برنامه برای مقایسه (نیم‌فاصله و ی/ک عربی نادیده) */
export function normWeekdayName(s: string): string {
  return String(s ?? "").replace(/[‌\s]/g, "").replace(/ي/g, "ی");
}

const WEEKDAY_KEYS = ["یکشنبه", "دوشنبه", "سهشنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

/** نام فارسی نرمال‌شده‌ی روز یک تاریخ (JS getDay: 0 = یکشنبه) */
export function weekdayKeyOfIso(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return WEEKDAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export type PlanRowLite = { start: string; until: string | null; planData: unknown };

/**
 * اسم حرکت‌های برنامه‌ی یک تاریخ از پلنی که اون روز معتبر بوده (جدیدترین
 * پلنی که تا اون روز شروع شده)؛ روز بدون برنامه [] برمی‌گردونه.
 */
export function plannedItemsOn(plans: PlanRowLite[], iso: string): string[] {
  const sorted = [...plans].sort((a, b) => (a.start < b.start ? 1 : -1));
  const plan = sorted.find((p) => p.start <= iso && (p.until == null || p.until >= iso));
  if (!plan || !Array.isArray(plan.planData)) return [];
  const want = weekdayKeyOfIso(iso);
  const day = (plan.planData as { day?: unknown; items?: unknown }[]).find(
    (d) => d && typeof d.day === "string" && normWeekdayName(d.day) === want
  );
  if (!day || !Array.isArray(day.items)) return [];
  return day.items.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => stripSetSuffix(x));
}

/** عضله‌ی ورودی کاتالوگ (MuscleKey کاتالوگ) → عضله‌ی قابل نمایش یا null (کاردیو/بدن کامل/انعطاف) */
export function catalogMuscleToFit(key: string | undefined | null): FitMuscle | null {
  if (!key) return null;
  if (key === "obliques") return "abs";
  return (FIT_MUSCLES as readonly string[]).includes(key) ? (key as FitMuscle) : null;
}

const MEAL_KEYS: FitMealKey[] = ["breakfast", "lunch", "dinner", "snack"];
export function mealKeyOf(raw: string | null | undefined): FitMealKey {
  return (MEAL_KEYS as string[]).includes(raw ?? "") ? (raw as FitMealKey) : "other";
}

/** درصد فاصله‌ی کالری از هدف: ±10% = داخل هدف */
export const WITHIN_PCT = 0.1;
export const isWithin = (kcal: number, target: number) => target > 0 && Math.abs(kcal - target) / target <= WITHIN_PCT;

/** پروتئین هدف: از 90% هدف به بالا = «هدف پروتئین» */
export const PROTEIN_HIT = 0.9;

// ───────────────────────── تمرین ─────────────────────────

function computeTraining(i: FitWeekInput): FitTraining | null {
  const statuses = i.days.map((d) => d.status);
  const hasStatus = statuses.some(Boolean);
  const rowsByDate = new Map(i.sessions.map((s) => [s.date, s]));
  if (!i.hasFitness || (!hasStatus && !i.sessions.length)) return null;

  const count = (s: FitStatus) => statuses.filter((x) => x === s).length;
  const done = count("done");
  const partial = count("partial");
  const missed = count("missed");
  const sessions = { done, planned: done + partial + missed, extra: count("extra"), partial, missed, rest: count("rest") };
  const adherence = sessions.planned > 0 ? r0((done / sessions.planned) * 100) : null;

  let prevSessions: FitTraining["prevSessions"] = null;
  let prevAdherence: number | null = null;
  if (i.prevDays) {
    const ps = i.prevDays.map((d) => d.status);
    if (ps.some(Boolean)) {
      const c = (s: FitStatus) => ps.filter((x) => x === s).length;
      const pDone = c("done");
      const pPlanned = pDone + c("partial") + c("missed");
      prevSessions = { done: pDone, planned: pPlanned, extra: c("extra") };
      prevAdherence = pPlanned > 0 ? r0((pDone / pPlanned) * 100) : null;
    }
  }

  // ── حرکت‌ها و عضله‌ها ──
  const topMap = new Map<string, { name: string; count: number }>();
  const muscleCount = new Map<FitMuscle, number>();
  const musclePlanned = new Map<FitMuscle, number>();
  let exDoneTotal = 0;
  let exPlannedTotal = 0;
  let anyItems = false;

  const days: FitTrainingDay[] = i.days.map((d) => {
    if (d.isFuture) return { date: d.date, weekday: d.weekday, status: "future", exDone: null, exPlanned: null };
    const row = rowsByDate.get(d.date);
    const planned = i.plannedByDate[d.date] ?? [];
    const plannedKeys = new Set(planned.map(exerciseKey));
    const doneItems = row ? [...new Map(row.items.map((x) => [exerciseKey(x), stripSetSuffix(x)])).entries()] : [];
    if (doneItems.length) anyItems = true;

    // اسم حرکت‌های تیک‌خورده برای پرتکرارها و عضله‌ها (حتی بیرون از برنامه)
    for (const [key, name] of doneItems) {
      const t = topMap.get(key);
      if (t) t.count += 1; else topMap.set(key, { name, count: 1 });
      const ms = i.muscleOf(name);
      if (ms[0]) muscleCount.set(ms[0], (muscleCount.get(ms[0]) ?? 0) + 1);
    }
    // عضله‌های برنامه (روزهای گذشته/امروز)
    for (const name of planned) {
      const ms = i.muscleOf(name);
      if (ms[0]) musclePlanned.set(ms[0], (musclePlanned.get(ms[0]) ?? 0) + 1);
    }

    // نسبت حرکت‌ها: روز «جلسه تموم شد ولی هیچ حرکتی تیک نخورده» نامشخصه و نه کامل فرض می‌شه نه صفر
    const unknown = !!row && row.completed && doneItems.length === 0;
    let exDone: number | null = null;
    let exPlanned: number | null = null;
    if (planned.length && !unknown && !(d.isToday && !row)) {
      exPlanned = planned.length;
      exDone = doneItems.filter(([k]) => plannedKeys.has(k)).length;
      exPlannedTotal += exPlanned;
      exDoneTotal += exDone;
    }
    return { date: d.date, weekday: d.weekday, status: d.status ?? "none", exDone, exPlanned };
  });

  const top = [...topMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  const muscles = FIT_MUSCLES
    .map((key) => ({ key, count: muscleCount.get(key) ?? 0, planned: musclePlanned.get(key) ?? 0 }))
    .filter((m) => m.count > 0 || m.planned > 0)
    .sort((a, b) => b.count - a.count || b.planned - a.planned);
  // بدون هیچ حرکت تیک‌خورده، «جاافتاده» معنی نداره (شاید فقط تیک نزده)
  const totalMuscleHits = [...muscleCount.values()].reduce((a, b) => a + b, 0);
  const skipped = totalMuscleHits > 0 ? muscles.filter((m) => m.planned > 0 && m.count === 0).map((m) => m.key) : [];

  // ── استریک جلسه: روز استراحت/بدون برنامه زنجیره رو نمی‌شکنه، روز جاافتاده/نیمه‌کاره می‌شکنه ──
  let run = 0;
  let longest = 0;
  for (const s of statuses) {
    if (s === "done" || s === "extra") { run++; longest = Math.max(longest, run); }
    else if (s === "missed" || s === "partial") run = 0;
  }

  // ── ساعت شروع ──
  const starts = i.sessions.map((s) => s.startMin).filter((x): x is number => x != null);
  const start = starts.length >= 2
    ? {
        morning: starts.filter((m) => m < 720).length,
        afternoon: starts.filter((m) => m >= 720 && m < 1020).length,
        evening: starts.filter((m) => m >= 1020).length,
        avgMin: r0(mean(starts)!),
      }
    : null;

  return {
    sessions,
    prevSessions,
    adherence,
    prevAdherence,
    days,
    exercises: { done: exDoneTotal, planned: exPlannedTotal, pct: exPlannedTotal > 0 && anyItems ? r0((exDoneTotal / exPlannedTotal) * 100) : null },
    top,
    muscles,
    skipped,
    longestStreak: longest,
    start,
  };
}

// ───────────────────────── سوخت ─────────────────────────

function balanceVerdict(goal: FitGoal | null, pct: number): FitBalanceVerdict {
  switch (goal) {
    case "cut":
      return pct > 0.03 ? "over" : pct < -0.2 ? "under" : "aligned";
    case "gain":
      return pct < -0.03 ? "under" : pct > 0.2 ? "over" : "aligned";
    default:
      return pct > 0.05 ? "over" : pct < -0.05 ? "under" : "aligned";
  }
}

function computeFuel(i: FitWeekInput): FitFuel | null {
  if (!i.hasNutrition) return null;
  const logged = i.days.filter((d) => d.nutrition);
  if (!logged.length) return null;

  const days: FitFuelDay[] = i.days.map((d) => {
    const n = d.nutrition;
    const closed = !d.isToday && !d.isFuture;
    const training = d.status ? (d.status === "done" || d.status === "extra" ? true : d.status === "rest" ? false : null) : null;
    return {
      date: d.date,
      weekday: d.weekday,
      kcal: n ? r0(n.kcal) : null,
      target: n?.target ?? null,
      protein: n?.protein != null ? r0(n.protein) : null,
      within: n && n.target ? isWithin(n.kcal, n.target) : null,
      closed,
      training,
    };
  });
  // آمار فقط از روزهای تمام‌شده (کالری نصفه‌ی امروز همیشه «زیر هدف» دیده می‌شد)
  const closedLogged = days.filter((d) => d.closed && d.kcal != null);
  const withTarget = closedLogged.filter((d) => d.target);
  const avgKcal = closedLogged.length ? r0(mean(closedLogged.map((d) => d.kcal!))!) : null;
  const target = i.targets.kcal ?? [...withTarget].pop()?.target ?? null;

  // ── تراز انرژی نسبت به هدف ──
  let balance: FitFuel["balance"] = null;
  if (withTarget.length >= 3) {
    const totalDelta = r0(withTarget.reduce((a, d) => a + (d.kcal! - d.target!), 0));
    const avgPct = withTarget.reduce((a, d) => a + (d.kcal! - d.target!) / d.target!, 0) / withTarget.length;
    balance = {
      totalDelta,
      days: withTarget.length,
      avgPct: Math.round(avgPct * 1000) / 1000,
      estKg: r1(totalDelta / KCAL_PER_KG),
      verdict: balanceVerdict(i.targets.goal, avgPct),
    };
  }

  // ── درشت‌مغذی‌ها (از روزهای تمام‌شده) ──
  const closedDates = new Set(closedLogged.map((d) => d.date));
  const dayMacro = (key: "protein" | "carbs" | "fat") => {
    const per = new Map<string, number>();
    for (const f of i.food) {
      if (!closedDates.has(f.date) || f[key] == null) continue;
      per.set(f.date, (per.get(f.date) ?? 0) + (f[key] as number));
    }
    return per;
  };
  const protByDay = new Map<string, number>();
  for (const d of closedLogged) if (d.protein != null) protByDay.set(d.date, d.protein);
  if (!protByDay.size) for (const [k, v] of dayMacro("protein")) protByDay.set(k, v);
  const carbsByDay = dayMacro("carbs");
  const fatByDay = dayMacro("fat");
  const avgOf = (m: Map<string, number>) => (m.size ? r0(mean([...m.values()])!) : null);
  const pTarget = i.targets.protein;
  const macros: FitFuel["macros"] = {
    protein: {
      avg: avgOf(protByDay),
      target: pTarget,
      hitDays: pTarget ? [...protByDay.values()].filter((v) => v >= pTarget * PROTEIN_HIT).length : 0,
      loggedDays: protByDay.size,
    },
    carbs: { avg: avgOf(carbsByDay), target: i.targets.carbs },
    fat: { avg: avgOf(fatByDay), target: i.targets.fat },
  };

  // ── سهم وعده‌ها (از کالری ردیف‌های روزهای تمام‌شده) ──
  const mealKcal: Record<FitMealKey, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, other: 0 };
  for (const f of i.food) if (closedDates.has(f.date)) mealKcal[mealKeyOf(f.mealType)] += f.kcal;
  const mealTotal = Object.values(mealKcal).reduce((a, b) => a + b, 0);
  const labeled = mealTotal - mealKcal.other;
  // اگه کمتر از نصف کالری نوع وعده داره، تقسیم‌بندی گمراه‌کننده‌ست
  const meals = mealTotal > 0 && labeled / mealTotal >= 0.5
    ? (MEAL_KEYS.map((key) => ({ key, pct: r0((mealKcal[key] / labeled) * 100) })).filter((m) => m.pct > 0))
    : null;

  // ── روز تمرین در برابر روز استراحت ──
  const trainD = closedLogged.filter((d) => d.training === true);
  const restD = closedLogged.filter((d) => d.training === false);
  const protOf = (ds: FitFuelDay[]) => {
    const v = ds.map((d) => d.protein).filter((x): x is number => x != null);
    return v.length ? r0(mean(v)!) : null;
  };
  const trainVsRest = trainD.length >= 1 && restD.length >= 1
    ? {
        trainDays: trainD.length,
        restDays: restD.length,
        trainKcal: r0(mean(trainD.map((d) => d.kcal!))!),
        restKcal: r0(mean(restD.map((d) => d.kcal!))!),
        trainProtein: protOf(trainD),
        restProtein: protOf(restD),
      }
    : null;

  // ── آخر هفته (پنجشنبه و جمعه) در برابر روزهای کاری ──
  const idx = new Map(i.days.map((d, k) => [d.date, k]));
  const we = closedLogged.filter((d) => (idx.get(d.date) ?? 0) >= 5);
  const wd = closedLogged.filter((d) => (idx.get(d.date) ?? 0) < 5);
  const weekend = we.length >= 1 && wd.length >= 3
    ? { weekendAvg: r0(mean(we.map((d) => d.kcal!))!), weekdayAvg: r0(mean(wd.map((d) => d.kcal!))!), weekendDays: we.length, weekdayDays: wd.length }
    : null;

  // ── هفته‌ی قبل ──
  let prev: FitFuel["prev"] = null;
  if (i.prevDays) {
    const pn = i.prevDays.map((d) => d.nutrition).filter((x): x is NonNullable<typeof x> => !!x);
    if (pn.length >= 2) {
      const pt = pn.filter((n) => n.target);
      const pp = pn.map((n) => n.protein).filter((x): x is number => x != null);
      prev = {
        avgKcal: r0(mean(pn.map((n) => n.kcal))!),
        withinDays: pt.filter((n) => isWithin(n.kcal, n.target!)).length,
        withinOf: pt.length,
        avgProtein: pp.length ? r0(mean(pp)!) : null,
      };
    }
  }

  return {
    goal: i.targets.goal,
    target,
    days,
    loggedDays: closedLogged.length,
    avgKcal,
    within: { days: withTarget.filter((d) => d.within).length, of: withTarget.length },
    balance,
    macros,
    meals,
    trainVsRest,
    weekend,
    prev,
  };
}

// ───────────────────────── ریکاوری ─────────────────────────

function computeRecovery(i: FitWeekInput): FitRecovery | null {
  const hrs = (pred: (s?: FitStatus) => boolean) =>
    i.days.filter((d) => !d.isFuture && pred(d.status) && d.sleepHours != null).map((d) => d.sleepHours as number);
  const train = hrs((s) => s === "done" || s === "extra");
  const missed = hrs((s) => s === "missed" || s === "partial");
  if (!train.length || !missed.length) return null;
  const t = mean(train)!;
  const m = mean(missed)!;
  return { trainAvg: r1(t), trainN: train.length, missedAvg: r1(m), missedN: missed.length, diff: r1(t - m) };
}

// ───────────────────────── نقطه‌ی ورود ─────────────────────────

/** null وقتی نه تمرین داریم نه تغذیه (بلوک fit اصلا ساخته نمی‌شه) */
export function computeFitWeek(i: FitWeekInput): FitWeek | null {
  const training = computeTraining(i);
  const fuel = computeFuel(i);
  if (!training && !fuel) return null;
  return { v: 1, training, fuel, recovery: training ? computeRecovery(i) : null };
}

/** محافظ شکل برای داده‌ی ناقص/قدیمی (snapshot یا payload بدون fit) */
export function readFit(raw: unknown): FitWeek | null {
  const f = raw as Partial<FitWeek> | null | undefined;
  if (!f || typeof f !== "object" || f.v !== 1) return null;
  const training = f.training && typeof f.training === "object" && Array.isArray(f.training.days) ? f.training : null;
  const fuel = f.fuel && typeof f.fuel === "object" && Array.isArray(f.fuel.days) ? f.fuel : null;
  if (!training && !fuel) return null;
  return { v: 1, training, fuel, recovery: f.recovery ?? null };
}
