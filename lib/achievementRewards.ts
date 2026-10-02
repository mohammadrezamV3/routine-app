// پاداش تخفیف اچیومنت‌ها — منطق خالص (بدون prisma) تا تست‌پذیر باشه.
//
// قاعده‌ی صاحب محصول: با باز شدن 50٪ همه‌ی اچیومنت‌ها یک بار 20٪ تخفیف و با
// 100٪ یک بار 50٪ تخفیف — فقط روی گزینه‌ی یک‌ماهه‌ی هر پلن، نه مدت‌های بلندتر.
// هر پاداش یک بار مصرف؛ با کد تخفیف/پاداش دعوت جمع نمی‌شه و بیشترین برنده‌ست.
// پاداشی که یک بار باز شد (ردیف AchievementReward) دیگه قفل نمی‌شه، حتی اگه
// کاتالوگ بزرگ‌تر بشه و درصد باز‌شده پایین بیاد.

export type AchievementRewardTier = "half" | "full";

export type AchievementRewardInfo = {
  tier: AchievementRewardTier;
  percent: 20 | 50;
  unlocked: boolean;
  used: boolean;
  usedAt: string | null;
};

export const ACHIEVEMENT_REWARD_TIERS: { tier: AchievementRewardTier; percent: 20 | 50; ratio: number }[] = [
  { tier: "half", percent: 20, ratio: 0.5 },
  { tier: "full", percent: 50, ratio: 1 },
];

export function rewardPercent(tier: AchievementRewardTier): 20 | 50 {
  return tier === "full" ? 50 : 20;
}

/** سطح‌هایی که با این تعداد باز‌شده به آستانه رسیدن */
export function reachedRewardTiers(unlockedCount: number, total: number): AchievementRewardTier[] {
  if (total <= 0) return [];
  return ACHIEVEMENT_REWARD_TIERS.filter((t) => unlockedCount >= Math.ceil(total * t.ratio)).map((t) => t.tier);
}

/** پاداش اچیومنت فقط روی گزینه‌ی یک‌ماهه (تعداد ماه امضاشده‌ی همون مدت) */
export function isMonthlyOption(months: number): boolean {
  return months === 1;
}

/** بزرگ‌ترین پاداش باز و مصرف‌نشده (50٪ قبل از 20٪) */
export function bestUnusedReward<T extends { tier: string; usedAt: Date | string | null }>(rows: T[]): T | null {
  const unused = rows.filter((r) => !r.usedAt && (r.tier === "half" || r.tier === "full"));
  unused.sort((a, b) => rewardPercent(b.tier as AchievementRewardTier) - rewardPercent(a.tier as AchievementRewardTier));
  return unused[0] ?? null;
}

/** وضعیت هر دو سطح برای payload */
export function rewardStates(rows: { tier: string; usedAt: Date | null }[]): AchievementRewardInfo[] {
  return ACHIEVEMENT_REWARD_TIERS.map(({ tier, percent }) => {
    const row = rows.find((r) => r.tier === tier);
    return { tier, percent, unlocked: !!row, used: !!row?.usedAt, usedAt: row?.usedAt ? row.usedAt.toISOString() : null };
  });
}

export type DiscountSource = "code" | "inviter" | "achievement";

/**
 * تخفیف‌ها جمع نمی‌شن: بیشترین درصد برنده‌ست. در تساوی، اونی که زودتر در
 * فهرست اومده می‌مونه (کد → پاداش دعوت → پاداش اچیومنت) تا پاداش یک‌بارمصرف
 * بی‌دلیل مصرف نشه.
 */
export function pickBestDiscount(cands: { source: DiscountSource; percent: number }[]): { source: DiscountSource; percent: number } | null {
  let best: { source: DiscountSource; percent: number } | null = null;
  for (const c of cands) {
    if (!(c.percent > 0)) continue;
    if (!best || c.percent > best.percent) best = c;
  }
  return best;
}
