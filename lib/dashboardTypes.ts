// قرارداد پاسخ GET /api/dashboard — مشترک روت (سرور) و داشبورد (کلاینت).
// هیچ import سروری این‌جا نیست.
//
// قاعده‌ی کلی: هر بخشی که کاربر بهش دسترسی نداره (ماژول پولی غیرفعال یا
// فلگ خاموش) `null` برمی‌گرده — نه خطا — تا بقیه‌ی داشبورد سالم بمونه. بخشی
// که دسترسی داره ولی خودش خطا داد هم `null` + اسمش توی `errors` میاد.
// روتین/خواب اصلا این‌جا نیستن: کلاینت از lib/storage.ts می‌خونه (قرارداد
// persistence و همگام‌سازی زنده با /weekly).

import type { FeatureKey } from "./featureFlags";

export type DashImpact = "LOW" | "MEDIUM" | "HIGH";

export type DashExercise = {
  hasPlan: boolean;
  planId: string | null;
  /** اسم‌های فارسی روزهای تمرین (همون gymDays پلن) */
  gymDays: string[];
  today: {
    /** FA_WEEKDAY[jsDay] روز درخواستی */
    dayName: string;
    isGymDay: boolean;
    /** عنوان تمرین امروز از planData (مثلا «سینه و پشت بازو») */
    focus: string | null;
    itemCount: number;
    doneItems: number;
    started: boolean;
    done: boolean;
    /** پیش‌نمایش حرکت‌های امروز (حداکثر ۶) با وضعیت تیک هرکدوم */
    items: { name: string; done: boolean }[];
  };
  week: { done: number; target: number };
  streak: number;
  /** ۱۴ روز اخیر تا امروز (قدیمی → جدید) */
  last14: { iso: string; planned: boolean; done: boolean }[];
};

export type DashCalorie = {
  target: { kcal: number; protein: number | null; carbs: number | null; fat: number | null } | null;
  today: { kcal: number; protein: number; carbs: number; fat: number; entries: number };
  /** ۷ روز اخیر تا امروز (قدیمی → جدید) */
  week: { iso: string; kcal: number }[];
};

export type DashTradeAccount = {
  id: string;
  name: string;
  color: string;
  currency: string;
  type: string;
  balance: number;
  netPnl: number;
  winRate: number | null;
  goalProgress: number | null;
};

export type DashTrade = {
  accountCount: number;
  /** ارز مشترک همه‌ی حساب‌های فعال؛ اگه متفاوت باشن null (جمع‌ها فقط از ارز غالب) */
  currency: string | null;
  /** ارزی که جمع‌های پایین با اون حساب شدن (ارز بیشترین حساب‌ها) */
  sumCurrency: string;
  today: { pnl: number; count: number };
  week: { pnl: number; count: number; wins: number; losses: number };
  month: { pnl: number; count: number; winRate: number | null; profitFactor: number | null };
  openTrades: number;
  /** سود/زیان خالص هر روز در ۳۰ روز اخیر (قدیمی → جدید، ۳۰ عدد) */
  daily30: number[];
  recent: { id: string; accountId: string; symbol: string; direction: "BUY" | "SELL"; pnl: number; result: string; status: string; openedAt: string }[];
  accounts: DashTradeAccount[];
};

export type DashEvent = {
  id: string;
  title: string;
  currency: string;
  country: string;
  impact: DashImpact;
  occursAt: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
};

export type DashRoadmap = { id: string; title: string; topic: string; pct: number; done: number; total: number };

export type DashMentors = {
  activeAsStudent: number;
  activeAsMentor: number;
  /** درخواست‌های منتظر پاسخ *من* */
  pendingIncoming: number;
  unread: number;
  isMentor: boolean;
};

export type DashNotification = { id: string; type: string; title: string; body: string; url: string | null; createdAt: string; read: boolean };

export type DashboardData = {
  generatedAt: string;
  user: {
    name: string;
    avatarUrl: string | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    memberSince: string;
    /** همه‌ی اچیومنت‌ها باز شده → نام طلایی (lib/achievementsServer.ts) */
    golden: boolean;
  };
  /** «روتین من»: در دوره‌ی ۱۴ روزه‌ی رایگان → روزهای باقی‌مونده؛ null = خریده/سوپریوزر/تموم‌شده */
  routineTrial: { daysLeft: number } | null;
  plan: { name: string; key: string; status: "ACTIVE" | "TRIAL"; endsAt: string } | null;
  /** ماژول‌های فعال (سوپریوزر: همه) */
  modules: string[];
  features: Record<FeatureKey, boolean>;
  exercise: DashExercise | null;
  calorie: DashCalorie | null;
  trade: DashTrade | null;
  /** رویدادهای مهم پیش‌رو (نیازمند TRADE) */
  calendar: { events: DashEvent[] } | null;
  roadmaps: { items: DashRoadmap[]; total: number } | null;
  mentors: DashMentors | null;
  notifications: { unread: number; latest: DashNotification[] };
  /** اطلاعیه‌های فعال خوانده‌نشده (حداکثر ۳) */
  announcements: { id: string; title: string; body: string; createdAt: string }[];
  /** اسم بخش‌هایی که دسترسی داشتن ولی موقع ساخت خطا دادن */
  errors: string[];
};
