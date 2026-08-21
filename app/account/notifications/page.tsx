"use client";

import { useEffect, useState } from "react";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { getNotifPrefs, saveNotifPrefs, NotifPrefs, DEFAULT_NOTIF_PREFS } from "@/lib/notifPrefs";

const ROWS: [keyof NotifPrefs, string][] = [
  ["arionGeneral", "اعلان‌های آریون"],
  ["taskReminders", "اعلان‌های روتین"],
  ["exerciseReminders", "اعلان‌های بدنسازی"],
  ["calorieReminders", "اعلان‌های کالری"],
  ["tradeReminders", "اعلان‌های ترید"],
  ["roadmapReminders", "اعلان‌های یادگیری / Skill"],
  ["friendRequests", "درخواستِ دوستی"],
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

  function toggle(key: keyof NotifPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotifPrefs(next);
      return next;
    });
  }

  return (
    <section>
      <h1>اعلان‌ها</h1>
      <div className="account-content-hint">مدیریتِ اعلان‌های Arion</div>

      <div className="tm-extra" style={{ marginTop: 0 }}>
        {notifPermission === "unsupported" ? (
          <div className="item-line empty">مرورگرت از نوتیف پشتیبانی نمی‌کنه.</div>
        ) : notifPermission === "granted" ? (
          <div className="item-line">فعاله — وقتی این صفحه بازه، سر وقتِ برنامه یادآوری می‌گیری.</div>
        ) : notifPermission === "denied" ? (
          <div className="item-line empty">مرورگر مسدودش کرده — از تنظیمات سایت توی مرورگرت می‌تونی بازش کنی.</div>
        ) : (
          <>
            <div className="section-note" style={{ marginBottom: 8 }}>
              وقتی برنامه‌ی امروزت (یا تمرینت) به وقتش برسه، یادآوری می‌گیری — فقط تا وقتی این صفحه توی مرورگرت بازه.
            </div>
            <button onClick={enableNotifications} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              فعال‌کردن یادآوری‌ها
            </button>
          </>
        )}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">کدوم دسته‌ها یادآوری بگیرن</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ROWS.map(([key, label]) => (
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
