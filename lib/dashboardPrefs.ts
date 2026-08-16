import { useEffect, useState } from "react";

// شخصی‌سازیِ چیدمانِ داشبورد — کاربر می‌تونه کارت‌های اختیاری (نه ماژول‌های
// اصلی) رو از داشبوردهای روتین/بدنسازی/کالری مخفی کنه. روی همون UserSetting
// عمومیِ کلید/مقدار، کلیدش "dashboardPrefs".

export type DashboardPrefs = {
  showReminders: boolean; // کارتِ «یادآوری‌ها»ی داشبوردِ روتین
  showFriends: boolean; // کارتِ «دوستان» — هرجا (روتین/بدنسازی/کالری)
  showChart: boolean; // نمودارها — هم DashWeeklyChartCard هم CalorieChartCard
};

export const DEFAULT_DASHBOARD_PREFS: DashboardPrefs = {
  showReminders: true,
  showFriends: true,
  showChart: true,
};

export async function getDashboardPrefs(): Promise<DashboardPrefs> {
  try {
    const res = await fetch("/api/settings/dashboardPrefs");
    if (!res.ok) return DEFAULT_DASHBOARD_PREFS;
    const json = await res.json();
    return { ...DEFAULT_DASHBOARD_PREFS, ...(json.value || {}) };
  } catch {
    return DEFAULT_DASHBOARD_PREFS;
  }
}

export async function saveDashboardPrefs(prefs: DashboardPrefs): Promise<void> {
  await fetch("/api/settings/dashboardPrefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: prefs }),
  });
}

// کش‌شده بیرونِ هوک — هر داشبوردی که این هوک رو صدا بزنه، بعد از اولین
// لودِ واقعی، بقیه فقط از همین کش می‌خونن (نه فچِ دوباره)
let cachedDashboardPrefs: DashboardPrefs | null = null;

// وقتی پنلِ کاربری خودش یه پرف رو عوض می‌کنه، این کش رو مستقیم آپدیت
// می‌کنه و بعدش eventِ "dashboard-prefs-updated" رو می‌فرسته — داشبوردهای
// بازِ دیگه بدونِ رفرشِ کاملِ صفحه بلافاصله می‌بینن.
export function setCachedDashboardPrefs(prefs: DashboardPrefs) {
  cachedDashboardPrefs = prefs;
}

export function useDashboardPrefs(): DashboardPrefs {
  const [prefs, setPrefs] = useState<DashboardPrefs>(cachedDashboardPrefs || DEFAULT_DASHBOARD_PREFS);
  useEffect(() => {
    if (!cachedDashboardPrefs) getDashboardPrefs().then((p) => { cachedDashboardPrefs = p; setPrefs(p); });
    function onUpdated() {
      if (cachedDashboardPrefs) setPrefs(cachedDashboardPrefs);
    }
    window.addEventListener("dashboard-prefs-updated", onUpdated);
    return () => window.removeEventListener("dashboard-prefs-updated", onUpdated);
  }, []);
  return prefs;
}
