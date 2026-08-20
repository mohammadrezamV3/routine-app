// پیش‌درخواستِ داده‌های بحرانی، *قبل* از این‌که React اصلاً بیاد بالا.
//
// مسئله‌ای که حل می‌کنه (اندازه‌گیری‌شده روی اتصالِ ۴۰۰ms، صفحه‌ی /weekly):
//   ۴۰۰ms   HTML می‌رسه
//   ~۸۰۰ms  باندلِ JS می‌رسه (رفت‌وبرگشتِ دوم)
//   ~۸۷۰ms  React هیدریت می‌کنه و *تازه* اولین درخواستِ داده می‌ره
//   ~۹۱۴ms  سنگین‌ترین‌ها (بازه‌های DailyEntry) تازه شروع می‌شن
//   ~۱۲۰۰ms همه‌چیز رسیده
// یعنی سه رفت‌وبرگشتِ سریال قبل از اولین بایتِ داده. خودِ درخواست‌ها سریع‌ن؛
// دیر *شروع* می‌شن.
//
// اسکریپتِ inlineِ زیر (توی app/layout.tsx، اولِ body) همون درخواست‌های
// همیشگی رو همون لحظه‌ای که مرورگر HTML رو پارس می‌کنه می‌فرسته — یعنی
// موازی با دانلودِ JS، نه بعدش. lib/storage.ts بعداً همین promiseها رو
// برمی‌داره، پس هیچ درخواستِ اضافه‌ای ساخته نمی‌شه؛ فقط زودتر شروع می‌شن.
//
// چرا کوکیِ راهنما: کوکیِ سشنِ next-auth از نوعِ httpOnlyه و جاوااسکریپت
// اصلاً نمی‌تونه ببیندش، پس بدونِ یه نشانه‌ی جدا، این اسکریپت برای مهمون‌ها
// هم چند تا ۴۰۱ الکی می‌فرستاد. این کوکی *تصمیمِ امنیتی نمی‌گیره* — فقط یه
// راهنماست؛ سرور همچنان خودش سشنِ واقعی رو چک می‌کنه. اگه نبود یا کهنه بود،
// بدترین حالت اینه که پیش‌درخواست انجام نمی‌شه و مسیرِ عادی کار می‌کنه.

export const AUTH_HINT_COOKIE = "arion-auth";

/** کلیدهایی که هر صفحه‌ی داخلِ اپ تقریباً همیشه لازمشون داره */
const PRELOAD_SETTING_KEYS = [
  "customOccurrences",
  "removedOccurrences",
  "wakeSleepTimes",
  "theme",
  "dashboardPrefs",
];

// `/api/account` و `/api/account/avatar` هردو از NavDrawer صدا زده می‌شن که
// توی layoutه — یعنی روی *هر* صفحه لازم‌ن، پس پیش‌درخواستشون هیچ‌وقت هدر
// نمی‌ره. (`/api/friends*` عمداً این‌جا نیست: فقط داشبوردهای روتین/ورزش/کالری
// لازمشون دارن، و روی بقیه‌ی صفحه‌ها دو درخواستِ الکی می‌شد.)

// بازه‌ی DailyEntry که پیش‌درخواست می‌شه: از ۹۰ روز قبل تا ۷ روز بعد.
// عمداً *یک بازه‌ی پهن* گرفته می‌شه، نه دقیقاً همون بازه‌هایی که کامپوننت‌ها
// می‌خوان — چون کشِ بازه‌آگاهِ lib/storage.ts هر زیربازه‌ای رو از یه بازه‌ی
// پوشاننده می‌بره. این‌جوری لازم نیست حسابِ تاریخِ اسکریپتِ inline مو‌به‌مو
// با حسابِ کامپوننت‌ها یکی باشه (که شکننده می‌بود)؛ فقط باید پوشش بده.
const PRELOAD_RANGE_BACK_DAYS = 90;
const PRELOAD_RANGE_FWD_DAYS = 7;

export const PRELOAD_RANGE_KEY = "__dailyRange";

// درخواست‌هایی که فقط روی یک مسیرِ خاص لازم‌ن. اسکریپت با location.pathname
// تصمیم می‌گیره، پس روی بقیه‌ی صفحه‌ها هیچ درخواستِ الکی‌ای نمی‌ره.
//
// چرا ارزششو داره: روی `/exercise` این‌ها یه زنجیره‌ی *سریال* بودن —
// `/api/exercise/plan` ساعتِ ۸۲۴ms شروع می‌شد و `bodyMetrics` تازه بعدِ
// رسیدنش (۱۰۴۲ms) می‌رفت، یعنی دو رفت‌وبرگشتِ پشتِ‌سرهم بعد از هیدریت.
// با پیش‌درخواست، هردو موازیِ بقیه از همون ~۵۰۰ms شروع می‌شن.
const ROUTE_PRELOADS: { prefix: string; urls: string[] }[] = [
  { prefix: "/exercise", urls: ["/api/exercise/plan", "/api/settings/bodyMetrics"] },
  // پنج کلیدِ تنظیماتِ ترید همگی توی همون موجِ بعدِ هیدریت می‌رفتن (۸۲۲ms).
  // URLشون کاملاً ثابته پس امنه. `/api/trade/entries` عمداً این‌جا نیست:
  // بازه‌اش ماهِ *جلالیِ* جاریه و تکرارِ اون حسابِ تاریخ داخلِ اسکریپتِ inline
  // شکننده می‌بود — یه اختلافِ یک‌روزه یعنی هم پیش‌درخواست هدر می‌ره هم
  // درخواستِ اصلی بازم می‌ره.
  {
    prefix: "/trade",
    urls: [
      "/api/trade/checklist",
      "/api/settings/tradeMonthlyGoal",
      "/api/settings/tradeVisibleStats",
      "/api/settings/tradeCalendarSystem",
      "/api/settings/tradeTickerSymbols",
      "/api/settings/tradeMarketsOnboarded",
    ],
  },
];

export const PRELOAD_SCRIPT = `(function(){try{
if(document.cookie.indexOf("${AUTH_HINT_COOKIE}=1")===-1)return;
var p=window.__arionPreload={};
var g=function(u){return fetch(u,{credentials:"same-origin"}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})};
${JSON.stringify(PRELOAD_SETTING_KEYS)}.forEach(function(k){var u="/api/settings/"+k;p[u]=g(u)});
p["/api/account"]=g("/api/account");
p["/api/account/avatar"]=g("/api/account/avatar");
var iso=function(d){var m=d.getMonth()+1,y=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(y<10?"0":"")+y};
var n=new Date(),a=new Date(n),b=new Date(n);
a.setDate(a.getDate()-${PRELOAD_RANGE_BACK_DAYS});b.setDate(b.getDate()+${PRELOAD_RANGE_FWD_DAYS});
var from=iso(a),to=iso(b);
p["${PRELOAD_RANGE_KEY}"]={from:from,to:to,data:g("/api/tasks/daily/range?from="+from+"&to="+to).then(function(j){return j?(j.entries||{}):null})};
var path=location.pathname;
${JSON.stringify(ROUTE_PRELOADS)}.forEach(function(r){
if(path.indexOf(r.prefix)===0)r.urls.forEach(function(u){p[u]=g(u)});
});
}catch(e){}})();`;

/**
 * اگه این URL از قبل پیش‌درخواست شده، همون promise رو برمی‌گردونه (و از
 * فهرست حذفش می‌کنه تا فقط یک‌بار مصرف بشه — خواندنِ بعدی از کشِ عادیِ
 * lib/storage.ts میاد که TTL و ابطالِ خودش رو داره).
 */
export function takePreloaded(url: string): Promise<any> | null {
  if (typeof window === "undefined") return null;
  const store = (window as any).__arionPreload as Record<string, any> | undefined;
  if (!store) return null;
  const hit = store[url];
  if (!hit || typeof hit.then !== "function") return null;
  delete store[url];
  return hit;
}

/** بازه‌ی پهنِ پیش‌درخواست‌شده — یک‌بارمصرف، مثلِ بالا */
export function takePreloadedRange(): { from: string; to: string; data: Promise<Record<string, any> | null> } | null {
  if (typeof window === "undefined") return null;
  const store = (window as any).__arionPreload as Record<string, any> | undefined;
  if (!store) return null;
  const hit = store[PRELOAD_RANGE_KEY];
  if (!hit || typeof hit.from !== "string") return null;
  delete store[PRELOAD_RANGE_KEY];
  return hit;
}

/** بعد از ورود صدا زده می‌شه تا لودِ بعدی بتونه پیش‌درخواست بزنه */
export function setAuthHintCookie() {
  if (typeof document === "undefined") return;
  // ۳۰ روز، هم‌اندازه‌ی بلندترین عمرِ سشن. SameSite=Lax مثلِ خودِ کوکیِ سشن.
  document.cookie = `${AUTH_HINT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

/** بعد از خروج — وگرنه لودِ بعدیِ یه مهمون چند تا ۴۰۱ می‌فرسته */
export function clearAuthHintCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_HINT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
