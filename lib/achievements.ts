// اچیومنت‌های دائمی — کاتالوگ واحد (کلاینت و سرور هر دو از همین‌جا می‌خونن).
// این فایل عمدا خالصه: فقط تعریف‌ها + ارزیابی از روی «متریک‌ها». متریک‌ها
// سمت سرور از دیتابیس ساخته می‌شن (lib/achievementsServer.ts) و هیچ‌وقت از
// کلاینت پذیرفته نمی‌شن — وگرنه «نام طلایی» و پاداش تخفیف قابل جعل بود.
//
// قاعده‌ی کاتالوگ: هر اچیومنت باید تلاش واقعی بخواد (نه «یک بار اپ رو باز کن»)
// ولی با استفاده‌ی منظم حداکثر تا 90 روز قابل رسیدنه (maxDays در هر تعریف، تست‌دار).
// اچیومنت‌های خیلی سخت حذف شدن؛ کسی که قبلا بازشون کرده در UserAchievement نگهشون می‌داره
// و شناسه‌ی ناشناخته فقط در نمایش و شمارش نادیده گرفته می‌شه. چند پله‌ی نردبان با همون
// شناسه‌ی قبلی به هدف کوچک‌تر بازتنظیم شدن (شناسه پایدارن، پس عدد داخل شناسه دیگه هدف نیست).
// شناسه‌ها پایدارن (UserAchievement بهشون ارجاع می‌ده) — هیچ‌وقت عوضشون نکن.
// name انگلیسی و کوتاه؛ desc فارسی و در صورت نیاز با نشانه‌ی {n} برای عدد هدف
// (عدد هدف همیشه نشون داده می‌شه؛ «؟» فقط برای روزهای مایلستون استریک مونده).

import { isEn, pick } from "./i18n";
import type { SectionKey } from "./sections";

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

/** سقف روز برای رسیدن به هر اچیومنت */
export const MAX_ACHIEVEMENT_DAYS = 90;

export type AchievementCategory = "streak" | "perfect" | "ticks" | "consistency" | "sleep" | "body" | "trade" | "special";

export type AchievementDef = {
  id: string;
  /** نام انگلیسی کوتاه و حماسی */
  name: string;
  /** @deprecated همون name — فقط برای سازگاری با مصرف‌کننده‌های قدیمی */
  title: string;
  /** توضیح فارسی؛ {n} = عدد هدف */
  desc: string;
  /** توضیح انگلیسی؛ {n} = عدد هدف */
  descEn: string;
  category: AchievementCategory;
  /** سطح درخشش (1 برنزی .. 4 افسانه‌ای) — فقط ظاهری */
  rarity: 1 | 2 | 3 | 4;
  /**
   * برآورد «حداکثر چند روز استفاده‌ی منظم تا رسیدن به هدف» (فرض‌ها: روتین حدود 85٪ روزها کامل،
   * 3 جلسه‌ی تمرین در هفته، 5 معامله در هفته، ثبت خواب و تغذیه حدود 90٪ شب‌ها/روزها).
   * قانون محصول (درخواست صریح): هیچ اچیومنتی بیشتر از MAX_ACHIEVEMENT_DAYS روز نباید وقت بخواد.
   */
  maxDays: number;
  /** وابسته به نقش و آدم‌های دیگه (منتور/شاگرد): در کاتالوگ می‌مونه ولی برای نام طلایی لازم نیست */
  roleBased?: boolean;
  /** مقدار فعلی و هدف (برای نوار پیشرفت) */
  progress: (m: AchievementMetrics) => { value: number; goal: number };
};

const at = (key: keyof AchievementMetrics, goal: number) => (m: AchievementMetrics) => ({ value: Number(m[key]) || 0, goal });

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, string> = {
  get streak() { return pick({ fa: "استریک", en: "Streak" }); },
  get perfect() { return pick({ fa: "روزهای کامل", en: "Perfect days" }); },
  get ticks() { return pick({ fa: "تیک‌ها", en: "Ticks" }); },
  get consistency() { return pick({ fa: "ثبات", en: "Consistency" }); },
  get sleep() { return pick({ fa: "خواب", en: "Sleep" }); },
  get body() { return pick({ fa: "بدن و تغذیه", en: "Body and nutrition" }); },
  get trade() { return pick({ fa: "ترید", en: "Trading" }); },
  get special() { return pick({ fa: "ویژه", en: "Special" }); },
};

/**
 * هر دسته روی زیردامنه‌ی کدوم بخش‌ها دیده می‌شه (جداسازی بخش‌ها، docs/sections.md). دامنه‌ی اصلی
 * (section = null) همه رو می‌بینه. فقط نمایش: باز شدن و نام طلایی هنوز روی کل کاتالوگ سمت سرور حساب می‌شن.
 */
export const ACHIEVEMENT_CATEGORY_SECTIONS: Record<AchievementCategory, SectionKey[]> = {
  streak: ["routine"],
  perfect: ["routine"],
  ticks: ["routine"],
  consistency: ["routine"],
  sleep: ["routine", "workout"],
  body: ["workout"],
  trade: ["trade"],
  special: ["routine"],
};

export function achievementVisibleIn(a: Pick<AchievementDef, "category">, section: SectionKey | null): boolean {
  return !section || ACHIEVEMENT_CATEGORY_SECTIONS[a.category].includes(section);
}

/** توضیح انگلیسی هر اچیومنت (کلید = id)؛ {n} = عدد هدف */
const DESC_EN: Record<string, string> = {
  streak_1: "Your first perfect day in the chain",
  streak_3: "{n} days in a row, every program done",
  streak_7: "{n} days in a row, no breaks",
  streak_14: "{n} days in a row, no breaks",
  streak_30: "{n} days in a row, a month on fire",
  streak_60: "{n} days in a row, no breaks",
  streak_90: "{n} days in a row, a whole season",
  perfect_1: "Completed every program in a day",
  perfect_10: "{n} perfect days",
  perfect_50: "{n} perfect days",
  perfect_100: "{n} perfect days",
  week_1: "A Saturday-to-Friday week with every day perfect",
  week_4: "{n} perfect weeks",
  week_12: "{n} perfect weeks",
  month_1: "Every day of a Persian-calendar month perfect",
  friday_4: "{n} perfect Fridays, even on the day off",
  ticks_10: "{n} programs completed",
  ticks_100: "{n} programs completed",
  ticks_500: "{n} programs completed",
  ticks_1000: "{n} programs completed",
  active_7: "{n} days with at least one tick",
  active_30: "{n} days with at least one tick",
  active_100: "{n} days with at least one tick",
  active_365: "{n} days with at least one tick",
  avg30_90: "30-day completion average above {n} percent",
  avg90_85: "90-day completion average above {n} percent",
  comeback: "After a broken streak, 7 days in a row again",
  comeback_3: "Got back up {n} times after a broken streak",
  early_7: "{n} days waking up on time",
  early_30: "{n} days waking up on time",
  early_100: "{n} days waking up on time",
  early_run_14: "{n} days in a row waking up on time",
  sleep_1: "Logged your first sleep",
  sleep_7: "{n} nights of sleep logged",
  sleep_30: "{n} nights of sleep logged",
  sleep_100: "{n} nights of sleep logged",
  sleep_365: "{n} nights of sleep logged",
  sleep_log_run_30: "{n} nights in a row of sleep logging",
  sleep_goal_7: "{n} nights with 7 to 9 hours of sleep",
  sleep_goal_30: "{n} nights with 7 to 9 hours of sleep",
  sleep_goal_100: "{n} nights with 7 to 9 hours of sleep",
  sleep_steady_7: "{n} nights in a row sleeping on your target time",
  sleep_steady_30: "{n} nights in a row sleeping on your target time",
  workout_10: "{n} full workout sessions",
  workout_50: "{n} full workout sessions",
  workout_150: "{n} full workout sessions",
  workout_weeks_4: "{n} weeks in a row, at least 3 sessions each week",
  workout_weeks_12: "{n} weeks in a row, at least 3 sessions each week",
  cal_days_30: "{n} days of food logging",
  cal_days_100: "{n} days of food logging",
  cal_run_7: "{n} days in a row of food logging",
  cal_run_30: "{n} days in a row of food logging",
  cal_target_30: "{n} days with calories within 10 percent of your goal",
  trade_50: "{n} journaled trades",
  trade_250: "{n} journaled trades",
  trade_check_25: "{n} trades with a full checklist",
  trade_check_100: "{n} trades with a full checklist",
  trade_plan_20: "{n} trades in a row following the plan",
  trade_reflect_50: "{n} trades with feelings before and after plus a note",
  planner_10: "At least {n} programs in your routine",
  member_30: "{n} days together",
  member_365: "{n} days together",
  mentee_program_1: "Finished a mentor program to the end",
  mentor_students_5: "Guided {n} students as a mentor",
};

type Def = Omit<AchievementDef, "title" | "descEn">;

const DEFS: Def[] = [
  // ── استریک (بهترین رکورد، تا شکستن استریک اچیومنت نپره) ──
  { id: "streak_1", name: "First Spark", desc: "اولین روز کامل زنجیره", category: "streak", rarity: 1, maxDays: 1, progress: at("bestStreak", 1) },
  { id: "streak_3", name: "Kindled", desc: "{n} روز پشت‌سرهم، همه‌ی برنامه‌ها", category: "streak", rarity: 1, maxDays: 3, progress: at("bestStreak", 3) },
  { id: "streak_7", name: "Week of Fire", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 2, maxDays: 7, progress: at("bestStreak", 7) },
  { id: "streak_14", name: "Unbroken Fortnight", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 2, maxDays: 14, progress: at("bestStreak", 14) },
  { id: "streak_30", name: "Month Ablaze", desc: "{n} روز پشت‌سرهم، یک ماه آتش", category: "streak", rarity: 3, maxDays: 30, progress: at("bestStreak", 30) },
  { id: "streak_60", name: "Volcanic Will", desc: "{n} روز پشت‌سرهم بی‌وقفه", category: "streak", rarity: 3, maxDays: 60, progress: at("bestStreak", 60) },
  { id: "streak_90", name: "Flawless Season", desc: "{n} روز پشت‌سرهم، یک فصل کامل", category: "streak", rarity: 3, maxDays: 90, progress: at("bestStreak", 90) },

  // ── روزهای کامل ──
  { id: "perfect_1", name: "Flawless Dawn", desc: "همه‌ی برنامه‌های یک روز انجام شد", category: "perfect", rarity: 1, maxDays: 1, progress: at("perfectDays", 1) },
  { id: "perfect_10", name: "Ten Stars", desc: "{n} روز کامل", category: "perfect", rarity: 1, maxDays: 12, progress: at("perfectDays", 10) },
  { id: "perfect_50", name: "Half Century", desc: "{n} روز کامل", category: "perfect", rarity: 2, maxDays: 59, progress: at("perfectDays", 50) },
  { id: "perfect_100", name: "Diamond Days", desc: "{n} روز کامل", category: "perfect", rarity: 3, maxDays: 82, progress: at("perfectDays", 70) },
  { id: "week_1", name: "Perfect Week", desc: "یک هفته‌ی شنبه تا جمعه، همه‌ی روزها کامل", category: "perfect", rarity: 2, maxDays: 13, progress: at("perfectWeeks", 1) },
  { id: "week_4", name: "Fourfold Crown", desc: "{n} هفته‌ی کامل", category: "perfect", rarity: 3, maxDays: 34, progress: at("perfectWeeks", 4) },
  { id: "week_12", name: "Twelve Banners", desc: "{n} هفته‌ی کامل", category: "perfect", rarity: 4, maxDays: 62, progress: at("perfectWeeks", 8) },
  { id: "month_1", name: "Flawless Moon", desc: "همه‌ی روزهای یک ماه شمسی کامل", category: "perfect", rarity: 4, maxDays: 62, progress: at("perfectMonths", 1) },
  { id: "friday_4", name: "Weekend Warrior", desc: "{n} جمعه‌ی کامل؛ حتی روز تعطیل", category: "perfect", rarity: 2, maxDays: 28, progress: at("perfectFridays", 4) },

  // ── تیک‌ها ──
  { id: "ticks_10", name: "First Steps", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 1, maxDays: 3, progress: at("totalTicks", 10) },
  { id: "ticks_100", name: "Hundred Strikes", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 1, maxDays: 24, progress: at("totalTicks", 100) },
  { id: "ticks_500", name: "Relentless", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 2, maxDays: 59, progress: at("totalTicks", 250) },
  { id: "ticks_1000", name: "Overdrive", desc: "{n} برنامه انجام شد", category: "ticks", rarity: 3, maxDays: 82, progress: at("totalTicks", 350) },

  // ── ثبات ──
  { id: "active_7", name: "Showing Up", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 1, maxDays: 7, progress: at("activeDays", 7) },
  { id: "active_30", name: "Steadfast", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 2, maxDays: 30, progress: at("activeDays", 30) },
  { id: "active_100", name: "Sixty Strong", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 3, maxDays: 60, progress: at("activeDays", 60) },
  { id: "active_365", name: "Season-Walker", desc: "{n} روز با حداقل یک تیک", category: "consistency", rarity: 4, maxDays: 80, progress: at("activeDays", 80) },
  { id: "avg30_90", name: "Clockwork", desc: "میانگین انجام 30 روزه بالای {n} درصد", category: "consistency", rarity: 3, maxDays: 30, progress: at("best30Avg", 90) },
  { id: "avg90_85", name: "Precision Engine", desc: "میانگین انجام 90 روزه بالای {n} درصد", category: "consistency", rarity: 4, maxDays: 90, progress: at("best90Avg", 85) },
  { id: "comeback", name: "The Comeback", desc: "بعد از شکستن استریک، دوباره 7 روز پشت‌سرهم", category: "consistency", rarity: 2, maxDays: 30, progress: (m) => ({ value: m.comeback ? 1 : 0, goal: 1 }) },
  { id: "comeback_3", name: "Unbreakable", desc: "{n} بار برخاستن بعد از شکستن استریک", category: "consistency", rarity: 3, maxDays: 60, progress: at("comebacks", 3) },
  { id: "early_7", name: "Early Riser", desc: "{n} روز بیداری سر وقت", category: "consistency", rarity: 2, maxDays: 9, progress: at("earlyWakes", 7) },
  { id: "early_30", name: "Dawnbreaker", desc: "{n} روز بیداری سر وقت", category: "consistency", rarity: 3, maxDays: 35, progress: at("earlyWakes", 30) },
  { id: "early_100", name: "Herald of Dawn", desc: "{n} روز بیداری سر وقت", category: "consistency", rarity: 4, maxDays: 71, progress: at("earlyWakes", 60) },
  { id: "early_run_14", name: "Sunrise Ritual", desc: "{n} روز پشت‌سرهم بیداری سر وقت", category: "consistency", rarity: 3, maxDays: 14, progress: at("earlyWakeRun", 14) },

  // ── خواب ──
  { id: "sleep_1", name: "First Night", desc: "اولین خواب ثبت شد", category: "sleep", rarity: 1, maxDays: 1, progress: at("sleepLogs", 1) },
  { id: "sleep_7", name: "Night Watch", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 1, maxDays: 8, progress: at("sleepLogs", 7) },
  { id: "sleep_30", name: "Dream Ledger", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 2, maxDays: 34, progress: at("sleepLogs", 30) },
  { id: "sleep_100", name: "Moonkeeper", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 3, maxDays: 56, progress: at("sleepLogs", 50) },
  { id: "sleep_365", name: "Keeper of Nights", desc: "{n} شب خواب ثبت شد", category: "sleep", rarity: 4, maxDays: 84, progress: at("sleepLogs", 75) },
  { id: "sleep_log_run_30", name: "Unbroken Nights", desc: "{n} شب پشت‌سرهم ثبت خواب", category: "sleep", rarity: 3, maxDays: 30, progress: at("sleepLogRun", 30) },
  { id: "sleep_goal_7", name: "Well Rested", desc: "{n} شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 2, maxDays: 10, progress: at("sleepGoalNights", 7) },
  { id: "sleep_goal_30", name: "Sleep Master", desc: "{n} شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 3, maxDays: 40, progress: at("sleepGoalNights", 30) },
  { id: "sleep_goal_100", name: "Lord of Slumber", desc: "{n} شب بین 7 تا 9 ساعت خواب", category: "sleep", rarity: 4, maxDays: 80, progress: at("sleepGoalNights", 60) },
  { id: "sleep_steady_7", name: "Body Clock", desc: "{n} شب پشت‌سرهم خواب سر ساعت هدف", category: "sleep", rarity: 3, maxDays: 7, progress: at("sleepConsistentRun", 7) },
  { id: "sleep_steady_30", name: "Circadian Master", desc: "{n} شب پشت‌سرهم خواب سر ساعت هدف", category: "sleep", rarity: 4, maxDays: 30, progress: at("sleepConsistentRun", 30) },

  // ── بدن و تغذیه ──
  { id: "workout_10", name: "Iron Initiate", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 1, maxDays: 23, progress: at("workoutSessions", 10) },
  { id: "workout_50", name: "Forged in Iron", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 2, maxDays: 56, progress: at("workoutSessions", 24) },
  { id: "workout_150", name: "Steel Will", desc: "{n} جلسه‌ی تمرین کامل", category: "body", rarity: 3, maxDays: 84, progress: at("workoutSessions", 36) },
  { id: "workout_weeks_4", name: "Iron Discipline", desc: "{n} هفته‌ی پشت‌سرهم، هر هفته حداقل 3 جلسه", category: "body", rarity: 2, maxDays: 34, progress: at("workoutWeekRun", 4) },
  { id: "workout_weeks_12", name: "Unyielding", desc: "{n} هفته‌ی پشت‌سرهم، هر هفته حداقل 3 جلسه", category: "body", rarity: 4, maxDays: 90, progress: at("workoutWeekRun", 12) },
  { id: "cal_days_30", name: "Mindful Plate", desc: "{n} روز ثبت تغذیه", category: "body", rarity: 2, maxDays: 34, progress: at("calorieLogDays", 30) },
  { id: "cal_days_100", name: "Nutrition Scholar", desc: "{n} روز ثبت تغذیه", category: "body", rarity: 3, maxDays: 67, progress: at("calorieLogDays", 60) },
  { id: "cal_run_7", name: "Clean Week", desc: "{n} روز پشت‌سرهم ثبت تغذیه", category: "body", rarity: 2, maxDays: 7, progress: at("calorieLogRun", 7) },
  { id: "cal_run_30", name: "Fuel Master", desc: "{n} روز پشت‌سرهم ثبت تغذیه", category: "body", rarity: 4, maxDays: 30, progress: at("calorieLogRun", 30) },
  { id: "cal_target_30", name: "Perfect Balance", desc: "{n} روز کالری در محدوده‌ی 10 درصدی هدف", category: "body", rarity: 3, maxDays: 43, progress: at("calorieOnTargetDays", 30) },

  // ── ترید ──
  { id: "trade_50", name: "Chronicler", desc: "{n} معامله‌ی ژورنال‌شده", category: "trade", rarity: 2, maxDays: 35, progress: at("tradesJournaled", 25) },
  { id: "trade_250", name: "Market Historian", desc: "{n} معامله‌ی ژورنال‌شده", category: "trade", rarity: 3, maxDays: 70, progress: at("tradesJournaled", 50) },
  { id: "trade_check_25", name: "By the Book", desc: "{n} معامله با چک‌لیست کامل", category: "trade", rarity: 2, maxDays: 44, progress: at("tradesChecklistFull", 25) },
  { id: "trade_check_100", name: "Ironclad Process", desc: "{n} معامله با چک‌لیست کامل", category: "trade", rarity: 4, maxDays: 70, progress: at("tradesChecklistFull", 40) },
  { id: "trade_plan_20", name: "Cold Blood", desc: "{n} معامله‌ی پشت‌سرهم طبق پلن", category: "trade", rarity: 3, maxDays: 40, progress: at("tradePlanRun", 20) },
  { id: "trade_reflect_50", name: "Mind Over Market", desc: "{n} معامله با احساس قبل و بعد و یادداشت", category: "trade", rarity: 3, maxDays: 70, progress: at("tradesReflected", 30) },

  // ── ویژه ──
  { id: "planner_10", name: "Architect", desc: "حداقل {n} برنامه در روتینت", category: "special", rarity: 1, maxDays: 1, progress: at("routineItems", 10) },
  { id: "member_30", name: "Companion", desc: "{n} روز همراهی", category: "special", rarity: 1, maxDays: 30, progress: at("memberDays", 30) },
  { id: "member_365", name: "Old Guard", desc: "{n} روز همراهی", category: "special", rarity: 3, maxDays: 90, progress: at("memberDays", 90) },
  { id: "mentee_program_1", roleBased: true, name: "Devoted Apprentice", desc: "یک برنامه‌ی منتور تا پایان کامل شد", category: "special", rarity: 2, maxDays: 90, progress: at("menteeProgramsDone", 1) },
  { id: "mentor_students_5", roleBased: true, name: "Guiding Light", desc: "همراهی {n} شاگرد به‌عنوان منتور", category: "special", rarity: 4, maxDays: 90, progress: at("mentorStudents", 3) },
];

export const ACHIEVEMENTS: AchievementDef[] = DEFS.map((d) => ({ ...d, title: d.name, descEn: DESC_EN[d.id] ?? d.desc }));

/** نشانه‌ی {n} همیشه با عدد هدف جایگزین می‌شه (چه باز چه قفل) — علامت سوال فقط برای مایلستون‌های استریکه */
export function achievementDesc(a: Pick<AchievementDef, "desc"> & { descEn?: string }, goal: number, _unlocked?: boolean): string {
  const t = isEn() && a.descEn ? a.descEn : a.desc;
  return t.split("{n}").join(String(goal));
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

/** اچیومنت‌هایی که نام طلایی لازم داره (همه به‌جز وابسته‌های نقش) */
export const GOLDEN_REQUIRED_IDS: string[] = ACHIEVEMENTS.filter((a) => !a.roleBased).map((a) => a.id);

/** شرط نام طلایی: همه‌ی اچیومنت‌های غیر نقش‌محور باز باشن (ورودی: شناسه‌های بازشده) */
export function goldenReached(unlockedIds: Iterable<string>): boolean {
  const u = new Set(unlockedIds);
  return GOLDEN_REQUIRED_IDS.every((id) => u.has(id));
}

export function allUnlocked(states: AchievementState[]): boolean {
  return goldenReached(states.filter((s) => s.unlocked).map((s) => s.id));
}

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
