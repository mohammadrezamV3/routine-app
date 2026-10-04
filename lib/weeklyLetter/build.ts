// سازنده‌ی «هفته‌نامه»: از خروجی کامل آنالیز یک هفته (همون getWeeklyAnalysis، بدون
// تکرار محاسبه) + چند کوئری کوچیک اضافه یک snapshot کامل می‌سازه.
// بخش خالص (buildLetterData) تست‌پذیره؛ بخش دیتابیس (gatherLetterExtras) فقط
// چیزهایی رو می‌گیره که توی خود آنالیز نیست: استریک پایان هفته، اچیومنت‌های دائمی
// که همون هفته باز شدن و اسم کوچک کاربر.
import { prisma } from "@/lib/prisma";
import { isolateAll, isolateNumbers } from "@/lib/weeklyAnalysis/bidi";
import { ACHIEVEMENT_BY_ID, achievementDesc, type AchievementCategory, type AchievementMetrics } from "@/lib/achievements";
import { computeRoutineStreak, type DailyTicks } from "@/lib/routineStreak";
import { addDaysIso, isoToUtcDate, localIso, safeTimezone } from "@/lib/weeklyAnalysis/week";
import { noonOfIso, type OccLike } from "@/lib/weeklyAnalysis/domains";
import type { TrendPoint, WeeklyAnalysis } from "@/lib/weeklyAnalysis/types";
import { WEEKLY_LETTER_VERSION, type LetterAchievement, type LetterDomain, type WeeklyLetterData } from "./types";
import { buildIntro, buildNextWeek, buildWinsAndImprove, domainBestWorst, domainNote, factsOfDays } from "./text";

export type LetterExtras = {
  issueNo: number;
  greetingName: string | null;
  streak: { days: number } | null;
  globalAchievements: LetterAchievement[];
  now: Date;
};

/** جایگاه این هفته بین هفته‌های دارای امتیاز ترند (۱ = بهترین)؛ با کمتر از ۳ هفته null */
export function rankAmongTrend(trend: TrendPoint[]): { position: number; of: number } | null {
  if (!trend.length) return null;
  const cur = trend[trend.length - 1].score;
  if (cur == null) return null;
  const scored = trend.map((t) => t.score).filter((s): s is number => s != null);
  if (scored.length < 3) return null;
  return { position: 1 + scored.filter((s) => s > cur).length, of: scored.length };
}

export function buildLetterData(a: WeeklyAnalysis, x: LetterExtras): WeeklyLetterData {
  const facts = factsOfDays(a.days);
  const rank = rankAmongTrend(a.trend);
  const domains: LetterDomain[] = a.domains.map((d) => {
    const bw = domainBestWorst(d, a.days);
    return { ...d, note: isolateNumbers(domainNote(d, facts)), bestDay: bw.best, worstDay: bw.worst };
  });
  const { wins, improve } = buildWinsAndImprove({
    score: a.overall.score,
    prevScore: a.overall.prevScore,
    delta: a.overall.delta,
    activeDays: a.overall.activeDays,
    days: a.days,
    domains: a.domains,
  });
  const weekly: LetterAchievement[] = a.achievements
    .filter((ac) => ac.unlocked)
    .map((ac) => ({ key: ac.key, title: ac.title, description: ac.description, emoji: ac.emoji, source: "weekly" as const }));

  return {
    v: WEEKLY_LETTER_VERSION,
    issueNo: x.issueNo,
    weekStart: a.weekStart,
    weekEnd: a.weekEnd,
    weekLabel: a.weekLabel,
    generatedAt: x.now.toISOString(),
    greetingName: x.greetingName,
    headline: a.headline,
    intro: isolateNumbers(buildIntro({
      weekLabel: a.weekLabel,
      score: a.overall.score,
      grade: a.overall.grade,
      prevScore: a.overall.prevScore,
      activeDays: a.overall.activeDays,
      bestDay: a.overall.bestDay,
      domains: a.domains,
      rank,
      archetype: a.archetype,
    })),
    archetype: a.archetype,
    overall: {
      score: a.overall.score,
      prevScore: a.overall.prevScore,
      delta: a.overall.delta,
      grade: a.overall.grade,
      consistency: a.overall.consistency,
      activeDays: a.overall.activeDays,
      rank,
    },
    days: a.days,
    domains,
    numbers: a.numbers,
    trend: a.trend,
    insights: a.insights,
    wins: isolateAll(wins),
    improve: isolateAll(improve),
    achievements: [...weekly, ...x.globalAchievements],
    streak: x.streak,
    goals: a.goals,
    reflection: a.reflection,
    ai: a.ai,
    nextWeek: (() => {
      const nw = buildNextWeek({ score: a.overall.score, domains: a.domains, days: a.days });
      return { ...nw, focusText: isolateNumbers(nw.focusText) };
    })(),
  };
}

// ───────────────────────── بخش دیتابیس ─────────────────────────

const CATEGORY_EMOJI: Record<AchievementCategory, string> = {
  streak: "🔥",
  perfect: "✨",
  ticks: "✅",
  consistency: "📅",
  sleep: "😴",
  body: "💪",
  trade: "🎯",
  special: "🏆",
};

/** اسم کوچک برای «سلام …» — فقط اولین کلمه‌ی name؛ هیچ‌وقت ایمیل/شماره/یوزرنیم */
export function greetingNameOf(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.length > 24 || /[@\d]/.test(first)) return null;
  return first;
}

async function routineStreakAt(userId: string, weekEndIso: string): Promise<{ days: number } | null> {
  const from = isoToUtcDate(addDaysIso(weekEndIso, -125));
  const to = isoToUtcDate(weekEndIso);
  const [settings, rows] = await Promise.all([
    prisma.userSetting.findMany({ where: { userId, key: { in: ["customOccurrences", "removedOccurrences"] } }, select: { key: true, value: true } }),
    prisma.dailyEntry.findMany({ where: { userId, date: { gte: from, lte: to } }, select: { date: true, completedItems: true } }),
  ]);
  const by = new Map(settings.map((s) => [s.key, s.value]));
  const custom = (Array.isArray(by.get("customOccurrences")) ? (by.get("customOccurrences") as unknown[]) : []).filter(
    (c): c is OccLike => !!c && typeof (c as OccLike).id === "string" && typeof (c as OccLike).jsDay === "number"
  );
  if (!custom.length) return null;
  const removed = new Set<string>((Array.isArray(by.get("removedOccurrences")) ? (by.get("removedOccurrences") as unknown[]) : []).filter((x): x is string => typeof x === "string"));
  const daily: DailyTicks = {};
  for (const r of rows) {
    const t = r.completedItems && typeof r.completedItems === "object" && !Array.isArray(r.completedItems) ? (r.completedItems as Record<string, boolean>) : {};
    daily[r.date.toISOString().slice(0, 10)] = { tasks: t };
  }
  const res = computeRoutineStreak(noonOfIso(weekEndIso), { customOccurrences: custom, removedOccurrences: removed }, daily, 120);
  return res.streak > 0 ? { days: res.streak } : null;
}

async function globalAchievementsOfWeek(userId: string, tz: string, weekStartIso: string, weekEndIso: string): Promise<LetterAchievement[]> {
  const rows = await prisma.userAchievement.findMany({
    where: { userId, unlockedAt: { gte: isoToUtcDate(addDaysIso(weekStartIso, -1)), lt: isoToUtcDate(addDaysIso(weekEndIso, 2)) } },
    select: { achievementId: true, unlockedAt: true },
    orderBy: { unlockedAt: "asc" },
  });
  const out: LetterAchievement[] = [];
  for (const r of rows) {
    const day = localIso(tz, r.unlockedAt);
    if (day < weekStartIso || day > weekEndIso) continue;
    const def = ACHIEVEMENT_BY_ID[r.achievementId];
    if (!def) continue;
    const goal = def.progress({} as AchievementMetrics).goal;
    out.push({ key: def.id, title: def.name, description: achievementDesc(def, goal, true), emoji: CATEGORY_EMOJI[def.category] ?? "🏆", source: "global" });
  }
  return out;
}

export async function gatherLetterExtras(
  userId: string,
  a: Pick<WeeklyAnalysis, "weekStart" | "weekEnd">,
  opts: { timezone: string; issueNo: number; now: Date }
): Promise<LetterExtras> {
  const tz = safeTimezone(opts.timezone);
  const [user, streak, globalAchievements] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    routineStreakAt(userId, a.weekEnd).catch(() => null),
    globalAchievementsOfWeek(userId, tz, a.weekStart, a.weekEnd).catch(() => [] as LetterAchievement[]),
  ]);
  return { issueNo: opts.issueNo, greetingName: greetingNameOf(user?.name), streak, globalAchievements, now: opts.now };
}
