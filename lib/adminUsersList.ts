import { prisma } from "@/lib/prisma";
import { ROUTINE_TRIAL_DAYS } from "@/lib/trial";
import {
  ACTIVE_DAYS, NEW_DAYS, RISK_EXPIRY_DAYS, RISK_INACTIVE_DAYS, SORTS, UsersFilters, UsersSort, SortDir,
  deriveUserStatus, isChurnRisk, rangeDays,
} from "@/lib/adminUsersView";

// کوئری لیست کاربران پنل ادمین (فقط خوندن). قوانین «کی روی کی» اینجا نیستن؛
// اقدام‌ها از lib/adminUsers.ts رد می‌شن.

const DAY = 86400000;
const LIST_CAP = 5000; // سقف مرتب‌سازی در حافظه (ltv/آخرین فعالیت) و خروجی CSV

type Where = Record<string, any>;

function activitySince(since: Date): Where {
  return { OR: [{ loginEvents: { some: { createdAt: { gte: since } } } }, { sessions: { some: { lastSeenAt: { gte: since } } } }] };
}
function noActivitySince(since: Date): Where {
  return { AND: [{ loginEvents: { none: { createdAt: { gte: since } } } }, { sessions: { none: { lastSeenAt: { gte: since } } } }] };
}
const paidSub = (extra: Where = {}): Where => ({ subscriptions: { some: { status: "ACTIVE", plan: { priceMonthly: { gt: 0 } }, ...extra } } });

export function buildUsersWhere(f: UsersFilters, now = new Date()): Where {
  const and: Where[] = [];
  const where: Where = { deletedAt: f.tab === "deleted" ? { not: null } : null };

  const q = f.search.trim();
  if (q) {
    and.push({
      OR: [
        { id: q },
        { name: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  switch (f.tab) {
    case "new": and.push({ createdAt: { gte: new Date(now.getTime() - NEW_DAYS * DAY) } }); break;
    case "active": and.push(activitySince(new Date(now.getTime() - ACTIVE_DAYS * DAY))); break;
    case "inactive": and.push(noActivitySince(new Date(now.getTime() - ACTIVE_DAYS * DAY))); break;
    case "paid": and.push(paidSub()); break;
    case "free": and.push({ NOT: paidSub() }); break;
    case "risk":
      and.push(paidSub());
      and.push({
        OR: [
          paidSub({ currentPeriodEnd: { gte: now, lte: new Date(now.getTime() + RISK_EXPIRY_DAYS * DAY) } }),
          noActivitySince(new Date(now.getTime() - RISK_INACTIVE_DAYS * DAY)),
        ],
      });
      break;
    case "blocked": where.isBlocked = true; break;
    case "admins": and.push({ OR: [{ isSuperAdmin: true }, { NOT: { adminPermissions: { isEmpty: true } } }] }); break;
  }

  if (f.plan === "none") and.push({ subscriptions: { none: { status: { in: ["ACTIVE", "TRIAL"] } } } });
  else if (f.plan) and.push({ subscriptions: { some: { status: { in: ["ACTIVE", "TRIAL"] }, planId: f.plan } } });

  if (f.seen === "never") and.push({ AND: [{ loginEvents: { none: {} } }, { sessions: { none: {} } }] });
  else {
    const d = rangeDays(f.seen);
    if (d) and.push(activitySince(new Date(now.getTime() - d * DAY)));
  }
  const sd = rangeDays(f.signup);
  if (sd) and.push({ createdAt: { gte: new Date(now.getTime() - sd * DAY) } });
  if (f.tag) and.push({ adminTags: { some: { tag: f.tag } } });

  if (and.length) where.AND = and;
  return where;
}

type Metrics = { ltv: Map<string, { amount: number; currency: string }>; seen: Map<string, Date | null> };

/** LTV = مجموع پرداخت‌های موفق (paidAt دارد و برگشت نخورده)؛ آخرین فعالیت = دیرترین ورود/بازدید نشست */
async function loadMetrics(ids: string[]): Promise<Metrics> {
  const ltv = new Map<string, { amount: number; currency: string }>();
  const seen = new Map<string, Date | null>();
  if (!ids.length) return { ltv, seen };
  const [pays, logins, sess] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { not: null }, refundedAt: null, subscription: { userId: { in: ids } } },
      select: { amount: true, currency: true, subscription: { select: { userId: true } } },
    }),
    prisma.loginEvent.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { createdAt: true } }),
    prisma.session.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { lastSeenAt: true } }),
  ]);
  const byCur = new Map<string, Map<string, number>>();
  for (const p of pays) {
    const uid = p.subscription.userId;
    const m = byCur.get(uid) || new Map<string, number>();
    m.set(p.currency, (m.get(p.currency) || 0) + p.amount);
    byCur.set(uid, m);
  }
  byCur.forEach((m, uid) => {
    let best: [string, number] = ["", -1];
    m.forEach((amt, cur) => { if (amt > best[1]) best = [cur, amt]; });
    ltv.set(uid, { amount: best[1], currency: best[0] });
  });
  const max = (a?: Date | null, b?: Date | null) => (a && b ? (a > b ? a : b) : a || b || null);
  const lm = new Map(logins.map((g) => [g.userId, g._max.createdAt]));
  const sm = new Map(sess.map((g) => [g.userId, g._max.lastSeenAt]));
  ids.forEach((id) => seen.set(id, max(lm.get(id), sm.get(id))));
  return { ltv, seen };
}

const ROW_SELECT = {
  id: true, name: true, lastName: true, email: true, phone: true, username: true, avatarUrl: true, market: true,
  isSuperAdmin: true, adminPermissions: true, isBlocked: true, deletedAt: true, createdAt: true,
  subscriptions: {
    orderBy: { createdAt: "desc" as const }, take: 5,
    select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, priceMonthly: true } } },
  },
  adminTags: { orderBy: { createdAt: "asc" as const }, select: { tag: true } },
};

export type UserListRow = {
  id: string; name: string | null; lastName: string | null; email: string | null; phone: string | null; username: string | null;
  avatarUrl: string | null; market: string; isSuperAdmin: boolean; isAdmin: boolean; isBlocked: boolean; deletedAt: Date | null; createdAt: Date;
  plan: string | null; status: string; atRisk: boolean; subscriptionExpiresAt: Date | null;
  ltv: { amount: number; currency: string } | null; lastActivityAt: Date | null; tags: string[];
};

async function shape(ids: string[], metrics: Metrics): Promise<UserListRow[]> {
  const rows = await prisma.user.findMany({ where: { id: { in: ids } }, select: ROW_SELECT });
  const now = new Date();
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r).map((u) => {
    const subs = u.subscriptions.map((s) => ({ status: s.status, currentPeriodEnd: s.currentPeriodEnd, priceMonthly: s.plan.priceMonthly }));
    const active = u.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIAL");
    const last = metrics.seen.get(u.id) ?? null;
    return {
      id: u.id, name: u.name, lastName: u.lastName, email: u.email, phone: u.phone, username: u.username, avatarUrl: u.avatarUrl, market: u.market,
      isSuperAdmin: u.isSuperAdmin, isAdmin: u.isSuperAdmin || u.adminPermissions.length > 0, isBlocked: u.isBlocked, deletedAt: u.deletedAt, createdAt: u.createdAt,
      plan: active?.plan.nameFa || null,
      status: deriveUserStatus(u, subs, now, ROUTINE_TRIAL_DAYS),
      atRisk: isChurnRisk(subs, last, now),
      subscriptionExpiresAt: active?.currentPeriodEnd || null,
      ltv: metrics.ltv.get(u.id) || null,
      lastActivityAt: last,
      tags: u.adminTags.map((t) => t.tag),
    };
  });
}

export async function listUsers(f: UsersFilters, opts: { sort?: string; dir?: SortDir; page?: number; pageSize?: number } = {}) {
  const sort: UsersSort = (SORTS as readonly string[]).includes(opts.sort || "") ? (opts.sort as UsersSort) : "newest";
  const dir: SortDir = opts.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize || 25));
  const where = buildUsersWhere(f);
  const total = await prisma.user.count({ where });

  let pageIds: string[];
  let metrics: Metrics;
  if (sort === "ltv" || sort === "seen") {
    // مرتب‌سازی با متریک محاسبه‌شده: تا سقف LIST_CAP کاربر در حافظه
    const all = await prisma.user.findMany({ where, select: { id: true }, orderBy: { createdAt: "desc" }, take: LIST_CAP });
    const m = await loadMetrics(all.map((a) => a.id));
    const key = (id: string) => (sort === "ltv" ? m.ltv.get(id)?.amount ?? 0 : m.seen.get(id)?.getTime() ?? 0);
    const sorted = all.map((a) => a.id).sort((a, b) => (dir === "asc" ? key(a) - key(b) : key(b) - key(a)));
    pageIds = sorted.slice((page - 1) * pageSize, page * pageSize);
    metrics = m;
  } else {
    const orderBy =
      sort === "name" ? [{ name: dir }, { lastName: dir }]
      : sort === "oldest" ? [{ createdAt: "asc" as const }]
      : [{ createdAt: dir }];
    const ids = await prisma.user.findMany({ where, select: { id: true }, orderBy, skip: (page - 1) * pageSize, take: pageSize });
    pageIds = ids.map((i) => i.id);
    metrics = await loadMetrics(pageIds);
  }
  return { users: await shape(pageIds, metrics), total, page, pageSize, capped: total > LIST_CAP && (sort === "ltv" || sort === "seen") };
}

/** همه‌ی ردیف‌های منطبق (یا شناسه‌های انتخاب‌شده) برای CSV — سقف 5000 */
export async function listUsersForExport(f: UsersFilters, ids?: string[]) {
  const where = ids?.length ? { id: { in: ids } } : buildUsersWhere(f);
  const found = await prisma.user.findMany({ where, select: { id: true }, orderBy: { createdAt: "desc" }, take: LIST_CAP });
  const list = found.map((x) => x.id);
  return shape(list, await loadMetrics(list));
}

export async function usersMeta() {
  const [plans, tags, segments] = await Promise.all([
    prisma.plan.findMany({ select: { id: true, nameFa: true }, orderBy: { priceMonthly: "asc" } }),
    prisma.userTag.groupBy({ by: ["tag"], _count: { _all: true }, orderBy: { _count: { tag: "desc" } }, take: 50 }),
    prisma.adminSegment.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, name: true, filters: true } }),
  ]);
  return { plans, tags: tags.map((t) => ({ tag: t.tag, count: t._count._all })), segments };
}

/** شمارنده‌ی هر تب (با همان جست‌وجو/فیلترها، به‌جز خود تب) */
export async function tabCounts(f: UsersFilters) {
  const tabs = ["all", "new", "active", "paid", "risk", "blocked", "deleted"];
  const entries = await Promise.all(tabs.map(async (t) => [t, await prisma.user.count({ where: buildUsersWhere({ ...f, tab: t }) })] as const));
  return Object.fromEntries(entries) as Record<string, number>;
}
