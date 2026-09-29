// سازنده‌های بخش‌های GET /api/dashboard — سمتِ سرور.
//
// قواعد (CLAUDE.md):
//   • هر کوئری با userId محدود می‌شه (بدون IDOR)، بدونِ raw SQL.
//   • بخشِ ماژولِ پولی فقط وقتی ساخته می‌شه که دسترسیِ واقعیِ دیتابیسی باشه
//     (همون منطقِ requireModule) — وگرنه null. فلگ‌ها از featureFlagsServer.
//   • متنِ پیام‌های منتور (رمزگذاری‌شده) و عکسِ معامله‌ها هیچ‌وقت select نمی‌شن.
//   • هر بخش جدا try/catch داره تا خطای یکی کلِ داشبورد رو نخوابونه.
//
// «امروز» از کلاینت میاد (date + tz) تا با روتینِ مرورگر یکی باشه؛ روت
// اعتبارسنجی و محدودش می‌کنه (±۲ روز از الان).

import { ModuleKey, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { FA_WEEKDAY, isoLocal } from "./jalali";
import { computeExerciseStreak, type ExerciseLogRange } from "./exerciseStats";
import { computeTradeStats } from "./tradeAnalytics";
import { countRowProgress } from "./roadmapPlan";
import { ensureFreshCalendar } from "./economicCalendar";
import type { DashCalorie, DashEvent, DashExercise, DashMentors, DashNotification, DashRoadmap, DashTrade, DashboardData } from "./dashboardTypes";

// ── تاریخ ────────────────────────────────────────────────────
const DAY = 86_400_000;

export function isoAdd(iso: string, n: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}
function jsDayOf(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}
/** ستون‌های @db.Date نیمه‌شبِ UTC ذخیره می‌شن */
function dbDate(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}
function dbIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** اعتبارسنجیِ ?date&tz — نامعتبر/خیلی دور → پیش‌فرض (امروزِ سرور، تهران) */
export function resolveDay(dateRaw: string | null, tzRaw: string | null): { date: string; tz: number } {
  // Number(null) و Number("") هر دو ۰ (UTC) می‌شن — نبودِ پارامتر باید پیش‌فرض باشه نه UTC
  let tz = tzRaw === null || tzRaw.trim() === "" ? NaN : Number(tzRaw);
  if (!Number.isInteger(tz) || tz < -720 || tz > 840) tz = 210;
  let date = isoLocal(new Date());
  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const t = Date.parse(dateRaw + "T00:00:00Z");
    if (Number.isFinite(t) && Math.abs(t - Date.now()) <= 2.5 * DAY && dbIso(new Date(t)) === dateRaw) date = dateRaw;
  }
  return { date, tz };
}

type Ctx = { userId: string; date: string; tz: number };

// ── تمرین ────────────────────────────────────────────────────
type PlanDay = { day: string; focus?: string; items?: string[] };

export async function buildExercise({ userId, date }: Ctx): Promise<DashExercise> {
  const dayName = FA_WEEKDAY[jsDayOf(date)];
  const last14Days = Array.from({ length: 14 }, (_, i) => isoAdd(date, i - 13));
  const plan = await prisma.exercisePlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { startDate: "desc" },
    select: { id: true, gymDays: true, planData: true },
  });
  if (!plan) {
    return {
      hasPlan: false, planId: null, gymDays: [],
      today: { dayName, isGymDay: false, focus: null, itemCount: 0, doneItems: 0, started: false, done: false },
      week: { done: 0, target: 0 }, streak: 0,
      last14: last14Days.map((iso) => ({ iso, planned: false, done: false })),
    };
  }
  const gymDays = Array.isArray(plan.gymDays) ? (plan.gymDays as unknown[]).filter((d): d is string => typeof d === "string") : [];
  const days = Array.isArray(plan.planData) ? (plan.planData as unknown as PlanDay[]) : [];
  const logsRows = await prisma.exerciseLog.findMany({
    where: { userId, planId: plan.id, date: { gte: dbDate(isoAdd(date, -120)), lte: dbDate(date) } },
    select: { date: true, completed: true, completedItems: true, startedAt: true },
  });
  const logs: ExerciseLogRange = {};
  let todayStarted = false;
  for (const r of logsRows) {
    const iso = dbIso(r.date);
    const items = Array.isArray(r.completedItems) ? (r.completedItems as unknown[]).filter((x): x is string => typeof x === "string") : [];
    logs[iso] = { completed: r.completed, completedItems: items, started: !!r.startedAt || items.length > 0 };
    if (iso === date) todayStarted = !!r.startedAt;
  }
  const todayDay = days.find((d) => d?.day === dayName);
  const todayLog = logs[date];
  const doneItems = todayLog?.completedItems.length ?? 0;

  const diffToSat = (jsDayOf(date) + 1) % 7;
  let weekDone = 0;
  for (let i = 0; i <= diffToSat; i++) if (logs[isoAdd(date, -i)]?.completed) weekDone++;

  // computeExerciseStreak با getterهای محلی کار می‌کنه؛ تاریخِ محلیِ هم‌روز
  // ساخته می‌شه تا isoLocal/getDay دقیقا همون کلیدهای logs رو بدن.
  const [y, m, d] = date.split("-").map(Number);
  const streak = computeExerciseStreak(gymDays, (dt) => FA_WEEKDAY[dt.getDay()], logs, new Date(y, m - 1, d));

  return {
    hasPlan: true,
    planId: plan.id,
    gymDays,
    today: {
      dayName,
      isGymDay: gymDays.includes(dayName),
      focus: typeof todayDay?.focus === "string" && todayDay.focus.trim() ? todayDay.focus : null,
      itemCount: Array.isArray(todayDay?.items) ? todayDay!.items!.length : 0,
      doneItems,
      started: todayStarted || doneItems > 0 || !!todayLog?.completed,
      done: !!todayLog?.completed,
    },
    week: { done: weekDone, target: gymDays.length },
    streak,
    last14: last14Days.map((iso) => ({ iso, planned: gymDays.includes(FA_WEEKDAY[jsDayOf(iso)]), done: !!logs[iso]?.completed })),
  };
}

// ── کالری ────────────────────────────────────────────────────
export async function buildCalorie({ userId, date }: Ctx): Promise<DashCalorie> {
  const from = isoAdd(date, -6);
  const [target, groups] = await Promise.all([
    prisma.calorieTarget.findFirst({
      where: { userId, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
      select: { dailyTargetKcal: true, proteinTargetG: true, carbsTargetG: true, fatTargetG: true },
    }),
    prisma.foodLogEntry.groupBy({
      by: ["date"],
      where: { userId, date: { gte: dbDate(from), lte: dbDate(date) } },
      _sum: { customCalories: true, proteinG: true, carbsG: true, fatG: true },
      _count: { _all: true },
    }),
  ]);
  const byIso = new Map(groups.map((g) => [dbIso(g.date), g]));
  const t = byIso.get(date);
  return {
    target: target ? { kcal: target.dailyTargetKcal, protein: target.proteinTargetG, carbs: target.carbsTargetG, fat: target.fatTargetG } : null,
    today: {
      kcal: Math.round(t?._sum.customCalories ?? 0),
      protein: Math.round(t?._sum.proteinG ?? 0),
      carbs: Math.round(t?._sum.carbsG ?? 0),
      fat: Math.round(t?._sum.fatG ?? 0),
      entries: t?._count._all ?? 0,
    },
    week: Array.from({ length: 7 }, (_, i) => {
      const iso = isoAdd(from, i);
      return { iso, kcal: Math.round(byIso.get(iso)?._sum.customCalories ?? 0) };
    }),
  };
}

// ── ترید ─────────────────────────────────────────────────────
export async function buildTrade({ userId, date, tz }: Ctx): Promise<DashTrade> {
  const tzMs = tz * 60_000;
  const localMidnight = (iso: string) => Date.parse(iso + "T00:00:00Z") - tzMs;
  const localIso = (d: Date) => new Date(d.getTime() + tzMs).toISOString().slice(0, 10);
  const start30 = isoAdd(date, -29);

  const accounts = await prisma.tradeAccount.findMany({
    where: { userId, archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, color: true, currency: true, type: true, initialBalance: true, goalType: true, goalValue: true },
  });
  const empty: DashTrade = {
    accountCount: 0, currency: null, sumCurrency: "USD",
    today: { pnl: 0, count: 0 }, week: { pnl: 0, count: 0, wins: 0, losses: 0 },
    month: { pnl: 0, count: 0, winRate: null, profitFactor: null },
    openTrades: 0, daily30: Array(30).fill(0), recent: [], accounts: [],
  };
  if (!accounts.length) return empty;

  const curCount = new Map<string, number>();
  for (const a of accounts) curCount.set(a.currency, (curCount.get(a.currency) ?? 0) + 1);
  const sumCurrency = Array.from(curCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const sumAccounts = new Set(accounts.filter((a) => a.currency === sumCurrency).map((a) => a.id));
  const top = accounts.slice(0, 4);

  const [windowRows, openTrades, recentRows, topRows] = await Promise.all([
    prisma.tradeEntry.findMany({
      where: { userId, status: "CLOSED", accountId: { in: Array.from(sumAccounts) }, openedAt: { gte: new Date(localMidnight(start30)) } },
      select: { pnl: true, result: true, openedAt: true },
      take: 10_000,
    }),
    prisma.tradeEntry.count({ where: { userId, status: "OPEN", account: { archived: false } } }),
    prisma.tradeEntry.findMany({
      where: { userId, account: { archived: false } },
      orderBy: { openedAt: "desc" },
      take: 5,
      select: { id: true, accountId: true, symbol: true, direction: true, pnl: true, result: true, status: true, openedAt: true },
    }),
    prisma.tradeEntry.findMany({
      where: { userId, accountId: { in: top.map((a) => a.id) } },
      select: { accountId: true, status: true, pnl: true, rMultiple: true, openedAt: true },
      take: 20_000,
    }),
  ]);

  const weekStart = isoAdd(date, -((jsDayOf(date) + 1) % 7));
  const daily = new Map<string, number>();
  const res = { ...empty, accountCount: accounts.length, sumCurrency, currency: curCount.size === 1 ? sumCurrency : null, openTrades };
  let gp = 0, gl = 0, mWins = 0, mLosses = 0;
  for (const e of windowRows) {
    const iso = localIso(e.openedAt);
    if (iso > date) continue;
    daily.set(iso, (daily.get(iso) ?? 0) + e.pnl);
    res.month.pnl += e.pnl; res.month.count++;
    if (e.pnl > 0) gp += e.pnl; else gl += e.pnl;
    if (e.result === "PROFIT") mWins++; else if (e.result === "LOSS") mLosses++;
    if (iso >= weekStart) {
      res.week.pnl += e.pnl; res.week.count++;
      if (e.result === "PROFIT") res.week.wins++; else if (e.result === "LOSS") res.week.losses++;
    }
    if (iso === date) { res.today.pnl += e.pnl; res.today.count++; }
  }
  res.month.winRate = mWins + mLosses ? Math.round((mWins / (mWins + mLosses)) * 100) : null;
  res.month.profitFactor = gl < 0 ? Math.round((gp / Math.abs(gl)) * 100) / 100 : null;
  res.daily30 = Array.from({ length: 30 }, (_, i) => round2(daily.get(isoAdd(start30, i)) ?? 0));
  res.today.pnl = round2(res.today.pnl); res.week.pnl = round2(res.week.pnl); res.month.pnl = round2(res.month.pnl);

  res.recent = recentRows.map((r) => ({ ...r, openedAt: r.openedAt.toISOString() }));

  const byAcc = new Map<string, { status: any; pnl: number; rMultiple: number | null; openedAt: string }[]>();
  for (const r of topRows) {
    if (!byAcc.has(r.accountId)) byAcc.set(r.accountId, []);
    byAcc.get(r.accountId)!.push({ status: r.status, pnl: r.pnl, rMultiple: r.rMultiple, openedAt: r.openedAt.toISOString() });
  }
  res.accounts = top.map((a) => {
    const s = computeTradeStats((byAcc.get(a.id) ?? []) as any, a);
    return { id: a.id, name: a.name, color: a.color, currency: a.currency, type: a.type, balance: s.balance, netPnl: s.netPnl, winRate: s.winRate, goalProgress: s.goalProgress };
  });
  return res;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ── تقویمِ اقتصادی ───────────────────────────────────────────
export async function buildCalendar(): Promise<{ events: DashEvent[] }> {
  // تازه‌سازی حداکثر ۹۰۰ms منتظر می‌مونه — داشبورد نباید پشتِ یک فیدِ بیرونیِ کند گیر کنه
  await Promise.race([ensureFreshCalendar(prisma).catch(() => {}), new Promise((r) => setTimeout(r, 900))]);
  const now = Date.now();
  const rows = await prisma.economicEvent.findMany({
    where: { occursAt: { gte: new Date(now - 90 * 60_000), lte: new Date(now + 7 * DAY) }, impact: { in: ["HIGH", "MEDIUM"] } },
    orderBy: { occursAt: "asc" },
    take: 8,
    select: { id: true, title: true, country: true, currency: true, impact: true, occursAt: true, actual: true, forecast: true, previous: true },
  });
  return { events: rows.map((r) => ({ ...r, impact: r.impact as DashEvent["impact"], occursAt: r.occursAt.toISOString() })) };
}

// ── رودمپ ────────────────────────────────────────────────────
export async function buildRoadmaps({ userId }: Ctx): Promise<{ items: DashRoadmap[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.roadmap.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, topic: true, steps: true, progress: true } }),
    prisma.roadmap.count({ where: { userId } }),
  ]);
  return {
    total,
    items: rows.map((r) => {
      const p = countRowProgress(r.steps, r.progress);
      return { id: r.id, title: r.title, topic: r.topic, done: p.done, total: p.total, pct: p.total ? Math.round((p.done / p.total) * 100) : 0 };
    }),
  };
}

// ── منتور ────────────────────────────────────────────────────
export async function buildMentors({ userId }: Ctx): Promise<DashMentors> {
  const [activeAsStudent, activeAsMentor, pendingIncoming, unread, profile] = await Promise.all([
    prisma.mentorship.count({ where: { studentId: userId, status: "ACTIVE" } }),
    prisma.mentorship.count({ where: { mentorId: userId, status: "ACTIVE" } }),
    prisma.mentorship.count({
      where: { status: "PENDING", OR: [{ studentId: userId, initiatedBy: "MENTOR" }, { mentorId: userId, initiatedBy: "STUDENT" }] },
    }),
    prisma.mentorMessage.count({
      where: { senderId: { not: userId }, readAt: null, mentorship: { status: { in: ["ACTIVE", "ENDED"] }, OR: [{ studentId: userId }, { mentorId: userId }] } },
    }),
    prisma.mentorProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);
  return { activeAsStudent, activeAsMentor, pendingIncoming, unread, isMentor: !!profile };
}

// ── اعلان‌ها و اطلاعیه‌ها ────────────────────────────────────
export async function buildNotifications({ userId }: Ctx): Promise<DashboardData["notifications"]> {
  const [rows, unread] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, title: true, body: true, url: true, readAt: true, createdAt: true },
    }),
    prisma.inAppNotification.count({ where: { userId, readAt: null } }),
  ]);
  const latest: DashNotification[] = rows.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, url: r.url, read: !!r.readAt, createdAt: r.createdAt.toISOString() }));
  return { unread, latest };
}

export async function buildAnnouncements({ userId }: Ctx): Promise<DashboardData["announcements"]> {
  const now = new Date();
  const [rows, readRow] = await Promise.all([
    prisma.announcement.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, body: true, createdAt: true },
    }),
    prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "readAnnouncements" } }, select: { value: true } }),
  ]);
  const read = new Set(Array.isArray(readRow?.value) ? (readRow!.value as unknown[]).filter((x): x is string => typeof x === "string") : []);
  return rows.filter((r) => !read.has(r.id)).slice(0, 3).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

// ── اجرای امن ────────────────────────────────────────────────
/** اجرای یک سازنده؛ خطا → null + ثبتِ اسمِ بخش (بقیه‌ی داشبورد سالم می‌مونه) */
export async function safe<T>(name: string, errors: string[], fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error("[dashboard]", name, e instanceof Prisma.PrismaClientKnownRequestError ? e.code : e);
    errors.push(name);
    return null;
  }
}

export function activeModuleSet(isSuperAdmin: boolean, rows: { module: ModuleKey; active: boolean; expiresAt: Date | null }[]): Set<ModuleKey> {
  if (isSuperAdmin) return new Set(Object.values(ModuleKey));
  const now = Date.now();
  return new Set(rows.filter((r) => r.active && (!r.expiresAt || r.expiresAt.getTime() > now)).map((r) => r.module));
}
