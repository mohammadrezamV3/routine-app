// حذف تکرار بین فصل‌های خواننده (هر واقعیت فقط یک بار). تابع‌های خالص،
// بدون import سروری.
import type { Insight, WeekNumber } from "@/lib/weeklyAnalysis/types";
import type { LetterDomain } from "./types";

export const MIN_NUMBER_TILES = 2;

/** توکن‌های عددی یک رشته: "14/18" -> ["14","18"]، "+6.3 ساعت" -> ["6.3"] */
export function numTokens(s: string): string[] {
  return (s.match(/\d+(?:\.\d+)?/g) ?? []).map((t) => String(Number(t)));
}

const sameTokens = (a: string[], b: string[]) => a.length > 0 && a.length === b.length && a.every((x, i) => x === b[i]);

// کاشی -> برچسب آمار معادلش در کارت بخش‌ها (مقدارها ممکنه کمی فرق گرد شده باشن)
const TILE_STAT_LABEL: Record<string, string> = {
  routine_done: "برنامه‌های انجام‌شده", routine_perfect: "روزهای کامل", sleep_avg: "میانگین خواب",
  fitness_sessions: "جلسات", nutrition_kcal: "میانگین کالری", trade_count: "معاملات", trade_winrate: "نرخ برد",
  trade_net: "سود/زیان خالص", tasks_done: "انجام‌شده", learning_steps: "مراحل انجام‌شده",
};

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
    const label = TILE_STAT_LABEL[n.key];
    if (label && stats.some((s) => s.label === label)) return false;
    const mine = numTokens(n.value);
    return !stats.some((s) => sameTokens(numTokens(s.value), mine));
  });
  return kept.length >= MIN_NUMBER_TILES ? kept : [];
}

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
const STREAK_RE = /پشت‌سرهم|پیاپی|متوالی/;

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
