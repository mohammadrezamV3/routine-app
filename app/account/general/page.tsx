"use client";

import { useEffect, useState } from "react";
import { Globe, Lock, Bell, Users, BarChart3 } from "lucide-react";
import { AccountRowLink, AccountToggleRow } from "@/components/AccountRow";
import { ICONS } from "@/components/NavDrawer";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";

const PREF_ICONS = [<Bell size={16} key="b" />, <Users size={16} key="u" />, <BarChart3 size={16} key="c" />];

const MODULE_CARDS = [
  { href: "/account/modules/routine", label: "روتین", desc: "برنامه‌ها و یادآوری‌های روتین", icon: "weekly" },
  { href: "/account/modules/exercise", label: "بدنسازی", desc: "تمرین و برنامه‌ی بدنسازی", icon: "exercise" },
  { href: "/account/modules/calorie", label: "کالری", desc: "شمارش و ثبت کالری", icon: "food" },
  { href: "/account/modules/trade", label: "ترید", desc: "بازارها، تقویم و آمار ترید", icon: "trade" },
  { href: "/account/modules/roadmap", label: "یادگیری / Skill", desc: "یادگیری و رودمپ", icon: "roadmaps" },
];

const DASHBOARD_PREFS: [keyof DashboardPrefs, string][] = [
  ["showReminders", "کارتِ «یادآوری‌ها»"],
  ["showFriends", "کارتِ «دوستان»"],
  ["showChart", "نمودارها"],
];

// ادغامِ «تنظیماتِ آریون» و «تنظیماتِ بخش‌ها» توی یک صفحه — قبلاً دو زبانه‌ی
// جدا بودن با محتوای مشابه (هر دو یه مشت تنظیمات ساده)؛ حالا فقط با تیترِ
// جداگانه از هم تفکیک می‌شن.
export default function AccountGeneralPage() {
  const [discoverable, setDiscoverable] = useState<boolean | null>(null);
  const [discoverableSaving, setDiscoverableSaving] = useState(false);
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as { discoverable?: boolean } | undefined;
      setDiscoverable(u?.discoverable ?? true);
    });
    getDashboardPrefs().then(setPrefs);
  }, []);

  async function toggleDiscoverable(next: boolean) {
    if (discoverableSaving) return;
    setDiscoverableSaving(true);
    setDiscoverable(next);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoverable: next }),
      });
      if (!res.ok) setDiscoverable(!next);
      else invalidateAccountCache();
    } catch {
      setDiscoverable(!next);
    } finally {
      setDiscoverableSaving(false);
    }
  }

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
      <h1>عمومی</h1>
      <div className="account-content-hint">تنظیماتِ کلیِ آریون و تنظیماتِ اختصاصیِ هر بخش</div>

      <div className="domain-sub">این بخش برای تنظیماتِ کلیِ آریون است</div>
      <div className="account-card" style={{ marginBottom: 6 }}>
        <div className="account-row2">
          <span className="account-row2-icon"><Globe size={17} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">زبان</span>
            <span className="account-row2-desc">فعلاً فقط فارسی — زبان‌های دیگه به‌زودی اضافه می‌شن</span>
          </span>
        </div>
        {discoverable !== null && (
          <AccountToggleRow
            index={1}
            icon={<Lock size={16} />}
            label="قابل‌جست‌وجو بودن با یوزرنیم"
            desc="خاموش‌کردنش یعنی توی جست‌وجوی دوستان دیده نمی‌شی"
            checked={discoverable}
            onChange={toggleDiscoverable}
          />
        )}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">این بخش برای تنظیماتِ اختصاصیِ هر بخش از آریون است</div>
        <div className="account-card" style={{ marginTop: 6 }}>
          {MODULE_CARDS.map((c, i) => (
            <AccountRowLink key={c.href} href={c.href} icon={ICONS[c.icon]} label={c.label} desc={c.desc} index={i} />
          ))}
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">این بخش برای نمایشِ کارت‌ها در داشبوردهاست</div>
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
    </section>
  );
}
