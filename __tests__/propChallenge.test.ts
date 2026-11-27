import { describe, it, expect } from "vitest";
import {
  advancePhase, detectionPatch, evaluatePropChallenge, initialPropState, parsePropConfig,
  propPreset, restartPhase, type PropChallengeConfig, type PropState, type PropTrade,
} from "@/lib/propChallenge";

const T0 = new Date("2026-03-02T00:00:00Z"); // دوشنبه
const SIZE = 10_000;
const day = (n: number, h = 12) => new Date(T0.getTime() + n * 86_400_000 + h * 3_600_000);
const trade = (d: number, pnl: number, h = 12): PropTrade => ({ pnl, status: "CLOSED", openedAt: day(d, h - 1), closedAt: day(d, h) });
const stateOf = (over: Partial<PropState> = {}): PropState => ({ currentPhase: 0, status: "ACTIVE", phaseStartedAt: T0, phaseEndedAt: null, phaseStartBalance: null, ...over });
const ev = (cfg: PropChallengeConfig, trades: PropTrade[], st = stateOf(), nowDay = 30) =>
  evaluatePropChallenge(cfg, st, trades, { now: day(nowDay), initialSize: SIZE });

const one: PropChallengeConfig = { phases: [{ profitTargetPct: 10, maxDailyLossPct: 5, maxOverallLossPct: 10, trailing: false, minTradingDays: 3, timeLimitDays: 0 }], funded: { maxDailyLossPct: 5, maxOverallLossPct: 10, trailing: false } };

describe("evaluatePropChallenge", () => {
  it("بدون معامله: فعال، صفر پیشرفت", () => {
    const r = ev(one, []);
    expect(r.status).toBe("ACTIVE");
    expect(r.metrics.targetProgress).toBe(0);
    expect(r.metrics.dailyRemaining).toBe(500);
    expect(r.metrics.overallRemaining).toBe(1000);
  });

  it("هدف رسید ولی حداقل روز نه → هنوز فعال؛ بعد از روز سوم قبول", () => {
    let r = ev(one, [trade(0, 600), trade(1, 600)]);
    expect(r.status).toBe("ACTIVE");
    expect(r.metrics.profitPct).toBe(12);
    expect(r.metrics.tradingDays).toBe(2);
    r = ev(one, [trade(0, 600), trade(1, 600), trade(2, 10)]);
    expect(r.status).toBe("PASSED");
    expect(r.eventAt).toBe(day(2).toISOString());
    expect(r.metrics.tradingDays).toBe(3);
  });

  it("چند معامله در یک روز یک روز معاملاتی حساب می‌شه", () => {
    const r = ev(one, [trade(0, 100, 9), trade(0, 100, 10), trade(0, 100, 11)]);
    expect(r.metrics.tradingDays).toBe(1);
    expect(r.metrics.tradeCount).toBe(3);
  });

  it("شکست با ضرر روزانه، حتی اگه روز بعد برگرده", () => {
    const r = ev(one, [trade(0, -300, 8), trade(0, -250, 10), trade(1, 5000)]);
    expect(r.status).toBe("FAILED");
    expect(r.failReason).toBe("DAILY");
    expect(r.eventAt).toBe(day(0, 10).toISOString());
  });

  it("ضرر روزانه به تفکیک روز UTC است (دو ضرر در دو روز شکست نیست)", () => {
    const r = ev(one, [trade(0, -400), trade(1, -400)]);
    expect(r.status).toBe("ACTIVE");
    expect(r.metrics.dailyLossUsed).toBe(0);
  });

  it("شکست با حد ضرر کلی ثابت", () => {
    const r = ev(one, [trade(0, -450), trade(1, -450), trade(2, -150)]);
    expect(r.status).toBe("FAILED");
    expect(r.failReason).toBe("OVERALL");
    expect(r.metrics.maxDrawdown).toBe(1050);
  });

  it("تریلینگ: حد از بالاترین equity حساب می‌شه", () => {
    const trailing: PropChallengeConfig = { ...one, phases: [{ ...one.phases[0], trailing: true, profitTargetPct: 50, maxDailyLossPct: 0 }] };
    // +800 بعد -1000 → افت 1000 از قله؛ ثابت بود شکست نبود (equity 9800)
    const t = [trade(0, 800), trade(1, -1000)];
    expect(ev(trailing, t).status).toBe("FAILED");
    expect(ev(trailing, t).failReason).toBe("OVERALL");
    const staticCfg: PropChallengeConfig = { ...trailing, phases: [{ ...trailing.phases[0], trailing: false }] };
    expect(ev(staticCfg, t).status).toBe("ACTIVE");
  });

  it("مهلت زمانی: تموم شدن زمان بدون هدف = شکست TIME؛ معامله بعد از مهلت حساب نمی‌شه", () => {
    const timed: PropChallengeConfig = { ...one, phases: [{ ...one.phases[0], timeLimitDays: 10, minTradingDays: 0 }] };
    let r = ev(timed, [trade(1, 100)], stateOf(), 5);
    expect(r.status).toBe("ACTIVE");
    expect(r.metrics.daysLeft).toBe(5);
    r = ev(timed, [trade(1, 100)], stateOf(), 11);
    expect(r.status).toBe("FAILED");
    expect(r.failReason).toBe("TIME");
    r = ev(timed, [trade(12, 5000)], stateOf(), 13);
    expect(r.failReason).toBe("TIME");
  });

  it("معامله‌های باز و قبل از شروع فاز حساب نمی‌شن", () => {
    const r = ev(one, [{ pnl: -9000, status: "OPEN", openedAt: day(1) }, trade(-3, -9000), trade(1, 50)]);
    expect(r.metrics.tradeCount).toBe(1);
    expect(r.metrics.profit).toBe(50);
  });

  it("فاز بسته با phaseEndedAt بریده می‌شه (معامله‌های بعدی اثر نمی‌ذارن)", () => {
    const st = stateOf({ status: "PASSED", phaseEndedAt: day(2) });
    const r = ev(one, [trade(0, 700), trade(1, 400), trade(2, 10), trade(5, -3000)], st);
    expect(r.status).toBe("PASSED");
    expect(r.metrics.profit).toBe(1110);
  });

  it("مرحله‌ی فاند: هدف ندارد، فقط حد ضرر", () => {
    const st = stateOf({ currentPhase: 1, status: "FUNDED" });
    expect(ev(one, [trade(0, 5000)], st).status).toBe("FUNDED");
    const r = ev(one, [trade(0, -600)], st);
    expect(r.status).toBe("FAILED");
    expect(r.isFundedStage).toBe(true);
  });
});

describe("انتقال فاز", () => {
  const two = propPreset("TWO");

  it("دو مرحله‌ای: فاز 1 → فاز 2 → فاند", () => {
    let st = stateOf();
    let e = ev(two, [trade(0, 300), trade(1, 300), trade(2, 300), trade(3, 100)], st);
    expect(e.status).toBe("PASSED"); // 10% > 8%
    const patch = detectionPatch(two, st, e)!;
    expect(patch.entry).toMatchObject({ phase: 0, result: "PASSED" });
    st = { ...st, status: patch.status, phaseEndedAt: patch.phaseEndedAt };
    const n1 = advancePhase(two, st, day(4), SIZE)!;
    expect(n1).toMatchObject({ currentPhase: 1, status: "ACTIVE", phaseStartBalance: SIZE });
    // معامله‌های فاز قبل دیگه حساب نمی‌شه
    e = ev(two, [trade(0, 300), trade(1, 300), trade(2, 300), trade(3, 100), trade(5, 200)], n1);
    expect(e.metrics.profit).toBe(200);
    expect(e.status).toBe("ACTIVE");
    e = ev(two, [trade(5, 300), trade(6, 100), trade(7, 100), trade(8, 100)], n1);
    expect(e.status).toBe("PASSED"); // 5% از 10000
    const patch2 = detectionPatch(two, n1, e)!;
    const n2 = advancePhase(two, { ...n1, status: patch2.status, phaseEndedAt: patch2.phaseEndedAt }, day(9), SIZE)!;
    expect(n2).toMatchObject({ currentPhase: 2, status: "FUNDED" });
  });

  it("advance فقط از PASSED و restart فقط از FAILED", () => {
    expect(advancePhase(one, stateOf(), day(1), SIZE)).toBeNull();
    expect(advancePhase(one, stateOf({ status: "FAILED" }), day(1), SIZE)).toBeNull();
    expect(restartPhase(one, stateOf(), day(1), SIZE)).toBeNull();
    expect(restartPhase(one, stateOf({ status: "PASSED" }), day(1), SIZE)).toBeNull();
  });

  it("شروع دوباره: همون فاز، آمار از صفر، معامله‌های قدیمی پاک نمی‌شن", () => {
    const trades = [trade(0, -600, 8), trade(0, -600, 9)];
    const e = ev(one, trades);
    expect(e.status).toBe("FAILED");
    const st = stateOf({ status: "FAILED", phaseEndedAt: day(0, 9) });
    const n = restartPhase(one, st, day(2), SIZE)!;
    expect(n.currentPhase).toBe(0);
    expect(n.status).toBe("ACTIVE");
    const e2 = ev(one, [...trades, trade(3, 100)], n);
    expect(e2.metrics.profit).toBe(100);
    expect(e2.status).toBe("ACTIVE");
  });

  it("detectionPatch وقتی فاز بسته‌ست یا رویدادی نیست null می‌ده", () => {
    expect(detectionPatch(one, stateOf(), ev(one, []))).toBeNull();
    const st = stateOf({ status: "PASSED", phaseEndedAt: day(2) });
    expect(detectionPatch(one, st, ev(one, [trade(0, 5000), trade(1, 10), trade(2, 10)], st))).toBeNull();
  });

  it("فاند مستقیم از همان اول FUNDED است", () => {
    const c = propPreset("INSTANT");
    expect(initialPropState(c, T0).status).toBe("FUNDED");
    expect(ev(c, [trade(0, 100)], stateOf({ status: "FUNDED" })).status).toBe("FUNDED");
  });
});

describe("parsePropConfig", () => {
  it("پیش‌تنظیم‌ها معتبرن", () => {
    for (const k of ["ONE", "TWO", "THREE", "INSTANT"] as const) expect(typeof parsePropConfig(propPreset(k))).toBe("object");
    expect(propPreset("TWO").phases.map((p) => p.profitTargetPct)).toEqual([8, 5]);
  });
  it("عدد خارج از حد، هدف صفر و بیش از سه فاز رد می‌شن", () => {
    const p = propPreset("ONE");
    expect(typeof parsePropConfig({ ...p, phases: [{ ...p.phases[0], profitTargetPct: 0 }] })).toBe("string");
    expect(typeof parsePropConfig({ ...p, phases: [{ ...p.phases[0], maxDailyLossPct: 500 }] })).toBe("string");
    expect(typeof parsePropConfig({ ...p, phases: [...p.phases, ...p.phases, ...p.phases, ...p.phases] })).toBe("string");
    expect(typeof parsePropConfig(null)).toBe("string");
  });
  it("حد ضرر خالی یا صفر یعنی بدون حد", () => {
    const p = propPreset("ONE");
    const r = parsePropConfig({ ...p, phases: [{ ...p.phases[0], maxDailyLossPct: "" }] });
    expect(typeof r).toBe("object");
    if (typeof r === "object") expect(r.phases[0].maxDailyLossPct).toBe(0);
  });
});
