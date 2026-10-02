import { prisma } from "./prisma";
import { effectiveAccountMoney, summarizeCashflows, type AccountMoney } from "./metatrader";

/**
 * پول هر حساب (بالانس اولیه‌ی موثر، واریز/برداشت، هزینه‌ها) — منبع واحد برای
 * فهرست حساب‌ها، داشبورد، تطبیق موجودی متاتریدر و کارنامه‌ی اشتراکی تا همه یک
 * عدد نشون بدن (lib/metatrader.ts → effectiveAccountMoney).
 * اگه جدول گردش پول در دسترس نباشه (مایگریشن اجرا نشده) همون عدد دستی برمی‌گرده.
 */
export async function loadAccountMoney(accounts: { id: string; initialBalance: number }[]): Promise<Map<string, AccountMoney>> {
  const ids = accounts.map((a) => a.id);
  let sums: { accountId: string; kind: string; _sum: { amount: number | null } }[] = [];
  let firsts: { accountId: string; amount: number }[] = [];
  if (ids.length) {
    try {
      [sums, firsts] = await Promise.all([
        prisma.tradeCashflow.groupBy({ by: ["accountId", "kind"], where: { accountId: { in: ids } }, _sum: { amount: true } }),
        prisma.tradeCashflow.findMany({
          where: { accountId: { in: ids }, kind: "DEPOSIT", amount: { gt: 0 } },
          orderBy: [{ occurredAt: "asc" }, { externalId: "asc" }],
          distinct: ["accountId"],
          select: { accountId: true, amount: true },
        }),
      ]);
    } catch (e) {
      console.error("[tradeCashflow] load failed", e);
    }
  }
  const out = new Map<string, AccountMoney>();
  for (const a of accounts) {
    const cf = summarizeCashflows(sums.filter((c) => c.accountId === a.id).map((c) => ({ kind: c.kind, amount: c._sum.amount ?? 0 })));
    const first = firsts.find((f) => f.accountId === a.id)?.amount ?? null;
    out.set(a.id, effectiveAccountMoney(a.initialBalance, cf, first));
  }
  return out;
}
