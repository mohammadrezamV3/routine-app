export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "arion:theme";

// همه‌ی دسترسی‌های localStorage باید try/catch باشن — تو WebView کپاسیتور
// معمولا مشکلی نیست، ولی روی وب (پیش‌نمایش/private mode) ممکنه throw کنه.
export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* noop */
  }
  return "dark"; // پیش‌فرض تاریک
}

export function storeTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* noop */
  }
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
}
