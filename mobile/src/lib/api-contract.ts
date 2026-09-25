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

export type MobileUser = {
  id: string;
  name: string | null;
  market: "IRAN" | "INTERNATIONAL";
  /** ماژول‌های فعال و منقضی‌نشده — فقط برای نمایش؛ سرور خودش دوباره چک می‌کنه */
  modules: MobileModuleKey[];
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
};

export type SleepEntryRecord = SyncMeta & {
  date: string;
  sleptAt: string | null;
  wokeAt: string | null;
  targetSleptAt: string | null;
  targetWokeAt: string | null;
  /** ۱ تا ۵ یا null */
  quality: number | null;
};

export type TaskRecord = SyncMeta & {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
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

/**
 * برنامه‌ی تمرینی: فقط جایگزینیِ حرکت/چیدمان (planData) و فعال/غیرفعال‌کردن.
 * ساختِ id جدید فقط برای «برنامه‌ی دستی» (level=custom) و با rulesAccepted=true.
 * ساختِ برنامه با AI از این راه نیست (endpointِ AI جدا). delete پشتیبانی نمی‌شه.
 * سقف‌ها: ۱ تا ۷ روز، هر روز ۱ تا ۵۰ حرکت، هر حرکت ≤ ۲۰۰ کاراکتر، focus ≤ ۱۰۰.
 */
export type ExercisePlanData = { planData: ExerciseDay[]; isActive: boolean; rulesAccepted?: boolean };

/** completedItems حداکثر ۵۰۰ مورد، هر کدوم ≤ ۲۰۰ کاراکتر. planId باید برنامه‌ی خودِ کاربر باشه */
export type ExerciseLogData = { completed: boolean; completedItems: string[] };

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

/** تیکِ مرحله‌ها: کلید = شماره‌ی مرحله (n) به‌شکلِ رشته، فقط true نگه داشته می‌شه */
export type RoadmapStepProgress = Record<string, boolean>;
/** همیشه سمتِ سرور حساب می‌شه؛ هر درصدی که کلاینت بفرسته نادیده گرفته می‌شه */
export type RoadmapProgressSummary = { total: number; done: number; pct: number };

export type RoadmapProgressRecord = SyncMeta & {
  /** id خودِ رودمپ */
  id: string;
  stepProgress: RoadmapStepProgress;
  progress: RoadmapProgressSummary;
};

/**
 * LWW روی *کلِ* نقشه‌ی پیشرفتِ یک رودمپ (نه تک‌مرحله). رودمپ باید مالِ خودِ
 * کاربر باشه؛ کلیدِ مرحله‌ای که وجود نداره یا مقدارِ غیرِ true دور ریخته می‌شه.
 * ساخت/حذفِ رودمپ از این راه نیست. حداکثر ۵۰ کلید.
 */
export type RoadmapProgressData = { stepProgress: RoadmapStepProgress };

export type RoadmapResource = { title: string; type: string; source?: string; url?: string };
export type RoadmapStage = {
  n: number;
  title: string;
  goal: string;
  duration: string;
  learn: string[];
  do: string[];
  tools: string[];
  resources: RoadmapResource[];
  done: string;
};
export type RoadmapPlan = {
  title: string;
  summary: string;
  guide: string;
  totalDuration: string;
  tools: string[];
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
  /** true یعنی هنوز صفحه‌ی بعدی هست — فورا دوباره با cursor جدید pull کن */
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
export type SleepEntryData = {
  sleptAt: string | null;
  wokeAt: string | null;
  targetSleptAt: string | null;
  targetWokeAt: string | null;
  quality: number | null;
};
export type TaskData = {
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: number;
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
 * applied: نوشته شد؛ serverRecord نسخه‌ی نهاییه.
 * stale:   نسخه‌ی سرور جدیدتر (یا هم‌زمان) بود؛ serverRecord رو جایگزینِ نسخه‌ی محلی کن.
 * rejected: ورودی نامعتبر (یا id متعلق به کسِ دیگه) — دوباره نفرست، error دلیلشه.
 *   error === "module_locked" (ثابت، نه فارسی) یعنی ماژولِ این موجودیت فعال
 *   نیست؛ تغییر رو نگه دار و بعد از فعال‌شدنِ اشتراک دوباره بفرست.
 */
export type SyncChangeResult = {
  index: number;
  entity: SyncEntity | null;
  key?: string;
  id?: string;
  status: "applied" | "stale" | "rejected";
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
export type MobileRoadmapRequest = { topic: string; goal?: string };
/** 201 | 400 | 401 | 403 {error:"module_locked"} | 429 | 502 */
export type MobileRoadmapResponse = { roadmap: MobileRoadmap };
