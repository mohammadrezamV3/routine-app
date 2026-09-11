// زبان نمایش (فارسی/انگلیسی) + جهتِ صفحه (RTL/LTR).
//
// دقیقا هم‌الگوی lib/themeColor.ts: کوکی (نه cookies() سمت سرور — آن یکی
// کل اپ را از static به dynamic می‌برد)، یک اسکریپتِ inline مسدودکننده
// که قبل از هر پینتی از روی همان کوکی dir/lang واقعی را روی <html>
// می‌نشاند، و suppressHydrationWarning روی <html> (از قبل در layout.tsx
// هست) چون رندرِ سرور همیشه پیش‌فرض («fa») است.

export type Language = "fa" | "en";

export const LANGUAGE_NAMES: Record<Language, string> = { fa: "فارسی", en: "English" };

export function dirFor(lang: Language): "rtl" | "ltr" {
  return lang === "en" ? "ltr" : "rtl";
}

/** روی <html> هم `lang` هم `dir` را می‌گذارد — همان الگوی applyThemeAttribute. */
export function applyLanguageAttribute(lang: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", dirFor(lang));
}

export const LANGUAGE_INIT_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )lang=(fa|en)/);
var l=m?m[1]:"fa";
document.documentElement.setAttribute("lang",l);
document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");
}catch(e){}})();`;

/** زبانی که همین الان واقعا روی DOM است — برای اولین اجرای افکت‌های کلاینتی. */
export function readLanguageFromDom(): Language {
  if (typeof document === "undefined") return "fa";
  return document.documentElement.getAttribute("lang") === "en" ? "en" : "fa";
}
