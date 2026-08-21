"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CalendarCheck2, Dumbbell, Flame, LineChart, Map, UserPlus, BellRing } from "lucide-react";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { getNotifPrefs, saveNotifPrefs, NotifPrefs, DEFAULT_NOTIF_PREFS } from "@/lib/notifPrefs";
import { AccountToggleRow } from "@/components/AccountRow";

const ROWS: [keyof NotifPrefs, string, React.ReactNode][] = [
  ["arionGeneral", "اعلان‌های آریون", <Sparkles size={16} key="a" />],
  ["taskReminders", "اعلان‌های روتین", <CalendarCheck2 size={16} key="r" />],
  ["exerciseReminders", "اعلان‌های بدنسازی", <Dumbbell size={16} key="e" />],
  ["calorieReminders", "اعلان‌های کالری", <Flame size={16} key="c" />],
  ["tradeReminders", "اعلان‌های ترید", <LineChart size={16} key="t" />],
  ["roadmapReminders", "اعلان‌های یادگیری / Skill", <Map size={16} key="m" />],
  ["friendRequests", "درخواستِ دوستی", <UserPlus size={16} key="f" />],
];

export default function NotificationsPage() {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    getNotifPrefs().then(setPrefs);
  }, []);

  async function enableNotifications() {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  }

  function toggle(key: keyof NotifPrefs, next: boolean) {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: next };
      saveNotifPrefs(updated);
      return updated;
    });
  }

  return (
    <section>
      <h1>اعلان‌ها</h1>
      <div className="account-content-hint">مدیریتِ اعلان‌های Arion</div>

      {notifPermission !== "granted" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="account-card"
          style={{ padding: "15px 16px", marginBottom: 16 }}
        >
          {notifPermission === "unsupported" ? (
            <div className="item-line empty">مرورگرت از نوتیف پشتیبانی نمی‌کنه.</div>
          ) : notifPermission === "denied" ? (
            <div className="item-line empty">مرورگر مسدودش کرده — از تنظیمات سایت توی مرورگرت می‌تونی بازش کنی.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span className="account-row2-icon" style={{ width: 34, height: 34 }}><BellRing size={16} /></span>
                <span className="section-note" style={{ margin: 0 }}>
                  وقتی برنامه‌ی امروزت (یا تمرینت) به وقتش برسه، یادآوری می‌گیری.
                </span>
              </div>
              <button onClick={enableNotifications} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                فعال‌کردن یادآوری‌ها
              </button>
            </>
          )}
        </motion.div>
      )}

      <div className="domain-sub" style={{ marginTop: 0 }}>کدوم دسته‌ها یادآوری بگیرن</div>
      <div className="account-card" style={{ marginTop: 6 }}>
        {ROWS.map(([key, label, icon], i) => (
          <AccountToggleRow key={key} index={i} icon={icon} label={label} checked={prefs[key]} onChange={(v) => toggle(key, v)} />
        ))}
      </div>
    </section>
  );
}
