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

export type SyncEntity = "dailyEntry" | "sleepEntry" | "task" | "setting";

/** کلیدهای تنظیماتی که توی فاز ۱ همگام می‌شن */
export const MOBILE_SYNC_SETTING_KEYS = [
  "customOccurrences",
  "removedOccurrences",
  "outingDates",
  "wakeSleepTimes",
  "medications",
  "dashboardPrefs",
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
  | { entity: "setting"; key: MobileSyncSettingKey; op: "delete"; clientUpdatedAt: string };

/** POST /api/mobile/sync/push — حداکثر MOBILE_SYNC_MAX_BATCH تغییر، بدنه حداکثر ۱MB */
export type SyncPushRequest = { changes: SyncChange[] };

export const MOBILE_SYNC_MAX_BATCH = 200;

export type SyncServerRecord = DailyEntryRecord | SleepEntryRecord | TaskRecord | SettingRecord;

/**
 * applied: نوشته شد؛ serverRecord نسخه‌ی نهاییه.
 * stale:   نسخه‌ی سرور جدیدتر (یا هم‌زمان) بود؛ serverRecord رو جایگزینِ نسخه‌ی محلی کن.
 * rejected: ورودی نامعتبر (یا id متعلق به کسِ دیگه) — دوباره نفرست، error دلیلشه.
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
