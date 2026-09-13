"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Dumbbell, BellRing } from "lucide-react";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { getNotifPrefs, saveNotifPrefs, NotifPrefs, DEFAULT_NOTIF_PREFS } from "@/lib/notifPrefs";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountBlock, AccountOption } from "@/components/AccountUI";

// اعلان‌ها — طبقِ درخواستِ صریح دیگر صفحه‌ی جدایی ندارد و بخشی از
// «تنظیمات» است (/account/general).
//
// فقط دسته‌هایی که واقعا سمت سرور (app/api/push/send-reminders) و پنل
// اعلان زنده (NotificationPanel) بهشون رسیدگی می‌شه؛ بقیه‌ی دسته‌ها
// قبلا سوییچ داشتن ولی هیچ‌جا خونده نمی‌شدن — سوییچی که هیچ اثری نداره
// بدتر از نبودنشه، پس حذف شدن.
const ROWS: [keyof NotifPrefs, string, React.ReactNode][] = [
  ["taskReminders", "اعلان‌های روتین", <CalendarCheck2 size={16} key="r" />],
  ["exerciseReminders", "اعلان‌های بدنسازی", <Dumbbell size={16} key="e" />],
];

export function NotificationSettings({ index = 0 }: { index?: number }) {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    getNotifPrefs().then(setPrefs);
  }, []);

  async function enableNotifications() {
    setNotifPermission(await requestNotificationPermission());
  }

  function toggle(key: keyof NotifPrefs, next: boolean) {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: next };
      saveNotifPrefs(updated);
      return updated;
    });
  }

  return (
    <AccountBlock icon={<BellRing size={15} />} title="اعلان‌ها" index={index}>
      {notifPermission !== "granted" && (
        <AccountOption label="اجازه‌ی نوتیفیکیشن مرورگر">
          {notifPermission === "unsupported" ? (
            <div className="item-line empty">مرورگرت از نوتیف پشتیبانی نمی‌کنه.</div>
          ) : notifPermission === "denied" ? (
            <div className="item-line empty">مرورگر مسدودش کرده — از تنظیمات سایتِ مرورگرت بازش کن.</div>
          ) : (
            <>
              <div className="item-line">وقتی برنامه‌ی امروزت (یا تمرینت) به وقتش برسه، یادآوری می‌گیری.</div>
              <button className="account-outline-btn" onClick={enableNotifications} style={{ marginTop: 10 }}>
                فعال‌کردن یادآوری‌ها
              </button>
            </>
          )}
        </AccountOption>
      )}

      <AccountOption label="کدوم دسته‌ها یادآوری بگیرن">
        {ROWS.map(([key, label, icon], i) => (
          <AccountToggleRow key={key} index={i} icon={icon} label={label} checked={prefs[key]} onChange={(v) => toggle(key, v)} />
        ))}
      </AccountOption>
    </AccountBlock>
  );
}
