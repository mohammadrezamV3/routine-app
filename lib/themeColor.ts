// رنگ نوار وضعیت/ناچ مرورگر (`<meta name="theme-color">`).
//
// باگی که این فایل حل می‌کنه: قبلا `themeColor` توی export‌ `viewport`
// نکست تعریف شده بود، یعنی *نکست* مالک اون تگ بود، ولی اسکریپت inline و
// ThemeProvider مستقیم با setAttribute دستکاریش می‌کردن. نتیجه‌اش این بود که
// سیستم متادیتای نکست بعد هیدریت نسخه‌ی خودش رو **دوباره تزریق** می‌کرد و
// صفحه با **دو تا** متای theme-color می‌موند:
//
//     <meta name="theme-color" content="#F4E3C9">   ← درست (تم روشن)
//     <meta name="theme-color" content="#0E1011">   ← بیات، دوباره تزریق‌شده
//
// مرورگر بین چندتا متا یکی رو می‌گیره و ThemeProvider هم فقط `querySelector`
// (یعنی *اولی*) رو آپدیت می‌کرد — پس اون یکی برای همیشه با رنگ تم اشتباه
// می‌موند. این دقیقا همون «بعد از یک دور سوییچ‌کردن تم، رنگ بالای صفحه
// گیر می‌کنه و نمی‌ره» بود. (بازتولیدشده: ریلود در تم روشن → دو متا.)
//
// راه‌حل: `themeColor` از `viewport` برداشته شد تا نکست اصلا این تگ رو
// نسازه؛ حالا خود اپ تنها مالکشه و همیشه دقیقا یکی نگهش می‌داره.

export const THEME_COLORS = {
  dark: "#0E1011",
  light: "#F4E3C9",
} as const;

export type ThemeName = keyof typeof THEME_COLORS;

/**
 * دقیقا یک `<meta name="theme-color">` با رنگ تم داده‌شده باقی می‌ذاره:
 * اضافه‌ها حذف می‌شن، و اگه هیچی نبود ساخته می‌شه.
 */
export function syncThemeColorMeta(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const all = document.querySelectorAll('meta[name="theme-color"]');
  // هر تگ اضافه‌ای (مثلا چیزی که بعد هیدریت دوباره تزریق شده) دور ریخته می‌شه
  for (let i = 1; i < all.length; i++) all[i].remove();
  let meta = all[0] as HTMLMetaElement | undefined;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_COLORS[theme]);
}

/**
 * `data-theme` باید هم روی `<html>` باشه هم روی `<body>`.
 *
 * روی body: تقریبا کل `globals.css` با `body[data-theme="light"]` نوشته شده.
 * روی html: پس‌زمینه‌ی *خود* `<html>` همون چیزیه که سافاری توی ناحیه‌ی امن
 * (زیر ناچ و بالای نوار خانه) و موقع اورراسکرول نشون می‌ده. قبلا این کار
 * با `html:has(body[data-theme="light"])` انجام می‌شد که به `:has()` وابسته
 * بود؛ با گذاشتن خود اتریبیوت روی html، یک سلکتور ساده کافیه و دیگه به
 * پشتیبانی `:has()` وابسته نیست.
 */
export function applyThemeAttribute(theme: ThemeName) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
}

// اسکریپت inline مسدودکننده — قبل از هر پینتی اجرا می‌شه (اولین فرزند body)
// و تم رو از روی کوکی می‌سازه. عمدا کوکی خونده می‌شه نه `cookies()` سمت
// سرور: اون یکی کل اپ رو از static به dynamic می‌برد (رندر به‌ازای هر
// ریکوئست) که دقیقا برخلاف کار بهینه‌سازی سرعت لوده.
//
// برخلاف نسخه‌ی قبلی، این‌جا متا **همیشه** ست می‌شه (نه فقط وقتی تم روشنه)،
// و اگه وجود نداشت ساخته می‌شه — چون دیگه نکست یکی نمی‌سازه.
export const THEME_INIT_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);
var t=m?m[1]:"${"dark"}";
document.documentElement.setAttribute("data-theme",t);
document.body.setAttribute("data-theme",t);
var c=${JSON.stringify(THEME_COLORS)}[t];
var all=document.querySelectorAll('meta[name="theme-color"]');
for(var i=1;i<all.length;i++)all[i].remove();
var e=all[0];
if(!e){e=document.createElement("meta");e.setAttribute("name","theme-color");document.head.appendChild(e);}
e.setAttribute("content",c);
}catch(e){}})();`;

/**
 * تمی که همین الان *واقعا* روی DOMه — یعنی همونی که اسکریپت inline از روی
 * کوکی ساخته. موقع اولین اجرای افکت ThemeProvider لازمه: اون‌جا state ری‌اکت
 * هنوز مقدار اولیه‌ی «dark» رو داره (که عمدا با رندر سرور یکیه) و مرجع
 * گرفتنش، تم درست کاربر رو پاک می‌کرد.
 */
export function readThemeFromDom(): ThemeName {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
