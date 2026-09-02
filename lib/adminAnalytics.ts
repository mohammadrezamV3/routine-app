// لایه‌ی تجمیع کوئری‌های پنل Owner — همه‌جا Prisma پارامتری‌شده (بدون raw
// SQL، طبق قاعده‌ی امنیتی ثابت پروژه)، و برای جلوگیری از سنگین‌شدن هر
// بارگذاری صفحه، نتیجه‌ی هر تابع با یک کش کوتاه‌مدت در-حافظه (تک-instance،
// هم‌الگوی lib/rateLimit.ts/lib/appSettings.ts) نگه داشته می‌شه.
//
// هیچ عددی این‌جا Fake نیست — هر مقدار مستقیم از یک کوئری واقعی میاد. جایی
// که داده‌ی کافی نیست یا زیرساخت لازم (مثلا event tracking) هنوز از قبل از
// این تاریخ وجود نداشته، مقدار «null»/آرایه‌ی خالی برمی‌گرده و صفحه باید
// «داده‌ای برای نمایش وجود ندارد» نشون بده — نه صفر یا عدد ساختگی.

import { prisma } from "@/lib/prisma";
import { ModuleKey } from "@prisma/client";

// ============================================================================
// کش
// ============================================================================

const cache = new Map<string, { at: number; value: any }>();

async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function invalidateAdminAnalyticsCache() {
  cache.clear();
}

// ============================================================================
// بازه‌ی زمانی
// ============================================================================

export type RangeKey = "today" | "7d" | "30d" | "3m" | "12m" | "custom";
export type Range = { from: Date; to: Date; key: RangeKey };

export function resolveRange(key: RangeKey, customFrom?: string | null, customTo?: string | null): Range {
  const now = new Date();
  if (key === "custom") {
    const from = customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 86400000);
    const to = customTo ? new Date(customTo) : now;
    return { from, to, key };
  }
  if (key === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now, key };
  }
  const daysMap: Record<Exclude<RangeKey, "today" | "custom">, number> = { "7d": 7, "30d": 30, "3m": 90, "12m": 365 };
  const days = daysMap[key as "7d" | "30d" | "3m" | "12m"] ?? 30;
  return { from: new Date(now.getTime() - days * 86400000), to: now, key };
}

const VALID_RANGE_KEYS: RangeKey[] = ["today", "7d", "30d", "3m", "12m", "custom"];

export function rangeFromSearchParams(sp: URLSearchParams): Range {
  const keyParam = sp.get("range") || "30d";
  const key = (VALID_RANGE_KEYS as string[]).includes(keyParam) ? (keyParam as RangeKey) : "30d";
  return resolveRange(key, sp.get("from"), sp.get("to"));
}

function previousRange(range: Range): Range {
  const spanMs = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - spanMs), to: range.from, key: range.key };
}

function rangeCacheKey(prefix: string, range: Range, extra = ""): string {
  return `${prefix}:${range.from.getTime()}:${range.to.getTime()}${extra ? ":" + extra : ""}`;
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : cur < 0 ? -100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

// ============================================================================
// سطل‌بندی زمانی برای نمودارها (بدون raw SQL — همه‌ی سطل‌بندی سمت JS)
// ============================================================================

type BucketUnit = "day" | "week" | "month";

function pickBucketUnit(range: Range): BucketUnit {
  const days = (range.to.getTime() - range.from.getTime()) / 86400000;
  if (days <= 45) return "day";
  if (days <= 150) return "week";
  return "month";
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 1) % 7; // شنبه=۰ برای همخوانی با هفته‌ی فارسی نیست، فقط یک سطل‌بندی پایدار می‌خوایم
  x.setDate(x.getDate() - day);
  return x;
}

function bucketKeyOf(d: Date, unit: BucketUnit): string {
  if (unit === "day") return d.toISOString().slice(0, 10);
  if (unit === "week") return startOfWeek(d).toISOString().slice(0, 10);
  return d.toISOString().slice(0, 7);
}

function enumerateBucketKeys(range: Range, unit: BucketUnit): string[] {
  const keys: string[] = [];
  const cur = unit === "week" ? startOfWeek(range.from) : new Date(range.from);
  if (unit === "day") cur.setHours(0, 0, 0, 0);
  if (unit === "month") cur.setDate(1);
  while (cur <= range.to) {
    keys.push(bucketKeyOf(cur, unit));
    if (unit === "day") cur.setDate(cur.getDate() + 1);
    else if (unit === "week") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
  if (keys.length === 0) keys.push(bucketKeyOf(range.to, unit));
  return keys;
}

// ============================================================================
// نمای کلی (Overview)
// ============================================================================

export type OverviewKpis = {
  totalUsers: number;
  newUsers: number;
  newUsersGrowthPercent: number | null;
  activeUsers: number;
  paidUsers: number;
  revenueByCurrency: Record<string, number>;
  revenueGrowthPercentByCurrency: Record<string, number | null>;
  refundsCount: number;
  range: Range;
};

export async function getOverviewKpis(range: Range): Promise<OverviewKpis> {
  return withCache(rangeCacheKey("overview", range), 30_000, async () => {
    const prev = previousRange(range);

    const [totalUsers, newUsers, prevNewUsers, activeLogins, paidSubs, payments, prevPayments, refundsCount] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: range.from, lte: range.to } } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: prev.from, lte: prev.to } } }),
      prisma.loginEvent.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.subscription.findMany({ where: { status: "ACTIVE", plan: { priceMonthly: { gt: 0 } } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.payment.findMany({ where: { paidAt: { gte: range.from, lte: range.to }, refundedAt: null }, select: { amount: true, currency: true } }),
      prisma.payment.findMany({ where: { paidAt: { gte: prev.from, lte: prev.to }, refundedAt: null }, select: { amount: true, currency: true } }),
      prisma.payment.count({ where: { refundedAt: { gte: range.from, lte: range.to } } }),
    ]);

    const revenueByCurrency: Record<string, number> = {};
    for (const p of payments) revenueByCurrency[p.currency] = (revenueByCurrency[p.currency] || 0) + p.amount;
    const prevRevenueByCurrency: Record<string, number> = {};
    for (const p of prevPayments) prevRevenueByCurrency[p.currency] = (prevRevenueByCurrency[p.currency] || 0) + p.amount;

    const revenueGrowthPercentByCurrency: Record<string, number | null> = {};
    for (const cur of new Set([...Object.keys(revenueByCurrency), ...Object.keys(prevRevenueByCurrency)])) {
      revenueGrowthPercentByCurrency[cur] = pctChange(revenueByCurrency[cur] || 0, prevRevenueByCurrency[cur] || 0);
    }

    return {
      totalUsers,
      newUsers,
      newUsersGrowthPercent: pctChange(newUsers, prevNewUsers),
      activeUsers: activeLogins.length,
      paidUsers: paidSubs.length,
      revenueByCurrency,
      revenueGrowthPercentByCurrency,
      refundsCount,
      range,
    };
  });
}

export type GrowthSeriesPoint = { bucket: string; newUsers: number; activeUsers: number; paidUsers: number };

export async function getUserGrowthSeries(range: Range): Promise<GrowthSeriesPoint[]> {
  return withCache(rangeCacheKey("growth-series", range), 30_000, async () => {
    const unit = pickBucketUnit(range);
    const [users, logins, paidSubs] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null, createdAt: { gte: range.from, lte: range.to } }, select: { createdAt: true } }),
      prisma.loginEvent.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { createdAt: true, userId: true } }),
      prisma.subscription.findMany({ where: { startDate: { gte: range.from, lte: range.to }, plan: { priceMonthly: { gt: 0 } } }, select: { startDate: true, userId: true } }),
    ]);

    const keys = enumerateBucketKeys(range, unit);
    const idx = new Map(keys.map((k, i) => [k, i]));
    const newUsersArr = new Array(keys.length).fill(0);
    const activeSets: Set<string>[] = keys.map(() => new Set());
    const paidSets: Set<string>[] = keys.map(() => new Set());

    for (const u of users) {
      const k = idx.get(bucketKeyOf(u.createdAt, unit));
      if (k !== undefined) newUsersArr[k]++;
    }
    for (const l of logins) {
      const k = idx.get(bucketKeyOf(l.createdAt, unit));
      if (k !== undefined) activeSets[k].add(l.userId);
    }
    for (const s of paidSubs) {
      const k = idx.get(bucketKeyOf(s.startDate, unit));
      if (k !== undefined) paidSets[k].add(s.userId);
    }

    return keys.map((bucket, i) => ({ bucket, newUsers: newUsersArr[i], activeUsers: activeSets[i].size, paidUsers: paidSets[i].size }));
  });
}

export type RevenuePoint = { bucket: string; byCurrency: Record<string, number> };
export type RevenueAnalytics = {
  series: RevenuePoint[];
  totalByCurrency: Record<string, number>;
  purchaseCountByCurrency: Record<string, number>;
  avgPurchaseValueByCurrency: Record<string, number>;
  refundedAmountByCurrency: Record<string, number>;
  netRevenueByCurrency: Record<string, number>;
};

export async function getRevenueAnalytics(range: Range): Promise<RevenueAnalytics> {
  return withCache(rangeCacheKey("revenue", range), 30_000, async () => {
    const unit = pickBucketUnit(range);
    const [payments, refunds] = await Promise.all([
      prisma.payment.findMany({ where: { paidAt: { gte: range.from, lte: range.to }, refundedAt: null }, select: { amount: true, currency: true, paidAt: true } }),
      prisma.payment.findMany({ where: { refundedAt: { gte: range.from, lte: range.to } }, select: { amount: true, currency: true } }),
    ]);

    const keys = enumerateBucketKeys(range, unit);
    const idx = new Map(keys.map((k, i) => [k, i]));
    const series: RevenuePoint[] = keys.map((bucket) => ({ bucket, byCurrency: {} }));

    const totalByCurrency: Record<string, number> = {};
    const purchaseCountByCurrency: Record<string, number> = {};
    for (const p of payments) {
      if (!p.paidAt) continue;
      const k = idx.get(bucketKeyOf(p.paidAt, unit));
      if (k !== undefined) series[k].byCurrency[p.currency] = (series[k].byCurrency[p.currency] || 0) + p.amount;
      totalByCurrency[p.currency] = (totalByCurrency[p.currency] || 0) + p.amount;
      purchaseCountByCurrency[p.currency] = (purchaseCountByCurrency[p.currency] || 0) + 1;
    }

    const refundedAmountByCurrency: Record<string, number> = {};
    for (const r of refunds) refundedAmountByCurrency[r.currency] = (refundedAmountByCurrency[r.currency] || 0) + r.amount;

    const avgPurchaseValueByCurrency: Record<string, number> = {};
    for (const cur of Object.keys(totalByCurrency)) {
      avgPurchaseValueByCurrency[cur] = Math.round(totalByCurrency[cur] / (purchaseCountByCurrency[cur] || 1));
    }

    const netRevenueByCurrency: Record<string, number> = {};
    for (const cur of new Set([...Object.keys(totalByCurrency), ...Object.keys(refundedAmountByCurrency)])) {
      netRevenueByCurrency[cur] = (totalByCurrency[cur] || 0) - (refundedAmountByCurrency[cur] || 0);
    }

    return { series, totalByCurrency, purchaseCountByCurrency, avgPurchaseValueByCurrency, refundedAmountByCurrency, netRevenueByCurrency };
  });
}

export type PlanBreakdownRow = {
  plan: { id: string; key: string; nameFa: string; market: string; currency: string; priceMonthly: number };
  active: number;
  expired: number;
  newInRange: number;
  canceledInRange: number;
};

export async function getPlanBreakdown(range: Range): Promise<PlanBreakdownRow[]> {
  return withCache(rangeCacheKey("plan-breakdown", range), 30_000, async () => {
    const plans = await prisma.plan.findMany({ orderBy: [{ market: "asc" }, { sortOrder: "asc" }] });
    return Promise.all(
      plans.map(async (p) => {
        const [active, expired, newInRange, canceledInRange] = await Promise.all([
          prisma.subscription.count({ where: { planId: p.id, status: "ACTIVE" } }),
          prisma.subscription.count({ where: { planId: p.id, status: "EXPIRED" } }),
          prisma.subscription.count({ where: { planId: p.id, startDate: { gte: range.from, lte: range.to } } }),
          prisma.subscription.count({ where: { planId: p.id, canceledAt: { gte: range.from, lte: range.to } } }),
        ]);
        return {
          plan: { id: p.id, key: p.key, nameFa: p.nameFa, market: p.market, currency: p.currency, priceMonthly: p.priceMonthly },
          active,
          expired,
          newInRange,
          canceledInRange,
        };
      })
    );
  });
}

export type RenewalsUpgrades = { renewalsInRange: number; upgradesInRange: number; downgradesInRange: number };

// «تمدید» و «ارتقا» فیلد مستقلی توی دیتابیس ندارن — هر خرید یک ردیف تازه‌ی
// Subscription می‌سازه (نه آپدیت ردیف قبلی)، پس این‌ها از روی توالی
// Subscriptionهای هر کاربر استنتاج می‌شن: همون پلن دوباره = تمدید؛ پلن
// گران‌تر = ارتقا؛ پلن ارزون‌تر = تنزل.
export async function getRenewalsAndUpgrades(range: Range): Promise<RenewalsUpgrades> {
  return withCache(rangeCacheKey("renewals-upgrades", range), 60_000, async () => {
    const subs = await prisma.subscription.findMany({
      orderBy: [{ userId: "asc" }, { startDate: "asc" }],
      select: { userId: true, planId: true, startDate: true, plan: { select: { priceMonthly: true } } },
    });
    const byUser = new Map<string, typeof subs>();
    for (const s of subs) {
      const arr = byUser.get(s.userId) || [];
      arr.push(s);
      byUser.set(s.userId, arr);
    }
    let renewalsInRange = 0, upgradesInRange = 0, downgradesInRange = 0;
    for (const arr of byUser.values()) {
      for (let i = 1; i < arr.length; i++) {
        const prevS = arr[i - 1], curS = arr[i];
        if (curS.startDate < range.from || curS.startDate > range.to) continue;
        if (curS.planId === prevS.planId) renewalsInRange++;
        else if (curS.plan.priceMonthly > prevS.plan.priceMonthly) upgradesInRange++;
        else downgradesInRange++;
      }
    }
    return { renewalsInRange, upgradesInRange, downgradesInRange };
  });
}

// ============================================================================
// کاربران
// ============================================================================

export type UsersListFilter = "all" | "new" | "active" | "inactive" | "free" | "paid" | "blocked";
export type UsersListParams = { search?: string; filter?: UsersListFilter; page?: number; pageSize?: number; sort?: "newest" | "oldest" | "name" };

export async function getUsersList(params: UsersListParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 25));
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const where: any = { deletedAt: null };
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { username: { contains: q, mode: "insensitive" } },
    ];
  }
  switch (params.filter) {
    case "new":
      where.createdAt = { gte: sevenDaysAgo };
      break;
    case "active":
      where.loginEvents = { some: { createdAt: { gte: thirtyDaysAgo } } };
      break;
    case "inactive":
      where.loginEvents = { none: { createdAt: { gte: thirtyDaysAgo } } };
      break;
    case "paid":
      where.subscriptions = { some: { status: "ACTIVE", plan: { priceMonthly: { gt: 0 } } } };
      break;
    case "free":
      where.subscriptions = { none: { status: "ACTIVE", plan: { priceMonthly: { gt: 0 } } } };
      break;
    case "blocked":
      where.isBlocked = true;
      break;
  }

  const orderBy =
    params.sort === "oldest" ? { createdAt: "asc" as const } : params.sort === "name" ? { name: "asc" as const } : { createdAt: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        username: true,
        market: true,
        isSuperAdmin: true,
        isBlocked: true,
        createdAt: true,
        subscriptions: { where: { status: "ACTIVE" }, take: 1, orderBy: { createdAt: "desc" }, select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, priceMonthly: true } } } },
        loginEvents: { take: 1, orderBy: { createdAt: "desc" }, select: { createdAt: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      username: u.username,
      market: u.market,
      isSuperAdmin: u.isSuperAdmin,
      isBlocked: u.isBlocked,
      createdAt: u.createdAt,
      plan: u.subscriptions[0]?.plan?.nameFa || null,
      subscriptionStatus: u.subscriptions[0]?.status || null,
      subscriptionExpiresAt: u.subscriptions[0]?.currentPeriodEnd || null,
      lastActivityAt: u.loginEvents[0]?.createdAt || null,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, lastName: true, email: true, phone: true, username: true,
      market: true, locale: true, isSuperAdmin: true, isBlocked: true, blockedAt: true,
      createdAt: true, gender: true, birthDate: true,
      subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: true, payments: { orderBy: { createdAt: "desc" } } } },
      moduleAccess: true,
      loginEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) return null;

  const [dailyEntries, exerciseLogs, foodLogs, tradeEntries, roadmaps, aiUsage] = await Promise.all([
    prisma.dailyEntry.count({ where: { userId } }),
    prisma.exerciseLog.count({ where: { userId } }),
    prisma.foodLogEntry.count({ where: { userId } }),
    prisma.tradeEntry.count({ where: { userId } }),
    prisma.roadmap.count({ where: { userId } }),
    prisma.aiUsageRecord.aggregate({ where: { userId }, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true, costUsdMicros: true } }),
  ]);

  return {
    user,
    activity: { dailyEntries, exerciseLogs, foodLogs, tradeEntries, roadmaps },
    aiUsage: {
      requests: aiUsage._count._all,
      inputTokens: aiUsage._sum.inputTokens || 0,
      outputTokens: aiUsage._sum.outputTokens || 0,
      costUsdMicros: aiUsage._sum.costUsdMicros || 0,
    },
  };
}

export async function setUserBlocked(actorUserId: string, targetUserId: string, blocked: boolean) {
  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isBlocked: blocked, blockedAt: blocked ? new Date() : null },
    select: { id: true, name: true, lastName: true, isBlocked: true },
  });
  await prisma.auditLog.create({
    data: { actorUserId, action: blocked ? "user.block" : "user.unblock", targetType: "User", targetId: targetUserId },
  });
  invalidateAdminAnalyticsCache();
  return updated;
}

// ============================================================================
// تحلیل محصولات
// ============================================================================

export type ProductAnalytics = {
  module: ModuleKey;
  usersWithAccess: number;
  activeUsers: number;
  usageRatePercent: number | null;
  metrics: Record<string, number>;
};

export async function getProductAnalytics(module: ModuleKey, range: Range): Promise<ProductAnalytics> {
  return withCache(rangeCacheKey(`product:${module}`, range), 30_000, async () => {
    const usersWithAccess = await prisma.moduleAccess.count({ where: { module, active: true } });

    let activeUserIds = new Set<string>();
    const metrics: Record<string, number> = {};

    if (module === "ROUTINE") {
      const [entries, items] = await Promise.all([
        prisma.dailyEntry.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true } }),
        prisma.routineItem.count(),
      ]);
      activeUserIds = new Set(entries.map((e) => e.userId));
      metrics.totalRoutineItems = items;
      metrics.dailyEntriesInRange = entries.length;
    } else if (module === "EXERCISE") {
      const [logs, plans, aiPlans] = await Promise.all([
        prisma.exerciseLog.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true } }),
        prisma.exercisePlan.count(),
        prisma.exercisePlan.count({ where: { generatedByAi: true } }),
      ]);
      activeUserIds = new Set(logs.map((l) => l.userId));
      metrics.totalPlans = plans;
      metrics.aiGeneratedPlans = aiPlans;
      metrics.logsInRange = logs.length;
    } else if (module === "CALORIE") {
      const [logs, aiScanned] = await Promise.all([
        prisma.foodLogEntry.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true, aiScanned: true } }),
        prisma.foodLogEntry.count({ where: { createdAt: { gte: range.from, lte: range.to }, aiScanned: true } }),
      ]);
      activeUserIds = new Set(logs.map((l) => l.userId));
      metrics.foodLogsInRange = logs.length;
      metrics.aiScannedLogsInRange = aiScanned;
    } else if (module === "TRADE") {
      const entries = await prisma.tradeEntry.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true } });
      activeUserIds = new Set(entries.map((e) => e.userId));
      metrics.entriesInRange = entries.length;
    } else if (module === "ROADMAP") {
      const roadmaps = await prisma.roadmap.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true, generatedByAi: true, stations: true } });
      activeUserIds = new Set(roadmaps.map((r) => r.userId));
      metrics.roadmapsInRange = roadmaps.length;
      metrics.aiGeneratedInRange = roadmaps.filter((r) => r.generatedByAi).length;
      let totalStations = 0;
      let doneStations = 0;
      for (const r of roadmaps) {
        const stations = Array.isArray(r.stations) ? (r.stations as any[]) : [];
        totalStations += stations.length;
        doneStations += stations.filter((s) => s?.done).length;
      }
      metrics.stationCompletionPercent = totalStations > 0 ? Math.round((doneStations / totalStations) * 100) : 0;
    }

    return {
      module,
      usersWithAccess,
      activeUsers: activeUserIds.size,
      usageRatePercent: usersWithAccess > 0 ? Math.round((activeUserIds.size / usersWithAccess) * 100) : null,
      metrics,
    };
  });
}

// ============================================================================
// مصرف AI
// ============================================================================

export type AiUsageAnalytics = {
  totalRequests: number;
  successRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsdMicros: number;
  avgDurationMs: number | null;
  byFeature: { feature: string; requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number }[];
  byModel: { model: string; requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number }[];
  series: { bucket: string; requests: number; costUsdMicros: number }[];
};

export async function getAiUsageAnalytics(range: Range): Promise<AiUsageAnalytics> {
  return withCache(rangeCacheKey("ai-usage", range), 30_000, async () => {
    const records = await prisma.aiUsageRecord.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { feature: true, model: true, inputTokens: true, outputTokens: true, costUsdMicros: true, success: true, durationMs: true, createdAt: true },
    });

    const unit = pickBucketUnit(range);
    const keys = enumerateBucketKeys(range, unit);
    const idx = new Map(keys.map((k, i) => [k, i]));
    const seriesRequests = new Array(keys.length).fill(0);
    const seriesCost = new Array(keys.length).fill(0);

    const byFeatureMap = new Map<string, { requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number }>();
    const byModelMap = new Map<string, { requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number }>();
    let totalInputTokens = 0, totalOutputTokens = 0, totalCostUsdMicros = 0, successRequests = 0, durationSum = 0, durationCount = 0;

    for (const r of records) {
      totalInputTokens += r.inputTokens;
      totalOutputTokens += r.outputTokens;
      totalCostUsdMicros += r.costUsdMicros;
      if (r.success) successRequests++;
      if (r.durationMs != null) { durationSum += r.durationMs; durationCount++; }

      const f = byFeatureMap.get(r.feature) || { requests: 0, inputTokens: 0, outputTokens: 0, costUsdMicros: 0 };
      f.requests++; f.inputTokens += r.inputTokens; f.outputTokens += r.outputTokens; f.costUsdMicros += r.costUsdMicros;
      byFeatureMap.set(r.feature, f);

      const m = byModelMap.get(r.model) || { requests: 0, inputTokens: 0, outputTokens: 0, costUsdMicros: 0 };
      m.requests++; m.inputTokens += r.inputTokens; m.outputTokens += r.outputTokens; m.costUsdMicros += r.costUsdMicros;
      byModelMap.set(r.model, m);

      const k = idx.get(bucketKeyOf(r.createdAt, unit));
      if (k !== undefined) { seriesRequests[k]++; seriesCost[k] += r.costUsdMicros; }
    }

    return {
      totalRequests: records.length,
      successRequests,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsdMicros,
      avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
      byFeature: [...byFeatureMap.entries()].map(([feature, v]) => ({ feature, ...v })),
      byModel: [...byModelMap.entries()].map(([model, v]) => ({ model, ...v })),
      series: keys.map((bucket, i) => ({ bucket, requests: seriesRequests[i], costUsdMicros: seriesCost[i] })),
    };
  });
}

// ============================================================================
// Funnel
// ============================================================================

export type FunnelStep = { key: string; label: string; count: number };

export async function getFunnel(range: Range): Promise<FunnelStep[]> {
  return withCache(rangeCacheKey("funnel", range), 30_000, async () => {
    const signupUsers = await prisma.user.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
      select: { id: true, name: true, lastName: true },
    });
    const ids = signupUsers.map((u) => u.id);
    if (ids.length === 0) return [
      { key: "signup", label: "ثبت‌نام", count: 0 },
      { key: "profile_complete", label: "تکمیل پروفایل", count: 0 },
      { key: "product_use", label: "استفاده از محصول", count: 0 },
      { key: "view_plan", label: "مشاهده پلن", count: 0 },
      { key: "checkout_start", label: "شروع خرید", count: 0 },
      { key: "payment_success", label: "پرداخت موفق", count: 0 },
      { key: "paid_user", label: "کاربر پولی", count: 0 },
    ];

    const profileCompleteCount = signupUsers.filter((u) => u.name && u.lastName).length;

    const [de, el, fl, te, rm, viewed, checkoutStarted, paidPayments, paidUsers] = await Promise.all([
      prisma.dailyEntry.findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.exerciseLog.findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.foodLogEntry.findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.tradeEntry.findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.roadmap.findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.analyticsEvent.findMany({ where: { type: "view_subscription_page", userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.analyticsEvent.findMany({ where: { type: "checkout_start", userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] }),
      prisma.payment.findMany({ where: { paidAt: { not: null }, subscription: { userId: { in: ids } } }, select: { subscription: { select: { userId: true } } } }),
      prisma.subscription.findMany({ where: { userId: { in: ids }, status: "ACTIVE", plan: { priceMonthly: { gt: 0 } } }, select: { userId: true }, distinct: ["userId"] }),
    ]);

    const productUseIds = new Set([...de, ...el, ...fl, ...te, ...rm].map((r) => r.userId));

    return [
      { key: "signup", label: "ثبت‌نام", count: ids.length },
      { key: "profile_complete", label: "تکمیل پروفایل", count: profileCompleteCount },
      { key: "product_use", label: "استفاده از محصول", count: productUseIds.size },
      { key: "view_plan", label: "مشاهده پلن", count: viewed.length },
      { key: "checkout_start", label: "شروع خرید", count: checkoutStarted.length },
      { key: "payment_success", label: "پرداخت موفق", count: new Set(paidPayments.map((p) => p.subscription.userId)).size },
      { key: "paid_user", label: "کاربر پولی", count: paidUsers.length },
    ];
  });
}

// ============================================================================
// Retention (D1/D7/D30)
// ============================================================================

export type RetentionResult = { d1: number | null; d7: number | null; d30: number | null; cohortSize: number };

export async function getRetention(opts?: { module?: ModuleKey; planKey?: string }): Promise<RetentionResult> {
  const cacheKeyExtra = `${opts?.module || ""}:${opts?.planKey || ""}`;
  return withCache(`retention:${cacheKeyExtra}`, 60_000, async () => {
    const now = new Date();
    const lookback = new Date(now.getTime() - 180 * 86400000);

    const where: any = { createdAt: { gte: lookback }, deletedAt: null };
    if (opts?.module) where.moduleAccess = { some: { module: opts.module, active: true } };
    if (opts?.planKey) where.subscriptions = { some: { plan: { key: opts.planKey } } };

    const users = await prisma.user.findMany({ where, select: { id: true, createdAt: true } });
    if (users.length === 0) return { d1: null, d7: null, d30: null, cohortSize: 0 };

    const ids = users.map((u) => u.id);
    const logins = await prisma.loginEvent.findMany({ where: { userId: { in: ids } }, select: { userId: true, createdAt: true } });
    const loginsByUser = new Map<string, Date[]>();
    for (const l of logins) {
      const arr = loginsByUser.get(l.userId) || [];
      arr.push(l.createdAt);
      loginsByUser.set(l.userId, arr);
    }

    function compute(days: number): number | null {
      let numerator = 0, denominator = 0;
      for (const u of users) {
        const target = new Date(u.createdAt.getTime() + days * 86400000);
        if (target > now) continue; // هنوز به این نقطه از زمان نرسیده — از مخرج کنار می‌ذاریم
        denominator++;
        const arr = loginsByUser.get(u.id);
        if (arr && arr.some((d) => d.getTime() >= target.getTime())) numerator++;
      }
      return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
    }

    return { d1: compute(1), d7: compute(7), d30: compute(30), cohortSize: users.length };
  });
}

// ============================================================================
// Churn
// ============================================================================

export type ChurnAnalytics = {
  canceledInRange: number;
  expiredInRange: number;
  churnRatePercent: number | null;
  atRiskCount: number; // اشتراک فعالی که ظرف ۷ روز آینده منقضی می‌شه
  series: { bucket: string; canceled: number }[];
};

export async function getChurn(range: Range): Promise<ChurnAnalytics> {
  return withCache(rangeCacheKey("churn", range), 30_000, async () => {
    const now = new Date();
    const unit = pickBucketUnit(range);
    const [canceled, expiredInRange, activeAtStart, atRiskCount] = await Promise.all([
      prisma.subscription.findMany({ where: { canceledAt: { gte: range.from, lte: range.to } }, select: { canceledAt: true } }),
      prisma.subscription.count({ where: { status: "EXPIRED", updatedAt: { gte: range.from, lte: range.to } } }),
      prisma.subscription.count({ where: { status: "ACTIVE", startDate: { lt: range.from } } }),
      prisma.subscription.count({ where: { status: "ACTIVE", currentPeriodEnd: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } } }),
    ]);

    const keys = enumerateBucketKeys(range, unit);
    const idx = new Map(keys.map((k, i) => [k, i]));
    const seriesCounts = new Array(keys.length).fill(0);
    for (const c of canceled) {
      if (!c.canceledAt) continue;
      const k = idx.get(bucketKeyOf(c.canceledAt, unit));
      if (k !== undefined) seriesCounts[k]++;
    }

    return {
      canceledInRange: canceled.length,
      expiredInRange,
      churnRatePercent: activeAtStart > 0 ? Math.round((canceled.length / activeAtStart) * 1000) / 10 : null,
      atRiskCount,
      series: keys.map((bucket, i) => ({ bucket, canceled: seriesCounts[i] })),
    };
  });
}

// ============================================================================
// Cohort
// ============================================================================

export type CohortRow = { monthKey: string; size: number; week1: number | null; month1: number | null; month2: number | null; month3: number | null };

export async function getCohort(monthsBack = 6): Promise<CohortRow[]> {
  return withCache(`cohort:${monthsBack}`, 120_000, async () => {
    const now = new Date();
    const rows: CohortRow[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

      const users = await prisma.user.findMany({ where: { createdAt: { gte: monthStart, lt: monthEnd }, deletedAt: null }, select: { id: true, createdAt: true } });
      if (users.length === 0) { rows.push({ monthKey, size: 0, week1: null, month1: null, month2: null, month3: null }); continue; }

      const ids = users.map((u) => u.id);
      const logins = await prisma.loginEvent.findMany({ where: { userId: { in: ids } }, select: { userId: true, createdAt: true } });
      const byUser = new Map<string, Date[]>();
      for (const l of logins) {
        const arr = byUser.get(l.userId) || [];
        arr.push(l.createdAt);
        byUser.set(l.userId, arr);
      }

      const acc = { w1: [0, 0], m1: [0, 0], m2: [0, 0], m3: [0, 0] }; // [numerator, denominator]
      for (const u of users) {
        const arr = byUser.get(u.id);
        const check = (days: number): boolean | null => {
          const target = new Date(u.createdAt.getTime() + days * 86400000);
          if (target > now) return null;
          return !!arr && arr.some((d) => d.getTime() >= target.getTime());
        };
        for (const [key, days] of [["w1", 7], ["m1", 30], ["m2", 60], ["m3", 90]] as const) {
          const v = check(days);
          if (v !== null) { (acc as any)[key][1]++; if (v) (acc as any)[key][0]++; }
        }
      }

      const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
      rows.push({
        monthKey,
        size: users.length,
        week1: pct(acc.w1[0], acc.w1[1]),
        month1: pct(acc.m1[0], acc.m1[1]),
        month2: pct(acc.m2[0], acc.m2[1]),
        month3: pct(acc.m3[0], acc.m3[1]),
      });
    }

    return rows;
  });
}

// ============================================================================
// تراکنش‌ها
// ============================================================================

export type TransactionsFilter = "all" | "paid" | "refunded";
export type TransactionsParams = { filter?: TransactionsFilter; page?: number; pageSize?: number };

export async function getTransactions(params: TransactionsParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 25));

  const where: any = {};
  if (params.filter === "paid") where.refundedAt = null;
  if (params.filter === "refunded") where.refundedAt = { not: null };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { subscription: { include: { user: { select: { id: true, name: true, lastName: true, phone: true, email: true } }, plan: { select: { nameFa: true } } } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    transactions: rows.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      providerRef: p.providerRef,
      status: p.refundedAt ? "refunded" : p.paidAt ? "paid" : "pending",
      paidAt: p.paidAt,
      refundedAt: p.refundedAt,
      createdAt: p.createdAt,
      user: p.subscription.user,
      plan: p.subscription.plan.nameFa,
    })),
    total,
    page,
    pageSize,
  };
}

// ============================================================================
// خطاها
// ============================================================================

export type ErrorLogParams = { severity?: "WARNING" | "ERROR" | "CRITICAL"; page?: number; pageSize?: number };

export async function getErrorLogs(params: ErrorLogParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 30));
  const where: any = {};
  if (params.severity) where.severity = params.severity;

  const [rows, total] = await Promise.all([
    prisma.errorLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.errorLog.count({ where }),
  ]);
  return { errors: rows, total, page, pageSize };
}

// ============================================================================
// لاگ اقدامات Owner
// ============================================================================

export async function getAuditLog(params: { page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 30));

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count(),
  ]);

  const actorIds = [...new Set(rows.map((r) => r.actorUserId))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, lastName: true, username: true } }) : [];
  const actorsById = new Map(actors.map((a) => [a.id, a]));

  return {
    entries: rows.map((r) => ({ ...r, actor: actorsById.get(r.actorUserId) || null })),
    total,
    page,
    pageSize,
  };
}

export async function writeAuditLog(actorUserId: string, action: string, targetType?: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({ data: { actorUserId, action, targetType, targetId, meta: meta as any } });
}

// ============================================================================
// وضعیت سیستم — فقط داده‌ی واقعی؛ هیچ متریکی که واقعا قابل‌اندازه‌گیری
// نیست (CPU/RAM/Disk سرور واقعی production وقتی این کد داخل یک محیط
// دیگه اجرا می‌شه) نمایش داده نمی‌شه.
// ============================================================================

export type SystemStatus = {
  db: { connected: boolean; pingMs: number | null };
  process: { uptimeSeconds: number; nodeVersion: string; memoryUsedMb: number; memoryTotalMb: number; loadAvg1m: number | null };
  aiGateway: { requestsLastHour: number; errorsLastHour: number; avgDurationMsLastHour: number | null };
  errorsLastHour: number;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const os = await import("os");
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600_000);

  let dbPingMs: number | null = null;
  let dbConnected = false;
  try {
    const start = Date.now();
    await prisma.user.count({ where: { id: "___ping___" } });
    dbPingMs = Date.now() - start;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  const [aiRecords, errorsLastHour] = await Promise.all([
    prisma.aiUsageRecord.findMany({ where: { createdAt: { gte: hourAgo } }, select: { success: true, durationMs: true } }),
    prisma.errorLog.count({ where: { createdAt: { gte: hourAgo } } }),
  ]);

  const durations = aiRecords.map((r) => r.durationMs).filter((d): d is number => d != null);

  return {
    db: { connected: dbConnected, pingMs: dbPingMs },
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryUsedMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      memoryTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      loadAvg1m: os.loadavg()[0] ?? null,
    },
    aiGateway: {
      requestsLastHour: aiRecords.length,
      errorsLastHour: aiRecords.filter((r) => !r.success).length,
      avgDurationMsLastHour: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    },
    errorsLastHour,
  };
}
