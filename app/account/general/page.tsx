"use client";

import { useEffect, useState } from "react";
import { Globe, Bell, Users, BarChart3 } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountBackButton } from "@/components/AccountBackButton";
import { RoutineSettings } from "@/components/RoutineSettings";
import { TradeSettings } from "@/components/TradeSettings";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

const PREF_ICONS = [<Bell size={16} key="b" />, <Users size={16} key="u" />, <BarChart3 size={16} key="c" />];

const DASHBOARD_PREFS: [keyof DashboardPrefs, string][] = [
  ["showReminders", "کارتِ «یادآوری‌ها»"],
  ["showFriends", "کارتِ «دوستان»"],
  ["showChart", "نمودارها"],
];

// «تنظیمات» (نامِ قبلی: «عمومی»).
//
// دو تغییرِ ساختاری نسبت به قبل، طبقِ درخواستِ صریحِ کاربر:
// ۱) بخش‌های بدنسازی/کالری/یادگیری از این‌جا حذف شدن — صفحه‌های تنظیماتشون
//    عملاً خالی بودن و فقط یک لینک به خودِ همون بخش داشتن.
// ۲) روتین و ترید دیگه پشتِ یک باکس و یک ناوبریِ دیگه قایم نیستن؛ تنظیماتشون
//    همین‌جا مستقیم رندر می‌شه و فقط یک تیتر می‌گه مالِ کدوم بخشه.
// ۳) «قابل‌جست‌وجو بودن با یوزرنیم» به بخشِ امنیت منتقل شد (تنظیمِ حریمِ خصوصیه).
export default function AccountSettingsPage() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => { getDashboardPrefs().then(setPrefs); }, []);

  function toggleDashboardPref(key: keyof DashboardPrefs, next: boolean) {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: next };
      saveDashboardPrefs(updated);
      setCachedDashboardPrefs(updated);
      window.dispatchEvent(new Event("dashboard-prefs-updated"));
      return updated;
    });
  }

  return (
    <section>
      <AccountBackButton />
      <h1>تنظیمات</h1>
      <div className="account-content-hint">تنظیماتِ کلیِ آریون و تنظیماتِ هر بخش</div>

      <div className="domain-sub">آریون</div>
      <div className="account-card" style={{ marginBottom: 6 }}>
        <div className="account-row2">
          <span className="account-row2-icon"><Globe size={17} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">زبان</span>
            <span className="account-row2-desc">فعلاً فقط فارسی — زبان‌های دیگه به‌زودی اضافه می‌شن</span>
          </span>
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">نمایشِ کارت‌ها در داشبوردها</div>
        <div className="account-card" style={{ marginTop: 6 }}>
          {DASHBOARD_PREFS.map(([key, label], i) => (
            <AccountToggleRow
              key={key}
              index={i}
              icon={PREF_ICONS[i]}
              label={label}
              checked={prefs[key]}
              onChange={(v) => toggleDashboardPref(key, v)}
            />
          ))}
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">روتین</div>
        <RoutineSettings />
      </div>

      <div className="tm-extra">
        <div className="domain-sub">ترید</div>
        <TradeSettings />
      </div>
    </section>
  );
}
