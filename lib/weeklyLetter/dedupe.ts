// حذف تکرار بین فصل‌های خواننده (هر واقعیت فقط یک بار). تابع‌های خالص،
// بدون import سروری.
import type { Insight, WeekNumber } from "@/lib/weeklyAnalysis/types";
import type { LetterDomain } from "./types";
import { tr } from "@/lib/i18n";

export const MIN_NUMBER_TILES = 2;

/** توکن‌های عددی یک رشته: "14/18" -> ["14","18"]، "+6.3 ساعت" -> ["6.3"] */
export function numTokens(s: string): string[] {
  return (s.match(/\d+(?:\.\d+)?/g) ?? []).map((t) => String(Number(t)));
}

const sameTokens = (a: string[], b: string[]) => a.length > 0 && a.length === b.length && a.every((x, i) => x === b[i]);

// کاشی -> برچسب آمار معادلش در کارت بخش‌ها (مقدارها ممکنه کمی فرق گرد شده باشن)
// (برچسب‌ها باید دقیقا با برچسب آمار lib/weeklyAnalysis/domains.ts هم‌زبان بمونن)
function tileStatLabel(key: string): string | undefined {
  switch (key) {
    case "routine_done": return tr("برنامه‌های انجام‌شده", "Items completed");
    case "routine_perfect": return tr("روزهای کامل", "Perfect days");
    case "sleep_avg": return tr("میانگین خواب", "Average sleep");
    case "fitness_sessions": return tr("جلسات", "Sessions");
    case "nutrition_kcal": return tr("میانگین کالری", "Average calories");
    case "trade_count": return tr("معاملات", "Trades");
    case "trade_winrate": return tr("نرخ برد", "Win rate");
    case "trade_net": return tr("سود/زیان خالص", "Net profit/loss");
    case "tasks_done": return tr("انجام‌شده", "Completed");
    case "learning_steps": return tr("مراحل انجام‌شده", "Steps completed");
  }
  return undefined;
}

/**
 * کاشی‌های «عددها» بدون اونچه کارت بخش‌ها از قبل نشون می‌ده (آمار همون دامنه با
 * همون مقدار). کاشی بدون دامنه یا با عددی که در کارت دامنه نیست می‌مونه.
 * اگه کمتر از MIN_NUMBER_TILES بمونه، آرایه‌ی خالی برمی‌گرده (بلوک کاشی‌ها رندر نمی‌شه).
 */
export function dedupeNumbers(numbers: WeekNumber[], domains: Pick<LetterDomain, "domain" | "hasData" | "score" | "stats">[]): WeekNumber[] {
  const cards = new Map(domains.filter((d) => d.hasData && d.score !== null).map((d) => [d.domain, d.stats]));
  const kept = numbers.filter((n) => {
    if (!n.domain) return true;
    const stats = cards.get(n.domain);
    if (!stats) return true;
    const label = tileStatLabel(n.key);
    if (label && stats.some((s) => s.label === label)) return false;
    const mine = numTokens(n.value);
    return !stats.some((s) => sameTokens(numTokens(s.value), mine));
  });
  return kept.length >= MIN_NUMBER_TILES ? kept : [];
}

const WEEKDAYS = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه",
  "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
];
const STREAK_RE = /پشت‌سرهم|پیاپی|متوالی|in a row/;

/**
 * بردها بدون: واقعیت‌های استریک (جاشون مدال‌هاست) و بردی که بینش‌ها همونو گفتن
 * (دست‌کم دو عدد مشترک، یا یک عدد مشترک + همون نام روز).
 */
export function dedupeWins(wins: string[], insights: Pick<Insight, "title" | "body">[]): string[] {
  const ins = insights.map((i) => {
    const t = `${i.title} ${i.body}`;
    return { nums: new Set(numTokens(t)), days: WEEKDAYS.filter((d) => t.includes(d)) };
  });
  return wins.filter((w) => {
    if (STREAK_RE.test(w)) return false;
    const wn = numTokens(w);
    const wd = WEEKDAYS.filter((d) => w.includes(d));
    return !ins.some((i) => {
      const shared = new Set(wn.filter((x) => i.nums.has(x))).size;
      return shared >= 2 || (shared >= 1 && wd.some((d) => i.days.includes(d)));
    });
  });
}
