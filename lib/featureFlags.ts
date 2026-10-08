// روشن/خاموش‌کردن قابلیت‌ها از پنل ادمین (بدون دیپلوی) — تعریف‌های مشترک
// کلاینت و سرور. هیچ import سروری این‌جا نیست.
//
// سه حالت:
//   on     → برای همه (همچنان با گیت ماژول پولی خودش، اگه داشته باشه)
//   admins → فقط Owner و ادمین‌ها (برای تست قبل از انتشار)
//   off    → خاموش؛ فقط Owner می‌بینه تا بتونه تستش کنه
// enforcement واقعی سمت سروره (lib/featureFlagsServer.ts)؛ کلاینت فقط UI رو مخفی می‌کنه.

export type FeatureMode = "on" | "admins" | "off";

// ترتیب همین فهرست ترتیب نمایش در /admin/features ـه (داخل هر گروه).
export const FEATURE_KEYS = [
  // عمومی
  "dashboard", "notifications", "blog", "about",
  // روتین
  "routine", "sleep", "streak", "shareCards",
  // بدنسازی
  "exercise", "calorie",
  // ترید
  "trade", "tradeJournal", "tradeChecklists", "economicCalendar", "forexClock", "tradeNotes", "metatrader", "tradeChart", "tradeChat", "tradeShare", "tradeRisk", "tradeMoneyMgmt",
  // اجتماعی
  "mentors", "friends",
  // هوش مصنوعی
  "routineAssistant", "aiExercisePlan", "roadmaps", "weeklyAnalysis",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureGroup = "general" | "routine" | "exercise" | "trade" | "social" | "ai";

export const FEATURE_GROUPS: { key: FeatureGroup; label: string }[] = [
  { key: "general", label: "عمومی" },
  { key: "routine", label: "روتین" },
  { key: "exercise", label: "بدنسازی" },
  { key: "trade", label: "ترید" },
  { key: "social", label: "اجتماعی" },
  { key: "ai", label: "هوش مصنوعی" },
];

// parent: زیربخشی که بدون بخش مادرش معنی نداره — مادر خاموش یعنی این هم خاموش
// (featureChain). مثلا «تقویم اقتصادی» زیر «ترید».
export type FeatureMeta = { label: string; hint: string; default: FeatureMode; group: FeatureGroup; parent?: FeatureKey };

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  // روشن برای همه (درخواست صریح صاحب محصول): داشبورد صفحه‌ی اصلی هر کاربر
  // واردشده‌ست (lib/homePath.ts). خاموش‌کردنش از پنل ادمین یعنی برگشت به /weekly.
  dashboard: { label: "داشبورد", hint: "صفحه‌ی /dashboard — نمای کلی همه‌ی بخش‌ها و صفحه‌ی اصلی بعد از ورود", default: "on", group: "general" },
  notifications: { label: "اعلان‌ها", hint: "زنگوله‌ی هدر، فهرست اعلان‌های درون‌برنامه و ثبت اعلان پوش", default: "on", group: "general" },
  blog: { label: "وبلاگ", hint: "صفحه‌های /blog و هر مقاله", default: "on", group: "general" },
  about: { label: "درباره ما", hint: "صفحه‌ی /about و لینکش در منو", default: "on", group: "general" },

  routine: { label: "روتین روزانه و هفتگی", hint: "صفحه‌ی /weekly، تیک برنامه‌ها و بخش روتین داشبورد", default: "on", group: "routine" },
  sleep: { label: "خواب", hint: "صفحه‌ی /sleep و ثبت خواب", default: "on", group: "routine" },
  streak: { label: "استریک و دستاوردها", hint: "صفحه‌ی /streak و اچیومنت‌ها", default: "on", group: "routine" },
  shareCards: { label: "اشتراک فعالیت امروز", hint: "دکمه‌ی اشتراک کارت فعالیت در هیروی داشبورد", default: "on", group: "routine" },

  exercise: { label: "برنامه تمرینی", hint: "تب تمرین در /exercise، پلن و ثبت جلسه‌ها", default: "on", group: "exercise" },
  calorie: { label: "کالری‌شمار", hint: "تب کالری در /exercise، ثبت غذا و هدف کالری", default: "on", group: "exercise" },

  trade: { label: "ترید (کل بخش)", hint: "هاب /trade و همه‌ی زیربخش‌هاش — خاموش یعنی همه‌ی زیربخش‌های ترید هم خاموش", default: "on", group: "trade" },
  tradeJournal: { label: "ژورنال و حساب‌ها", hint: "/trade/journal، صفحه‌ی هر حساب و ثبت معامله", default: "on", group: "trade", parent: "trade" },
  tradeChecklists: { label: "چک‌لیست‌های ترید", hint: "/trade/checklists", default: "on", group: "trade", parent: "trade" },
  economicCalendar: { label: "تقویم اقتصادی", hint: "/trade/calendar و رویدادهای داشبورد", default: "on", group: "trade", parent: "trade" },
  forexClock: { label: "ساعت فارکس", hint: "/trade/clock — وضعیت جلسه‌های معاملاتی", default: "on", group: "trade", parent: "trade" },
  tradeNotes: { label: "یادداشت‌های ترید", hint: "/trade/notes", default: "on", group: "trade", parent: "trade" },
  metatrader: { label: "اتصال متاتریدر", hint: "/trade/metatrader و همگام‌سازی اکسپرت", default: "on", group: "trade", parent: "trade" },
  tradeChart: { label: "چارت نمادها", hint: "/trade/chart و قیمت لحظه‌ای", default: "on", group: "trade", parent: "trade" },
  tradeChat: { label: "چت نمادها", hint: "گفتگوی کاربران زیر چارت هر نماد", default: "on", group: "trade", parent: "tradeChart" },
  tradeRisk: { label: "ریسک و سود", hint: "/trade/risk و ابزار ریسک داخل چارت", default: "on", group: "trade", parent: "trade" },
  tradeMoneyMgmt: { label: "اکسپرت مدیریت سرمایه", hint: "/trade/money و دانلود اکسپرت", default: "admins", group: "trade", parent: "trade" },
  tradeShare: { label: "اشتراک کارنامه‌ی ترید", hint: "دکمه‌ی اشتراک در /trade و صفحه‌ی حساب", default: "on", group: "trade", parent: "trade" },

  mentors: { label: "مربی‌ها", hint: "اتصال مربی ↔ شاگرد، برنامه‌ها، چت و نظرات (/mentors)", default: "on", group: "social" },
  friends: { label: "دوستان", hint: "کارت دوستان، جستجو و درخواست دوستی", default: "on", group: "social" },

  routineAssistant: { label: "دستیار هوشمند روتین", hint: "دکمه‌ی AI در صفحه‌ی روتین", default: "on", group: "ai", parent: "routine" },
  aiExercisePlan: { label: "ساخت برنامه تمرینی با AI", hint: "ساخت خودکار پلن تمرین؛ برنامه‌ی دستی همچنان کار می‌کنه", default: "on", group: "ai", parent: "exercise" },
  roadmaps: { label: "رودمپ یادگیری", hint: "ساخت رودمپ با هوش مصنوعی و صفحه‌ی /roadmaps", default: "off", group: "ai" },
  weeklyAnalysis: { label: "آنالیز هفتگی", hint: "صفحه‌ی آنالیز هفتگی (هفته به هفته، با مربی AI، هدف و یادداشت) (همچنان نیازمند ماژول AI Insight)", default: "off", group: "ai" },
};

/** کلید + همه‌ی مادرهاش (از نزدیک به دور) — همه باید مجاز باشن */
export function featureChain(key: FeatureKey): FeatureKey[] {
  const out: FeatureKey[] = [];
  let k: FeatureKey | undefined = key;
  while (k && !out.includes(k)) { out.push(k); k = FEATURE_META[k].parent; }
  return out;
}

export const FEATURE_MODE_LABELS: Record<FeatureMode, string> = { on: "روشن برای همه", admins: "فقط ادمین‌ها", off: "خاموش" };

export type FeatureFlags = Record<FeatureKey, FeatureMode>;

export function defaultFlags(): FeatureFlags {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, FEATURE_META[k].default])) as FeatureFlags;
}

export function normalizeFlags(v: unknown): FeatureFlags {
  const out = defaultFlags();
  if (v && typeof v === "object") {
    for (const k of FEATURE_KEYS) {
      const m = (v as any)[k];
      if (m === "on" || m === "admins" || m === "off") out[k] = m;
    }
  }
  return out;
}

export function featureAllowed(mode: FeatureMode, who: { isSuperAdmin: boolean; isAdmin: boolean }): boolean {
  if (who.isSuperAdmin) return true;
  if (mode === "on") return true;
  if (mode === "admins") return who.isAdmin;
  return false;
}

/** مجاز بودن یک کلید با در نظر گرفتن مادرهاش (زیربخش ترید بدون خود ترید نه) */
export function featureKeyAllowed(flags: FeatureFlags, key: FeatureKey, who: { isSuperAdmin: boolean; isAdmin: boolean }): boolean {
  return featureChain(key).every((k) => featureAllowed(flags[k], who));
}

/** وضعیت همه‌ی کلیدها برای یک نقش (با مادرها) — خالص، مشترک سرور و تست */
export function resolveFeatureMap(flags: FeatureFlags, who: { isSuperAdmin: boolean; isAdmin: boolean }): Record<FeatureKey, boolean> {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, featureKeyAllowed(flags, k, who)])) as Record<FeatureKey, boolean>;
}

/**
 * نمایش لینک یک بخش در منو/داشبورد سمت کلاینت. تا وقتی وضعیت نرسیده
 * (features=null) بخش‌های پیش‌فرض‌روشن دیده می‌شن (بدون چشمک) و بقیه نه.
 */
export function featureVisible(features: Partial<Record<FeatureKey, boolean>> | null | undefined, key: FeatureKey): boolean {
  if (!features || typeof features[key] !== "boolean") return featureChain(key).every((k) => FEATURE_META[k].default === "on");
  return features[key] === true;
}
