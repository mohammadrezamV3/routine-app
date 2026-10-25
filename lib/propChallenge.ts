// چالش حساب پراپ — منطق خالص (بدون دیتابیس). همه‌ی اعداد پیشرفت هر بار از
// معامله‌های بسته‌ی همون حساب محاسبه می‌شن، هیچ‌وقت ذخیره نمی‌شن؛ فقط «فاز فعلی
// و وضعیتش» (TradePropChallenge) نگه‌داری می‌شه. زمان‌ها UTC و روز = روز UTC
// (همون قرارداد آمار ترید). تشخیص قبولی/شکست ترتیبی روی معامله‌هاست: اگه وسط
// فاز حد ضرر شکسته بشه، حتی با برگشت قیمت بعدا، فاز شکست‌خورده می‌مونه.
//
// قرارداد پایه: همه‌ی درصدها نسبت به «بالانس پایه‌ی فاز» (phaseStartBalance، وگرنه
// بالانس اولیه‌ی موثر حساب) حساب می‌شن. حد ضرر کلی یا ثابته (از بالانس پایه) یا
// تریلینگ (از بالاترین equity فاز). مقدار 0 برای حد ضرر یعنی «بدون حد».

import { checkNumber, type LimitKey } from "./numberLimits";
import { tr } from "./i18n";

export const PROP_MAX_PHASES = 3;
const DAY_MS = 86_400_000;

export type PropPhaseRule = {
  profitTargetPct: number;
  maxDailyLossPct: number;
  maxOverallLossPct: number;
  trailing: boolean;
  minTradingDays: number;
  /** 0 = بدون مهلت */
  timeLimitDays: number;
};

/** قوانین مرحله‌ی فاند (بعد از آخرین فاز): هدف سود نداره، فقط حدهای ضرر */
export type PropFundedRule = {
  maxDailyLossPct: number;
  maxOverallLossPct: number;
  trailing: boolean;
};

export type PropChallengeConfig = {
  /** فازهای ارزیابی: 0 (فاند مستقیم) تا 3 */
  phases: PropPhaseRule[];
  funded: PropFundedRule;
};

export type PropStatus = "ACTIVE" | "PASSED" | "FAILED" | "FUNDED";
export type PropFailReason = "DAILY" | "OVERALL" | "TIME";

export type PropState = {
  /** برابر phases.length یعنی مرحله‌ی فاند */
  currentPhase: number;
  status: PropStatus;
  phaseStartedAt: string | Date;
  phaseEndedAt?: string | Date | null;
  phaseStartBalance: number | null;
};

export type PropHistoryEntry = {
  phase: number;
  result: "PASSED" | "FAILED";
  reason: PropFailReason | null;
  startedAt: string;
  endedAt: string;
  startBalance: number;
  profit: number;
  tradingDays: number;
};

export type PropTrade = {
  pnl: number;
  status: string;
  openedAt: string | Date;
  closedAt?: string | Date | null;
};

export type PropMetrics = {
  baseline: number;
  equity: number;
  profit: number;
  profitPct: number;
  targetPct: number;
  targetAmount: number;
  /** 0..1؛ null وقتی هدفی نیست (فاند) */
  targetProgress: number | null;
  dailyLimitPct: number;
  dailyLimitAmount: number;
  dailyLossUsed: number;
  dailyRemaining: number | null;
  overallLimitPct: number;
  overallLimitAmount: number;
  trailing: boolean;
  drawdown: number;
  overallRemaining: number | null;
  maxDrawdown: number;
  tradingDays: number;
  minTradingDays: number;
  timeLimitDays: number;
  /** null = بدون مهلت */
  daysLeft: number | null;
  tradeCount: number;
};

export type PropEvaluation = {
  status: PropStatus;
  /** لحظه‌ی قبولی/شکست (ISO) وقتی همین ارزیابی اون رو تشخیص داده یا ذخیره شده */
  eventAt: string | null;
  failReason: PropFailReason | null;
  phase: number;
  isFundedStage: boolean;
  metrics: PropMetrics;
};

// ── پیش‌تنظیم‌ها و اعتبارسنجی ──────────────────────────────────────────────

export type PropPresetKey = "ONE" | "TWO" | "THREE" | "INSTANT";

const ph = (t: number, d: number, o: number, min: number, trailing = false, limit = 0): PropPhaseRule => ({
  profitTargetPct: t, maxDailyLossPct: d, maxOverallLossPct: o, trailing, minTradingDays: min, timeLimitDays: limit,
});

export function propPreset(key: PropPresetKey): PropChallengeConfig {
  const funded: PropFundedRule = { maxDailyLossPct: 5, maxOverallLossPct: 10, trailing: false };
  switch (key) {
    case "ONE": return { phases: [ph(10, 4, 6, 4)], funded };
    case "TWO": return { phases: [ph(8, 5, 10, 4), ph(5, 5, 10, 4)], funded };
    case "THREE": return { phases: [ph(6, 5, 10, 3), ph(4, 5, 10, 3), ph(3, 5, 10, 3)], funded };
    case "INSTANT": return { phases: [], funded };
  }
}

export function presetOfConfig(c: PropChallengeConfig): PropPresetKey {
  return c.phases.length === 0 ? "INSTANT" : c.phases.length === 1 ? "ONE" : c.phases.length === 2 ? "TWO" : "THREE";
}

function num(v: unknown, key: LimitKey, allowZero: boolean): number | string {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (n === undefined || n === null || n === "" || (allowZero && Number(n) === 0)) return 0;
  const r = checkNumber(n, key);
  return r.ok ? r.value : r.error;
}

/** ورودی خام (بدنه‌ی API) → config تمیز، یا متن خطا */
export function parsePropConfig(raw: unknown): PropChallengeConfig | string {
  const o = raw as { phases?: unknown; funded?: unknown } | null;
  if (!o || typeof o !== "object" || !Array.isArray(o.phases)) return tr("تنظیمات چالش نامعتبر است", "Invalid challenge settings");
  if (o.phases.length > PROP_MAX_PHASES) return tr(`حداکثر ${PROP_MAX_PHASES} فاز`, `At most ${PROP_MAX_PHASES} phases`);
  const phases: PropPhaseRule[] = [];
  for (const p of o.phases as Record<string, unknown>[]) {
    if (!p || typeof p !== "object") return tr("فاز نامعتبر است", "Invalid phase");
    const target = num(p.profitTargetPct, "propTargetPct", false);
    const daily = num(p.maxDailyLossPct, "propLossPct", true);
    const overall = num(p.maxOverallLossPct, "propLossPct", true);
    const minDays = num(p.minTradingDays, "propMinDays", true);
    const limit = num(p.timeLimitDays, "propTimeLimitDays", true);
    for (const v of [target, daily, overall, minDays, limit]) if (typeof v === "string") return v;
    phases.push({
      profitTargetPct: target as number, maxDailyLossPct: daily as number, maxOverallLossPct: overall as number,
      trailing: p.trailing === true, minTradingDays: Math.round(minDays as number), timeLimitDays: Math.round(limit as number),
    });
  }
  const f = (o.funded && typeof o.funded === "object" ? o.funded : {}) as Record<string, unknown>;
  const fd = num(f.maxDailyLossPct, "propLossPct", true);
  const fo = num(f.maxOverallLossPct, "propLossPct", true);
  if (typeof fd === "string") return fd;
  if (typeof fo === "string") return fo;
  return { phases, funded: { maxDailyLossPct: fd, maxOverallLossPct: fo, trailing: f.trailing === true } };
}

/** config ذخیره‌شده (JSON دیتابیس) → config امن؛ داده‌ی خراب = بدون فاز */
export function readStoredConfig(json: unknown): PropChallengeConfig {
  const r = parsePropConfig(json);
  return typeof r === "string" ? propPreset("INSTANT") : r;
}

export const isFundedStage = (c: PropChallengeConfig, phase: number) => phase >= c.phases.length;

export function initialPropState(c: PropChallengeConfig, now: Date): PropState {
  return { currentPhase: 0, status: c.phases.length ? "ACTIVE" : "FUNDED", phaseStartedAt: now, phaseEndedAt: null, phaseStartBalance: null };
}

// ── محاسبه ─────────────────────────────────────────────────────────────

const ms = (d: string | Date) => (d instanceof Date ? d.getTime() : new Date(d).getTime());
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const r2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 1e-9;

export function evaluatePropChallenge(
  config: PropChallengeConfig,
  state: PropState,
  trades: PropTrade[],
  opts: { now: Date; initialSize: number },
): PropEvaluation {
  const idx = Math.min(Math.max(0, state.currentPhase), config.phases.length);
  const funded = isFundedStage(config, idx);
  const rule = funded
    ? { profitTargetPct: 0, minTradingDays: 0, timeLimitDays: 0, ...config.funded }
    : config.phases[idx];
  const baseline = state.phaseStartBalance ?? opts.initialSize;
  const live = state.status === "ACTIVE" || state.status === "FUNDED";
  const start = ms(state.phaseStartedAt);
  const end = !live && state.phaseEndedAt ? ms(state.phaseEndedAt) : Infinity;

  const targetAmount = baseline > 0 ? (baseline * rule.profitTargetPct) / 100 : 0;
  const dailyLimit = baseline > 0 ? (baseline * rule.maxDailyLossPct) / 100 : 0;
  const overallLimit = baseline > 0 ? (baseline * rule.maxOverallLossPct) / 100 : 0;
  const deadline = rule.timeLimitDays > 0 ? start + rule.timeLimitDays * DAY_MS : null;

  const list = trades
    .filter((t) => t.status === "CLOSED")
    .map((t) => ({ pnl: t.pnl, t: ms(t.closedAt ?? t.openedAt) }))
    .filter((t) => Number.isFinite(t.t) && t.t >= start && t.t <= end)
    .sort((a, b) => a.t - b.t);

  let equity = baseline, peak = baseline, maxDd = 0, count = 0;
  const dayPnl = new Map<string, number>();
  let event: { status: "PASSED" | "FAILED"; reason: PropFailReason | null; at: number } | null = null;

  for (const tr0 of list) {
    if (deadline !== null && tr0.t > deadline) { event = { status: "FAILED", reason: "TIME", at: deadline }; break; }
    equity += tr0.pnl; count++;
    if (equity > peak) peak = equity;
    const k = dayKey(tr0.t);
    const dp = (dayPnl.get(k) ?? 0) + tr0.pnl;
    dayPnl.set(k, dp);
    const dd = Math.max(0, (rule.trailing ? peak : baseline) - equity);
    if (dd > maxDd) maxDd = dd;
    if (dailyLimit > 0 && -dp >= dailyLimit - EPS) { event = { status: "FAILED", reason: "DAILY", at: tr0.t }; break; }
    if (overallLimit > 0 && dd >= overallLimit - EPS) { event = { status: "FAILED", reason: "OVERALL", at: tr0.t }; break; }
    if (!funded && targetAmount > 0 && dayPnl.size >= rule.minTradingDays && equity - baseline >= targetAmount - EPS) {
      event = { status: "PASSED", reason: null, at: tr0.t }; break;
    }
  }
  const nowMs = opts.now.getTime();
  if (!event && live && deadline !== null && nowMs > deadline) event = { status: "FAILED", reason: "TIME", at: deadline };

  // metrics: لحظه‌ی مرجع = زمان رویداد (برای فاز بسته) یا اکنون
  const refMs = event ? event.at : Number.isFinite(end) ? end : nowMs;
  const todayLoss = Math.max(0, -(dayPnl.get(dayKey(refMs)) ?? 0));
  const dd = Math.max(0, (rule.trailing ? peak : baseline) - equity);
  const profit = equity - baseline;

  let status: PropStatus;
  if (!live) status = state.status;
  else if (event) status = event.status;
  else status = funded ? "FUNDED" : "ACTIVE";

  const metrics: PropMetrics = {
    baseline: r2(baseline),
    equity: r2(equity),
    profit: r2(profit),
    profitPct: baseline > 0 ? r2((profit / baseline) * 100) : 0,
    targetPct: rule.profitTargetPct,
    targetAmount: r2(targetAmount),
    targetProgress: !funded && targetAmount > 0 ? Math.max(0, Math.min(1, profit / targetAmount)) : null,
    dailyLimitPct: rule.maxDailyLossPct,
    dailyLimitAmount: r2(dailyLimit),
    dailyLossUsed: r2(todayLoss),
    dailyRemaining: dailyLimit > 0 ? r2(Math.max(0, dailyLimit - todayLoss)) : null,
    overallLimitPct: rule.maxOverallLossPct,
    overallLimitAmount: r2(overallLimit),
    trailing: rule.trailing,
    drawdown: r2(dd),
    overallRemaining: overallLimit > 0 ? r2(Math.max(0, overallLimit - dd)) : null,
    maxDrawdown: r2(maxDd),
    tradingDays: dayPnl.size,
    minTradingDays: rule.minTradingDays,
    timeLimitDays: rule.timeLimitDays,
    daysLeft: deadline !== null ? Math.max(0, Math.ceil((deadline - refMs) / DAY_MS)) : null,
    tradeCount: count,
  };

  return {
    status,
    eventAt: !live ? (state.phaseEndedAt ? new Date(ms(state.phaseEndedAt)).toISOString() : null) : event ? new Date(event.at).toISOString() : null,
    failReason: event?.status === "FAILED" ? event.reason : null,
    phase: idx,
    isFundedStage: funded,
    metrics,
  };
}

// ── انتقال وضعیت ───────────────────────────────────────────────────────

/** تشخیص قبولی/شکست جدید → تغییرات لازم روی رکورد (یا null اگه چیزی عوض نشده) */
export function detectionPatch(
  config: PropChallengeConfig,
  state: PropState,
  ev: PropEvaluation,
): { status: PropStatus; phaseEndedAt: Date; entry: PropHistoryEntry } | null {
  const live = state.status === "ACTIVE" || state.status === "FUNDED";
  if (!live || !ev.eventAt || (ev.status !== "PASSED" && ev.status !== "FAILED")) return null;
  return {
    status: ev.status,
    phaseEndedAt: new Date(ev.eventAt),
    entry: {
      phase: ev.phase,
      result: ev.status,
      reason: ev.failReason,
      startedAt: new Date(ms(state.phaseStartedAt)).toISOString(),
      endedAt: ev.eventAt,
      startBalance: ev.metrics.baseline,
      profit: ev.metrics.profit,
      tradingDays: ev.metrics.tradingDays,
    },
  };
}

/** «رفتن به فاز بعد»: فقط از PASSED. آخرین فاز → مرحله‌ی فاند. بالانس پایه‌ی فاز بعد = بالانس اولیه‌ی موثر */
export function advancePhase(config: PropChallengeConfig, state: PropState, now: Date, initialSize: number): PropState | null {
  if (state.status !== "PASSED") return null;
  const next = state.currentPhase + 1;
  return {
    currentPhase: next,
    status: next >= config.phases.length ? "FUNDED" : "ACTIVE",
    phaseStartedAt: now,
    phaseEndedAt: null,
    phaseStartBalance: initialSize,
  };
}

/** «شروع دوباره»: فقط از FAILED، همون فاز، معامله‌های قبلی از آمار فاز بیرون می‌رن (پاک نمی‌شن) */
export function restartPhase(config: PropChallengeConfig, state: PropState, now: Date, initialSize: number): PropState | null {
  if (state.status !== "FAILED") return null;
  return {
    currentPhase: state.currentPhase,
    status: state.currentPhase >= config.phases.length ? "FUNDED" : "ACTIVE",
    phaseStartedAt: now,
    phaseEndedAt: null,
    phaseStartBalance: initialSize,
  };
}

/** خلاصه‌ی سبک برای نشان فاز در فهرست حساب‌ها */
export type PropChallengeBadge = {
  config: PropChallengeConfig;
  currentPhase: number;
  totalPhases: number;
  status: PropStatus;
};
