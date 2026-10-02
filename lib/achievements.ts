// اچیومنت‌های دائمی — کاتالوگ واحد (کلاینت و سرور هر دو از همین‌جا می‌خونن).
// این فایل عمدا خالصه: فقط تعریف‌ها + ارزیابی از روی «متریک‌ها». متریک‌ها
// سمت سرور از دیتابیس ساخته می‌شن (lib/achievementsServer.ts) و هیچ‌وقت از
// کلاینت پذیرفته نمی‌شن — وگرنه «نام طلایی» و پاداش تخفیف قابل جعل بود.
//
// قاعده‌ی کاتالوگ: هر اچیومنت باید تلاش واقعی بخواد (نه «یک بار اپ رو باز کن»).
// شناسه‌ها پایدارن (UserAchievement بهشون ارجاع می‌ده) — هیچ‌وقت عوضشون نکن.
// name انگلیسی و کوتاه؛ desc فارسی و در صورت نیاز با نشانه‌ی {n} برای عدد هدف
// (UI عدد رو فقط برای اچیومنت باز نشون می‌ده، برای قفل «??»).

export type AchievementMetrics = {
  currentStreak: number;
  bestStreak: number;
  perfectDays: number;
  totalTicks: number;
  activeDays: number;
  perfectWeeks: number;
  perfectMonths: number;
  /** بعد از شکستن یک استریک حداقل 3 روزه، دوباره 7 روز پشت‌سرهم */
  comeback: boolean;
  /** چند بار چنین بازگشتی اتفاق افتاده */
  comebacks: number;
  routineItems: number;
  memberDays: number;
  /** جمعه‌های کامل */
  perfectFridays: number;
  /** روزهایی که بیداری سر وقت (یا زودتر) ثبت شده */
  earlyWakes: number;
  /** بیشترین روزهای پشت‌سرهم بیداری سر وقت */
  earlyWakeRun: number;
  sleepLogs: number;
  /** بیشترین شب‌های پشت‌سرهم که خواب ثبت شده */
  sleepLogRun: number;
  /** شب‌هایی با 7 تا 9 ساعت خواب */
  sleepGoalNights: number;
  /** بیشترین شب‌های پشت‌سرهم که ساعت خواب ±30 دقیقه‌ی هدف بوده */
  sleepConsistentRun: number;
  /** بیشترین میانگین انجام 30 روزه (0..100) */
  best30Avg: number;
  /** بیشترین میانگین انجام 90 روزه (0..100) */
  best90Avg: number;
  /** روزهای جلسه‌ی تمرین کامل‌شده */
  workoutSessions: number;
  /** بیشترین هفته‌های پشت‌سرهم با حداقل 3 جلسه‌ی تمرین */
  workoutWeekRun: number;
  /** روزهایی که حداقل یک وعده ثبت شده */
  calorieLogDays: number;
  /** بیشترین روزهای پشت‌سرهم ثبت تغذیه */
  calorieLogRun: number;
  /** روزهایی که کالری در ±10٪ هدف روز بوده */
  calorieOnTargetDays: number;
  /** معاملاتی که واقعا ژورنال شدن (دستی یا با یادداشت/احساس) */
  tradesJournaled: number;
  /** معاملات با چک‌لیست کامل */
  tradesChecklistFull: number;
  /** بیشترین معاملات پشت‌سرهم «طبق پلن» */
  tradePlanRun: number;
  /** معاملات با احساس قبل، احساس بعد و یادداشت */
  tradesReflected: number;
  /** برنامه‌های منتوری که شاگرد کامل کرده */
  menteeProgramsDone: number;
  /** شاگردانی که به‌عنوان منتور همراهی کرده */
  mentorStudents: number;
};

export type AchievementCategory = "streak" | "perfect" | "ticks" | "consistency" | "sleep" | "body" | "trade" | "special";

export type AchievementDef = {
  id: string;
  /** نام انگلیسی کوتاه و حماسی */
  name: string;
  /** @deprecated همون name — فقط برای سازگاری با مصرف‌کننده‌های قدیمی */
  title: string;
  /** توضیح فارسی؛ {n} = عدد هدف */
  desc: string;
  category: AchievementCategory;
  /** سطح درخشش (1 برنزی .. 4 افسانه‌ای) — فقط ظاهری */
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
  body: "بدن و تغذیه",
  trade: "ترید",
  special: "ویژه",
};

type Def = Omit<AchievementDef, "title">;

const DEFS: Def[] = [
  // ── استریک (بهترین رکورد، تا شکستن استریک اچیومنت نپره) ──
  { id: "streak_1", name: "First Spark", desc: "اولین روز کامل زنجیره", category: "streak", rarity: 1, progress: at("bestStreak", 1) },
  { id: "streak_3", name: "Kindled", desc: "{n} روز پشت‌سرهم، همه‌ی برنامه‌ها", category: "streak", rarity: 1, progress: at("bestStreak", 3) },
  { id: "streak_7", name: "Week of Fire", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 2, progress: at("bestStreak", 7) },
  { id: "streak_14", name: "Unbroken Fortnight", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 2, progress: at("bestStreak", 14) },
  { id: "streak_30", name: "Month Ablaze", desc: "{n} روز پشت‌سرهم، یک ماه آتش", category: "streak", rarity: 3, progress: at("bestStreak", 30) },
  { id: "streak_60", name: "Volcanic Will", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 3, progress: at("bestStreak", 60) },
  { id: "streak_90", name: "Flawless Season", desc: "{n} روز پشت‌سرهم، یک فصل کامل", category: "streak", rarity: 3, progress: at("bestStreak", 90) },
  { id: "streak_180", name: "Phoenix Rising", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 4, progress: at("bestStreak", 180) },
  { id: "streak_365", name: "Eternal Flame", desc: "{n} روز پشت‌سرهم، یک سال تمام", category: "streak", rarity: 4, progress: at("bestStreak", 365) },
  { id: "streak_500", name: "The Undying", desc: "{n} روز پشت‌سرهم؛ شعله‌ای که خاموش نمی‌شه", category: "streak", rarity: 4, progress: at("bestStreak", 500) },

  // ── روزهای کامل ──
  { id: "perfect_1", name: "Flawless Dawn", desc: "همه‌ی برنامه‌های یک روز انجام شد", category: "perfect", rarity: 1, progress: at("perfectDays", 1) },
  { id: "perfect_10", name: "Ten Stars", desc: "{n} روز کامل", category: "perfect", rarity: 1, progress: at("perfectDays", 10) },
  { id: "perfect_50", name: "Half Century", desc: "{n} روز کامل", category: "perfect", rarity: 2, progress: at("perfectDays", 50) },
  { id: "perfect_100", name: "Centurion", desc: "{n} روز کامل", category: "perfect", rarity: 3, progress: at("perfectDays", 100) },
  { id: "perfect_250", name: "Galaxy Mind", desc: "{n} روز کامل", category: "perfect", rarity: 4, progress: at("perfectDays", 250) },
  { id: "perfect_500", name: "Starforged", desc: "{n} روز کامل", category: "perfect", rarity: 4, progress: at("perfectDays", 500) },
  { id: "perfect_1000", name: "Thousand Suns", desc: "{n} روز کامل", category: "perfect", rarity: 4, progress: at("perfectDays", 1000) },
  { id: "week_1", name: "Perfect Week", desc: "یک هفته‌ی شنبه تا جمعه، همه‌ی روزها کامل", category: "perfect", rarity: 2, progress: at("perfectWeeks", 1) },
  { id: "week_4", name: "Fourfold Crown", desc: "{n} هفته‌ی کامل", category: "perfect", rarity: 3, progress: at("perfectWeeks", 4) },
  { id: "week_12", name: "Twelve Banners", desc: "{n} هفته‌ی کامل", category: "perfect", rarity: 4, progress: at("perfectWeeks", 12) },
  { id: "week_26", name: "Half-Year Sovereign", desc: "{n} هفته‌ی کامل", category: "perfect", rarity: 4, progress: at("perfectWeeks", 26) },
  { id: "week_52", name: "Year of Crowns", desc: "{n} هفته‌ی کامل", category: "perfect", rarity: 4, progress: at("perfectWeeks", 52) },
  { id: "month_1", name: "Flawless Moon", desc: "همه‌ی روزهای یک ماه شمسی کامل", category: "perfect", rarity: 4, progress: at("perfectMonths", 1) },
  { id: "month_3", name: "Triple Moon", desc: "{n} ماه شمسی کامل", category: "perfect", rarity: 4, progress: at("perfectMonths", 3) },
  { id: "month_6", name: "Lunar Dynasty", desc: "{n} ماه شمسی کامل", category: "perfect", rarity: 4, progress: at("perfectMonths", 6) },
  { id: "month_12", name: "Celestial Year", desc: "{n} ماه شمسی کامل", category: "perfect", rarity: 4, progress: at("perfectMonths", 12) },
  { id: "friday_4", name: "Weekend Warrior", desc: "{n} جمعه‌ی کامل؛ حتی روز تعطیل", category: "perfect", rarity: 2, progress: at("perfectFridays", 4) },

  // ── تیک‌ها ──
  { id: "ticks_10", name: "First Steps", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 1, progress: at("totalTicks", 10) },
  { id: "ticks_100", name: "Hundred Strikes", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 1, progress: at("totalTicks", 100) },
  { id: "ticks_500", name: "Relentless", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 2, progress: at("totalTicks", 500) },
  { id: "ticks_1000", name: "Thousandfold", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 3, progress: at("totalTicks", 1000) },
  { id: "ticks_5000", name: "The Machine", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 4, progress: at("totalTicks", 5000) },
  { id: "ticks_10000", name: "Myriad", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 4, progress: at("totalTicks", 10000) },

  // ── ثبات ──
  { id: "active_7", name: "Showing Up", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 1, progress: at("activeDays", 7) },
  { id: "active_30", name: "Steadfast", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 2, progress: at("activeDays", 30) },
  { id: "active_100", name: "Centennial", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 3, progress: at("activeDays", 100) },
  { id: "active_365", name: "Year-Walker", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 4, progress: at("activeDays", 365) },
  { id: "avg30_90", name: "Clockwork", desc: "میانگین انجام 30 روزه بالای {n} درصد", category: "consistency", rarity: 3, progress: at("best30Avg", 90) },
  { id: "avg90_85", name: "Precision Engine", desc: "میانگین انجام 90 روزه بالای {n} درصد", category: "consistency", rarity: 4, progress: at("best90Avg", 85) },
  { id: "comeback", name: "The Comeback", desc: "بعد از شکستن استریک، دوباره 7 روز پشت‌سرهم", category: "consistency", rarity: 2, progress: (m) => ({ value: m.comeback ? 1 : 0, goal: 1 }) },
  { id: "comeback_3", name: "Unbreakable", desc: "{n} بار برخاستن بعد از شکستن استریک", category: "consistency", rarity: 3, progress: at("comebacks", 3) },
  { id: "early_7", name: "Early Riser", desc: "{n} روز بیداری سر وقت", category: "consistency", rarity: 2, progress: at("earlyWakes", 7) },
  { id: "early_30", name: "Dawnbreaker", desc: "{n} روز بیداری سر وقت", category: "consistency", rarity: 3, progress: at("earlyWakes", 30) },
  { id: "early_100", name: "Herald of Dawn", desc: "{n} روز بیداری سر وقت", category: "consistency", rarity: 4, progress: at("earlyWakes", 100) },
  { id: "early_run_14", name: "Sunrise Ritual", desc: "{n} روز پشت‌سرهم بیداری سر وقت", category: "consistency", rarity: 3, progress: at("earlyWakeRun", 14) },

  // ── خواب ──
  { id: "sleep_1", name: "First Night", desc: "اولین خواب ثبت شد", category: "sleep", rarity: 1, progress: at("sleepLogs", 1) },
  { id: "sleep_7", name: "Night Watch", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 1, progress: at("sleepLogs", 7) },
  { id: "sleep_30", name: "Dream Ledger", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 2, progress: at("sleepLogs", 30) },
  { id: "sleep_100", name: "Moonkeeper", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 3, progress: at("sleepLogs", 100) },
  { id: "sleep_365", name: "Keeper of Nights", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 4, progress: at("sleepLogs", 365) },
  { id: "sleep_log_run_30", name: "Unbroken Nights", desc: "{n} شب پشت‌سرهم ثبت خواب", category: "sleep", rarity: 3, progress: at("sleepLogRun", 30) },
  { id: "sleep_goal_7", name: "Well Rested", desc: "{n} شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 2, progress: at("sleepGoalNights", 7) },
  { id: "sleep_goal_30", name: "Sleep Master", desc: "{n} شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 3, progress: at("sleepGoalNights", 30) },
  { id: "sleep_goal_100", name: "Lord of Slumber", desc: "{n} شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 4, progress: at("sleepGoalNights", 100) },
  { id: "sleep_steady_7", name: "Body Clock", desc: "{n} شب پشت‌سرهم خواب سر ساعت هدف", category: "sleep", rarity: 3, progress: at("sleepConsistentRun", 7) },
  { id: "sleep_steady_30", name: "Circadian Master", desc: "{n} شب پشت‌سرهم خواب سر ساعت هدف", category: "sleep", rarity: 4, progress: at("sleepConsistentRun", 30) },

  // ── بدن و تغذیه ──
  { id: "workout_10", name: "Iron Initiate", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 1, progress: at("workoutSessions", 10) },
  { id: "workout_50", name: "Forged in Iron", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 2, progress: at("workoutSessions", 50) },
  { id: "workout_150", name: "Steel Will", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 3, progress: at("workoutSessions", 150) },
  { id: "workout_365", name: "Titan", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 4, progress: at("workoutSessions", 365) },
  { id: "workout_weeks_4", name: "Iron Discipline", desc: "{n} هفته‌ی پشت‌سرهم، هر هفته حداقل 3 جلسه", category: "body", rarity: 2, progress: at("workoutWeekRun", 4) },
  { id: "workout_weeks_12", name: "Unyielding", desc: "{n} هفته‌ی پشت‌سرهم، هر هفته حداقل 3 جلسه", category: "body", rarity: 4, progress: at("workoutWeekRun", 12) },
  { id: "cal_days_30", name: "Mindful Plate", desc: "{n} روز ثبت تغذیه", category: "body", rarity: 2, progress: at("calorieLogDays", 30) },
  { id: "cal_days_100", name: "Nutrition Scholar", desc: "{n} روز ثبت تغذیه", category: "body", rarity: 3, progress: at("calorieLogDays", 100) },
  { id: "cal_run_7", name: "Clean Week", desc: "{n} روز پشت‌سرهم ثبت تغذیه", category: "body", rarity: 2, progress: at("calorieLogRun", 7) },
  { id: "cal_run_30", name: "Fuel Master", desc: "{n} روز پشت‌سرهم ثبت تغذیه", category: "body", rarity: 4, progress: at("calorieLogRun", 30) },
  { id: "cal_target_30", name: "Perfect Balance", desc: "{n} روز کالری در محدوده‌ی 10 درصدی هدف", category: "body", rarity: 3, progress: at("calorieOnTargetDays", 30) },

  // ── ترید ──
  { id: "trade_50", name: "Chronicler", desc: "{n} معامله‌ی ژورنال‌شده", category: "trade", rarity: 2, progress: at("tradesJournaled", 50) },
  { id: "trade_250", name: "Market Historian", desc: "{n} معامله‌ی ژورنال‌شده", category: "trade", rarity: 3, progress: at("tradesJournaled", 250) },
  { id: "trade_check_25", name: "By the Book", desc: "{n} معامله با چک‌لیست کامل", category: "trade", rarity: 2, progress: at("tradesChecklistFull", 25) },
  { id: "trade_check_100", name: "Ironclad Process", desc: "{n} معامله با چک‌لیست کامل", category: "trade", rarity: 4, progress: at("tradesChecklistFull", 100) },
  { id: "trade_plan_20", name: "Cold Blood", desc: "{n} معامله‌ی پشت‌سرهم طبق پلن", category: "trade", rarity: 3, progress: at("tradePlanRun", 20) },
  { id: "trade_reflect_50", name: "Mind Over Market", desc: "{n} معامله با احساس قبل و بعد و یادداشت", category: "trade", rarity: 3, progress: at("tradesReflected", 50) },

  // ── ویژه ──
  { id: "planner_10", name: "Architect", desc: "حداقل {n} برنامه در روتینت", category: "special", rarity: 1, progress: at("routineItems", 10) },
  { id: "member_30", name: "Companion", desc: "{n} روز همراهی", category: "special", rarity: 1, progress: at("memberDays", 30) },
  { id: "member_365", name: "Old Guard", desc: "یک سال همراهی", category: "special", rarity: 3, progress: at("memberDays", 365) },
  { id: "mentee_program_1", name: "Devoted Apprentice", desc: "یک برنامه‌ی منتور تا پایان کامل شد", category: "special", rarity: 2, progress: at("menteeProgramsDone", 1) },
  { id: "mentee_program_3", name: "Master's Heir", desc: "{n} برنامه‌ی منتور تا پایان کامل شد", category: "special", rarity: 3, progress: at("menteeProgramsDone", 3) },
  { id: "mentor_students_5", name: "Guiding Light", desc: "همراهی {n} شاگرد به‌عنوان منتور", category: "special", rarity: 4, progress: at("mentorStudents", 5) },
];

export const ACHIEVEMENTS: AchievementDef[] = DEFS.map((d) => ({ ...d, title: d.name }));

/** نشانه‌ی {n} با عدد هدف (باز) یا «??» (قفل) جایگزین می‌شه */
export function achievementDesc(a: Pick<AchievementDef, "desc">, goal: number, unlocked: boolean): string {
  return a.desc.split("{n}").join(unlocked ? String(goal) : "??");
}

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
