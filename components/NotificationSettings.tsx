"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Dumbbell, BellRing } from "lucide-react";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { getNotifPrefs, saveNotifPrefs, NotifPrefs, DEFAULT_NOTIF_PREFS } from "@/lib/notifPrefs";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountBlock, AccountOption } from "@/components/AccountUI";
import { useSection } from "@/components/SectionProvider";
import type { SectionKey } from "@/lib/sections";
import { tr } from "@/lib/i18n";

// اعلان‌ها — طبق درخواست صریح دیگر صفحه‌ی جدایی ندارد و بخشی از
// «تنظیمات» است (/account/general).
//
// فقط دسته‌هایی که واقعا سمت سرور (lib/pushReminders.ts) و پنل
// اعلان زنده (NotificationPanel) بهشون رسیدگی می‌شه؛ بقیه‌ی دسته‌ها
// قبلا سوییچ داشتن ولی هیچ‌جا خونده نمی‌شدن — سوییچی که هیچ اثری نداره
// بدتر از نبودنشه، پس حذف شدن.
// روی زیردامنه‌ی یک بخش فقط دسته‌ی همون بخش دیده می‌شه (ترید دسته‌ی یادآوری این‌جا نداره)
const rows = (section: SectionKey | null): [keyof NotifPrefs, string, React.ReactNode][] => {
  const all: [keyof NotifPrefs, string, React.ReactNode, SectionKey][] = [
    ["taskReminders", tr("اعلان‌های روتین", "Routine notifications"), <CalendarCheck2 size={16} key="r" />, "routine"],
    ["exerciseReminders", tr("اعلان‌های بدنسازی", "Workout notifications"), <Dumbbell size={16} key="e" />, "workout"],
  ];
  return all.filter((r) => !section || r[3] === section).map(([k, l, i]) => [k, l, i]);
};

export function NotificationSettings({ index = 0 }: { index?: number }) {
  const section = useSection();
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

  const categoryRows = rows(section);

  return (
    <AccountBlock icon={<BellRing size={15} />} title={tr("اعلان‌ها", "Notifications")} index={index}>
      {notifPermission !== "granted" && (
        <AccountOption label={tr("اجازه‌ی نوتیفیکیشن مرورگر", "Browser notification permission")}>
          {notifPermission === "unsupported" ? (
            <div className="item-line empty">{tr("مرورگرت از نوتیف پشتیبانی نمی‌کنه.", "Your browser does not support notifications.")}</div>
          ) : notifPermission === "denied" ? (
            <div className="item-line empty">{tr("مرورگر مسدودش کرده — از تنظیمات سایت مرورگرت بازش کن.", "Your browser has blocked it. Unblock it in your browser site settings.")}</div>
          ) : (
            <>
              <div className="item-line">
                {section === "routine"
                  ? tr("وقتی برنامه‌ی امروزت به وقتش برسه، یادآوری می‌گیری.", "You get a reminder when today's plan is due.")
                  : section === "workout"
                    ? tr("وقتی تمرینت به وقتش برسه، یادآوری می‌گیری.", "You get a reminder when your workout is due.")
                    : section === "trade"
                      ? tr("وقتی خبر مهم یا رویداد ترید برسه، اعلان می‌گیری.", "You get an alert when an important news event or trading update arrives.")
                      : tr("وقتی برنامه‌ی امروزت (یا تمرینت) به وقتش برسه، یادآوری می‌گیری.", "You get a reminder when today's plan (or workout) is due.")}
              </div>
              <button className="btn btn-tonal btn-sm" onClick={enableNotifications} style={{ marginTop: 10 }}>
                {tr("فعال‌کردن یادآوری‌ها", "Enable reminders")}
              </button>
            </>
          )}
        </AccountOption>
      )}

      {categoryRows.length > 0 && (
        <AccountOption label={tr("کدوم دسته‌ها یادآوری بگیرن", "Which categories send reminders")}>
          {categoryRows.map(([key, label, icon], i) => (
            <AccountToggleRow key={key} index={i} icon={icon} label={label} checked={prefs[key]} onChange={(v) => toggle(key, v)} />
          ))}
        </AccountOption>
      )}
    </AccountBlock>
  );
}
