"use client";

import { useEffect, useState } from "react";
import { Bell, Users, BarChart3, Tablets } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";
import { tr } from "@/lib/i18n";

const PREF_ICONS = [<Bell size={16} key="b" />, <Tablets size={16} key="m" />, <Users size={16} key="u" />, <BarChart3 size={16} key="c" />];

const dashboardPrefs = (): [keyof DashboardPrefs, string, string?][] => [
  ["showReminders", tr("کارت «یادآوری‌ها»", "Reminders card")],
  ["showMedications", tr("کارت «یادآوری دارو»", "Medication reminders card"), tr("خاموش‌کردنش هم کارت رو مخفی می‌کنه هم اعلان نوبت‌های دارو رو قطع می‌کنه", "Turning it off hides the card and also stops medication notifications")],
  ["showFriends", tr("کارت «دوستان»", "Friends card")],
  ["showChart", tr("نمودارها", "Charts")],
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
      <AccountPageHead title={tr("داشبورد", "Dashboard")} hint={tr("کارت‌هایی که در داشبوردها نمایش داده می‌شوند", "Cards shown on the dashboards")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <AccountBlock flush index={0}>
        {dashboardPrefs().map(([key, label, desc], i) => (
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
