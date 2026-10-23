// ابزارهای ترید (چارت، چک‌لیست‌ها، یادداشت‌ها، متاتریدر) — سمت سرور.
//
// مشترک بین هاب قدیمی (lib/tradeHub.ts) و داشبورد بخش ترید (lib/dashboardServer.ts).
// این فایل عمدا dashboardServer رو import نمی‌کنه (وابستگی حلقوی).
// هر کوئری با userId محدود می‌شه؛ متن معامله/عکس/یادداشت خصوصی منتور select نمی‌شن.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { SETTING_KEYS } from "./userSettingKeys";
import type { FeatureKey } from "./featureFlags";
import type { DashTradeTools } from "./dashboardTypes";
import type { HubChecklists, HubNote } from "./tradeHubTypes";
import { noteExcerpt } from "./tradeHubCompute";

type Ctx = { userId: string; date: string; tz: number };
type Features = Record<FeatureKey, boolean>;

/** مثل safe() داشبورد: خطا → null + ثبت اسم بخش */
async function safeRun<T>(name: string, errors: string[], fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error("[dashboard]", name, e instanceof Prisma.PrismaClientKnownRequestError ? e.code : e);
    errors.push(name);
    return null;
  }
}

// ── چارت: آخرین نماد + نمادهای اخیر ژورنال ───────────────────
export async function buildChart({ userId }: Ctx): Promise<{ lastSymbol: string | null; recentSymbols: string[] }> {
  const [setting, rows] = await Promise.all([
    prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: SETTING_KEYS.tradeChartSymbol } },
      select: { value: true },
    }),
    prisma.tradeEntry.findMany({
      where: { userId, account: { archived: false } },
      orderBy: { openedAt: "desc" },
      take: 40,
      select: { symbol: true },
    }),
  ]);
  const last = typeof setting?.value === "string" && /^[A-Za-z0-9]{3,16}$/.test(setting.value) ? setting.value.toUpperCase() : null;
  const recent: string[] = [];
  for (const r of rows) if (!recent.includes(r.symbol)) recent.push(r.symbol);
  return { lastSymbol: last, recentSymbols: recent.slice(0, 4) };
}

// ── چک‌لیست‌ها ───────────────────────────────────────────────
export async function buildChecklists({ userId }: Ctx): Promise<HubChecklists> {
  const [rows, lastUse] = await Promise.all([
    prisma.tradeChecklist.findMany({
      where: { userId, archived: false },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: 30,
      select: { id: true, name: true, items: { select: { checked: true } } },
    }),
    prisma.tradeEntry.findFirst({
      where: { userId, checklistId: { not: null }, checklist: { archived: false } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, checklistId: true },
    }),
  ]);
  const pick = rows.find((r) => r.id === lastUse?.checklistId) ?? rows[0] ?? null;
  return {
    count: rows.length,
    featured: pick
      ? { id: pick.id, name: pick.name, total: pick.items.length, checked: pick.items.filter((i) => i.checked).length }
      : null,
    lastUsedAt: lastUse ? lastUse.createdAt.toISOString() : null,
  };
}

// ── یادداشت‌ها ───────────────────────────────────────────────
export async function buildNotes({ userId }: Ctx): Promise<{ count: number; latest: HubNote | null }> {
  const [count, latest] = await Promise.all([
    prisma.tradeNote.count({ where: { userId } }),
    prisma.tradeNote.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, content: true, updatedAt: true },
    }),
  ]);
  return {
    count,
    latest: latest
      ? { id: latest.id, title: latest.title, excerpt: noteExcerpt(latest.content.slice(0, 600), latest.title), updatedAt: latest.updatedAt.toISOString() }
      : null,
  };
}

// ── اتصال متاتریدر ───────────────────────────────────────────
export async function buildMetatrader({ userId }: Ctx): Promise<{ connected: number; lastSyncAt: string | null }> {
  // «متصل» = توکن فعال و لغونشده روی یک حساب غیرآرشیو (همون تعریف روت /api/trade/metatrader)
  const where = { userId, tokenHash: { not: null }, revokedAt: null, account: { archived: false } } as const;
  const [connected, last] = await Promise.all([
    prisma.tradeMtLink.count({ where }),
    prisma.tradeMtLink.findFirst({ where: { ...where, lastSyncAt: { not: null } }, orderBy: { lastSyncAt: "desc" }, select: { lastSyncAt: true } }),
  ]);
  return { connected, lastSyncAt: last?.lastSyncAt ? last.lastSyncAt.toISOString() : null };
}

/** خلاصه‌ی ابزارهای ترید برای داشبورد؛ هر زیربخش با فلگ خودش، خطا → null */
export async function buildTradeTools(ctx: Ctx, features: Features, errors: string[]): Promise<DashTradeTools> {
  const none = Promise.resolve(null);
  const [chart, checklists, notes, metatrader] = await Promise.all([
    features.tradeChart ? safeRun("tradeChart", errors, () => buildChart(ctx)) : none,
    features.tradeChecklists ? safeRun("tradeChecklists", errors, () => buildChecklists(ctx)) : none,
    features.tradeNotes ? safeRun("tradeNotes", errors, () => buildNotes(ctx)) : none,
    features.metatrader ? safeRun("metatrader", errors, () => buildMetatrader(ctx)) : none,
  ]);
  return { chart, checklists, notes, metatrader };
}
