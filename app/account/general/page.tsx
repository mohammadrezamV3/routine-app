"use client";

import { useEffect, useState } from "react";
import { Globe, Bell, Users, BarChart3, Tablets, CalendarCheck2, CandlestickChart } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountPageHead, AccountBlock, AccountLine } from "@/components/AccountUI";
import { RoutineSettings } from "@/components/RoutineSettings";
import { TradeSettings } from "@/components/TradeSettings";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

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
      <AccountPageHead title="تنظیمات" hint="تنظیمات کلی آریون و تنظیمات هر بخش" />

      <AccountBlock title="آریون" icon={<Globe size={15} />} flush index={0}>
        <AccountLine icon={<Globe size={16} />} label="زبان" value="فعلا فقط فارسی — زبان‌های دیگه به‌زودی اضافه می‌شن" />
      </AccountBlock>

      <AccountBlock title="نمایش کارت‌ها در داشبوردها" icon={<BarChart3 size={15} />} flush index={1}>
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
      </AccountBlock>

      {/* این دو خودشان بخش‌های استاندارد را رندر می‌کنند، پس این‌جا فقط
          یک عنوانِ دامنه می‌گذاریم — نه یک قابِ دیگر دورِ قاب. */}
      <h2 className="acc-block-title" style={{ marginTop: 30 }}><CalendarCheck2 size={15} /> روتین</h2>
      <RoutineSettings />

      <h2 className="acc-block-title" style={{ marginTop: 30 }}><CandlestickChart size={15} /> ترید</h2>
      <TradeSettings />
    </section>
  );
}
