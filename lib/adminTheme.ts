// تم آزمایشی «برفی نئونی» (فقط ادمین، فقط همین دستگاه) — استایل در
// app/admin-theme.css. وضعیت فقط در localStorage همین دستگاه می‌مونه و
// اتریبیوت data-admin-theme روی html می‌شینه؛ هیچ ارتباطی با سرور ندارد.

export const ADMIN_THEME_KEY = "arion:adminTheme";
export const ADMIN_THEME_ATTR = "data-admin-theme";

// اسکریپت inline قبل از اولین پینت (layout.tsx) تا فلش نداشته باشه
export const ADMIN_THEME_INIT_SCRIPT = `(function(){try{
if(localStorage.getItem("${ADMIN_THEME_KEY}")==="snow")document.documentElement.setAttribute("${ADMIN_THEME_ATTR}","snow");
}catch(e){}})();`;

export function readAdminSnow(): boolean {
  try {
    return localStorage.getItem(ADMIN_THEME_KEY) === "snow";
  } catch {
    return false;
  }
}

export function writeAdminSnow(on: boolean) {
  try {
    if (on) localStorage.setItem(ADMIN_THEME_KEY, "snow");
    else localStorage.removeItem(ADMIN_THEME_KEY);
  } catch {
    // حافظه در دسترس نیست — فقط همین نشست اعمال می‌شه
  }
  try {
    if (on) document.documentElement.setAttribute(ADMIN_THEME_ATTR, "snow");
    else document.documentElement.removeAttribute(ADMIN_THEME_ATTR);
  } catch {
    // بی‌اثر
  }
}
