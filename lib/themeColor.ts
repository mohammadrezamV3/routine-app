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

import { sectionBaseDomain } from "@/lib/sections";
import { setSharedCookie } from "@/lib/clientCookie";
import { PRESET_META_COLORS, normalizeHex } from "@/lib/palette";

export const THEME_COLORS = {
  dark: "#0E1011",
  light: "#F4E3C9",
} as const;

export type ThemeName = keyof typeof THEME_COLORS;

// رنگ نوار وضعیت بخش‌های زیردامنه: همون --bg پالت app/palette-themes.css (ترید آبی سایبری،
// تمرین زرشکی). روتین و دامنه‌ی اصلی همون THEME_COLORS بالان. وقتی تم مناسبتی فعاله پالت اعمال
// نمی‌شه (palette-themes.css)، پس رنگ متا هم همون رنگ عادی می‌مونه.
export const SECTION_THEME_COLORS = {
  trade: { dark: "#070B12", light: "#E7EDF4" },
  workout: { dark: "#100A0C", light: "#F6E9E6" },
} as const;

/** --bg هر پالت غیرروتین (ترید، ورزش و پالت‌های آماده). پالت سفارشی از `data-palette-meta` میاد. */
export const PALETTE_THEME_COLORS: Record<string, { dark: string; light: string }> = {
  ...SECTION_THEME_COLORS,
  ...PRESET_META_COLORS,
};

/**
 * رنگ متای theme-color. `palette` پالت موثر (data-palette روی html) و `customBg` رنگ‌های --bg پالت
 * سفارشی (شب/روز) ـه. بدون `palette` رفتار قدیمی: فقط بر اساس بخش (manifest و جاهای بدون تنظیم کاربر).
 */
export function themeColorFor(
  theme: ThemeName,
  section?: string | null,
  eventThemeActive = false,
  palette?: string | null,
  customBg?: { dark: string; light: string } | null,
): string {
  if (eventThemeActive) return THEME_COLORS[theme];
  const key = palette ?? section;
  if (key === "custom") return customBg?.[theme] ?? THEME_COLORS[theme];
  if (key && Object.prototype.hasOwnProperty.call(PALETTE_THEME_COLORS, key)) return PALETTE_THEME_COLORS[key][theme];
  return THEME_COLORS[theme];
}

/** مقدار صفت `data-palette-meta` («#شب,#روز») → رنگ‌های --bg پالت سفارشی، یا null */
export function parsePaletteMeta(v: string | null | undefined): { dark: string; light: string } | null {
  if (!v) return null;
  const [d, l] = v.split(",");
  const dark = normalizeHex(d), light = normalizeHex(l);
  return dark && light ? { dark, light } : null;
}

/** نام کوکی تم — layout.tsx (سمت سرور) و اسکریپت inline هر دو از همین می‌خونن. */
export const THEME_COOKIE = "theme";

/**
 * فقط کوکی تم رو (بدون نوشتن دیتابیس) هم‌گام می‌کنه.
 *
 * چرا جدا از setThemeSetting: وقتی تم ذخیره‌شده‌ی حساب (DB) با کوکی این
 * دستگاه فرق داره (تم روی دستگاه دیگه عوض شده، کوکی پاک/منقضی شده، یا
 * اپ نصب‌شده کوکی جدا داره)، ThemeProvider بعد از لود تم رو به مقدار DB
 * برمی‌گردونه — ولی چون اون مقدار «از قبل ذخیره‌ست»، setThemeSetting صدا
 * زده نمی‌شد و کوکی هیچ‌وقت درست نمی‌شد. نتیجه: *هر* بار باز کردن اپ،
 * اول تم کوکی رسم می‌شد و بعد به تم حساب فید می‌کرد. با نوشتن کوکی در
 * همون لحظه، این فقط یک بار (اولین لود بعد از ناهماهنگی) رخ می‌ده.
 */
export function writeThemeCookie(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
  // کوکی تم بین زیردامنه‌های بخش‌ها مشترکه (lib/clientCookie.ts)
  setSharedCookie(THEME_COOKIE, theme, `path=/; max-age=31536000; samesite=lax${secure}`);
}

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
  const root = document.documentElement;
  meta.setAttribute(
    "content",
    themeColorFor(
      theme,
      root.getAttribute("data-section"),
      root.hasAttribute("data-event-theme"),
      root.getAttribute("data-palette"),
      parsePaletteMeta(root.getAttribute("data-palette-meta")),
    ),
  );
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
//
// به‌روزرسانی: layout.tsx حالا خودش تم را سمت سرور تعیین می‌کند (برای
// کاربر لاگین‌کرده از *حساب*، وگرنه از کوکی). وقتی مرجع حساب بوده
// (`data-theme-src="account"` روی html)، کوکی دیگر حق بازنویسی ندارد —
// برعکس، همین‌جا کوکی با تم حساب هم‌گام می‌شود تا صفحه‌های بعدی (و حتی
// نسخه‌ی کش‌شده‌ی آفلاین سرویس‌ورکر) هم از اولین پینت درست باشند.
//
// کوکی تم بین زیردامنه‌ها (routine./trade./workout.) مشترکه: دامنه‌ی پایه موقع build داخل اسکریپت
// می‌ره (NEXT_PUBLIC_SECTION_BASE_DOMAIN) و دامنه‌ی کوکی از روی location.hostname حساب می‌شه
// (هم‌قاعده‌ی cookieDomainForHost). هر نوشتن با دامنه اول نسخه‌ی host-only قدیمی رو منقضی می‌کنه.
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement;
var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);
var B=${JSON.stringify(sectionBaseDomain())},D="",h=location.hostname;
if(B&&B!=="localhost"&&!/^[\\d.]+$/.test(B)&&(h===B||h.slice(-B.length-1)==="."+B))D="; domain=."+B;
var w=function(v){if(D)document.cookie="${THEME_COOKIE}=; path=/; max-age=0";document.cookie="${THEME_COOKIE}="+v+"; path=/; max-age=31536000; samesite=lax"+(location.protocol==="https:"?"; secure":"")+D};
var t;
if(d.getAttribute("data-theme-src")==="account"){
t=d.getAttribute("data-theme")==="light"?"light":"dark";
if(!m||m[1]!==t)w(t);
}else{t=m?m[1]:"${"dark"}";if(D&&m)w(t)}
d.setAttribute("data-theme",t);
document.body.setAttribute("data-theme",t);
var c=${JSON.stringify(THEME_COLORS)}[t];
var S=${JSON.stringify(PALETTE_THEME_COLORS)},k=d.getAttribute("data-palette")||d.getAttribute("data-section");
if(k&&!d.hasAttribute("data-event-theme")){
if(k==="custom"){var q=(d.getAttribute("data-palette-meta")||"").split(",")[t==="light"?1:0];if(/^#[0-9A-Fa-f]{6}$/.test(q))c=q;}
else if(Object.prototype.hasOwnProperty.call(S,k))c=S[k][t];
}
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
