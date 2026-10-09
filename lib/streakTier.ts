// منطق واحد «سطح استریک» — همه‌ی جاهایی که شعله/عدد استریک نشون داده
// می‌شه (StreakFlame, StreakBadge, HeaderStreakClock, کارت کالری، کارت
// دوستان، پاپ‌آپ پروفایل دوست) باید از همین تابع استفاده کنن، نه یه
// حد آستانه‌ی جدا توی خودشون — تا همه‌جا یه قانون واحد داشته باشیم.
//
// سطح‌ها بر اساس همون مایلستون‌هایی که کاربر می‌بینه (۱، ۳، ۷، ۳۰، ۶۰، ۹۰،
// ۱۸۰، ۳۶۵ روز) — یعنی هر مایلستون دقیقا یه سطح بصری جدا (tier 1..8)
// می‌گیره؛ tier 0 یعنی هنوز استریک فعالی نیست (خاکستری، بدون انیمیشن).
import { tr } from "@/lib/i18n";

export const STREAK_MILESTONES = [1, 3, 7, 30, 60, 90, 180, 365] as const;

export type StreakTierInfo = {
  tier: number; // 0..STREAK_MILESTONES.length
  milestone: number | null; // مایلستونی که این سطح رو باز کرده (0 برای tier 0)
  name: string; // اسم فارسی سطح — برای tooltip/aria-label
  nextMilestone: number | null; // مایلستون بعدی (null یعنی آخرین سطح، ۳۶۵+)
};

const tierNames = (): string[] => [
  tr("بدون استریک", "No streak"),
  tr("شروع استریک", "Streak started"),
  tr("استریک 3 روزه", "3-day streak"),
  tr("استریک هفتگی", "Weekly streak"),
  tr("استریک ماهانه", "Monthly streak"),
  tr("استریک 60 روزه", "60-day streak"),
  tr("استریک فصلی", "Seasonal streak"),
  tr("استریک نیم‌ساله", "Half-year streak"),
  tr("استریک افسانه‌ای", "Legendary streak"),
];

export function getStreakTier(days: number | null | undefined): StreakTierInfo {
  const d = days ?? 0;
  let tier = 0;
  for (let i = 0; i < STREAK_MILESTONES.length; i++) {
    if (d >= STREAK_MILESTONES[i]) tier = i + 1;
  }
  const milestone = tier === 0 ? 0 : STREAK_MILESTONES[tier - 1];
  const nextMilestone = tier < STREAK_MILESTONES.length ? STREAK_MILESTONES[tier] : null;
  return { tier, milestone, name: tierNames()[tier], nextMilestone };
}
