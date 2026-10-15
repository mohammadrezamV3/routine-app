import { useEffect, useSyncExternalStore } from "react";
import { getSetting, setSetting } from "./storage";

// شخصی‌سازی چیدمان داشبورد — کاربر می‌تونه کارت‌های اختیاری (نه ماژول‌های
// اصلی) رو از داشبوردهای روتین/بدنسازی/کالری مخفی کنه. روی همون UserSetting
// عمومی کلید/مقدار، کلیدش "dashboardPrefs".

export type DashboardPrefs = {
  showReminders: boolean; // کارت «یادآوری‌ها»ی داشبورد روتین
  showFriends: boolean; // کارت «دوستان» — هرجا (روتین/بدنسازی/کالری)
  showChart: boolean; // نمودارها — هم DashWeeklyChartCard هم CalorieChartCard
  showMedications: boolean; // کارت «یادآوری دارو»ی داشبورد روتین
};

export const DEFAULT_DASHBOARD_PREFS: DashboardPrefs = {
  showReminders: true,
  showFriends: true,
  showChart: true,
  showMedications: true,
};

export async function getDashboardPrefs(): Promise<DashboardPrefs> {
  // از getSetting رد می‌شه (نه fetch خام) تا هم از کش/دیدوپ مشترک
  // lib/storage.ts استفاده کنه، هم بتونه promise پیش‌درخواست‌شده‌ی
  // lib/preload.ts رو برداره. قبلا fetch مستقل خودش رو می‌زد، پس
  // پیش‌درخواست همین کلید هدر می‌رفت و در تایم‌لاین دو بار دیده می‌شد.
  const value = await getSetting<Partial<DashboardPrefs> | null>("dashboardPrefs", null);
  return { ...DEFAULT_DASHBOARD_PREFS, ...(value || {}) };
}

export async function saveDashboardPrefs(prefs: DashboardPrefs): Promise<void> {
  // setSetting کش مشترک رو هم write-through آپدیت می‌کنه
  await setSetting("dashboardPrefs", prefs);
}

// کش‌شده بیرون هوک — هر داشبوردی که این هوک رو صدا بزنه، بعد از اولین
// لود واقعی، بقیه فقط از همین کش می‌خونن (نه فچ دوباره)
let cachedDashboardPrefs: DashboardPrefs | null = null;
// کش به‌تنهایی کافی نبود: چند داشبورد/کارت که هم‌زمان mount می‌شن، همه‌شون
// قبل از رسیدن اولین جواب می‌دیدن که کش هنوز خالیه و هرکدوم یه فچ جدا
// می‌زدن. این promise مشترک همه‌ی اون صداهای هم‌زمان رو به یک درخواست می‌بنده.
let inFlightDashboardPrefs: Promise<DashboardPrefs> | null = null;

function loadDashboardPrefsOnce(): Promise<DashboardPrefs> {
  if (cachedDashboardPrefs) return Promise.resolve(cachedDashboardPrefs);
  if (!inFlightDashboardPrefs) {
    inFlightDashboardPrefs = getDashboardPrefs()
      .then((p) => { cachedDashboardPrefs = p; emitPrefs(); return p; })
      .finally(() => { inFlightDashboardPrefs = null; });
  }
  return inFlightDashboardPrefs;
}

// وقتی پنل کاربری خودش یه پرف رو عوض می‌کنه، این کش رو مستقیم آپدیت
// می‌کنه و بعدش event "dashboard-prefs-updated" رو می‌فرسته — داشبوردهای
// باز دیگه بدون رفرش کامل صفحه بلافاصله می‌بینن.
export function setCachedDashboardPrefs(prefs: DashboardPrefs) {
  cachedDashboardPrefs = prefs;
  emitPrefs();
}

// useSyncExternalStore: موقع هیدریشن همیشه DEFAULT (همون که سرور رندر کرده) و بعدش مقدار کش،
// تا کامپوننتی که دیرتر هیدریت می‌شه (بعد از پر شدن کش) خروجی متفاوت از HTML سرور نده.
const prefsSubs = new Set<() => void>();
function emitPrefs() { prefsSubs.forEach((fn) => fn()); }
function subscribePrefs(fn: () => void) { prefsSubs.add(fn); return () => { prefsSubs.delete(fn); }; }
const getPrefsSnapshot = () => cachedDashboardPrefs || DEFAULT_DASHBOARD_PREFS;
const getPrefsServerSnapshot = () => DEFAULT_DASHBOARD_PREFS;

export function useDashboardPrefs(): DashboardPrefs {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefsSnapshot, getPrefsServerSnapshot);
  useEffect(() => {
    if (!cachedDashboardPrefs) loadDashboardPrefsOnce().catch(() => {});
    window.addEventListener("dashboard-prefs-updated", emitPrefs);
    return () => window.removeEventListener("dashboard-prefs-updated", emitPrefs);
  }, []);
  return prefs;
}
