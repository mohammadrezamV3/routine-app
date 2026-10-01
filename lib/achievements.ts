// اچیومنت‌های دائمی «روتین من» — کاتالوگ واحد (کلاینت و سرور هر دو از
// همین‌جا می‌خونن). این فایل عمدا خالصه: فقط تعریف‌ها + ارزیابی از روی
// «متریک‌ها». متریک‌ها سمت سرور از دیتابیس ساخته می‌شن
// (lib/achievementsServer.ts) و هیچ‌وقت از کلاینت پذیرفته نمی‌شن — وگرنه
// «نام طلایی» (همه‌ی اچیومنت‌ها) قابل جعل بود.
//
// اچیومنت‌ها فقط روی داده‌ی روتین/استریک/خواب خود کاربرن (نه ماژول‌های
// پولی دیگه) تا «همه رو باز کن» برای هر کاربری واقعا شدنی باشه.

export type AchievementMetrics = {
  currentStreak: number;
  bestStreak: number;
  perfectDays: number;
  totalTicks: number;
  activeDays: number;
  perfectWeeks: number;
  perfectMonths: number;
  /** بعد از شکستن یک استریک حداقل ۳ روزه، دوباره ۷ روز پشت‌سرهم */
  comeback: boolean;
  routineItems: number;
  memberDays: number;
  /** جمعه‌های کامل */
  perfectFridays: number;
  /** روزهایی که بیداری سر وقت (یا زودتر) ثبت شده */
  earlyWakes: number;
  sleepLogs: number;
  /** شب‌هایی با ۷ تا ۹ ساعت خواب */
  sleepGoalNights: number;
  /** بیشترین شب‌های پشت‌سرهم که ساعت خواب ±۳۰ دقیقه‌ی هدف بوده */
  sleepConsistentRun: number;
  /** بیشترین میانگین انجام ۳۰ روزه (۰..۱۰۰) */
  best30Avg: number;
};

export type AchievementCategory = "streak" | "perfect" | "ticks" | "consistency" | "sleep" | "special";

export type AchievementDef = {
  id: string;
  title: string;
  desc: string;
  category: AchievementCategory;
  /** سطح درخشش (۱ برنزی .. ۴ افسانه‌ای) — فقط ظاهری */
  rarity: 1 | 2 | 3 | 4;
  /** مقدار فعلی و هدف (برای نوار پیشرفت) */
  progress: (m: AchievementMetrics) => { value: number; goal: number };
};

const at = (key: keyof AchievementMetrics, goal: number) => (m: AchievementMetrics) => ({ value: Number(m[key]) || 0, goal });

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, string> = {
  streak: "استریک",
  perfect: "روزهای کامل",
  ticks: "تیک‌ها",
  consistency: "ثبات",
  sleep: "خواب",
  special: "ویژه",
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── استریک (بهترین رکورد، تا شکستن استریک اچیومنت نپره) ──
  { id: "streak_1", title: "جرقه", desc: "اولین روز کامل پشت‌سرهم", category: "streak", rarity: 1, progress: at("bestStreak", 1) },
  { id: "streak_3", title: "شعله‌ی کوچک", desc: "3 روز پشت‌سرهم همه‌ی برنامه‌ها", category: "streak", rarity: 1, progress: at("bestStreak", 3) },
  { id: "streak_7", title: "هفته‌ی آتشین", desc: "7 روز پشت‌سرهم", category: "streak", rarity: 2, progress: at("bestStreak", 7) },
  { id: "streak_14", title: "دو هفته بی‌وقفه", desc: "14 روز پشت‌سرهم", category: "streak", rarity: 2, progress: at("bestStreak", 14) },
  { id: "streak_30", title: "ماه طلایی", desc: "30 روز پشت‌سرهم", category: "streak", rarity: 3, progress: at("bestStreak", 30) },
  { id: "streak_60", title: "آتشفشان", desc: "60 روز پشت‌سرهم", category: "streak", rarity: 3, progress: at("bestStreak", 60) },
  { id: "streak_90", title: "فصل بی‌نقص", desc: "90 روز پشت‌سرهم", category: "streak", rarity: 3, progress: at("bestStreak", 90) },
  { id: "streak_180", title: "ققنوس", desc: "180 روز پشت‌سرهم", category: "streak", rarity: 4, progress: at("bestStreak", 180) },
  { id: "streak_365", title: "افسانه‌ی یک‌ساله", desc: "365 روز پشت‌سرهم", category: "streak", rarity: 4, progress: at("bestStreak", 365) },

  // ── روزهای کامل ──
  { id: "perfect_1", title: "اولین روز کامل", desc: "همه‌ی برنامه‌های یک روز انجام شد", category: "perfect", rarity: 1, progress: at("perfectDays", 1) },
  { id: "perfect_10", title: "ده ستاره", desc: "10 روز کامل", category: "perfect", rarity: 1, progress: at("perfectDays", 10) },
  { id: "perfect_50", title: "نیم‌صد", desc: "50 روز کامل", category: "perfect", rarity: 2, progress: at("perfectDays", 50) },
  { id: "perfect_100", title: "صدتایی", desc: "100 روز کامل", category: "perfect", rarity: 3, progress: at("perfectDays", 100) },
  { id: "perfect_250", title: "کهکشان", desc: "250 روز کامل", category: "perfect", rarity: 4, progress: at("perfectDays", 250) },
  { id: "week_1", title: "هفته‌ی بی‌نقص", desc: "یک هفته (شنبه تا جمعه) همه‌ی روزها کامل", category: "perfect", rarity: 2, progress: at("perfectWeeks", 1) },
  { id: "week_4", title: "چهار هفته‌ی بی‌نقص", desc: "4 هفته‌ی کامل", category: "perfect", rarity: 3, progress: at("perfectWeeks", 4) },
  { id: "week_12", title: "فصل هفته‌ها", desc: "12 هفته‌ی کامل", category: "perfect", rarity: 4, progress: at("perfectWeeks", 12) },
  { id: "month_1", title: "ماه کامل", desc: "همه‌ی روزهای یک ماه شمسی کامل", category: "perfect", rarity: 4, progress: at("perfectMonths", 1) },
  { id: "friday_4", title: "جمعه‌ی قهرمان", desc: "4 جمعه‌ی کامل — حتی روز تعطیل", category: "perfect", rarity: 2, progress: at("perfectFridays", 4) },

  // ── تیک‌ها ──
  { id: "ticks_10", title: "شروع حرکت", desc: "10 برنامه انجام شد", category: "ticks", rarity: 1, progress: at("totalTicks", 10) },
  { id: "ticks_100", title: "صد تیک", desc: "100 برنامه انجام شد", category: "ticks", rarity: 1, progress: at("totalTicks", 100) },
  { id: "ticks_500", title: "پانصد قدم", desc: "500 برنامه انجام شد", category: "ticks", rarity: 2, progress: at("totalTicks", 500) },
  { id: "ticks_1000", title: "هزارتیک", desc: "1000 برنامه انجام شد", category: "ticks", rarity: 3, progress: at("totalTicks", 1000) },
  { id: "ticks_5000", title: "ماشین انجام", desc: "5000 برنامه انجام شد", category: "ticks", rarity: 4, progress: at("totalTicks", 5000) },

  // ── ثبات ──
  { id: "active_7", title: "یک هفته حضور", desc: "7 روز با حداقل یک تیک", category: "consistency", rarity: 1, progress: at("activeDays", 7) },
  { id: "active_30", title: "یک ماه حضور", desc: "30 روز با حداقل یک تیک", category: "consistency", rarity: 2, progress: at("activeDays", 30) },
  { id: "active_100", title: "صد روز فعال", desc: "100 روز با حداقل یک تیک", category: "consistency", rarity: 3, progress: at("activeDays", 100) },
  { id: "active_365", title: "یک سال با روتین", desc: "365 روز با حداقل یک تیک", category: "consistency", rarity: 4, progress: at("activeDays", 365) },
  { id: "avg30_90", title: "دقیق مثل ساعت", desc: "میانگین 30 روزه‌ی انجام بالای 90 درصد", category: "consistency", rarity: 3, progress: at("best30Avg", 90) },
  { id: "comeback", title: "بازگشت قهرمان", desc: "بعد از شکستن استریک، دوباره 7 روز پشت‌سرهم", category: "consistency", rarity: 2, progress: (m) => ({ value: m.comeback ? 1 : 0, goal: 1 }) },
  { id: "early_7", title: "سحرخیز", desc: "7 روز بیداری سر وقت", category: "consistency", rarity: 2, progress: at("earlyWakes", 7) },
  { id: "early_30", title: "طلوع‌باز", desc: "30 روز بیداری سر وقت", category: "consistency", rarity: 3, progress: at("earlyWakes", 30) },

  // ── خواب ──
  { id: "sleep_1", title: "اولین شب", desc: "اولین خواب ثبت شد", category: "sleep", rarity: 1, progress: at("sleepLogs", 1) },
  { id: "sleep_7", title: "هفته‌ی شب‌ها", desc: "7 شب خواب ثبت شد", category: "sleep", rarity: 1, progress: at("sleepLogs", 7) },
  { id: "sleep_30", title: "دفترچه‌ی خواب", desc: "30 شب خواب ثبت شد", category: "sleep", rarity: 2, progress: at("sleepLogs", 30) },
  { id: "sleep_goal_7", title: "خواب کافی", desc: "7 شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 2, progress: at("sleepGoalNights", 7) },
  { id: "sleep_goal_30", title: "استاد خواب", desc: "30 شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 3, progress: at("sleepGoalNights", 30) },
  { id: "sleep_steady_7", title: "ساعت بدن", desc: "7 شب پشت‌سرهم خواب سر ساعت هدف", category: "sleep", rarity: 3, progress: at("sleepConsistentRun", 7) },

  // ── ویژه ──
  { id: "planner_10", title: "معمار", desc: "حداقل 10 برنامه در روتینت بساز", category: "special", rarity: 1, progress: at("routineItems", 10) },
  { id: "member_30", title: "هم‌سفر", desc: "30 روز عضویت", category: "special", rarity: 1, progress: at("memberDays", 30) },
  { id: "member_365", title: "یار قدیمی", desc: "یک سال عضویت", category: "special", rarity: 3, progress: at("memberDays", 365) },
];

export type AchievementState = {
  id: string;
  unlocked: boolean;
  value: number;
  goal: number;
};

export function evaluateAchievements(m: AchievementMetrics): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const { value, goal } = a.progress(m);
    return { id: a.id, unlocked: value >= goal, value: Math.min(value, goal), goal };
  });
}

export function allUnlocked(states: AchievementState[]): boolean {
  return states.length === ACHIEVEMENTS.length && states.every((s) => s.unlocked);
}

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
