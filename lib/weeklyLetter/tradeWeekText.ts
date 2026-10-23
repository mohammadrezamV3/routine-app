// متن‌ها و محتوای قطعی آنالیز هفتگی بخش ترید (بینش، برد و جای پیشرفت، مدال،
// تیتر، مقدمه، تمرکز هفته‌ی بعد، کاشی عددها و خلاصه‌ی عددی برای مربی AI).
// همه تابع خالص روی TradeWeek‌اند (lib/weeklyLetter/tradeWeek.ts)؛ فقط چیزی گفته
// می‌شه که داده پشتشه و همیشه با عدد واقعی. هیچ متن آزاد کاربر وارد نمی‌شه.
import { tr } from "@/lib/i18n";
import { CAL_WEEK_ORDER, weekdayName } from "@/lib/jalali";
import { pl } from "@/lib/weeklyAnalysis/plural";
import { isolateAll, isolateNumbers } from "@/lib/weeklyAnalysis/bidi";
import type { Insight, WeekNumber } from "@/lib/weeklyAnalysis/types";
import type { LetterAchievement, WeeklyLetterData } from "./types";
import { TRADE_AFTER_LOSS_HOURS, TRADE_MIN_FOR_SPLIT, type TradeBucket, type TradeWeek } from "./tradeWeek";
import { suggestTarget } from "./text";

// ───────────────────────── برچسب‌ها ─────────────────────────

export function tradeSessionLabel(key: string): string {
  switch (key) {
    case "TOKYO": return tr("توکیو", "Tokyo");
    case "LONDON": return tr("لندن", "London");
    case "NEWYORK": return tr("نیویورک", "New York");
    case "SYDNEY": return tr("سیدنی", "Sydney");
  }
  return key;
}

export function tradeDirectionLabel(key: string): string {
  return key === "BUY" ? tr("خرید", "Buy") : key === "SELL" ? tr("فروش", "Sell") : key;
}

/** index: 0 = شنبه تا 6 = جمعه */
export function tradeDayLabel(index: number): string {
  return weekdayName(CAL_WEEK_ORDER[Math.max(0, Math.min(6, index))]);
}

export function tradeEmotionLabel(key: string): string {
  switch (key) {
    case "CALM": return tr("آرام", "Calm");
    case "NEUTRAL": return tr("معمولی", "Neutral");
    case "EXCITED": return tr("هیجان‌زده", "Excited");
    case "ANXIOUS": return tr("مضطرب", "Anxious");
    case "ANGRY": return tr("عصبانی", "Angry");
    case "OVERCONFIDENT": return tr("بیش‌ازحد مطمئن", "Overconfident");
  }
  return key;
}

/** مبلغ علامت‌دار با واحد: «+120.5 USD» */
export function fmtMoney(n: number, cur: string | null, signed = true): string {
  const v = Math.round(n * 100) / 100;
  return `${signed && v > 0 ? "+" : ""}${v}${cur ? ` ${cur}` : ""}`;
}

/** مدت به دقیقه → «45 دقیقه» / «2.3 ساعت» */
export function fmtHold(min: number): string {
  if (min < 90) return tr(`${min} دقیقه`, `${min} min`);
  const h = Math.round((min / 60) * 10) / 10;
  return tr(`${h} ساعت`, `${h} h`);
}

const fmtR = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n * 100) / 100}R`;

// ───────────────────────── انتخاب‌های کمکی ─────────────────────────

const rated = (b: TradeBucket) => b.wins + b.losses >= 1;

function bestWorstBucket(list: TradeBucket[], minCount: number): { best: TradeBucket | null; worst: TradeBucket | null } {
  const ok = list.filter((b) => b.count >= minCount);
  if (!ok.length) return { best: null, worst: null };
  const best = ok.reduce((a, b) => (b.net > a.net ? b : a));
  const worst = ok.reduce((a, b) => (b.net < a.net ? b : a));
  return { best: best.net > 0 ? best : null, worst: worst.net < 0 && worst.key !== best.key ? worst : null };
}

const wrText = (b: { winRate: number | null }) => (b.winRate == null ? "-" : `${b.winRate}%`);

// ───────────────────────── بینش‌ها ─────────────────────────

type InsightCand = Insight & { priority: number };

export function buildTradeInsights(t: TradeWeek): Insight[] {
  const c: InsightCand[] = [];
  const cur = t.currency;
  const add = (x: Omit<InsightCand, "domain" | "kind"> & { kind?: Insight["kind"] }) => c.push({ domain: "trading", kind: "correlation", ...x });

  // بهترین / بدترین جلسه
  const ses = bestWorstBucket(t.bySession, 2);
  if (ses.best) {
    const s = tradeSessionLabel(ses.best.key);
    add({
      id: "trade_best_session", icon: "trophy", tone: "good", priority: 80, kind: "best_day",
      title: tr(`جلسه‌ی ${s} جای تو بود`, `The ${s} session was your spot`),
      body: tr(`توی جلسه‌ی ${s} ${ses.best.count} معامله زدی با ${wrText(ses.best)} نرخ برد و ${fmtMoney(ses.best.net, cur)}.`, `In the ${s} session you took ${pl(ses.best.count, "trade")} with a ${wrText(ses.best)} win rate and ${fmtMoney(ses.best.net, cur)}.`),
    });
  }
  if (ses.worst) {
    const s = tradeSessionLabel(ses.worst.key);
    add({
      id: "trade_worst_session", icon: "alert", tone: "bad", priority: 78, kind: "worst_day",
      title: tr(`جلسه‌ی ${s} خرج داشت`, `The ${s} session cost you`),
      body: tr(`توی جلسه‌ی ${s} ${ses.worst.count} معامله زدی و ${fmtMoney(ses.worst.net, cur)} بستی؛ اگه تکرار شد، توی این ساعت‌ها کمتر معامله کن.`, `In the ${s} session you took ${pl(ses.worst.count, "trade")} and closed at ${fmtMoney(ses.worst.net, cur)}; if it repeats, trade less in those hours.`),
    });
  }

  // نمادی که باید کنارش بذاری
  const drop = t.bySymbol.filter((b) => b.count >= 2 && b.net < 0 && rated(b) && (b.winRate ?? 0) <= 40).sort((a, b) => a.net - b.net)[0];
  if (drop) {
    add({
      id: "trade_drop_symbol", icon: "trend_down", tone: "bad", priority: 74, kind: "decline",
      title: tr(`${drop.key} این هفته نخورد`, `${drop.key} did not work this week`),
      body: tr(`با ${drop.key} ${drop.count} معامله زدی، ${wrText(drop)} برد و ${fmtMoney(drop.net, cur)}. شاید بهتر باشه یه مدت کنارش بذاری یا حجمش رو کم کنی.`, `You took ${pl(drop.count, "trade")} on ${drop.key} with a ${wrText(drop)} win rate and ${fmtMoney(drop.net, cur)}. It may be worth sitting it out or cutting its size for a while.`),
    });
  }
  const star = t.bySymbol.filter((b) => b.count >= 2 && b.net > 0).sort((a, b) => b.net - a.net)[0];
  if (star && t.bySymbol.length >= 2) {
    add({
      id: "trade_star_symbol", icon: "trend_up", tone: "good", priority: 60, kind: "improvement",
      title: tr(`${star.key} نماد این هفته‌ت بود`, `${star.key} was your symbol this week`),
      body: tr(`${star.key} با ${star.count} معامله ${fmtMoney(star.net, cur)} آورد (${wrText(star)} نرخ برد).`, `${star.key} brought ${fmtMoney(star.net, cur)} over ${pl(star.count, "trade")} (${wrText(star)} win rate).`),
    });
  }

  // خرید در برابر فروش
  const buy = t.byDirection.find((b) => b.key === "BUY");
  const sell = t.byDirection.find((b) => b.key === "SELL");
  if (buy && sell && buy.count >= 2 && sell.count >= 2 && buy.winRate != null && sell.winRate != null) {
    const gap = Math.abs(buy.winRate - sell.winRate);
    if (gap >= 25 || (buy.net > 0) !== (sell.net > 0)) {
      const better = buy.net >= sell.net ? buy : sell;
      const worse = better === buy ? sell : buy;
      add({
        id: "trade_dir_gap", icon: "link", tone: "neutral", priority: 62,
        title: tr(`${tradeDirectionLabel(better.key)} بهتر از ${tradeDirectionLabel(worse.key)} بود`, `${tradeDirectionLabel(better.key)} beat ${tradeDirectionLabel(worse.key)}`),
        body: tr(`معامله‌های ${tradeDirectionLabel(better.key)} ${wrText(better)} برد و ${fmtMoney(better.net, cur)} داشتن، ولی ${tradeDirectionLabel(worse.key)} ${wrText(worse)} برد و ${fmtMoney(worse.net, cur)}.`, `${tradeDirectionLabel(better.key)} trades had ${wrText(better)} wins and ${fmtMoney(better.net, cur)}, while ${tradeDirectionLabel(worse.key)} had ${wrText(worse)} and ${fmtMoney(worse.net, cur)}.`),
      });
    }
  }

  // انتقام بعد از ضرر
  const al = t.mind.afterLoss;
  if (al.count >= 2 && al.winRate != null && (al.net < 0 || (t.mind.afterLoss.otherWinRate != null && al.winRate + 20 <= t.mind.afterLoss.otherWinRate))) {
    add({
      id: "trade_after_loss", icon: "alert", tone: "bad", priority: 90, kind: "outlier",
      title: tr("بعد از ضرر زود وارد شدی", "You jumped back in after a loss"),
      body: tr(
        `${al.count} معامله رو کمتر از ${TRADE_AFTER_LOSS_HOURS} ساعت بعد از یک ضرر باز کردی؛ نرخ بردشون ${al.winRate}% بود${al.otherWinRate != null ? ` در برابر ${al.otherWinRate}% برای بقیه` : ""} و جمعشون ${fmtMoney(al.net, cur)}. بعد از ضرر چند دقیقه صبر کن.`,
        `You opened ${pl(al.count, "trade")} within ${TRADE_AFTER_LOSS_HOURS} hours of a loss; their win rate was ${al.winRate}%${al.otherWinRate != null ? ` versus ${al.otherWinRate}% for the rest` : ""} and they totalled ${fmtMoney(al.net, cur)}. After a loss, wait a few minutes.`,
      ),
    });
  }

  // هزینه‌ی قانون‌شکنی
  const { broke, kept } = t.mind;
  if (broke.count >= 1 && broke.net < 0) {
    add({
      id: "trade_rule_cost", icon: "alert", tone: "bad", priority: 95, kind: "outlier",
      title: tr("قانون‌شکنی گرون تموم شد", "Breaking the rules was expensive"),
      body: tr(
        `${broke.count} معامله‌ی خارج از قانون (هیجانی یا بدون پلن) ${fmtMoney(broke.net, cur)} خرج داشت${kept.count >= TRADE_MIN_FOR_SPLIT && kept.avg != null ? `؛ معامله‌های منظمت به‌طور میانگین ${fmtMoney(kept.avg, cur)} بودن` : ""}.`,
        `${pl(broke.count, "rule-breaking trade")} (emotional or off-plan) cost ${fmtMoney(broke.net, cur)}${kept.count >= TRADE_MIN_FOR_SPLIT && kept.avg != null ? `; your disciplined trades averaged ${fmtMoney(kept.avg, cur)}` : ""}.`,
      ),
    });
  } else if (broke.count === 0 && t.count >= TRADE_MIN_FOR_SPLIT) {
    add({
      id: "trade_rules_kept", icon: "flame", tone: "good", priority: 70, kind: "consistency",
      title: tr("هیچ معامله‌ی خارج از قانون نداشتی", "Not a single off-rule trade"),
      body: tr(`${t.count} معامله زدی و هیچ‌کدوم هیجانی یا خارج از پلن نبود. همین نظمه که بلندمدت پول می‌سازه.`, `You took ${pl(t.count, "trade")} and none was emotional or off-plan. That order is what builds money over time.`),
    });
  }

  // مدت نگهداری برنده‌ها و بازنده‌ها
  if (t.avgHoldWinMin != null && t.avgHoldLossMin != null && t.wins >= 2 && t.losses >= 2) {
    if (t.avgHoldLossMin >= t.avgHoldWinMin * 1.5) {
      add({
        id: "trade_hold_losers", icon: "zap", tone: "bad", priority: 72, kind: "outlier",
        title: tr("ضررها رو دیر می‌بستی", "You held losers too long"),
        body: tr(`معامله‌های برنده به‌طور میانگین ${fmtHold(t.avgHoldWinMin)} باز بودن ولی بازنده‌ها ${fmtHold(t.avgHoldLossMin)}. ضرر رو زودتر ببند و بذار سود بدوه.`, `Winners stayed open ${fmtHold(t.avgHoldWinMin)} on average but losers ${fmtHold(t.avgHoldLossMin)}. Cut losses sooner and let profits run.`),
      });
    } else if (t.avgHoldWinMin >= t.avgHoldLossMin * 1.5) {
      add({
        id: "trade_hold_winners", icon: "zap", tone: "good", priority: 66, kind: "improvement",
        title: tr("سود رو نگه داشتی، ضرر رو قطع کردی", "You let winners run and cut losers"),
        body: tr(`برنده‌ها ${fmtHold(t.avgHoldWinMin)} و بازنده‌ها ${fmtHold(t.avgHoldLossMin)} باز موندن؛ این الگوی درستیه.`, `Winners stayed open ${fmtHold(t.avgHoldWinMin)} and losers ${fmtHold(t.avgHoldLossMin)}; that is the right pattern.`),
      });
    }
  }

  // ضریب سود و افت
  if (t.profitFactor != null && t.count >= 4) {
    if (t.profitFactor >= 2) {
      add({
        id: "trade_pf", icon: "trend_up", tone: "good", priority: 68, kind: "improvement",
        title: tr(`ضریب سود ${t.profitFactor}`, `Profit factor ${t.profitFactor}`),
        body: tr(`به‌ازای هر 1 واحد ضرر، ${t.profitFactor} واحد سود آوردی؛ بالای 2 یعنی لبه‌ی واقعی.`, `For every 1 unit lost you made ${t.profitFactor} units; above 2 is a real edge.`),
      });
    } else if (t.profitFactor < 1) {
      add({
        id: "trade_pf_low", icon: "trend_down", tone: "bad", priority: 64, kind: "decline",
        title: tr(`ضریب سود زیر 1 (${t.profitFactor})`, `Profit factor below 1 (${t.profitFactor})`),
        body: tr("ضررهات از سودهات بیشتر بود. یا ضررها رو کوچیک‌تر کن یا فقط ستاپ‌های با نرخ برد بالاتر رو بزن.", "Your losses outweighed your gains. Make losses smaller, or take only your higher win-rate setups."),
      });
    }
  }
  if (t.maxDrawdownPct != null && t.maxDrawdownPct >= 50 && t.count >= 4) {
    add({
      id: "trade_dd", icon: "alert", tone: "bad", priority: 61, kind: "outlier",
      title: tr("افت سرمایه‌ی عمیق", "A deep drawdown"),
      body: tr(`از قله‌ی هفته ${fmtMoney(t.maxDrawdown, cur, false)} (${t.maxDrawdownPct}% قله) پایین اومدی. ضرر پشت‌سرهم رو با کم‌کردن حجم کنترل کن.`, `You fell ${fmtMoney(t.maxDrawdown, cur, false)} (${t.maxDrawdownPct}% of the peak) from the week's high. Control losing runs by cutting size.`),
    });
  }

  // مقایسه با هفته‌ی قبل
  const p = t.prev;
  if (p && p.count >= 2 && t.count >= 2) {
    if (p.net != null && cur) {
      const d = Math.round((t.net - p.net) * 100) / 100;
      if (p.net < 0 && t.net > 0) {
        add({
          id: "trade_wow", icon: "trend_up", tone: "good", priority: 76, kind: "improvement",
          title: tr("از قرمز به سبز", "From red to green"),
          body: tr(`هفته‌ی قبل ${fmtMoney(p.net, cur)} بسته بودی و این هفته ${fmtMoney(t.net, cur)}.`, `Last week you closed at ${fmtMoney(p.net, cur)} and this week ${fmtMoney(t.net, cur)}.`),
        });
      } else if (p.net > 0 && t.net < 0) {
        add({
          id: "trade_wow", icon: "trend_down", tone: "bad", priority: 76, kind: "decline",
          title: tr("از سبز به قرمز", "From green to red"),
          body: tr(`هفته‌ی قبل ${fmtMoney(p.net, cur)} بودی و این هفته ${fmtMoney(t.net, cur)}؛ ${fmtMoney(Math.abs(d), cur, false)} افت.`, `You were at ${fmtMoney(p.net, cur)} last week and ${fmtMoney(t.net, cur)} this week; down ${fmtMoney(Math.abs(d), cur, false)}.`),
        });
      }
    }
    if (p.winRate != null && t.winRate != null && Math.abs(t.winRate - p.winRate) >= 15 && !c.some((x) => x.id === "trade_wow")) {
      const up = t.winRate > p.winRate;
      add({
        id: "trade_wow_wr", icon: up ? "trend_up" : "trend_down", tone: up ? "good" : "bad", priority: 58, kind: up ? "improvement" : "decline",
        title: up ? tr("نرخ بردت بالا رفت", "Your win rate went up") : tr("نرخ بردت پایین اومد", "Your win rate went down"),
        body: tr(`نرخ برد از ${p.winRate}% به ${t.winRate}% رسید.`, `Your win rate went from ${p.winRate}% to ${t.winRate}%.`),
      });
    }
  }

  return c
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)
    .map(({ priority: _p, ...rest }) => { void _p; return rest; })
    .map((i) => ({ ...i, title: isolateNumbers(i.title), body: isolateNumbers(i.body) }));
}

// ───────────────────────── بردها و جای پیشرفت ─────────────────────────

type Cand = { text: string; priority: number };
const top = (c: Cand[], n: number) => c.sort((a, b) => b.priority - a.priority).slice(0, n).map((x) => x.text);

export function buildTradeWinsAndImprove(t: TradeWeek): { wins: string[]; improve: string[] } {
  const w: Cand[] = [];
  const b: Cand[] = [];
  const cur = t.currency;
  const { discipline: d, mind } = t;
  const stopPct = d.stop ? Math.round((d.stop.yes / d.stop.of) * 100) : null;
  const planPct = d.plan ? Math.round((d.plan.yes / d.plan.of) * 100) : null;

  if (t.count >= 2 && t.net > 0) w.push({ priority: 90, text: tr(`هفته رو با ${fmtMoney(t.net, cur)} بستی، از ${t.count} معامله.`, `You closed the week at ${fmtMoney(t.net, cur)} from ${pl(t.count, "trade")}.`) });
  if (t.count >= 2 && t.net < 0) b.push({ priority: 90, text: tr(`هفته با ${fmtMoney(t.net, cur)} بسته شد؛ ببین کدوم معامله‌ها بیشترین سهم رو داشتن.`, `The week closed at ${fmtMoney(t.net, cur)}; check which trades did most of the damage.`) });
  if (t.winRate != null && t.count >= 4) {
    if (t.winRate >= 60) w.push({ priority: 70, text: tr(`نرخ بردت ${t.winRate}% بود (${t.wins} برد از ${t.wins + t.losses} معامله‌ی برد و باخت).`, `Your win rate was ${t.winRate}% (${t.wins} wins out of ${pl(t.wins + t.losses, "decided trade")}).`) });
    if (t.winRate < 40) b.push({ priority: 66, text: tr(`نرخ بردت ${t.winRate}% بود؛ فقط ستاپ‌هایی رو بزن که چک‌لیستشون کامله.`, `Your win rate was ${t.winRate}%; take only the setups whose checklist is complete.`) });
  }
  if (t.profitFactor != null && t.profitFactor >= 1.5 && t.count >= 4) w.push({ priority: 72, text: tr(`ضریب سودت ${t.profitFactor} شد؛ سودها از ضررها بزرگ‌تر بودن.`, `Your profit factor was ${t.profitFactor}; wins outweighed losses.`) });
  if (t.avgWin != null && t.avgLoss != null && t.losses >= 2 && Math.abs(t.avgLoss) > t.avgWin * 1.3) {
    b.push({ priority: 68, text: tr(`میانگین ضررت (${fmtMoney(t.avgLoss, cur)}) از میانگین سودت (${fmtMoney(t.avgWin, cur)}) بزرگ‌تره؛ حدضرر رو نزدیک‌تر بذار یا تارگت رو دورتر.`, `Your average loss (${fmtMoney(t.avgLoss, cur)}) is bigger than your average win (${fmtMoney(t.avgWin, cur)}); tighten the stop or push the target out.`) });
  }
  if (t.maxWinStreak >= 3) w.push({ priority: 64, text: tr(`${t.maxWinStreak} برد پشت‌سرهم داشتی.`, `You had ${t.maxWinStreak} wins in a row.`) });
  if (t.maxLossStreak >= 3) b.push({ priority: 76, text: tr(`${t.maxLossStreak} ضرر پشت‌سرهم داشتی؛ بعد از دومین ضرر یه استراحت بذار.`, `You had ${t.maxLossStreak} losses in a row; take a break after the second loss.`) });
  if (stopPct === 100 && d.stop && d.stop.of >= 3) w.push({ priority: 74, text: tr(`روی هر ${d.stop.of} معامله حدضرر گذاشتی.`, `You set a stop loss on all ${pl(d.stop.of, "trade")}.`) });
  if (stopPct != null && stopPct < 80 && d.stop && d.stop.of >= 3) b.push({ priority: 80, text: tr(`${d.stop.of - d.stop.yes} معامله از ${d.stop.of} معامله بدون حدضرر بود.`, `${d.stop.of - d.stop.yes} of ${pl(d.stop.of, "trade")} had no stop loss.`) });
  if (planPct != null && d.plan && d.plan.of >= 3) {
    if (planPct >= 85) w.push({ priority: 73, text: tr(`${planPct}% معامله‌هات طبق پلن بود.`, `${planPct}% of your trades followed the plan.`) });
    if (planPct < 60) b.push({ priority: 78, text: tr(`فقط ${planPct}% معامله‌هات طبق پلن بود.`, `Only ${planPct}% of your trades followed the plan.`) });
  }
  if (d.checklist && d.checklist.of >= 3) {
    const cp = Math.round((d.checklist.full / d.checklist.of) * 100);
    if (cp >= 85) w.push({ priority: 63, text: tr(`چک‌لیست ${d.checklist.full} معامله از ${d.checklist.of} معامله کامل بود.`, `The checklist was complete on ${d.checklist.full} of ${pl(d.checklist.of, "trade")}.`) });
    if (cp < 60) b.push({ priority: 67, text: tr(`چک‌لیست فقط روی ${d.checklist.full} معامله از ${d.checklist.of} معامله کامل بود.`, `The checklist was complete on only ${d.checklist.full} of ${pl(d.checklist.of, "trade")}.`) });
  }
  if (mind.broke.count === 0 && t.count >= TRADE_MIN_FOR_SPLIT) w.push({ priority: 85, text: tr("هیچ معامله‌ی هیجانی یا خارج از پلن نداشتی.", "You had no emotional or off-plan trades.") });
  if (mind.broke.count > 0 && mind.broke.net < 0) b.push({ priority: 92, text: tr(`${mind.broke.count} معامله‌ی خارج از قانون ${fmtMoney(mind.broke.net, cur)} خرج داشت.`, `${pl(mind.broke.count, "off-rule trade")} cost ${fmtMoney(mind.broke.net, cur)}.`) });
  if (mind.afterLoss.count >= 2 && mind.afterLoss.net < 0) b.push({ priority: 88, text: tr(`معامله‌های کمتر از ${TRADE_AFTER_LOSS_HOURS} ساعت بعد از ضرر جمعا ${fmtMoney(mind.afterLoss.net, cur)} شدن.`, `Trades opened within ${TRADE_AFTER_LOSS_HOURS} hours of a loss totalled ${fmtMoney(mind.afterLoss.net, cur)}.`) });
  if (t.count > 12) b.push({ priority: 60, text: tr(`${t.count} معامله توی یک هفته زیاده؛ کمتر و با کیفیت‌تر.`, `${pl(t.count, "trade")} in one week is a lot; fewer, better ones.`) });

  const wins = top(w, 3);
  if (!wins.length && t.count >= 1) wins.push(tr(`${t.count} معامله ثبت کردی؛ ثبت منظم پایه‌ی بهتر شدنه.`, `You logged ${pl(t.count, "trade")}; consistent logging is the base of getting better.`));
  return { wins: isolateAll(wins), improve: isolateAll(top(b, 3)) };
}

// ───────────────────────── مدال‌های هفته ─────────────────────────

export function buildTradeMedals(t: TradeWeek): LetterAchievement[] {
  const out: LetterAchievement[] = [];
  const add = (key: string, emoji: string, title: string, description: string) => out.push({ key: `trade_${key}`, emoji, title, description, source: "weekly" });
  const cur = t.currency;
  if (t.net > 0 && t.count >= 3) add("green_week", "📈", tr("هفته‌ی سبز", "Green week"), tr(`هفته رو با ${fmtMoney(t.net, cur)} بستی.`, `You closed the week at ${fmtMoney(t.net, cur)}.`));
  if (t.profitFactor != null && t.profitFactor >= 2 && t.count >= 4) add("pf2", "⚖️", tr("ضریب سود بالای 2", "Profit factor above 2"), tr(`ضریب سود ${t.profitFactor} از ${t.count} معامله.`, `A profit factor of ${t.profitFactor} over ${pl(t.count, "trade")}.`));
  if (t.mind.broke.count === 0 && t.count >= TRADE_MIN_FOR_SPLIT) add("no_breaks", "🛡️", tr("بدون قانون‌شکنی", "No rule breaks"), tr(`${t.count} معامله، صفر معامله‌ی هیجانی یا خارج از پلن.`, `${pl(t.count, "trade")}, zero emotional or off-plan ones.`));
  if (t.discipline.stop && t.discipline.stop.of >= 3 && t.discipline.stop.yes === t.discipline.stop.of) add("all_sl", "🎯", tr("همه با حدضرر", "Every trade with a stop"), tr(`روی هر ${t.discipline.stop.of} معامله حدضرر بود.`, `All ${pl(t.discipline.stop.of, "trade")} had a stop loss.`));
  if (t.maxWinStreak >= 3) add("streak3", "🔥", tr(`${t.maxWinStreak} برد پیاپی`, `${t.maxWinStreak} wins in a row`), tr(`بلندترین رشته‌ی بردت ${t.maxWinStreak} معامله بود.`, `Your longest winning run was ${pl(t.maxWinStreak, "trade")}.`));
  if (t.expectancy != null && t.expectancy > 0 && t.count >= 5) add("expectancy", "🧮", tr("امید ریاضی مثبت", "Positive expectancy"), tr(`به‌ازای هر معامله به‌طور میانگین ${fmtMoney(t.expectancy, cur)}.`, `On average ${fmtMoney(t.expectancy, cur)} per trade.`));
  if (t.discipline.checklist && t.discipline.checklist.of >= 3 && t.discipline.checklist.full === t.discipline.checklist.of) add("full_list", "✅", tr("چک‌لیست کامل", "Complete checklists"), tr(`چک‌لیست هر ${t.discipline.checklist.of} معامله کامل بود.`, `The checklist was complete on all ${pl(t.discipline.checklist.of, "trade")}.`));
  return out.map((m) => ({ ...m, description: isolateNumbers(m.description) }));
}

// ───────────────────────── تیتر و مقدمه ─────────────────────────

export function buildTradeHeadline(t: TradeWeek, isCurrent: boolean): string {
  const cur = t.currency;
  if (t.count === 0) {
    return t.open > 0
      ? tr(`${t.open} معامله‌ی بازت هنوز بسته نشده`, `Your ${pl(t.open, "open trade")} ${t.open === 1 ? "is" : "are"} not closed yet`)
      : tr("این هفته معامله‌ی بسته‌ای نداشتی", "You had no closed trades this week");
  }
  const so = isCurrent ? tr("تا الان ", "") : "";
  const soEn = isCurrent ? " so far" : "";
  const wr = t.winRate != null ? tr(` و ${t.winRate}% نرخ برد`, ` and a ${t.winRate}% win rate`) : "";
  if (t.net > 0) return isolateNumbers(tr(`${so}هفته سبزه: ${fmtMoney(t.net, cur)} با ${t.count} معامله${wr}`, `A green week${soEn}: ${fmtMoney(t.net, cur)} from ${pl(t.count, "trade")}${wr}`));
  if (t.net < 0) return isolateNumbers(tr(`${so}هفته قرمزه: ${fmtMoney(t.net, cur)} با ${t.count} معامله${wr}`, `A red week${soEn}: ${fmtMoney(t.net, cur)} from ${pl(t.count, "trade")}${wr}`));
  return isolateNumbers(tr(`${so}هفته سر به سر شد، ${t.count} معامله${wr}`, `A break-even week${soEn}, ${pl(t.count, "trade")}${wr}`));
}

export function buildTradeIntro(t: TradeWeek, weekLabel: string): string {
  const cur = t.currency;
  if (t.count === 0) {
    return tr(`برای هفته‌ی ${weekLabel} معامله‌ی بسته‌شده‌ای ثبت نشده بود، پس هنوز عددی برای جمع‌بندی نداریم.`, `No closed trades were logged for the week of ${weekLabel}, so there are no numbers to sum up yet.`);
  }
  const pf = t.profitFactor != null ? tr(` و ضریب سود ${t.profitFactor}`, ` and a profit factor of ${t.profitFactor}`) : "";
  const wr = t.winRate != null ? tr(`، ${t.winRate}% نرخ برد`, `, a ${t.winRate}% win rate`) : "";
  const s1 = tr(`هفته‌ی ${weekLabel} رو با ${fmtMoney(t.net, cur)} از ${t.count} معامله بستی${wr}${pf}.`, `You closed the week of ${weekLabel} at ${fmtMoney(t.net, cur)} from ${pl(t.count, "trade")}${wr}${pf}.`);

  let s2 = "";
  const d = t.discipline;
  const parts: string[] = [];
  if (d.plan) parts.push(tr(`${Math.round((d.plan.yes / d.plan.of) * 100)}% طبق پلن`, `${Math.round((d.plan.yes / d.plan.of) * 100)}% on plan`));
  if (d.stop) parts.push(tr(`${Math.round((d.stop.yes / d.stop.of) * 100)}% با حدضرر`, `${Math.round((d.stop.yes / d.stop.of) * 100)}% with a stop`));
  if (parts.length) s2 = tr(` از نظر انضباط، ${parts.join(" و ")} بود.`, ` On discipline: ${parts.join(", ")}.`);

  let s3 = "";
  if (t.mind.broke.count > 0 && t.mind.broke.net < 0) {
    s3 = tr(` ${t.mind.broke.count} معامله‌ی خارج از قانون ${fmtMoney(t.mind.broke.net, cur)} خرج داشت.`, ` ${pl(t.mind.broke.count, "off-rule trade")} cost ${fmtMoney(t.mind.broke.net, cur)}.`);
  } else {
    const ses = bestWorstBucket(t.bySession, 2).best;
    if (ses) s3 = tr(` قوی‌ترین جلسه‌ت ${tradeSessionLabel(ses.key)} بود.`, ` Your strongest session was ${tradeSessionLabel(ses.key)}.`);
  }
  let s4 = "";
  if (t.prev?.net != null && cur) {
    const diff = Math.round((t.net - t.prev.net) * 100) / 100;
    if (diff !== 0) s4 = tr(` نسبت به هفته‌ی قبل ${fmtMoney(Math.abs(diff), cur, false)} ${diff > 0 ? "بهتر" : "کمتر"} بود.`, ` That is ${fmtMoney(Math.abs(diff), cur, false)} ${diff > 0 ? "better" : "lower"} than last week.`);
  }
  return isolateNumbers(`${s1}${s2}${s3}${s4}`);
}

// ───────────────────────── هفته‌ی بعد ─────────────────────────

export type TradeNextWeek = { focusTitle: string; focusText: string; suggestedTarget: number | null };

export function buildTradeNextWeek(t: TradeWeek, disciplineScore: number | null): TradeNextWeek {
  const target = disciplineScore != null ? suggestTarget(disciplineScore) : null;
  const cur = t.currency;
  const d = t.discipline;
  const stopMissing = d.stop ? d.stop.of - d.stop.yes : 0;
  const al = t.mind.afterLoss;
  let title: string;
  let text: string;

  if (t.count === 0) {
    title = tr("تمرکز هفته‌ی بعد: ثبت معامله", "Next week's focus: logging trades");
    text = tr("هفته‌ی بعد هر معامله رو با حدضرر، دلیل ورود و چک‌لیست ثبت کن؛ با چند معامله، آنالیز هفتگی دقیق می‌شه.", "Next week, log every trade with a stop loss, an entry reason and the checklist; with a few trades the weekly review becomes accurate.");
  } else if (al.count >= 2 && al.net < 0) {
    title = tr("تمرکز هفته‌ی بعد: صبر بعد از ضرر", "Next week's focus: patience after a loss");
    text = tr(`بعد از هر ضرر حداقل ${TRADE_AFTER_LOSS_HOURS} ساعت معامله باز نکن. این هفته ${al.count} معامله‌ی سریع بعد از ضرر ${fmtMoney(al.net, cur)} شد. هدف: صفر معامله‌ی انتقامی.`, `After every loss, do not open a trade for at least ${TRADE_AFTER_LOSS_HOURS} hours. This week ${pl(al.count, "quick re-entry")} totalled ${fmtMoney(al.net, cur)}. Goal: zero revenge trades.`);
  } else if (t.mind.broke.count > 0 && t.mind.broke.net < 0) {
    title = tr("تمرکز هفته‌ی بعد: فقط معامله‌ی طبق پلن", "Next week's focus: on-plan trades only");
    text = tr(`${t.mind.broke.count} معامله‌ی هیجانی یا خارج از پلن ${fmtMoney(t.mind.broke.net, cur)} خرج داشت. قبل از هر ورود چک‌لیست رو کامل کن؛ هدف: صفر معامله‌ی خارج از قانون.`, `${pl(t.mind.broke.count, "emotional or off-plan trade")} cost ${fmtMoney(t.mind.broke.net, cur)}. Complete the checklist before every entry; goal: zero off-rule trades.`);
  } else if (stopMissing > 0) {
    title = tr("تمرکز هفته‌ی بعد: حدضرر روی همه‌ی معامله‌ها", "Next week's focus: a stop on every trade");
    text = tr(`${stopMissing} معامله بدون حدضرر بود. هفته‌ی بعد حدضرر رو قبل از ورود بذار؛ هدف: 100% معامله با حدضرر.`, `${pl(stopMissing, "trade")} had no stop loss. Next week set the stop before you enter; goal: 100% of trades with a stop.`);
  } else if (t.maxLossStreak >= 3) {
    title = tr("تمرکز هفته‌ی بعد: قطع رشته‌ی ضرر", "Next week's focus: break the losing run");
    text = tr(`${t.maxLossStreak} ضرر پشت‌سرهم داشتی. قانون بذار: بعد از دو ضرر پشت‌سرهم، اون روز تموم.`, `You had ${t.maxLossStreak} losses in a row. Set a rule: after two losses in a row, you are done for the day.`);
  } else {
    const ses = bestWorstBucket(t.bySession, 2);
    const sym = t.bySymbol.filter((b) => b.count >= 2 && b.net < 0).sort((a, b) => a.net - b.net)[0];
    if (ses.worst) {
      title = tr(`تمرکز هفته‌ی بعد: کمتر در جلسه‌ی ${tradeSessionLabel(ses.worst.key)}`, `Next week's focus: less in the ${tradeSessionLabel(ses.worst.key)} session`);
      text = tr(`جلسه‌ی ${tradeSessionLabel(ses.worst.key)} ${fmtMoney(ses.worst.net, cur)} خرج داشت. هفته‌ی بعد اونجا فقط بهترین ستاپ‌ها رو بزن${ses.best ? ` و انرژیت رو بذار برای ${tradeSessionLabel(ses.best.key)}` : ""}.`, `The ${tradeSessionLabel(ses.worst.key)} session cost ${fmtMoney(ses.worst.net, cur)}. Next week take only your best setups there${ses.best ? ` and save your energy for ${tradeSessionLabel(ses.best.key)}` : ""}.`);
    } else if (sym) {
      title = tr(`تمرکز هفته‌ی بعد: ${sym.key}`, `Next week's focus: ${sym.key}`);
      text = tr(`${sym.key} با ${sym.count} معامله ${fmtMoney(sym.net, cur)} شد. هفته‌ی بعد حجمش رو نصف کن یا فقط ستاپ‌های اصلی رو روش بزن.`, `${sym.key} ended at ${fmtMoney(sym.net, cur)} over ${pl(sym.count, "trade")}. Next week halve its size or take only your core setups on it.`);
    } else {
      title = tr("تمرکز هفته‌ی بعد: همین روند", "Next week's focus: keep this up");
      text = tr(`انضباط و نتیجه‌ی این هفته خوب بود. هفته‌ی بعد همین قانون‌ها رو تکرار کن و حجم رو بی‌دلیل بالا نبر.`, `Your discipline and results were good this week. Repeat the same rules next week and do not raise size without reason.`);
    }
  }
  if (target != null && t.count > 0) text += tr(` هدف پیشنهادی امتیاز انضباط: ${target}.`, ` Suggested discipline score target: ${target}.`);
  return { focusTitle: title, focusText: isolateNumbers(text), suggestedTarget: target };
}

// ───────────────────────── کاشی‌های عددها ─────────────────────────

export function buildTradeNumbers(t: TradeWeek): WeekNumber[] {
  const out: WeekNumber[] = [];
  const cur = t.currency;
  const add = (key: string, label: string, value: string, tone: WeekNumber["tone"], unit?: string, hint?: string) =>
    out.push({ key, label, value: isolateNumbers(value), unit, domain: "trading", tone, hint: hint ? isolateNumbers(hint) : undefined });
  if (t.avgWin != null) add("trade_avg_win", tr("میانگین سود", "Average win"), `${t.avgWin}`, "good", cur ?? undefined);
  if (t.avgLoss != null) add("trade_avg_loss", tr("میانگین ضرر", "Average loss"), `${t.avgLoss}`, "bad", cur ?? undefined);
  if (t.maxDrawdown > 0) add("trade_dd", tr("بیشترین افت", "Max drawdown"), `${t.maxDrawdown}`, t.maxDrawdownPct != null && t.maxDrawdownPct >= 50 ? "bad" : "neutral", cur ?? undefined, t.maxDrawdownPct != null ? tr(`${t.maxDrawdownPct}% قله‌ی هفته`, `${t.maxDrawdownPct}% of the weekly peak`) : undefined);
  if (t.maxWinStreak >= 2 || t.maxLossStreak >= 2) {
    add("trade_streak", tr("بلندترین رشته‌ی برد", "Longest win streak"), `${t.maxWinStreak}`, t.maxWinStreak >= 3 ? "good" : "neutral", tr("معامله", "trades"), t.maxLossStreak >= 2 ? tr(`بلندترین رشته‌ی ضرر ${t.maxLossStreak}`, `longest losing run ${t.maxLossStreak}`) : undefined);
  }
  if (t.avgHoldMin != null) {
    const long = t.avgHoldMin >= 90;
    add("trade_hold", tr("میانگین نگهداری", "Average hold"), long ? `${Math.round((t.avgHoldMin / 60) * 10) / 10}` : `${t.avgHoldMin}`, "neutral", long ? tr("ساعت", "h") : tr("دقیقه", "min"));
  }
  return out.slice(0, 6);
}

// ───────────────────────── مربی AI ─────────────────────────

/** خلاصه‌ی عددی لاغر برای مربی؛ فقط عدد و برچسب ثابت، هیچ متن آزاد کاربر (یادداشت، نام ستاپ/تگ) */
export type TradeCoachInput = {
  currency: string | null;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  net: number;
  profitFactor: number | null;
  expectancyPerTrade: number | null;
  totalR: number | null;
  maxDrawdown: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgHoldMinutes: { all: number | null; winners: number | null; losers: number | null };
  disciplinePct: { followedPlan: number | null; fullChecklist: number | null; withStopLoss: number | null };
  ruleBreaks: { trades: number; net: number; emotionalTrades: number };
  afterLoss: { trades: number; winRatePct: number | null; net: number };
  bestSession: string | null;
  worstSession: string | null;
  bestSymbol: string | null;
  worstSymbol: string | null;
  buy: { trades: number; winRatePct: number | null; net: number } | null;
  sell: { trades: number; winRatePct: number | null; net: number } | null;
  previousWeek: { closedTrades: number; net: number | null; winRatePct: number | null; planPct: number | null } | null;
};

export function buildTradeCoachInput(t: TradeWeek): TradeCoachInput {
  const p = (x: { yes: number; of: number } | null) => (x ? Math.round((x.yes / x.of) * 100) : null);
  const ses = bestWorstBucket(t.bySession, 2);
  const symBuckets = t.bySymbol.filter((b) => b.count >= 2);
  const bestSym = symBuckets.filter((b) => b.net > 0).sort((a, b) => b.net - a.net)[0];
  const worstSym = symBuckets.filter((b) => b.net < 0).sort((a, b) => a.net - b.net)[0];
  const dir = (k: string) => {
    const b = t.byDirection.find((x) => x.key === k);
    return b ? { trades: b.count, winRatePct: b.winRate, net: b.net } : null;
  };
  return {
    currency: t.currency,
    closedTrades: t.count,
    openTrades: t.open,
    wins: t.wins,
    losses: t.losses,
    winRatePct: t.winRate,
    net: t.net,
    profitFactor: t.profitFactor,
    expectancyPerTrade: t.expectancy,
    totalR: t.totalR,
    maxDrawdown: t.maxDrawdown,
    maxWinStreak: t.maxWinStreak,
    maxLossStreak: t.maxLossStreak,
    avgHoldMinutes: { all: t.avgHoldMin, winners: t.avgHoldWinMin, losers: t.avgHoldLossMin },
    disciplinePct: {
      followedPlan: p(t.discipline.plan),
      fullChecklist: t.discipline.checklist ? Math.round((t.discipline.checklist.full / t.discipline.checklist.of) * 100) : null,
      withStopLoss: p(t.discipline.stop),
    },
    ruleBreaks: { trades: t.mind.broke.count, net: t.mind.broke.net, emotionalTrades: t.mind.emotional.count },
    afterLoss: { trades: t.mind.afterLoss.count, winRatePct: t.mind.afterLoss.winRate, net: t.mind.afterLoss.net },
    bestSession: ses.best?.key ?? null,
    worstSession: ses.worst?.key ?? null,
    bestSymbol: bestSym?.key ?? null,
    worstSymbol: worstSym?.key ?? null,
    buy: dir("BUY"),
    sell: dir("SELL"),
    previousWeek: t.prev ? { closedTrades: t.prev.count, net: t.prev.net, winRatePct: t.prev.winRate, planPct: t.prev.planPct } : null,
  };
}

// ───────────────────────── جمع‌بندی روی هفته‌نامه ─────────────────────────

/**
 * محتوای بخش ترید رو روی هفته‌نامه‌ی ساخته‌شده اعمال می‌کنه: تیتر و مقدمه درباره‌ی
 * سود/نرخ برد/انضباط، بینش‌ها، بردها، مدال‌ها، کاشی‌ها و تمرکز هفته‌ی بعد.
 * فقط وقتی معامله‌ی واقعی بود (trade != null)؛ وگرنه هفته‌نامه دست‌نخورده می‌مونه.
 */
export function applyTradeToLetter(
  letter: WeeklyLetterData,
  trade: TradeWeek | null,
  opts: { isCurrent: boolean; disciplineScore: number | null },
): WeeklyLetterData {
  if (!trade) return letter;
  const { wins, improve } = buildTradeWinsAndImprove(trade);
  const nw = buildTradeNextWeek(trade, opts.disciplineScore);
  const medals = buildTradeMedals(trade);
  const numbers = buildTradeNumbers(trade);
  return {
    ...letter,
    trade,
    headline: buildTradeHeadline(trade, opts.isCurrent),
    intro: buildTradeIntro(trade, letter.weekLabel),
    insights: buildTradeInsights(trade),
    wins,
    improve,
    achievements: [...medals, ...letter.achievements.filter((a) => a.source === "global")],
    numbers,
    nextWeek: { focusDomain: "trading", focusTitle: nw.focusTitle, focusText: nw.focusText, suggestedTarget: nw.suggestedTarget },
  };
}
