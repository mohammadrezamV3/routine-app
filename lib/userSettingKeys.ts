// کلیدهای مجازِ ذخیره‌سازیِ کلید/مقدارِ کاربر (`/api/settings/[key]`).
//
// چرا allowlist و نه هرچی کاربر فرستاد: قبل از این، اون روت *هر* کلیدی با
// *هر* حجمی رو قبول می‌کرد. دو تا مشکلِ واقعی داشت (هردو تست شدن):
//
//   ۱) پرکردنِ دیتابیس — یک کاربرِ لاگین‌کرده می‌تونست بی‌نهایت کلیدِ دلخواه
//      بسازه و توی هرکدوم چندمگابایت بریزه (۳MB روی یه کلیدِ ساختگی قبول و
//      ذخیره شد و کامل هم پس داده شد).
//   ۲) دستکاریِ حالتی که *خودِ سرور* بهش تکیه می‌کنه — همین اندپوینت اجازه
//      می‌داد کاربر `pushSentLog` رو بازنویسی کنه؛ همون کلیدی که کرانِ
//      `/api/push/send-reminders` می‌خونه تا بفهمه یادآوریِ امروز فرستاده
//      شده یا نه. با نوشتنِ تاریخِ آینده توش، یادآوری‌ها برای همیشه خفه
//      می‌شدن. `notifPrefs` هم همین‌طور.
//
// پس: کلیدهایی که کاربر (از راه UI) می‌نویسه این‌جا لیست می‌شن، و کلیدهایی
// که سرور مدیریتشون می‌کنه صریحاً ممنوع‌ن — حتی برای خوندن، چون حالتِ داخلیِ
// سروره نه ترجیحِ کاربر.

// تکْ‌منبعِ حقیقتِ نامِ کلیدها. ماژول‌های فیچر (tradeTypes، tickerSymbols،
// bodyMetrics، …) کلیدشون رو از همین‌جا import می‌کنن، نه اینکه رشته‌ی خودشون
// رو داشته باشن — وگرنه اضافه‌شدنِ یه کلیدِ جدید بی‌سروصدا از allowlist جا
// می‌مونه و اون فیچر با ۴۰۰ می‌شکنه. (دقیقاً همین اتفاق موقعِ ساختِ این
// فایل افتاد: تستِ E2E شش کلیدِ trade/bodyMetrics رو گرفت.)
export const SETTING_KEYS = {
  theme: "theme",
  removedOccurrences: "removedOccurrences",
  customOccurrences: "customOccurrences",
  wakeSleepTimes: "wakeSleepTimes",
  outingDates: "outingDates",
  dashboardPrefs: "dashboardPrefs",
  notifPrefs: "notifPrefs",
  dismissedStaticNotifs: "dismissedStaticNotifs",
  bodyMetrics: "bodyMetrics",
  tradeTickerSymbols: "tradeTickerSymbols",
  tradeCalendarSystem: "tradeCalendarSystem",
  tradeVisibleStats: "tradeVisibleStats",
  tradeMarketsOnboarded: "tradeMarketsOnboarded",
  tradeNewsAlerts: "tradeNewsAlerts",
  tradeChartSymbol: "tradeChartSymbol",
  tradeChartInterval: "tradeChartInterval",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** کلیدهایی که کلاینت مجازه بخونه و بنویسه */
export const USER_WRITABLE_SETTING_KEYS = new Set<string>(Object.values(SETTING_KEYS));

/** حالتِ داخلیِ سرور — هیچ‌وقت از راهِ API نه خونده می‌شه نه نوشته */
export const SERVER_MANAGED_SETTING_KEYS = new Set<string>([
  "pushSentLog",
  // ردِ هشدارهای خبریِ فرستاده‌شده — اگر کاربر می‌توانست بنویسدش، می‌شد با
  // پرکردنش هشدارها را برای همیشه خاموش کرد (همان اشکالی که pushSentLog داشت).
  "tradeNewsAlertLog",
]);

// سقفِ حجمِ هر مقدار. حتی بزرگ‌ترین کلیدِ واقعی (`customOccurrences` با
// چند صد برنامه) خیلی زیر این عدده؛ این فقط جلوی سوءاستفاده رو می‌گیره.
export const MAX_SETTING_VALUE_BYTES = 64 * 1024;

export function isUserSettingKey(key: string): boolean {
  return USER_WRITABLE_SETTING_KEYS.has(key) && !SERVER_MANAGED_SETTING_KEYS.has(key);
}

/**
 * کلیدهایی که `/api/bootstrap` در همون یک درخواست برمی‌گردونه — همون‌هایی که
 * لایه‌ی چیدمان/داده روی *هر* صفحه لازم داره. لیستِ عمدی و کوچیک نگه داشته
 * می‌شه: هرچی این‌جا اضافه بشه به بارِ هر لودِ صفحه اضافه می‌شه.
 * (زیرمجموعه‌ی USER_WRITABLE_SETTING_KEYS — تستِ پایینِ فایل تضمینش می‌کنه.)
 */
export const BOOTSTRAP_SETTING_KEYS = [
  SETTING_KEYS.customOccurrences,
  SETTING_KEYS.removedOccurrences,
  SETTING_KEYS.wakeSleepTimes,
  SETTING_KEYS.theme,
  SETTING_KEYS.dashboardPrefs,
  SETTING_KEYS.notifPrefs,
  SETTING_KEYS.dismissedStaticNotifs,
] as const;
