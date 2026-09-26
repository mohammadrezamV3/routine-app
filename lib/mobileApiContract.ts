// قراردادِ API بینِ بک‌اندِ وب و اپ اندروید (Capacitor) — /api/mobile/*
//
// این فایل عمدا هیچ import‌ای نداره تا عینا بشه کپی‌اش رو توی
// `mobile/src/lib/api-contract.ts` گذاشت. نسخه‌ی مرجع همین‌جاست؛ تستِ
// __tests__/mobileApiContract.test.ts اگه دو نسخه از هم فاصله بگیرن می‌شکنه.
//
// قراردادهای کلی:
//   • احرازِ هویت فقط با هدرِ `Authorization: Bearer <accessToken>` — هیچ کوکی‌ای.
//   • همه‌ی زمان‌ها رشته‌ی ISO-8601 به UTC‌ان (`2026-09-25T10:00:00.000Z`)،
//     و تاریخِ روز (`date`) همیشه `YYYY-MM-DD`.
//   • پیامِ خطا (`error`) فارسی و برای نمایش به کاربره؛ روی متنش منطق نساز،
//     روی status code بساز.

// ─── Auth ────────────────────────────────────────────────────────────────

export type MobileModuleKey =
  | "ROUTINE"
  | "SLEEP"
  | "TASKS"
  | "EXERCISE"
  | "CALORIE"
  | "TRADE"
  | "ROADMAP"
  | "AI_INSIGHT";

/** یک ماژولِ فعال با انقضاش (null = بی‌انقضا، مثلا پلنِ پایه یا سوپریوزر) */
export type MobileModuleAccess = { module: MobileModuleKey; expiresAt: string | null };

/** اشتراکِ فعلیِ کاربر — همون «پلن فعلی»ِ پنلِ حسابِ وب (ACTIVE/TRIAL و منقضی‌نشده) */
export type MobilePlanInfo = {
  /** "basic" | "exercise" | "trade" | "max" | … */
  key: string;
  /** نامِ فارسیِ پلن (Plan.nameFa) */
  name: string;
  status: "ACTIVE" | "TRIAL";
  /** ISO — پایانِ دوره‌ی فعلیِ اشتراک (Subscription.currentPeriodEnd) */
  expiresAt: string;
};

export type MobileUser = {
  id: string;
  name: string | null;
  username: string | null;
  /** شماره‌ی ماسک‌شده برای نمایش، مثلا "0912***4567" — شماره‌ی کامل هیچ‌وقت نمیاد */
  phoneMasked: string | null;
  market: "IRAN" | "INTERNATIONAL";
  /** ماژول‌های فعال و منقضی‌نشده — فقط برای نمایش؛ سرور خودش دوباره چک می‌کنه */
  modules: MobileModuleKey[];
  /** همون ماژول‌ها با تاریخِ انقضا */
  moduleAccess: MobileModuleAccess[];
  /** null یعنی اشتراکِ فعالی نداره */
  plan: MobilePlanInfo | null;
};

export type MobileTokens = {
  /** JWT کوتاه‌عمر (رمزگذاری‌شده، audience = "mobile") */
  accessToken: string;
  /** ثانیه تا انقضای accessToken */
  accessTokenExpiresIn: number;
  /** توکنِ مات و یک‌بارمصرف — با هر refresh عوض می‌شه؛ نسخه‌ی قبلی فورا باطله */
  refreshToken: string;
  /** ISO — انقضای refreshToken (با هر refresh جلو می‌ره) */
  refreshTokenExpiresAt: string;
};

export type MobileAuthSuccess = MobileTokens & { user: MobileUser };

/** POST /api/mobile/auth/login */
export type MobileLoginRequest = {
  /** ایمیل، شماره موبایل یا یوزرنیم */
  identifier: string;
  password: string;
  /** اسمِ نمایشیِ دستگاه برای «دستگاه‌های فعال» (حداکثر ۶۰ کاراکتر) */
  deviceName?: string;
};
/** 200: یا توکن‌ها، یا (برای حسابِ دومرحله‌ای) درخواستِ کدِ پیامکی. 401 عمومی / 429 / 502 */
export type MobileLoginResponse = MobileAuthSuccess | { requires2fa: true; phoneHint: string };

/** POST /api/mobile/auth/verify-2fa */
export type MobileVerify2faRequest = { identifier: string; code: string; deviceName?: string };
/** 200 | 401 عمومی | 429 */
export type MobileVerify2faResponse = MobileAuthSuccess;

/** POST /api/mobile/auth/refresh */
export type MobileRefreshRequest = { refreshToken: string };
/** 200 | 401 (توکن نامعتبر/باطل/منقضی ← کاربر باید دوباره وارد بشه) */
export type MobileRefreshResponse = MobileAuthSuccess;

/**
 * GET /api/mobile/me — Bearer. همون MobileUserِ login/refresh، برای تازه‌کردنِ
 * اطلاعاتِ حساب (پلن/ماژول‌ها) بدونِ refreshِ توکن. 200 | 401 | 429
 */
export type MobileMeResponse = { user: MobileUser };

/** POST /api/mobile/auth/logout — Bearer اختیاری؛ همیشه 200 */
export type MobileLogoutRequest = { refreshToken?: string };
export type MobileLogoutResponse = { ok: true };

export type MobileErrorResponse = { error: string };

// ─── Sync (فاز ۱: روتین/داشبورد) ───────────────────────────────────────

export type SyncEntity =
  | "dailyEntry"
  | "sleepEntry"
  | "task"
  | "setting"
  // فاز ۴ — فقط با دسترسیِ فعالِ ماژولِ مربوطه (سمتِ سرور چک می‌شه)
  | "exercisePlan"
  | "exerciseLog"
  | "foodLogEntry"
  | "calorieTarget"
  // پیشرفتِ رودمپ — ماژولِ ROADMAP
  | "roadmapProgress";

/** ماژول‌های پولی که موجودیت‌هاشون در sync گیت می‌شن */
export type MobileGatedModule = "EXERCISE" | "CALORIE" | "ROADMAP";
/** entity → ماژولی که لازم داره */
export const SYNC_ENTITY_MODULE: Partial<Record<SyncEntity, MobileGatedModule>> = {
  exercisePlan: "EXERCISE",
  exerciseLog: "EXERCISE",
  foodLogEntry: "CALORIE",
  calorieTarget: "CALORIE",
  roadmapProgress: "ROADMAP",
};

/** کلیدهای تنظیماتی که توی فاز ۱ همگام می‌شن */
export const MOBILE_SYNC_SETTING_KEYS = [
  "theme",
  "customOccurrences",
  "removedOccurrences",
  "outingDates",
  "wakeSleepTimes",
  "medications",
  "dashboardPrefs",
  "bodyMetrics",
] as const;
export type MobileSyncSettingKey = (typeof MOBILE_SYNC_SETTING_KEYS)[number];

/**
 * فیلدهای مشترکِ هر رکوردِ برگشتی.
 * `editedAt`: زمانِ منطقیِ آخرین ویرایش — همونی که LWW باهاش مقایسه می‌کنه.
 * کلاینت برای هر رکورد همین رو نگه داره و تغییرِ محلیِ خودش رو فقط وقتی
 * push کنه که clientUpdatedAtش از این بزرگ‌تر باشه.
 * `updatedAt`: زمانِ سرور؛ فقط برای دیباگ — کلاینت بهش تکیه نکنه.
 */
type SyncMeta = { editedAt: string; updatedAt: string };

export type DailyEntryRecord = SyncMeta & {
  date: string;
  /** { [کلیدِ برنامه/تسک]: انجام‌شده } — حداکثر ۵۰۰ کلید، هر کلید حداکثر ۲۰۰ کاراکتر */
  tasks: Record<string, boolean>;
  /** ISO یا null */
  wake: string | null;
  /**
   * true یعنی روزِ خالی (tombstoneِ delete: هیچ تیکی و wake=null) — ردیف فقط
   * برای LWW روی سرور می‌مونه؛ کلاینت نسخه‌ی محلی رو پاک کنه.
   */
  deleted: boolean;
};

export type SleepEntryRecord = SyncMeta & {
  date: string;
  sleptAt: string | null;
  wokeAt: string | null;
  /** ISOِ کامل (UTC) */
  targetSleptAt: string | null;
  targetWokeAt: string | null;
  /** همون هدف‌ها به‌شکلِ "HH:mm" به ساعتِ User.timezone (نه ساعتِ گوشی) */
  targetSleptAtHhmm: string | null;
  targetWokeAtHhmm: string | null;
  /** IANAِ کاربر که HH:mmها باهاش حساب شدن (User.timezone) */
  timezone: string;
  /** ۱ تا ۵ یا null */
  quality: number | null;
  /** true یعنی روزِ خالی (tombstoneِ delete: همه‌ی فیلدها null) — کلاینت پاکش کنه */
  deleted: boolean;
};

/**
 * اولویتِ تسک — عدد ۰ تا ۱۰ روی سیم، با این نگاشت:
 *   0 = low، 1 = medium (پیش‌فرض)، 2 = high. مقادیرِ ۳ تا ۱۰ (قدیمی/آینده)
 *   رو «high» نمایش بده.
 */
export const TASK_PRIORITY = { low: 0, medium: 1, high: 2 } as const;
export const TASK_PRIORITY_DEFAULT = TASK_PRIORITY.medium;

export type TaskRecord = SyncMeta & {
  id: string;
  title: string;
  notes: string | null;
  /** "YYYY-MM-DD" (روزِ تقویمی، بدونِ ساعت — سرور نیمه‌شبِ UTC ذخیره می‌کنه) */
  dueDate: string | null;
  /** TASK_PRIORITY */
  priority: number;
  completedAt: string | null;
  createdAt: string;
  /** tombstone: true یعنی حذف شده — کلاینت باید نسخه‌ی محلی رو پاک کنه */
  deleted: boolean;
};

export type SettingRecord = SyncMeta & {
  key: MobileSyncSettingKey;
  /** null یعنی حذف/بازنشانی شده */
  value: unknown;
};

// ─── فاز ۴: بدنسازی و کالری ────────────────────────────────────────────

/** یک روزِ برنامه‌ی تمرینی. day یکی از روزهای هفته به فارسی (یکشنبه…شنبه) */
export type ExerciseDay = { day: string; focus: string; items: string[] };

export type ExercisePlanRecord = SyncMeta & {
  id: string;
  /** beginner | intermediate | advanced | custom (برنامه‌ی دستی) */
  level: string;
  goal: string | null;
  heightCm: number | null;
  weightKg: number | null;
  hasPhysicalLimitation: boolean;
  gymDays: string[];
  trainingPhase: string | null;
  trainingMonth: number | null;
  equipment: string | null;
  generatedByAi: boolean;
  startDate: string;
  /** همیشه حداکثر یک برنامه‌ی فعال — فعال‌کردنِ یکی، بقیه رو غیرفعال می‌کنه */
  isActive: boolean;
  planData: ExerciseDay[];
  createdAt: string;
};

export type ExerciseLogRecord = SyncMeta & {
  /** `${planId}|${date}` — کلیدِ همین رکورد در push */
  key: string;
  planId: string;
  date: string;
  completed: boolean;
  completedItems: string[];
  /** یادداشتِ آزادِ همین جلسه (حداکثر EXERCISE_LOG_NOTES_MAX کاراکتر) */
  notes: string | null;
};

export type FoodLogEntryRecord = SyncMeta & {
  id: string;
  date: string;
  customName: string | null;
  /** کالریِ کلِ همین مقدار (نه به‌ازای ۱۰۰ گرم) */
  customCalories: number | null;
  grams: number;
  mealType: string | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  aiScanned: boolean;
  createdAt: string;
  deleted: boolean;
};

export type MealBreakdownItem = { key: string; label: string; kcal: number };

export type CalorieTargetRecord = SyncMeta & {
  id: string;
  dailyTargetKcal: number;
  goal: string | null;
  mealsPerDay: number | null;
  mealBreakdown: MealBreakdownItem[] | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  sex: string | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  effectiveFrom: string;
  /** null = هدفِ فعلی؛ پر = تاریخچه */
  effectiveTo: string | null;
};

/** سطح‌های مجازِ برنامه — سه سطحِ قالب‌های ایستا/AI + custom (برنامه‌ی دستی) */
export const EXERCISE_PLAN_LEVELS = ["beginner", "intermediate", "advanced", "custom"] as const;
export type ExercisePlanLevel = (typeof EXERCISE_PLAN_LEVELS)[number];
export const EXERCISE_TRAINING_PHASES = ["bulk", "cut", "maintenance", "none"] as const;
export type ExerciseTrainingPhase = (typeof EXERCISE_TRAINING_PHASES)[number];

/**
 * متادیتای اختیاریِ برنامه (همون ستون‌هایی که وب برای برنامه‌ی قالبی/AI
 * ذخیره می‌کنه)، با همون سقف‌های POST /api/exercise/plan:
 *   goal ≤ ۲۰۰، equipment ≤ ۵۰۰، heightCm ۵۰..۲۶۰، weightKg ۲۰..۴۰۰،
 *   trainingMonth عددِ صحیحِ ۱..۶۰۰، gymDays نامِ فارسیِ روزهای هفته (بی‌تکرار).
 * نبودِ هر فیلد: در ساخت = پیش‌فرض (level=custom، goal=null، trainingPhase=none،
 * gymDays = روزهای planData)؛ در ویرایش = مقدارِ فعلی دست نمی‌خوره.
 * null برای فیلدهای nullable یعنی پاک‌کردن. generatedByAi همیشه سمتِ سروره.
 */
export type ExercisePlanMeta = {
  level?: ExercisePlanLevel;
  goal?: string | null;
  equipment?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  trainingMonth?: number | null;
  trainingPhase?: ExerciseTrainingPhase;
  hasPhysicalLimitation?: boolean;
  gymDays?: string[];
};

/**
 * برنامه‌ی تمرینی: جایگزینیِ حرکت/چیدمان (planData)، فعال/غیرفعال‌کردن و
 * متادیتای اختیاری (ExercisePlanMeta). ساختِ id جدید (برنامه‌ی دستی یا قالبیِ
 * آفلاین) فقط با rulesAccepted=true. ساختِ برنامه با AI از این راه نیست
 * (endpointِ AI جدا). delete پشتیبانی نمی‌شه.
 * سقف‌ها: ۱ تا ۷ روز، هر روز ۱ تا ۵۰ حرکت، هر حرکت ≤ ۲۰۰ کاراکتر، focus ≤ ۱۰۰.
 */
export type ExercisePlanData = ExercisePlanMeta & { planData: ExerciseDay[]; isActive: boolean; rulesAccepted?: boolean };

export const EXERCISE_LOG_NOTES_MAX = 1000;

/**
 * completedItems حداکثر ۵۰۰ مورد، هر کدوم ≤ ۲۰۰ کاراکتر. planId باید برنامه‌ی خودِ کاربر باشه.
 * notes: اختیاری، حداکثر EXERCISE_LOG_NOTES_MAX کاراکتر (trim می‌شه). نبودنش
 * (undefined) یادداشتِ فعلی رو نگه می‌داره؛ null یا "" پاکش می‌کنه. delete هم پاکش می‌کنه.
 */
export type ExerciseLogData = { completed: boolean; completedItems: string[]; notes?: string | null };

/**
 * همون قواعدِ POST /api/calorie/log: customName ۱ تا ۸۰ کاراکتر، customCalories > 0،
 * 0 < grams ≤ 10000، mealType ≤ ۲۰ کاراکتر، درشت‌مغذی‌ها یا هر سه (۰ تا ۲۰۰۰) یا هیچ‌کدوم.
 */
export type FoodLogEntryData = {
  date: string;
  customName: string;
  customCalories: number;
  grams: number;
  mealType: string | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  aiScanned?: boolean;
};

/**
 * هدفِ کالری — دو نوع:
 *  - compute: فقط با id *جدید*. سرور خودش با فرمول حساب می‌کنه (عدد از کلاینت
 *    گرفته نمی‌شه) و هدفِ فعلی رو می‌بنده. اگه هدفِ فعلیِ سرور جدیدتر از
 *    clientUpdatedAt باشه → stale و هدفِ فعلی برمی‌گرده.
 *  - meals: ویرایشِ وعده‌ها/درشت‌مغذی‌های یک هدفِ *فعلیِ* موجود (مثل PATCH وب).
 * delete پشتیبانی نمی‌شه.
 */
export type CalorieTargetData =
  | { kind: "compute"; goal: "lose" | "maintain" | "gain"; mealsPerDay: number; sex: "male" | "female"; ageYears?: number; heightCm: number; weightKg: number }
  | { kind: "meals"; mealBreakdown: MealBreakdownItem[]; proteinTargetG?: number | null; carbsTargetG?: number | null; fatTargetG?: number | null };

// ─── رودمپ ─────────────────────────────────────────────────────────────

/**
 * تیکِ مرحله‌ها و کارها: کلیدِ `"n"` (شماره‌ی مرحله) = کلِ مرحله تمام شد،
 * کلیدِ `"n.i"` (i یک‌مبنا) = کارِ iامِ مرحله‌ی n — همون taskKeyِ
 * lib/roadmapPlan.ts. فقط true نگه داشته می‌شه؛ درصد فقط از کلیدهای مرحله.
 */
export type RoadmapStepProgress = Record<string, boolean>;
/** همیشه سمتِ سرور حساب می‌شه (فقط کلیدهای مرحله، نه کار)؛ هر درصدی که کلاینت بفرسته نادیده گرفته می‌شه */
export type RoadmapProgressSummary = { total: number; done: number; pct: number };

export type RoadmapProgressRecord = SyncMeta & {
  /** id خودِ رودمپ */
  id: string;
  stepProgress: RoadmapStepProgress;
  progress: RoadmapProgressSummary;
};

/**
 * LWW روی *کلِ* نقشه‌ی پیشرفتِ یک رودمپ (نه تک‌مرحله). رودمپ باید مالِ خودِ
 * کاربر باشه؛ کلیدِ مرحله/کاری که وجود نداره یا مقدارِ غیرِ true دور ریخته
 * می‌شه. ساخت/حذفِ رودمپ از این راه نیست. حداکثر ۲۵۰ کلید.
 */
export type RoadmapProgressData = { stepProgress: RoadmapStepProgress };

// شکلِ مسیر — آینه‌ی RoadmapPlan در lib/roadmapPlan.ts (ساختِ دوفازی: اسکلت +
// جزئیاتِ ریزِ هر مرحله). سرور همیشه با normalizePlan کاملش می‌کنه، پس هیچ
// فیلدی غایب نیست (ردیفِ قدیمیِ learn/do/done هم به همین شکل نگاشت می‌شه).
/** سطحِ شروع — همون LEVEL_OPTIONSِ lib/roadmapPlan.ts (مقدار + برچسب) */
export const ROADMAP_LEVEL_OPTIONS = [
  { value: "zero", label: "صفرِ مطلق" },
  { value: "basic", label: "یه چیزایی بلدم" },
  { value: "mid", label: "متوسطم" },
  { value: "pro", label: "حرفه‌ای‌ام، می‌خوام عمیق‌تر شم" },
] as const;
/** وقتِ هفتگی — همون HOURS_OPTIONSِ lib/roadmapPlan.ts */
export const ROADMAP_HOURS_OPTIONS = [
  { value: "3", label: "کمتر از ۵ ساعت" },
  { value: "8", label: "۵ تا ۱۰ ساعت" },
  { value: "15", label: "۱۰ تا ۲۰ ساعت" },
  { value: "25", label: "بیشتر از ۲۰ ساعت" },
] as const;
export type RoadmapLevel = (typeof ROADMAP_LEVEL_OPTIONS)[number]["value"];
export type RoadmapWeeklyHours = (typeof ROADMAP_HOURS_OPTIONS)[number]["value"];
export type RoadmapResource = {
  title: string;
  type: string;
  source?: string;
  /** فقط لینکِ دامنه‌های شناخته‌شده — بقیه رو با جست‌وجوی عنوان باز کن */
  url?: string;
  /** این منبع دقیقا برای کدوم بخشِ مرحله‌ست */
  why?: string;
};
export type RoadmapTool = { name: string; use: string };
export type RoadmapTopic = { title: string; detail: string; points: string[] };
export type RoadmapTask = { title: string; detail: string; output: string };
export type RoadmapProject = { title: string; brief: string; deliverables: string[] };
export type RoadmapStage = {
  n: number;
  title: string;
  goal: string;
  duration: string;
  focus: string;
  why: string;
  /** false یعنی فقط اسکلت ساخته شده — با POST /api/mobile/ai/roadmap/{id}/regenerate بساز */
  detailed: boolean;
  prerequisites: string[];
  topics: RoadmapTopic[];
  /** تیکِ کارِ iام (صفرمبنا در آرایه) با کلیدِ `${n}.${i + 1}` */
  tasks: RoadmapTask[];
  project: RoadmapProject | null;
  tools: RoadmapTool[];
  resources: RoadmapResource[];
  pitfalls: string[];
  done: string[];
};
export type RoadmapCert = { name: string; note: string };
export type RoadmapMeta = {
  level?: RoadmapLevel;
  weeklyHours?: RoadmapWeeklyHours;
  background?: string;
  audience: string;
  prerequisites: string[];
  outcomes: string[];
  certifications: RoadmapCert[];
};
export type RoadmapPlan = {
  title: string;
  summary: string;
  guide: string;
  totalDuration: string;
  tools: RoadmapTool[];
  meta: RoadmapMeta;
  stages: RoadmapStage[];
};

export type MobileRoadmap = {
  id: string;
  topic: string;
  goal: string | null;
  generatedByAi: boolean;
  createdAt: string;
  plan: RoadmapPlan;
  stepProgress: RoadmapStepProgress;
  progress: RoadmapProgressSummary;
  /** برای LWWِ پیشرفت — همون معنیِ editedAt در sync */
  editedAt: string;
  updatedAt: string;
};

/**
 * GET /api/mobile/roadmaps — فهرستِ *کاملِ* رودمپ‌های کاربر با محتوا و پیشرفت
 * (جدیدترین اول). ETag + If-None-Match → 304. 403 {error:"module_locked"}.
 * این فهرست مرجعِ «کدوم رودمپ‌ها وجود دارن» است (حذف‌ها فقط این‌جا دیده می‌شن).
 */
export type MobileRoadmapsResponse = { roadmaps: MobileRoadmap[] };

/** GET /api/mobile/sync/pull?since=<cursor> — بدونِ since یعنی همه‌چیز */
export type SyncPullResponse = {
  /** برای درخواستِ بعدی عینا به‌عنوان since بفرست (مات فرضش کن) */
  cursor: string;
  /** true یعنی هنوز صفحه‌ی بعدی هست (سقفِ ردیف یا حجمِ ~۴MBِ پاسخ پر شد) — فورا دوباره با cursor جدید pull کن */
  hasMore: boolean;
  serverTime: string;
  dailyEntries: DailyEntryRecord[];
  sleepEntries: SleepEntryRecord[];
  tasks: TaskRecord[];
  settings: SettingRecord[];
  /**
   * ماژول‌هایی که الان دسترسی نداره — آرایه‌های مربوط به اون‌ها *اصلا* توی
   * پاسخ نیستن (نه خالی). مهم: اگه ماژولی از locked به باز تغییر کرد، یک‌بار
   * بدونِ since برای اون موجودیت‌ها pull کن — cursor در دورانِ قفل جلو رفته.
   */
  lockedModules: MobileGatedModule[];
  exercisePlans?: ExercisePlanRecord[];
  exerciseLogs?: ExerciseLogRecord[];
  foodLogEntries?: FoodLogEntryRecord[];
  calorieTargets?: CalorieTargetRecord[];
  /**
   * پیشرفتِ رودمپ‌هایی که بعد از since عوض شدن. حذفِ رودمپ اینجا نمیاد
   * (وب واقعا پاکش می‌کنه) — فهرستِ مرجع GET /api/mobile/roadmaps است؛
   * progressِ رودمپی که توی اون فهرست نیست رو نادیده بگیر.
   */
  roadmapProgress?: RoadmapProgressRecord[];
};

export type DailyEntryData = { tasks: Record<string, boolean>; wake: string | null };
/**
 * targetSleptAt/targetWokeAt: یا "HH:mm" (ساعتِ دیواری — سرور با تاریخِ همین
 * روز (key) و User.timezone به UTC تبدیلش می‌کنه)، یا ISOِ کامل با منطقه‌ی
 * زمانی (سازگاریِ قبلی)، یا null.
 */
export type SleepEntryData = {
  sleptAt: string | null;
  wokeAt: string | null;
  targetSleptAt: string | null;
  targetWokeAt: string | null;
  quality: number | null;
};
/**
 * dueDate: "YYYY-MM-DD" (پیشنهادی — نیمه‌شبِ UTCِ همون روز ذخیره می‌شه، پس
 * اختلافِ یک‌روزه‌ی منطقه‌ی زمانی پیش نمیاد). ISOِ کامل هم برای سازگاری
 * قبول می‌شه و فقط بخشِ روزِ UTCش نگه داشته می‌شه.
 * priority: اختیاری؛ نبودش = TASK_PRIORITY_DEFAULT (1).
 */
export type TaskData = {
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority?: number;
  completedAt: string | null;
};
export type SettingData = { value: unknown };

/**
 * یک تغییرِ محلی. `clientUpdatedAt` = لحظه‌ی ویرایش روی گوشی (ISO).
 * `delete` روی dailyEntry/sleepEntry یعنی «پاک‌کردنِ محتوای اون روز»، روی
 * setting یعنی value=null، و روی task یعنی tombstone (soft-delete).
 * حذفِ رکوردی که سرور هیچ‌وقت نداشته هم یک tombstone می‌سازه (applied با
 * serverRecord) تا upsertِ قدیمی‌ترِ یک دستگاهِ دیگه بعدا برنده نشه.
 * `data` فقط برای upsert لازمه.
 */
export type SyncChange =
  | { entity: "dailyEntry"; key: string; op: "upsert"; data: DailyEntryData; clientUpdatedAt: string }
  | { entity: "dailyEntry"; key: string; op: "delete"; clientUpdatedAt: string }
  | { entity: "sleepEntry"; key: string; op: "upsert"; data: SleepEntryData; clientUpdatedAt: string }
  | { entity: "sleepEntry"; key: string; op: "delete"; clientUpdatedAt: string }
  | { entity: "task"; id: string; op: "upsert"; data: TaskData; clientUpdatedAt: string }
  | { entity: "task"; id: string; op: "delete"; clientUpdatedAt: string }
  | { entity: "setting"; key: MobileSyncSettingKey; op: "upsert"; data: SettingData; clientUpdatedAt: string }
  | { entity: "setting"; key: MobileSyncSettingKey; op: "delete"; clientUpdatedAt: string }
  | { entity: "exercisePlan"; id: string; op: "upsert"; data: ExercisePlanData; clientUpdatedAt: string }
  | { entity: "exerciseLog"; key: string; op: "upsert"; data: ExerciseLogData; clientUpdatedAt: string }
  | { entity: "exerciseLog"; key: string; op: "delete"; clientUpdatedAt: string }
  | { entity: "foodLogEntry"; id: string; op: "upsert"; data: FoodLogEntryData; clientUpdatedAt: string }
  | { entity: "foodLogEntry"; id: string; op: "delete"; clientUpdatedAt: string }
  | { entity: "calorieTarget"; id: string; op: "upsert"; data: CalorieTargetData; clientUpdatedAt: string }
  | { entity: "roadmapProgress"; id: string; op: "upsert"; data: RoadmapProgressData; clientUpdatedAt: string };

/** POST /api/mobile/sync/push — حداکثر MOBILE_SYNC_MAX_BATCH تغییر، بدنه حداکثر ۱MB */
export type SyncPushRequest = { changes: SyncChange[] };

export const MOBILE_SYNC_MAX_BATCH = 200;

export type SyncServerRecord =
  | DailyEntryRecord
  | SleepEntryRecord
  | TaskRecord
  | SettingRecord
  | ExercisePlanRecord
  | ExerciseLogRecord
  | FoodLogEntryRecord
  | CalorieTargetRecord
  | RoadmapProgressRecord;

/**
 * کدِ ماشین‌خوانِ هر rejected — روی این منطق بساز، نه روی متنِ error:
 *   module_locked  ماژولِ این موجودیت فعال نیست — نگه دار، بعد از تمدید دوباره بفرست
 *   invalid        ورودیِ نامعتبر یا id مالِ کسِ دیگه — دوباره نفرست
 *   not_found      مرجع (برنامه/رودمپ/هدفِ فعلی) پیدا نشد — دوباره نفرست
 *   conflict       با وضعیتِ سرور جور نیست (مثلا هدفی که دیگه فعال نیست)
 *   busy           تغییرِ هم‌زمان — همون تغییر رو بعدا دوباره بفرست (retryable)
 */
export type SyncRejectCode = "module_locked" | "invalid" | "not_found" | "conflict" | "busy";

/**
 * applied: نوشته شد؛ serverRecord نسخه‌ی نهاییه.
 * stale:   نسخه‌ی سرور جدیدتر (یا هم‌زمان) بود؛ serverRecord رو جایگزینِ نسخه‌ی محلی کن.
 * rejected: code دلیلشه (فقط busy و module_locked ارزشِ دوباره‌فرستادن دارن).
 *   برای سازگاری، module_locked هنوز error === "module_locked" هم داره.
 */
export type SyncChangeResult = {
  index: number;
  entity: SyncEntity | null;
  key?: string;
  id?: string;
  status: "applied" | "stale" | "rejected";
  /** فقط روی rejected */
  code?: SyncRejectCode;
  error?: string;
  serverRecord: SyncServerRecord | null;
};

export type SyncPushResponse = { serverTime: string; results: SyncChangeResult[] };

export const SYNC_ERROR_MODULE_LOCKED = "module_locked";

// ─── Catalog (دیتای مرجعِ فقط‌خواندنی برای آفلاین) ───────────────────────

export type CatalogFood = { name: string; caloriesPer100g: number };
export type CatalogExercise = {
  name: string;
  muscleGroup: string;
  muscleKeys: string[];
  pattern: string;
  howTo: string[];
  benefits: string;
};

/**
 * GET /api/mobile/catalog — Bearer لازم. `ETag` برمی‌گرده؛ درخواستِ بعدی با
 * `If-None-Match: <همون ETag>` → 304 بدونِ بدنه اگه تغییری نکرده.
 * exerciseMedia فقط با دسترسیِ EXERCISE (وگرنه null): کلیدِ نرمال‌شده‌ی نامِ
 * حرکت‌هایی که عکس دارن + updatedAt — اگه updatedAt عوض شد عکس رو دوباره بگیر.
 */
export type MobileCatalogResponse = {
  version: string;
  foods: CatalogFood[];
  exercises: CatalogExercise[];
  exerciseMedia: { key: string; updatedAt: string }[] | null;
};

/**
 * GET /api/mobile/catalog/media?key=<کلیدِ exerciseMedia> — ماژولِ EXERCISE.
 * 200 {dataUrl} | 404 | 403 {error:"module_locked"}. `ETag` + `If-None-Match` هم دارد.
 */
export type MobileCatalogMediaResponse = { key: string; dataUrl: string; updatedAt: string };

// ─── AI ────────────────────────────────────────────────────────────────

/** POST /api/mobile/ai/food-scan — ماژولِ CALORIE، سقفِ ۱۵ اسکن در ساعت (مشترک با وب) */
export type MobileFoodScanRequest = { imageBase64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
export type FoodScanResult =
  | { recognized: true; name: string; estimatedGrams: number; calories: number; proteinG: number; carbsG: number; fatG: number }
  | { recognized: false; message: string };
/** 200 | 400 | 401 | 403 {error:"module_locked"} | 429 | 500 */
export type MobileFoodScanResponse = { ok: true; result: FoodScanResult };

/**
 * POST /api/mobile/ai/exercise-plan — ماژولِ EXERCISE. همون ورودی/سهمیه‌ی ماهانه/
 * fallbackِ POST /api/exercise/plan. برنامه‌ی قبلیِ فعال غیرفعال می‌شه؛ تغییرها
 * توی pullِ بعدی هم میان.
 */
export type MobileExercisePlanRequest = {
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
  equipment: string;
  gymDays: string[];
  rulesAccepted: true;
  heightCm?: number;
  weightKg?: number;
  trainingMonth?: number;
  hasPhysicalLimitation?: boolean;
  limitationDetails?: string;
  description?: string;
};
/** 200 | 400 | 401 | 403 {error:"module_locked"} | 429 (سهمیه‌ی ماهانه) */
export type MobileExercisePlanResponse =
  | { ok: true; feasible: true; plan: ExercisePlanRecord; generatedByAi: boolean }
  | { ok: false; feasible: false; message: string };

/**
 * POST /api/mobile/ai/roadmap — ماژولِ ROADMAP. همون ورودی و سقفِ POST /api/roadmaps
 * (۶ مسیر در ۳۰ دقیقه، مشترک با وب). تا ۶۰ ثانیه طول می‌کشه.
 */
export type MobileRoadmapRequest = {
  topic: string;
  goal?: string;
  /** فقط از فهرستِ ثابت — هر مقدارِ دیگه یعنی «نگفته» */
  level?: RoadmapLevel;
  weeklyHours?: RoadmapWeeklyHours;
  /** پیش‌زمینه‌ی آزاد، حداکثر ۳۰۰ نویسه */
  background?: string;
};
/**
 * 201 | 400 | 401 | 403 {error:"module_locked"} | 429 | 502.
 * pendingStages = مرحله‌هایی که جزئیاتشون در بودجه‌ی زمانیِ ساخت نرسید
 * (detailed:false)؛ guideReady=false یعنی متنِ راهنما خالی موند — هر دو با
 * regenerate ساخته می‌شن.
 */
export type MobileRoadmapResponse = { roadmap: MobileRoadmap; pendingStages: number[]; guideReady: boolean };

/**
 * POST /api/mobile/ai/roadmap/{id}/regenerate — ساختِ دوباره‌ی یک تکه از مسیر
 * (همون POST /api/roadmaps/{id}/regenerate): `{target:"stage", n}` جزئیاتِ یک
 * مرحله، `{target:"guide"}` متنِ راهنما. اسکلت هیچ‌وقت عوض نمی‌شه. سقف ۲۰ بار
 * در ۳۰ دقیقه (سطلِ مشترک با وب). تیکِ کارهایی که دیگه نیستن دور ریخته می‌شه.
 * 200 | 400 | 401 | 403 {error:"module_locked"} | 404 | 429 | 502.
 */
export type MobileRoadmapRegenerateRequest = { target: "guide" } | { target: "stage"; n: number };
export type MobileRoadmapRegenerateResponse = { roadmap: MobileRoadmap };
