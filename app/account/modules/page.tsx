"use client";

import { useEffect, useState } from "react";
import { Bell, Users, BarChart3 } from "lucide-react";
import { AccountRowLink, AccountToggleRow } from "@/components/AccountRow";
import { ICONS } from "@/components/NavDrawer";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

const PREF_ICONS = [<Bell size={16} key="b" />, <Users size={16} key="u" />, <BarChart3 size={16} key="c" />];

const CARDS = [
  { href: "/account/modules/routine", label: "روتین", desc: "برنامه‌ها و یادآوری‌های روتین", icon: "weekly" },
  { href: "/account/modules/exercise", label: "بدنسازی", desc: "تمرین و برنامه‌ی بدنسازی", icon: "exercise" },
  { href: "/account/modules/calorie", label: "کالری", desc: "شمارش و ثبت کالری", icon: "food" },
  { href: "/account/modules/trade", label: "ترید", desc: "بازارها، تقویم و آمار ترید", icon: "trade" },
  { href: "/account/modules/roadmap", label: "یادگیری / Skill", desc: "یادگیری و رودمپ", icon: "roadmaps" },
];

const PREFS: [keyof DashboardPrefs, string][] = [
  ["showReminders", "کارتِ «یادآوری‌ها»"],
  ["showFriends", "کارتِ «دوستان»"],
  ["showChart", "نمودارها"],
];

export default function ModuleSettingsPage() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => { getDashboardPrefs().then(setPrefs); }, []);

  function toggle(key: keyof DashboardPrefs, next: boolean) {
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
      <h1>تنظیمات بخش‌ها</h1>
      <div className="account-content-hint">تنظیماتِ اختصاصیِ هر بخش از آریون</div>

      <div className="account-card">
        {CARDS.map((c, i) => (
          <AccountRowLink key={c.href} href={c.href} icon={ICONS[c.icon]} label={c.label} desc={c.desc} index={i} />
        ))}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">نمایشِ کارت‌ها در داشبوردها</div>
        <div className="account-card" style={{ marginTop: 6 }}>
          {PREFS.map(([key, label], i) => (
            <AccountToggleRow
              key={key}
              index={i}
              icon={PREF_ICONS[i]}
              label={label}
              checked={prefs[key]}
              onChange={(v) => toggle(key, v)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
