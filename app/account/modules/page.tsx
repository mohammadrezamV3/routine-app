"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ICONS } from "@/components/NavDrawer";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

const CARDS = [
  { href: "/account/modules/routine", label: "روتین", desc: "تنظیمات مربوط به برنامه‌ها و یادآوری‌های روتین", icon: "weekly" },
  { href: "/account/modules/exercise", label: "بدنسازی", desc: "تنظیمات مربوط به تمرین و برنامه بدنسازی", icon: "exercise" },
  { href: "/account/modules/calorie", label: "کالری", desc: "تنظیمات مربوط به شمارش و ثبت کالری", icon: "food" },
  { href: "/account/modules/trade", label: "ترید", desc: "تنظیمات مربوط به بخش ترید", icon: "trade" },
  { href: "/account/modules/roadmap", label: "یادگیری / Skill", desc: "تنظیمات مربوط به یادگیری و رودمپ", icon: "roadmaps" },
];

export default function ModuleSettingsPage() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => { getDashboardPrefs().then(setPrefs); }, []);

  function toggle(key: keyof DashboardPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveDashboardPrefs(next);
      setCachedDashboardPrefs(next);
      window.dispatchEvent(new Event("dashboard-prefs-updated"));
      return next;
    });
  }

  return (
    <section>
      <h1>تنظیمات بخش‌ها</h1>
      <div className="account-content-hint">تنظیماتِ اختصاصیِ هر بخش از آریون</div>

      <div className="account-row-list">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="account-row">
            <span className="account-row-icon">{ICONS[c.icon]}</span>
            <span className="account-row-body">
              <span className="account-row-label">{c.label}</span>
              <span className="account-row-desc">{c.desc}</span>
            </span>
            <ChevronLeft size={16} className="account-row-chevron" />
          </Link>
        ))}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">نمایشِ کارت‌ها در داشبوردها</div>
        <div className="section-note" style={{ marginBottom: 6 }}>کدوم کارت‌های اختیاری توی داشبوردها نشون داده بشن</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {([
            ["showReminders", "کارتِ «یادآوری‌ها» (داشبوردِ روتین)"],
            ["showFriends", "کارتِ «دوستان»"],
            ["showChart", "نمودارها"],
          ] as [keyof DashboardPrefs, string][]).map(([key, label]) => (
            <div key={key} className="task" style={{ cursor: "pointer", padding: "4px 0" }} onClick={() => toggle(key)}>
              <div className={`check${prefs[key] ? " on" : ""}`}>
                <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="task-name">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
