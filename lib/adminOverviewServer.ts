// تجمیع داده‌ی داشبورد ادمین (/admin). همه‌چیز از دیتابیس واقعی؛ منطق
// «کاربر فعال» (LoginEvent متمایز)، «درآمد» (پرداخت‌شده و بازپرداخت‌نشده)،
// «ریزش» (لغو در بازه نسبت به فعال‌های قبل از بازه)، قیف و استفاده‌ی
// ماژول‌ها از همون lib/adminAnalytics.ts میاد. هر بخش فقط وقتی حساب می‌شه که
// ادمین دسترسی مربوطه رو داره.

import { prisma } from "@/lib/prisma";
import { hasPermission, type AdminPermission } from "@/lib/adminPermissions";
import { getFunnel, getProductAnalytics, getSystemStatus, resolveRange, type Range } from "@/lib/adminAnalytics";
import {
  bucketCounts, bucketSums, dashRangeDays, deltaPercent, healthSummary, lastDayKeys, mergeFeed, queueTotal,
  rialToToman, safeRate, type DashRange, type FeedItem, type QueueItem,
} from "@/lib/adminOverview";
import type { ModuleKey } from "@prisma/client";

type Access = { isSuperAdmin: boolean; permissions: readonly string[] };

export type KpiOut = { value: number | null; delta: number | null; spark: number[]; unit?: "count" | "toman" | "percent" };

export type OverviewDashboard = {
  range: DashRange;
  can: Record<string, boolean>;
  generatedAt: string;
  seriesKeys: string[];
  kpis: {
    totalUsers?: KpiOut; activeUsers?: KpiOut; revenue?: KpiOut;
    activeSubs?: KpiOut; churn?: KpiOut; openTickets?: KpiOut;
  };
  chart?: { revenue: number[]; signups: number[]; netRevenue: number; avgOrder: number | null; orders: number };
  queue: QueueItem[];
  queueTotal: number;
  funnel?: { key: string; label: string; count: number }[];
  modules?: { key: string; label: string; percent: number | null }[];
  health?: {
    state: "ok" | "warn" | "bad";
    dbConnected: boolean; dbPingMs: number | null;
    calendarSyncAt: string | null; pushQueue: number | null;
    lastErrorAt: string | null; errors24h: number | null;
  };
  feed: FeedItem[];
  transactions?: {
    id: string; userId: string; user: string; plan: string; amount: number; currency: string;
    status: "paid" | "refunded" | "pending"; at: string;
  }[];
};

const MODULE_LABELS: [ModuleKey, string][] = [
  ["ROUTINE", "روتین"], ["EXERCISE", "ورزش"], ["CALORIE", "کالری"], ["TRADE", "ترید"], ["ROADMAP", "رودمپ"],
];

function displayName(u: { name: string | null; lastName: string | null; username: string | null } | null | undefined): string {
  if (!u) return "کاربر";
  const full = [u.name, u.lastName].filter(Boolean).join(" ").trim();
  return full || (u.username ? `@${u.username}` : "کاربر");
}

const PENDING_MENTOR_WHERE = {
  OR: [{ identityStatus: "PENDING" as const }, { credentials: { some: { status: "PENDING" as const } } }],
};

export async function buildOverview(access: Access, rangeKey: DashRange): Promise<OverviewDashboard> {
  const can = (p: AdminPermission) => hasPermission(access, p);
  const now = new Date();
  const days = dashRangeDays(rangeKey);
  const range: Range = resolveRange(rangeKey === "90d" ? "3m" : rangeKey);
  const span = range.to.getTime() - range.from.getTime();
  const prev: Range = { from: new Date(range.from.getTime() - span), to: range.from, key: range.key };
  const seriesDays = Math.max(days, 7);
  const seriesKeys = lastDayKeys(now, seriesDays);
  const seriesFrom = new Date(now.getTime() - seriesDays * 86400000);
  const dayAgo = new Date(now.getTime() - 86400000);

  const cu = can("users.view"), cf = can("finance"), cs = can("subscriptions"), ca = can("analytics");
  const csup = can("support"), cm = can("mentors"), cc = can("chat"), csys = can("system");

  const out: OverviewDashboard = {
    range: rangeKey,
    can: { users: cu, finance: cf, subscriptions: cs, analytics: ca, support: csup, mentors: cm, chat: cc, system: csys, content: can("content"), discounts: can("discounts") },
    generatedAt: now.toISOString(),
    seriesKeys,
    kpis: {},
    queue: [],
    queueTotal: 0,
    feed: [],
  };

  const tasks: Promise<void>[] = [];

  // --- کاربران کل + ثبت‌نام روزانه
  const signupsNeeded = cu || cf || ca;
  if (signupsNeeded) {
    tasks.push((async () => {
      const [total, newCur, newPrev, recent] = await Promise.all([
        cu ? prisma.user.count({ where: { deletedAt: null } }) : Promise.resolve(0),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: range.from, lte: range.to } } }),
        prisma.user.count({ where: { deletedAt: null, createdAt: { gte: prev.from, lte: prev.to } } }),
        prisma.user.findMany({ where: { deletedAt: null, createdAt: { gte: seriesFrom } }, select: { createdAt: true } }),
      ]);
      const spark = bucketCounts(recent.map((u) => u.createdAt), seriesKeys);
      if (cu) out.kpis.totalUsers = { value: total, delta: deltaPercent(newCur, newPrev), spark, unit: "count" };
      out.chart = { ...(out.chart || { revenue: [], netRevenue: 0, avgOrder: null, orders: 0 }), signups: spark };
    })());
  }

  // --- کاربر فعال
  if (ca) {
    tasks.push((async () => {
      const [cur, pre, rows] = await Promise.all([
        prisma.loginEvent.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true }, distinct: ["userId"] }),
        prisma.loginEvent.findMany({ where: { createdAt: { gte: prev.from, lte: prev.to } }, select: { userId: true }, distinct: ["userId"] }),
        prisma.loginEvent.findMany({ where: { createdAt: { gte: seriesFrom } }, select: { userId: true, createdAt: true } }),
      ]);
      const sets = seriesKeys.map(() => new Set<string>());
      const idx = new Map(seriesKeys.map((k, i) => [k, i]));
      const keyOf = (d: Date) => new Date(d.getTime() + 3.5 * 3600_000).toISOString().slice(0, 10);
      for (const r of rows) {
        const i = idx.get(keyOf(r.createdAt));
        if (i !== undefined) sets[i].add(r.userId);
      }
      out.kpis.activeUsers = { value: cur.length, delta: deltaPercent(cur.length, pre.length), spark: sets.map((s) => s.size), unit: "count" };
    })());
  }

  // --- درآمد (IRR ریال -> تومان) + نمودار + میانگین
  if (cf) {
    tasks.push((async () => {
      const [paid, prevPaid, refunds] = await Promise.all([
        prisma.payment.findMany({ where: { paidAt: { gte: seriesFrom < range.from ? seriesFrom : range.from }, refundedAt: null, currency: "IRR" }, select: { amount: true, paidAt: true } }),
        prisma.payment.findMany({ where: { paidAt: { gte: prev.from, lte: prev.to }, refundedAt: null, currency: "IRR" }, select: { amount: true } }),
        prisma.payment.findMany({ where: { refundedAt: { gte: range.from, lte: range.to }, currency: "IRR" }, select: { amount: true } }),
      ]);
      const inRange = paid.filter((p) => p.paidAt && p.paidAt >= range.from && p.paidAt <= range.to);
      const gross = inRange.reduce((a, p) => a + p.amount, 0);
      const prevGross = prevPaid.reduce((a, p) => a + p.amount, 0);
      const refunded = refunds.reduce((a, p) => a + p.amount, 0);
      const series = bucketSums(paid.map((p) => ({ at: p.paidAt, value: rialToToman(p.amount) })), seriesKeys);
      out.kpis.revenue = { value: rialToToman(gross), delta: deltaPercent(gross, prevGross), spark: series, unit: "toman" };
      out.chart = {
        signups: [],
        ...(out.chart || {}),
        revenue: series,
        netRevenue: rialToToman(gross - refunded),
        avgOrder: inRange.length ? rialToToman(Math.round(gross / inRange.length)) : null,
        orders: inRange.length,
      };
    })());
  }

  // --- اشتراک فعال + ریزش
  if (cs || ca) {
    tasks.push((async () => {
      const [active, newCur, newPrev, recentStarts, canceled, activeAtStart, activeAtPrevStart] = await Promise.all([
        prisma.subscription.count({ where: { status: "ACTIVE", plan: { priceMonthly: { gt: 0 } } } }),
        prisma.subscription.count({ where: { startDate: { gte: range.from, lte: range.to }, plan: { priceMonthly: { gt: 0 } } } }),
        prisma.subscription.count({ where: { startDate: { gte: prev.from, lte: prev.to }, plan: { priceMonthly: { gt: 0 } } } }),
        prisma.subscription.findMany({ where: { startDate: { gte: seriesFrom }, plan: { priceMonthly: { gt: 0 } } }, select: { startDate: true } }),
        prisma.subscription.findMany({ where: { canceledAt: { gte: seriesFrom < prev.from ? seriesFrom : prev.from } }, select: { canceledAt: true } }),
        prisma.subscription.count({ where: { status: "ACTIVE", startDate: { lt: range.from } } }),
        prisma.subscription.count({ where: { status: "ACTIVE", startDate: { lt: prev.from } } }),
      ]);
      if (cs) out.kpis.activeSubs = { value: active, delta: deltaPercent(newCur, newPrev), spark: bucketCounts(recentStarts.map((s) => s.startDate), seriesKeys), unit: "count" };
      if (ca) {
        const cancCur = canceled.filter((c) => c.canceledAt && c.canceledAt >= range.from && c.canceledAt <= range.to).length;
        const cancPrev = canceled.filter((c) => c.canceledAt && c.canceledAt >= prev.from && c.canceledAt < prev.to).length;
        const rate = safeRate(cancCur, activeAtStart);
        const prevRate = safeRate(cancPrev, activeAtPrevStart);
        out.kpis.churn = {
          value: rate,
          delta: rate !== null && prevRate !== null ? deltaPercent(rate, prevRate) : null,
          spark: bucketCounts(canceled.map((c) => c.canceledAt), seriesKeys),
          unit: "percent",
        };
      }
    })());
  }

  // --- تیکت‌ها
  if (csup) {
    tasks.push((async () => {
      const [open, overdue, newCur, newPrev, recent] = await Promise.all([
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.supportTicket.count({ where: { status: "OPEN", updatedAt: { lt: dayAgo } } }),
        prisma.supportTicket.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
        prisma.supportTicket.count({ where: { createdAt: { gte: prev.from, lte: prev.to } } }),
        prisma.supportTicket.findMany({ where: { createdAt: { gte: seriesFrom } }, select: { createdAt: true } }),
      ]);
      out.kpis.openTickets = { value: open, delta: deltaPercent(newCur, newPrev), spark: bucketCounts(recent.map((t) => t.createdAt), seriesKeys), unit: "count" };
      out.queue.push({ key: "tickets", title: "تیکت باز", sub: overdue > 0 ? `${overdue} مورد بیش از 24 ساعت بی‌پاسخ` : "همه در 24 ساعت اخیر", count: open, href: "/admin/support", tone: overdue > 0 ? "red" : "amber" });
    })());
  }

  // --- صف اقدام: منتور، گزارش چت، پرداخت ناموفق، خطای سرور
  if (cm) {
    tasks.push((async () => {
      const n = await prisma.mentorProfile.count({ where: PENDING_MENTOR_WHERE });
      out.queue.push({ key: "mentors", title: "احراز منتور", sub: "منتظر بررسی هویت یا مدرک", count: n, href: "/admin/mentors", tone: "amber" });
    })());
  }
  if (cc) {
    tasks.push((async () => {
      const n = await prisma.tradeChatReport.count({ where: { status: "OPEN" } });
      out.queue.push({ key: "chat", title: "گزارش چت", sub: "منتظر تصمیم", count: n, href: "/admin/chat-reports", tone: "amber" });
    })());
  }
  if (cf) {
    tasks.push((async () => {
      const n = await prisma.payment.count({ where: { paidAt: null, createdAt: { gte: dayAgo } } });
      out.queue.push({ key: "failed", title: "پرداخت ناموفق", sub: "24 ساعت اخیر", count: n, href: "/admin/transactions", tone: "red" });
    })());
  }
  if (csys) {
    tasks.push((async () => {
      const [n, last, status, calendar, push] = await Promise.all([
        prisma.errorLog.count({ where: { createdAt: { gte: dayAgo }, severity: { in: ["ERROR", "CRITICAL"] } } }),
        prisma.errorLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        getSystemStatus(),
        prisma.economicEvent.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
        prisma.pushReminderLog.count({ where: { deadline: { gte: now } } }),
      ]);
      out.queue.push({ key: "errors", title: "خطای سرور", sub: "24 ساعت اخیر", count: n, href: "/admin/system", tone: "red" });
      out.health = {
        state: healthSummary({ dbConnected: status.db.connected, errors24h: n }),
        dbConnected: status.db.connected,
        dbPingMs: status.db.pingMs,
        calendarSyncAt: calendar?.updatedAt.toISOString() ?? null,
        pushQueue: push,
        lastErrorAt: last?.createdAt.toISOString() ?? null,
        errors24h: n,
      };
    })());
  }

  // --- قیف و استفاده‌ی ماژول‌ها
  if (ca) {
    tasks.push((async () => {
      const [fun, signups] = await Promise.all([
        getFunnel(range),
        prisma.user.findMany({ where: { deletedAt: null, createdAt: { gte: range.from, lte: range.to } }, select: { id: true, createdAt: true }, take: 20000 }),
      ]);
      const created = new Map(signups.map((u) => [u.id, u.createdAt.getTime()]));
      let firstWeek = 0;
      if (created.size) {
        const logins = await prisma.loginEvent.findMany({ where: { userId: { in: [...created.keys()] } }, select: { userId: true, createdAt: true } });
        const hit = new Set<string>();
        for (const l of logins) {
          const c = created.get(l.userId);
          if (c !== undefined && l.createdAt.getTime() - c <= 7 * 86400000 && l.createdAt.getTime() >= c) hit.add(l.userId);
        }
        firstWeek = hit.size;
      }
      out.funnel = [
        { key: "signup", label: "ثبت‌نام", count: created.size },
        { key: "first_week", label: "فعال در هفته‌ی اول", count: firstWeek },
        { key: "purchase", label: "خرید", count: fun.find((s) => s.key === "payment_success")?.count ?? 0 },
      ];
    })());
    tasks.push((async () => {
      const [stats, actives] = await Promise.all([
        Promise.all(MODULE_LABELS.map(([m]) => getProductAnalytics(m, range))),
        prisma.loginEvent.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { userId: true }, distinct: ["userId"] }),
      ]);
      out.modules = MODULE_LABELS.map(([key, label], i) => {
        const r = safeRate(stats[i].activeUsers, actives.length);
        return { key, label, percent: r === null ? null : Math.min(100, Math.round(r)) };
      });
    })());
  }

  // --- فید + تراکنش‌ها
  const feedLists: FeedItem[][] = [];
  if (cu) {
    tasks.push((async () => {
      const rows = await prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, lastName: true, username: true, createdAt: true } });
      feedLists.push(rows.map((u) => ({ id: u.id, kind: "signup", text: `${displayName(u)} ثبت‌نام کرد`, at: u.createdAt.toISOString(), href: `/admin/users/${u.id}` })));
    })());
  }
  if (cf) {
    tasks.push((async () => {
      const include = { subscription: { select: { userId: true, user: { select: { name: true, lastName: true, username: true } }, plan: { select: { nameFa: true } } } } };
      const [okRows, badRows] = await Promise.all([
        prisma.payment.findMany({ where: { paidAt: { not: null } }, orderBy: { paidAt: "desc" }, take: 10, include }),
        prisma.payment.findMany({ where: { paidAt: null }, orderBy: { createdAt: "desc" }, take: 10, include }),
      ]);
      feedLists.push(okRows.map((p) => ({ id: p.id, kind: "purchase", text: `${displayName(p.subscription.user)} پلن ${p.subscription.plan.nameFa} خرید`, at: (p.paidAt as Date).toISOString(), href: "/admin/transactions" })));
      feedLists.push(badRows.map((p) => ({ id: p.id, kind: "failed_payment", text: `پرداخت ناموفق ${displayName(p.subscription.user)}`, at: p.createdAt.toISOString(), href: "/admin/transactions" })));
    })());
    tasks.push((async () => {
      const rows = await prisma.payment.findMany({
        orderBy: { createdAt: "desc" }, take: 5,
        include: { subscription: { select: { userId: true, user: { select: { name: true, lastName: true, username: true } }, plan: { select: { nameFa: true } } } } },
      });
      out.transactions = rows.map((p) => ({
        id: p.id, userId: p.subscription.userId, user: displayName(p.subscription.user), plan: p.subscription.plan.nameFa,
        amount: p.amount, currency: p.currency,
        status: p.refundedAt ? "refunded" : p.paidAt ? "paid" : "pending",
        at: (p.paidAt ?? p.createdAt).toISOString(),
      }));
    })());
  }
  if (csup) {
    tasks.push((async () => {
      const rows = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, subject: true, createdAt: true } });
      feedLists.push(rows.map((t) => ({ id: t.id, kind: "ticket", text: `تیکت جدید: ${t.subject.length > 40 ? t.subject.slice(0, 40) + "…" : t.subject}`, at: t.createdAt.toISOString(), href: "/admin/support" })));
    })());
  }
  if (cm) {
    tasks.push((async () => {
      const rows = await prisma.mentorProfile.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, createdAt: true, user: { select: { name: true, lastName: true, username: true } } } });
      feedLists.push(rows.map((m) => ({ id: m.id, kind: "mentor", text: `درخواست منتوری از ${displayName(m.user)}`, at: m.createdAt.toISOString(), href: "/admin/mentors" })));
    })());
  }

  await Promise.all(tasks);

  out.feed = mergeFeed(feedLists, 10);
  const order = ["tickets", "mentors", "chat", "failed", "errors"];
  out.queue.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  out.queueTotal = queueTotal(out.queue);
  if (out.chart && !out.chart.revenue.length) out.chart.revenue = [];
  if (out.chart && !cf) out.chart = { ...out.chart, revenue: [], netRevenue: 0, avgOrder: null, orders: 0 };
  return out;
}
