"use client";

import { useEffect, useState } from "react";
import { Globe, Bell, Users, BarChart3, Tablets } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountBackButton } from "@/components/AccountBackButton";
import { RoutineSettings } from "@/components/RoutineSettings";
import { TradeSettings } from "@/components/TradeSettings";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useLanguage } from "@/components/LanguageProvider";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

const LANGUAGE_OPTIONS: { value: "fa" | "en"; label: string }[] = [
  { value: "fa", label: "فارسی" },
  { value: "en", label: "English" },
];

const PREF_ICONS = [<Bell size={16} key="b" />, <Tablets size={16} key="m" />, <Users size={16} key="u" />, <BarChart3 size={16} key="c" />];

const DASHBOARD_PREFS: [keyof DashboardPrefs, string, string?][] = [
  ["showReminders", "کارت «یادآوری‌ها»"],
  ["showMedications", "کارت «یادآوری دارو»", "خاموش‌کردنش هم کارت رو مخفی می‌کنه هم اعلان نوبت‌های دارو رو قطع می‌کنه"],
  ["showFriends", "کارت «دوستان»"],
  ["showChart", "نمودارها"],
];

// «تنظیمات» (نام قبلی: «عمومی»).
//
// دو تغییر ساختاری نسبت به قبل، طبق درخواست صریح کاربر:
// ۱) بخش‌های بدنسازی/کالری/یادگیری از این‌جا حذف شدن — صفحه‌های تنظیماتشون
//    عملا خالی بودن و فقط یک لینک به خود همون بخش داشتن.
// ۲) روتین و ترید دیگه پشت یک باکس و یک ناوبری دیگه قایم نیستن؛ تنظیماتشون
//    همین‌جا مستقیم رندر می‌شه و فقط یک تیتر می‌گه مال کدوم بخشه.
// ۳) «قابل‌جست‌وجو بودن با یوزرنیم» به بخش امنیت منتقل شد (تنظیم حریم خصوصیه).
export default function AccountSettingsPage() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);
  const { lang, setLang } = useLanguage();

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
      <div className="account-content-hint">تنظیمات کلی آریون و تنظیمات هر بخش</div>

      <div className="domain-sub">آریون</div>
      <div className="account-card" style={{ marginBottom: 6 }}>
        <div className="account-row2" style={{ borderBottom: "none" }}>
          <span className="account-row2-icon"><Globe size={17} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">{lang === "en" ? "Language" : "زبان"}</span>
            <span className="account-row2-desc">
              {lang === "en"
                ? "Switches the whole app to English and left-to-right layout."
                : "کل اپ رو به انگلیسی و چپ‌چین تغییر می‌ده — هنوز همه‌ی صفحه‌ها ترجمه نشدن."}
            </span>
          </span>
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <SegmentedTabs options={LANGUAGE_OPTIONS} active={lang} onChange={setLang} />
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">نمایش کارت‌ها در داشبوردها</div>
        <div className="account-card" style={{ marginTop: 6 }}>
          {DASHBOARD_PREFS.map(([key, label, desc], i) => (
            <AccountToggleRow
              key={key}
              index={i}
              icon={PREF_ICONS[i]}
              label={label}
              desc={desc}
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
