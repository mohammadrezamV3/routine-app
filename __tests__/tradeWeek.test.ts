import { describe, expect, it } from "vitest";
import { computeTradeWeek, isEmotionalTrade, type TradeWeekRow } from "@/lib/weeklyLetter/tradeWeek";
import {
  applyTradeToLetter, buildTradeCoachInput, buildTradeHeadline, buildTradeInsights, buildTradeIntro, buildTradeMedals,
  buildTradeNextWeek, buildTradeNumbers, buildTradeWinsAndImprove, fmtHold, fmtMoney,
} from "@/lib/weeklyLetter/tradeWeekText";
import { normalizeLetter } from "@/components/WeeklyLetterUtils";
import { buildStorySlides } from "@/components/WeeklyLetterStoriesData";

// هفته‌ی شنبه 2026-10-17 تا جمعه 2026-10-23، منطقه‌ی UTC
const WS = "2026-10-17";
const WE = "2026-10-23";
const OPTS = { tz: "UTC", weekStart: WS, weekEnd: WE };

let seq = 0;
function row(over: Partial<TradeWeekRow> & { open: string; close?: string | null }): TradeWeekRow {
  seq++;
  const { open, close, ...rest } = over as Partial<TradeWeekRow> & { open: string; close?: string | null };
  const base: TradeWeekRow = {
    openedAt: new Date(open),
    closedAt: close === undefined ? new Date(new Date(open).getTime() + 60 * 60_000) : close === null ? null : new Date(close),
    status: "CLOSED",
    result: "PROFIT",
    pnl: 100,
    symbol: "EURUSD",
    direction: "BUY",
    sessions: ["LONDON"],
    setup: null,
    tags: [],
    rMultiple: null,
    checklistDone: 4,
    checklistTotal: 4,
    followedPlan: true,
    stopLoss: 1.05,
    entryReasons: ["STRATEGY"],
    exitReasons: ["TAKE_PROFIT"],
    emotionBefore: "CALM",
    confidence: 7,
    currency: "USD",
  };
  void seq;
  return { ...base, ...rest };
}
const win = (open: string, pnl = 100, over: Partial<TradeWeekRow> = {}) => row({ open, pnl, result: "PROFIT", ...over });
const loss = (open: string, pnl = -50, over: Partial<TradeWeekRow> = {}) => row({ open, pnl, result: "LOSS", ...over });

describe("computeTradeWeek", () => {
  it("returns null with no real trades (canceled only, or outside the week)", () => {
    expect(computeTradeWeek([], OPTS)).toBeNull();
    expect(computeTradeWeek([row({ open: "2026-10-18T10:00:00Z", status: "CANCELED" })], OPTS)).toBeNull();
    expect(computeTradeWeek([win("2026-10-10T10:00:00Z")], OPTS)).toBeNull();
  });

  it("computes net, win rate, profit factor, expectancy and averages", () => {
    const t = computeTradeWeek([
      win("2026-10-18T08:00:00Z", 200), win("2026-10-19T08:00:00Z", 100), loss("2026-10-20T08:00:00Z", -100), loss("2026-10-21T08:00:00Z", -50),
    ], OPTS)!;
    expect(t.count).toBe(4);
    expect(t.net).toBe(150);
    expect(t.winRate).toBe(50);
    expect(t.avgWin).toBe(150);
    expect(t.avgLoss).toBe(-75);
    expect(t.profitFactor).toBe(2);
    expect(t.expectancy).toBe(37.5);
  });

  it("profit factor is null without both wins and losses", () => {
    expect(computeTradeWeek([win("2026-10-18T08:00:00Z"), win("2026-10-19T08:00:00Z")], OPTS)!.profitFactor).toBeNull();
  });

  it("builds the equity curve in closing order and finds max drawdown with its range", () => {
    const t = computeTradeWeek([
      win("2026-10-17T08:00:00Z", 100), win("2026-10-18T08:00:00Z", 100), loss("2026-10-19T08:00:00Z", -80), loss("2026-10-20T08:00:00Z", -70), win("2026-10-21T08:00:00Z", 60),
    ], OPTS)!;
    expect(t.curve.map((p) => p.v)).toEqual([0, 100, 200, 120, 50, 110]);
    expect(t.maxDrawdown).toBe(150);
    expect(t.maxDrawdownPct).toBe(75);
    expect(t.ddRange).toEqual([2, 4]);
    expect(t.bestIdx).toBe(1);
    expect(t.worstIdx).toBe(3);
    expect(t.best?.pnl).toBe(100);
    expect(t.worst?.pnl).toBe(-80);
  });

  it("drawdown is zero for a monotonic curve", () => {
    const t = computeTradeWeek([win("2026-10-18T08:00:00Z"), win("2026-10-19T08:00:00Z")], OPTS)!;
    expect(t.maxDrawdown).toBe(0);
    expect(t.ddRange).toBeNull();
    expect(t.worst).toBeNull();
  });

  it("computes streaks and per-day nets (Saturday first)", () => {
    const t = computeTradeWeek([
      win("2026-10-17T08:00:00Z"), win("2026-10-17T10:00:00Z"), win("2026-10-18T08:00:00Z"), loss("2026-10-19T08:00:00Z"), loss("2026-10-19T10:00:00Z"),
    ], OPTS)!;
    expect(t.maxWinStreak).toBe(3);
    expect(t.maxLossStreak).toBe(2);
    expect(t.days[0]).toEqual({ count: 2, net: 200 });
    expect(t.days[2].count).toBe(2);
    expect(t.byWeekday.map((b) => b.key)).toEqual(["0", "1", "2"]);
  });

  it("R multiples and hold times", () => {
    const t = computeTradeWeek([
      win("2026-10-18T08:00:00Z", 100, { rMultiple: 2, closedAt: new Date("2026-10-18T10:00:00Z") }),
      loss("2026-10-19T08:00:00Z", -50, { rMultiple: -1, closedAt: new Date("2026-10-19T08:30:00Z") }),
    ], OPTS)!;
    expect(t.totalR).toBe(1);
    expect(t.avgR).toBe(0.5);
    expect(t.avgHoldMin).toBe(75);
    expect(t.avgHoldWinMin).toBe(120);
    expect(t.avgHoldLossMin).toBe(30);
  });

  it("a trade with several sessions counts in each one", () => {
    const t = computeTradeWeek([win("2026-10-18T14:00:00Z", 100, { sessions: ["LONDON", "NEWYORK"] }), loss("2026-10-19T08:00:00Z", -50, { sessions: ["LONDON"] })], OPTS)!;
    expect(t.bySession.map((b) => [b.key, b.count])).toEqual([["LONDON", 2], ["NEWYORK", 1]]);
    expect(t.bySession[0].net).toBe(50);
  });

  it("buckets by symbol (top 5), direction, setup and tag", () => {
    const rows = ["A", "B", "C", "D", "E", "F"].map((s, i) => win(`2026-10-18T0${i + 1}:00:00Z`, 10 + i, { symbol: s }));
    rows.push(loss("2026-10-19T08:00:00Z", -20, { symbol: "A", direction: "SELL", setup: " Breakout ", tags: ["news"] }));
    const t = computeTradeWeek(rows, OPTS)!;
    expect(t.bySymbol.length).toBe(5);
    expect(t.bySymbol[0].key).toBe("A");
    expect(t.byDirection.map((b) => b.key)).toEqual(["BUY", "SELL"]);
    expect(t.bySetup[0].key).toBe("Breakout");
    expect(t.byTag[0].key).toBe("news");
  });

  it("discipline percentages come from all real trades, open ones included", () => {
    const t = computeTradeWeek([
      win("2026-10-18T08:00:00Z", 100, { followedPlan: true, stopLoss: 1 }),
      loss("2026-10-19T08:00:00Z", -50, { followedPlan: false, stopLoss: null, checklistDone: 2 }),
      row({ open: "2026-10-20T08:00:00Z", status: "OPEN", close: null, followedPlan: null, stopLoss: 1 }),
    ], OPTS)!;
    expect(t.discipline.total).toBe(3);
    expect(t.discipline.plan).toEqual({ yes: 1, of: 2 });
    expect(t.discipline.stop).toEqual({ yes: 2, of: 3 });
    expect(t.discipline.checklist).toEqual({ full: 2, of: 3 });
    expect(t.open).toBe(1);
    expect(t.count).toBe(2);
  });

  it("cost of breaking the rules: emotional or off-plan trades vs the rest", () => {
    const t = computeTradeWeek([
      win("2026-10-18T08:00:00Z", 100),
      win("2026-10-18T10:00:00Z", 100),
      loss("2026-10-19T08:00:00Z", -120, { entryReasons: ["FOMO"] }),
      loss("2026-10-19T10:00:00Z", -60, { followedPlan: false }),
      loss("2026-10-20T08:00:00Z", -40, { exitReasons: ["EMOTIONAL"] }),
    ], OPTS)!;
    expect(t.mind.emotional).toEqual({ count: 2, net: -160 });
    expect(t.mind.broke.count).toBe(3);
    expect(t.mind.broke.net).toBe(-220);
    expect(t.mind.kept).toEqual({ count: 2, net: 200, avg: 100 });
    expect(isEmotionalTrade({ entryReasons: ["REVENGE"], exitReasons: [] })).toBe(true);
    expect(isEmotionalTrade({ entryReasons: ["STRATEGY"], exitReasons: ["TAKE_PROFIT"] })).toBe(false);
  });

  it("emotion buckets and confidence of wins vs losses", () => {
    const t = computeTradeWeek([
      win("2026-10-18T08:00:00Z", 100, { emotionBefore: "CALM", confidence: 8 }),
      loss("2026-10-19T08:00:00Z", -50, { emotionBefore: "ANGRY", confidence: 4 }),
      loss("2026-10-19T12:00:00Z", -50, { emotionBefore: "ANGRY", confidence: 6 }),
    ], OPTS)!;
    expect(t.mind.byEmotion[0]).toMatchObject({ key: "ANGRY", count: 2, net: -100 });
    expect(t.mind.confidenceWin).toBe(8);
    expect(t.mind.confidenceLoss).toBe(5);
  });

  it("after-loss behavior: opened within 2 hours of a losing close", () => {
    const t = computeTradeWeek([
      loss("2026-10-18T08:00:00Z", -50, { closedAt: new Date("2026-10-18T09:00:00Z") }),
      loss("2026-10-18T09:30:00Z", -40, { closedAt: new Date("2026-10-18T10:00:00Z") }),
      win("2026-10-18T10:30:00Z", 30, { closedAt: new Date("2026-10-18T11:00:00Z") }),
      win("2026-10-19T08:00:00Z", 100),
    ], OPTS)!;
    expect(t.mind.afterLoss.count).toBe(2);
    expect(t.mind.afterLoss.wins).toBe(1);
    expect(t.mind.afterLoss.losses).toBe(1);
    expect(t.mind.afterLoss.net).toBe(-10);
    expect(t.mind.afterLoss.otherWinRate).toBe(50);
  });

  it("mixed currencies: only the dominant currency is counted", () => {
    const t = computeTradeWeek([
      win("2026-10-18T08:00:00Z", 100), win("2026-10-19T08:00:00Z", 100), win("2026-10-20T08:00:00Z", 999, { currency: "EUR" }),
    ], OPTS)!;
    expect(t.currency).toBe("USD");
    expect(t.mixed).toBe(true);
    expect(t.count).toBe(2);
    expect(t.net).toBe(200);
  });

  it("respects the local timezone when assigning the day", () => {
    // 23:30 UTC on Saturday is already Sunday in Tehran (UTC+3:30)
    const t = computeTradeWeek([win("2026-10-17T23:30:00Z")], { ...OPTS, tz: "Asia/Tehran" })!;
    expect(t.days[1].count).toBe(1);
    expect(t.days[0].count).toBe(0);
  });

  it("compares with the previous week", () => {
    const rows = [
      win("2026-10-10T08:00:00Z", 100), loss("2026-10-11T08:00:00Z", -300),
      win("2026-10-18T08:00:00Z", 200), win("2026-10-19T08:00:00Z", 100),
    ];
    const t = computeTradeWeek(rows, { ...OPTS, prevRows: rows, prevWeekStart: "2026-10-10", prevWeekEnd: "2026-10-16" })!;
    expect(t.prev).toMatchObject({ count: 2, net: -200, winRate: 50 });
    expect(computeTradeWeek(rows, OPTS)!.prev).toBeNull();
  });
});

function sample(rows: TradeWeekRow[]) {
  return computeTradeWeek(rows, OPTS)!;
}

const goodWeek = () => sample([
  win("2026-10-18T08:00:00Z", 200, { rMultiple: 2 }), win("2026-10-18T12:00:00Z", 150), win("2026-10-19T08:00:00Z", 120, { sessions: ["NEWYORK"] }),
  loss("2026-10-20T08:00:00Z", -60, { sessions: ["NEWYORK"] }), win("2026-10-21T08:00:00Z", 90),
]);
const badWeek = () => sample([
  loss("2026-10-18T08:00:00Z", -100, { closedAt: new Date("2026-10-18T10:00:00Z"), sessions: ["TOKYO"], symbol: "GBPJPY", entryReasons: ["FOMO"], followedPlan: false, stopLoss: null }),
  loss("2026-10-18T10:30:00Z", -120, { closedAt: new Date("2026-10-18T11:00:00Z"), sessions: ["TOKYO"], symbol: "GBPJPY", entryReasons: ["REVENGE"], followedPlan: false, stopLoss: null }),
  loss("2026-10-18T11:30:00Z", -80, { closedAt: new Date("2026-10-18T12:30:00Z"), sessions: ["TOKYO"], symbol: "GBPJPY", stopLoss: null }),
  win("2026-10-20T08:00:00Z", 50, { closedAt: new Date("2026-10-20T08:20:00Z"), sessions: ["LONDON"] }),
  win("2026-10-21T08:00:00Z", 40, { closedAt: new Date("2026-10-21T08:20:00Z"), sessions: ["LONDON"] }),
]);

describe("trade text generators", () => {
  it("formats money and hold times", () => {
    expect(fmtMoney(12.345, "USD")).toBe("+12.35 USD");
    expect(fmtMoney(-5, null)).toBe("-5");
    expect(fmtMoney(5, "USD", false)).toBe("5 USD");
    expect(fmtHold(45)).toContain("45");
    expect(fmtHold(150)).toContain("2.5");
  });

  it("insights are bounded, unique, trading-scoped and tell the bad week story", () => {
    const ins = buildTradeInsights(badWeek());
    expect(ins.length).toBeGreaterThan(0);
    expect(ins.length).toBeLessThanOrEqual(6);
    expect(new Set(ins.map((i) => i.id)).size).toBe(ins.length);
    expect(ins.every((i) => i.domain === "trading" && i.title && i.body)).toBe(true);
    const ids = ins.map((i) => i.id);
    expect(ids).toContain("trade_rule_cost");
    expect(ids).toContain("trade_after_loss");
    expect(ids).toContain("trade_worst_session");
  });

  it("a good week yields positive insights and no rule-cost warning", () => {
    const ins = buildTradeInsights(goodWeek());
    const ids = ins.map((i) => i.id);
    expect(ids).not.toContain("trade_rule_cost");
    expect(ids).toContain("trade_rules_kept");
  });

  it("insight needs enough data: one trade gives no session or symbol insight", () => {
    const ids = buildTradeInsights(sample([win("2026-10-18T08:00:00Z")])).map((i) => i.id);
    expect(ids).not.toContain("trade_best_session");
    expect(ids).not.toContain("trade_drop_symbol");
  });

  it("wins and improve: at most 3 each and they match the data", () => {
    const g = buildTradeWinsAndImprove(goodWeek());
    expect(g.wins.length).toBeGreaterThan(0);
    expect(g.wins.length).toBeLessThanOrEqual(3);
    const b = buildTradeWinsAndImprove(badWeek());
    expect(b.improve.length).toBeGreaterThan(0);
    expect(b.improve.length).toBeLessThanOrEqual(3);
    expect(b.improve.join(" ")).toMatch(/\d/);
  });

  it("medals: a clean green week earns several, a bad week none of the positive ones", () => {
    const keys = buildTradeMedals(goodWeek()).map((m) => m.key);
    expect(keys).toContain("trade_green_week");
    expect(keys).toContain("trade_no_breaks");
    expect(keys).toContain("trade_all_sl");
    expect(keys).toContain("trade_streak3");
    const bad = buildTradeMedals(badWeek()).map((m) => m.key);
    expect(bad).not.toContain("trade_green_week");
    expect(bad).not.toContain("trade_no_breaks");
    expect(bad).not.toContain("trade_all_sl");
    expect(buildTradeMedals(goodWeek()).every((m) => m.source === "weekly")).toBe(true);
  });

  it("headline and intro mention the net result", () => {
    const g = goodWeek();
    expect(buildTradeHeadline(g, false)).toContain("500");
    expect(buildTradeIntro(g, "x").length).toBeGreaterThan(30);
    const b = badWeek();
    expect(buildTradeHeadline(b, false)).toContain("-210");
  });

  it("next week focus is concrete and picks the biggest problem first", () => {
    expect(buildTradeNextWeek(badWeek(), 55).focusTitle.length).toBeGreaterThan(5);
    expect(buildTradeNextWeek(badWeek(), 55).suggestedTarget).toBe(65);
    expect(buildTradeNextWeek(goodWeek(), null).suggestedTarget).toBeNull();
  });

  it("number tiles have unique keys and no duplicates of the curve KPIs", () => {
    const nums = buildTradeNumbers(goodWeek());
    expect(new Set(nums.map((n) => n.key)).size).toBe(nums.length);
    expect(nums.some((n) => n.key === "trade_net" || n.key === "trade_winrate")).toBe(false);
  });

  it("coach input has only numbers and fixed labels (no free text)", () => {
    const c = buildTradeCoachInput(badWeek());
    const json = JSON.stringify(c);
    expect(c.closedTrades).toBe(5);
    expect(c.ruleBreaks.trades).toBe(2);
    expect(c.worstSession).toBe("TOKYO");
    expect(json).not.toMatch(/note|setup|tag/i);
  });

  it("applyTradeToLetter keeps the letter when there is no trade and overrides text when there is", () => {
    const base = normalizeLetter({
      v: 1, issueNo: 1, weekStart: WS, weekEnd: WE, weekLabel: "x", generatedAt: "", headline: "H", intro: "I", greetingName: null,
      overall: { score: 70, prevScore: null, delta: null, grade: "B", consistency: null, activeDays: 3, rank: null },
      days: [], domains: [], numbers: [], trend: [], insights: [], wins: ["w"], improve: ["i"],
      achievements: [{ key: "g", title: "g", description: "d", emoji: "🏆", source: "global" }, { key: "old", title: "o", description: "d", emoji: "x", source: "weekly" }],
      goals: [], reflection: null, ai: null, nextWeek: { focusDomain: null, focusTitle: "", focusText: "", suggestedTarget: null }, streak: null,
    } as never)!;
    expect(applyTradeToLetter(base, null, { isCurrent: false, disciplineScore: 70 })).toBe(base);
    const out = applyTradeToLetter(base, goodWeek(), { isCurrent: false, disciplineScore: 70 });
    expect(out.trade).toBeTruthy();
    expect(out.headline).not.toBe("H");
    expect(out.insights.length).toBeGreaterThan(0);
    expect(out.nextWeek.focusDomain).toBe("trading");
    expect(out.achievements.some((a) => a.key === "g")).toBe(true);
    expect(out.achievements.some((a) => a.key === "old")).toBe(false);
    // داستان بخش ترید: اسلایدهای مخصوص ترید
    const ids = buildStorySlides(out).map((s) => s.id);
    expect(ids).toContain("tradeCurve");
    expect(ids).toContain("tradeMind");
    expect(ids[0]).toBe("intro");
    expect(ids[ids.length - 1]).toBe("summary");
  });
});
