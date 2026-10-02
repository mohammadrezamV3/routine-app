// تم آزمایشی «نوآر سیاه و سفید» (فقط ادمین، فقط همین دستگاه) — استایل در
// app/admin-theme.css. وضعیت فقط در localStorage همین دستگاه می‌مونه و
// اتریبیوت data-admin-theme روی html می‌شینه؛ هیچ ارتباطی با سرور ندارد.
// مقدار قدیمی "snow" (نسخه‌ی اولیه) هم به‌عنوان noir خونده می‌شه.

export const ADMIN_THEME_KEY = "arion:adminTheme";
export const ADMIN_THEME_ATTR = "data-admin-theme";

// اسکریپت inline قبل از اولین پینت (layout.tsx) تا فلش نداشته باشه
export const ADMIN_THEME_INIT_SCRIPT = `(function(){try{
var v=localStorage.getItem("${ADMIN_THEME_KEY}");
if(v==="noir"||v==="snow")document.documentElement.setAttribute("${ADMIN_THEME_ATTR}","noir");
}catch(e){}})();`;

export function readAdminNoir(): boolean {
  try {
    const v = localStorage.getItem(ADMIN_THEME_KEY);
    return v === "noir" || v === "snow";
  } catch {
    return false;
  }
}

export function writeAdminNoir(on: boolean) {
  try {
    if (on) localStorage.setItem(ADMIN_THEME_KEY, "noir");
    else localStorage.removeItem(ADMIN_THEME_KEY);
  } catch {
    // حافظه در دسترس نیست — فقط همین نشست اعمال می‌شه
  }
  try {
    if (on) document.documentElement.setAttribute(ADMIN_THEME_ATTR, "noir");
    else document.documentElement.removeAttribute(ADMIN_THEME_ATTR);
  } catch {
    // بی‌اثر
  }
}
