"use client";

import { useEffect, useState } from "react";
import { Bell, Users, BarChart3, Tablets } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

const PREF_ICONS = [<Bell size={16} key="b" />, <Tablets size={16} key="m" />, <Users size={16} key="u" />, <BarChart3 size={16} key="c" />];

const DASHBOARD_PREFS: [keyof DashboardPrefs, string, string?][] = [
  ["showReminders", "کارت «یادآوری‌ها»"],
  ["showMedications", "کارت «یادآوری دارو»", "خاموش‌کردنش هم کارت رو مخفی می‌کنه هم اعلان نوبت‌های دارو رو قطع می‌کنه"],
  ["showFriends", "کارت «دوستان»"],
  ["showChart", "نمودارها"],
];


// «تنظیمات › داشبورد» — نمایش کارت‌ها در داشبوردها
export default function DashboardSettingsPage() {
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
      <AccountPageHead title="داشبورد" hint="کارت‌هایی که در داشبوردها نمایش داده می‌شوند" backHref="/account/general" backLabel="تنظیمات" />
      <AccountBlock flush index={0}>
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
    </section>
  );
}
