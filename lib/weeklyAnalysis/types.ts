// «آنالیز هفتگی» — قرارداد مشترک بین موتور محاسبه (lib/weeklyAnalysis/*)،
// API (app/api/analysis/weekly/*) و UI (app/analysis/weekly + components/WeeklyAnalysis*).
// این فایل هیچ import سروری نداره تا توی باندل کلاینت هم امن باشه.
// هر تغییری این‌جا یعنی هر سه لایه باید هماهنگ بشن.

// شنبه تا جمعه، به وقت محلی کاربر (User.timezone)
export type AnalysisDomain = "routine" | "sleep" | "tasks" | "fitness" | "nutrition" | "trading" | "learning";

export const ANALYSIS_DOMAINS: AnalysisDomain[] = ["routine", "sleep", "tasks", "fitness", "nutrition", "trading", "learning"];

export const ANALYSIS_DOMAIN_LABELS: Record<AnalysisDomain, string> = {
  routine: "روتین",
  sleep: "خواب",
  tasks: "کارها",
  fitness: "بدنسازی",
  nutrition: "تغذیه",
  trading: "ترید",
  learning: "یادگیری",
};

// ModuleKey هر دامنه (رشته، نه enum پریزما — برای امنیت باندل کلاینت)
export const ANALYSIS_DOMAIN_MODULE: Record<AnalysisDomain, string> = {
  routine: "ROUTINE",
  sleep: "SLEEP",
  tasks: "TASKS",
  fitness: "EXERCISE",
  nutrition: "CALORIE",
  trading: "TRADE",
  learning: "ROADMAP",
};

export type Grade = "S" | "A" | "B" | "C" | "D";

// «داده نداریم» ≠ «صفر». score فقط وقتی hasData=true عدده.
export type DomainResult = {
  domain: AnalysisDomain;
  active: boolean; // کاربر دسترسی ماژول رو داره
  hasData: boolean; // این هفته واقعا چیزی ثبت شده
  score: number | null; // 0..100
  prevScore: number | null; // هفته‌ی قبل
  delta: number | null; // score - prevScore
  daysWithData: number; // 0..7
  daily: (number | null)[]; // ۷تایی شنبه..جمعه، 0..100 یا null
  // آمارهای خوانای مخصوص همون دامنه، برای نمایش کارت‌ها. value همیشه رشته‌ی
  // آماده‌ی نمایش (اعداد لاتین)، مثلا { label: "میانگین خواب", value: "7.2 ساعت" }
  stats: { label: string; value: string; tone?: "good" | "bad" | "neutral" }[];
};

export type DayCell = {
  date: string; // YYYY-MM-DD محلی
  weekday: string; // «شنبه» ...
  score: number | null; // میانگین دامنه‌های دارای داده در اون روز
  isToday: boolean;
  isFuture: boolean;
};

export type TrendPoint = { weekStart: string; score: number | null; domains: Partial<Record<AnalysisDomain, number | null>> };

export type Insight = {
  id: string;
  kind: "correlation" | "streak" | "best_day" | "worst_day" | "consistency" | "improvement" | "decline" | "outlier";
  icon: "link" | "flame" | "trophy" | "alert" | "trend_up" | "trend_down" | "calendar" | "zap";
  title: string; // کوتاه، فارسی
  body: string; // یک-دو جمله، با عدد واقعی
  domain?: AnalysisDomain;
  tone: "good" | "bad" | "neutral";
};

export type Achievement = {
  key: string; // مثلا "perfect_day", "sleep_7h_5days"
  title: string;
  description: string;
  emoji: string; // یک ایموجی
  unlocked: boolean;
  progress?: { current: number; target: number };
};

export type Prediction = {
  // فقط برای هفته‌ی جاری؛ پیش‌بینی امتیاز پایان هفته با روند فعلی
  projectedScore: number;
  low: number;
  high: number;
  message: string;
} | null;

export type AiCoach = {
  summary: string; // ۲-۳ جمله
  recommendations: { title: string; description: string; domain: AnalysisDomain | null; priority: "high" | "medium" | "low" }[];
  generatedAt: string; // ISO
  model: string;
} | null;

export type WeeklyGoalStatus = "ACTIVE" | "DONE" | "MISSED";

export type WeeklyGoalDto = {
  id: string;
  weekStart: string; // هفته‌ای که هدف *برای* اونه
  domain: AnalysisDomain | null;
  title: string;
  target: number | null; // مثلا امتیاز هدف دامنه (0..100)؛ null = هدف متنی/دستی
  status: WeeklyGoalStatus;
  achievedScore: number | null; // وقتی هفته تموم شد
  createdAt: string;
};

export type ReflectionDto = { wentWell: string; improve: string; mood: number | null; updatedAt: string } | null;

export type WeeklyAnalysis = {
  weekStart: string; // YYYY-MM-DD (شنبه)
  weekEnd: string; // YYYY-MM-DD (جمعه)
  weekLabel: string; // مثلا «۱ تا ۷ مهر» (جلالی، ارقام فارسی مجازه فقط این‌جا)
  offset: number; // 0 = هفته‌ی جاری، -1 = قبلی، ...
  isCurrentWeek: boolean;
  daysElapsed: number; // هفته‌ی جاری: چند روز گذشته (1..7)، گذشته: 7

  overall: {
    score: number | null;
    prevScore: number | null;
    delta: number | null;
    grade: Grade | null;
    confidence: "low" | "medium" | "high"; // بر اساس تعداد روزهای دارای داده
    consistency: number | null; // 0..100 — چقدر امتیاز روزها به هم نزدیکه (100 = کاملا یکنواخت)
    activeDays: number; // روزهایی که حداقل یک دامنه داده داشت
    bestDay: DayCell | null;
    worstDay: DayCell | null;
  };

  domains: DomainResult[]; // فقط دامنه‌های active، به ترتیب ANALYSIS_DOMAINS
  days: DayCell[]; // ۷تایی
  trend: TrendPoint[]; // ۸ هفته‌ی اخیر، قدیمی → جدید، آخری = همین هفته
  insights: Insight[]; // حداکثر ۶، مهم‌ترین اول
  achievements: Achievement[];
  prediction: Prediction;
  ai: AiCoach; // از کش؛ null یعنی هنوز ساخته نشده یا AI در دسترس نیست
  aiAvailable: boolean; // ARVAN_AI تنظیم شده؟
  goals: WeeklyGoalDto[]; // اهداف *همین* هفته (که هفته‌ی قبل تعیین شدن)
  nextWeekGoals: WeeklyGoalDto[]; // اهدافی که برای هفته‌ی بعد تعیین شده
  reflection: ReflectionDto;
};

// ---- API ----
// GET    /api/analysis/weekly?offset=0            → { analysis: WeeklyAnalysis }   (بدون فراخوانی AI، سریع)
// POST   /api/analysis/weekly/ai   { offset }      → { ai: AiCoach }               (ساخت/بازسازی مربی AI، rate-limited)
// POST   /api/analysis/weekly/goals { domain, title, target } → { goal }         (برای هفته‌ی بعدِ هفته‌ی جاری؛ حداکثر ۳)
// DELETE /api/analysis/weekly/goals?id=            → { ok }
// PUT    /api/analysis/weekly/reflection { offset, wentWell, improve, mood } → { reflection }
// خطاها همیشه JSON: { error: string } با status مناسب. گیت: requireModule("AI_INSIGHT").
