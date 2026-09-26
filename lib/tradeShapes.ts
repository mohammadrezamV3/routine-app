// شکل‌دادن خالص پاسخ‌های ماژول ترید — بدون prisma/سرور (فقط `import type`).
// روت‌های وب همین‌ها رو صدا می‌زنن و لایه‌ی آفلاین اپ موبایل هم باید
// دقیقا همین‌ها رو صدا بزنه، تا شکل پاسخ LOCAL و وب هیچ‌وقت از هم دریفت نکنه
// (تست fixture: __tests__/tradeShapes.test.ts).

import { computeTradeStats } from "./tradeAnalytics";
import type { TradeAccount } from "./tradeTypes";

// ─── خلاصه‌ی کارت حساب‌ها (GET /api/trade/accounts) ───────────────────────

export type AccountMtLinkRow = {
  tokenHash: string | null;
  revokedAt: Date | null;
  lastSyncAt: Date | null;
  platform?: string | null;
} | null;

export type AccountSummaryStatRow = {
  accountId: string;
  status: string;
  pnl: number;
  rMultiple: number | null;
  openedAt: Date;
};

type AccountRowBase = { id: string; mtLink: AccountMtLinkRow } & Pick<TradeAccount, "initialBalance" | "goalType" | "goalValue">;

/**
 * هر حساب + خلاصه‌ی کارتش. `stats` معاملات *همه‌ی* حساب‌هاست (یک کوئری)،
 * این‌جا بر اساس accountId گروه می‌شن. هش توکن متاتریدر عمدا بیرون داده
 * نمی‌شه — فقط «متصل هست یا نه» و زمان آخرین sync.
 */
export function shapeAccountSummaries<A extends AccountRowBase>(accounts: A[], stats: AccountSummaryStatRow[]) {
  const byAccount = new Map<string, AccountSummaryStatRow[]>();
  for (const s of stats) {
    if (!byAccount.has(s.accountId)) byAccount.set(s.accountId, []);
    byAccount.get(s.accountId)!.push(s);
  }

  return accounts.map((account) => {
    const { mtLink, ...a } = account;
    const list = (byAccount.get(a.id) || []).map((e) => ({
      status: e.status, pnl: e.pnl, rMultiple: e.rMultiple, openedAt: e.openedAt.toISOString(),
    }));
    const s = computeTradeStats(list as Parameters<typeof computeTradeStats>[0], a);
    return {
      ...a,
      // هش توکن عمدا بیرون داده نمی‌شود — فقط «متصل هست یا نه»
      mtConnected: !!mtLink?.tokenHash && !mtLink.revokedAt,
      mtLastSyncAt: mtLink?.lastSyncAt ? mtLink.lastSyncAt.toISOString() : null,
      summary: {
        tradeCount: s.total,
        closedCount: s.closedCount,
        netPnl: s.netPnl,
        balance: s.balance,
        winRate: s.winRate,
        goalProgress: s.goalProgress,
      },
    };
  });
}

// ─── اسنپ‌شات چک‌لیست معامله (POST/PATCH /api/trade/entries) ───────────────

export type ChecklistSnapshotSource = {
  id: string;
  name: string;
  items: { id: string; text: string }[]; // به ترتیب order
} | null;

export type ChecklistSnapshotData = {
  checklistId: string | null;
  checklistName: string | null;
  checklistDone: number | null;
  checklistTotal: number | null;
  /** null یعنی «بدون چک‌لیست» — روت وب این رو به Prisma.DbNull تبدیل می‌کنه */
  checklistSnapshot: { text: string; checked: boolean }[] | null;
};

/**
 * اسنپ‌شات چک‌لیست در لحظه‌ی ثبت.
 * متن آیتم‌ها کپی می‌شود نه ارجاع داده — اگر کاربر فردا یک آیتم را عوض یا
 * حذف کند، آمار معاملات دیروز نباید بی‌صدا معنی دیگری پیدا کند.
 * چک‌لیست ناقص یا ناموجود هیچ‌وقت جلوی ثبت معامله را نمی‌گیرد.
 */
export function buildChecklistSnapshotData(
  checklist: ChecklistSnapshotSource,
  state: Record<string, boolean>
): ChecklistSnapshotData {
  if (!checklist) {
    return { checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: null };
  }
  const snapshot = checklist.items.map((i) => ({ text: i.text, checked: !!state[i.id] }));
  return {
    checklistId: checklist.id,
    checklistName: checklist.name,
    checklistDone: snapshot.filter((i) => i.checked).length,
    checklistTotal: snapshot.length,
    checklistSnapshot: snapshot,
  };
}

// ─── یادداشت (GET/POST/PATCH /api/trade/notes) ─────────────────────────────

export function serializeNote<N extends { createdAt: Date; updatedAt: Date }>(n: N) {
  return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
}
