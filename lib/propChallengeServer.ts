import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  detectionPatch, evaluatePropChallenge, readStoredConfig,
  type PropChallengeBadge, type PropChallengeConfig, type PropEvaluation, type PropHistoryEntry,
  type PropState, type PropStatus, type PropTrade,
} from "./propChallenge";

// لایه‌ی دیتابیسی چالش پراپ. پیشرفت هر بار از معامله‌ها محاسبه می‌شه؛ اینجا فقط
// قبولی/شکست تازه‌تشخیص‌داده‌شده روی رکورد ثبت می‌شه (و به تاریخچه می‌ره).

export type PropChallengeView = {
  config: PropChallengeConfig;
  state: {
    currentPhase: number;
    status: PropStatus;
    phaseStartedAt: string;
    phaseEndedAt: string | null;
    phaseStartBalance: number | null;
  };
  evaluation: PropEvaluation;
  history: PropHistoryEntry[];
};

type Rec = NonNullable<Awaited<ReturnType<typeof prisma.tradePropChallenge.findFirst>>>;

export const toState = (r: Rec): PropState => ({
  currentPhase: r.currentPhase, status: r.status, phaseStartedAt: r.phaseStartedAt,
  phaseEndedAt: r.phaseEndedAt, phaseStartBalance: r.phaseStartBalance,
});

const readHistory = (json: unknown): PropHistoryEntry[] => (Array.isArray(json) ? (json as PropHistoryEntry[]) : []);

/** بالانس مبنای چالش: بالانس اولیه‌ی موثر + واریز/برداشت (هم‌قاعده‌ی computeTradeStats) */
export const propInitialSize = (m: { initialBalance: number; cashFunding: number }) => m.initialBalance + m.cashFunding;

/** ارزیابی + ثبت قبولی/شکست جدید. رکورد به‌روز و نمای نهایی رو برمی‌گردونه. */
export async function evaluateAndSync(rec: Rec, trades: PropTrade[], initialSize: number, now = new Date()): Promise<{ rec: Rec; view: PropChallengeView }> {
  const config = readStoredConfig(rec.config);
  const state = toState(rec);
  const evaluation = evaluatePropChallenge(config, state, trades, { now, initialSize });
  const patch = detectionPatch(config, state, evaluation);
  let cur = rec;
  if (patch) {
    // شرط status در where: دو درخواست هم‌زمان یک رویداد رو دوبار توی تاریخچه نمی‌ذارن
    const res = await prisma.tradePropChallenge.updateMany({
      where: { id: rec.id, status: rec.status },
      data: {
        status: patch.status,
        phaseEndedAt: patch.phaseEndedAt,
        history: [...readHistory(rec.history), patch.entry] as unknown as Prisma.InputJsonValue,
      },
    });
    if (res.count) cur = (await prisma.tradePropChallenge.findUnique({ where: { id: rec.id } })) ?? rec;
  }
  return {
    rec: cur,
    view: {
      config,
      state: {
        currentPhase: cur.currentPhase, status: cur.status, phaseStartedAt: cur.phaseStartedAt.toISOString(),
        phaseEndedAt: cur.phaseEndedAt ? cur.phaseEndedAt.toISOString() : null, phaseStartBalance: cur.phaseStartBalance,
      },
      evaluation: patch ? { ...evaluation, status: cur.status } : evaluation,
      history: readHistory(cur.history),
    },
  };
}

export async function loadAccountTrades(userId: string, accountId: string): Promise<PropTrade[]> {
  return prisma.tradeEntry.findMany({
    where: { userId, accountId, status: "CLOSED" },
    select: { pnl: true, status: true, openedAt: true, closedAt: true },
    take: 50_000,
  });
}

/** نشان فاز برای فهرست حساب‌ها — همون داده‌ی معامله‌ی لیست رو مصرف می‌کنه، کوئری اضافه نداره (جز خود رکوردها) */
export async function loadPropBadges(
  userId: string,
  accounts: { id: string; type: string; initialBalance: number; cashFunding: number }[],
  tradesBy: Map<string, PropTrade[]>,
): Promise<Map<string, PropChallengeBadge>> {
  const out = new Map<string, PropChallengeBadge>();
  const propIds = accounts.filter((a) => a.type === "PROP").map((a) => a.id);
  if (!propIds.length) return out;
  let recs: Rec[] = [];
  try {
    recs = await prisma.tradePropChallenge.findMany({ where: { userId, accountId: { in: propIds } } });
  } catch (e) {
    console.error("[propChallenge] load failed", e); // مایگریشن اجرا نشده: لیست بدون نشان کار می‌کنه
    return out;
  }
  for (const rec of recs) {
    const acc = accounts.find((a) => a.id === rec.accountId);
    if (!acc) continue;
    const { view } = await evaluateAndSync(rec, tradesBy.get(rec.accountId) ?? [], propInitialSize(acc));
    out.set(rec.accountId, {
      config: view.config, currentPhase: view.state.currentPhase,
      totalPhases: view.config.phases.length, status: view.state.status,
    });
  }
  return out;
}
