// تنظیماتِ دقیق‌ترِ اطلاعیه‌ها — کاربر می‌تونه هر دسته رو جدا خاموش/روشن
import { getSetting, setSetting } from "./storage";
import { SETTING_KEYS } from "./userSettingKeys";
// کنه، نه فقط یک سوییچِ کلیِ «اجازه‌ی نوتیف مرورگر». روی همون UserSetting
// عمومیِ کلید/مقدار ذخیره می‌شه، کلیدش "notifPrefs".

export type NotifPrefs = {
  taskReminders: boolean;
  exerciseReminders: boolean;
  friendRequests: boolean;
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  taskReminders: true,
  exerciseReminders: true,
  friendRequests: true,
};

export async function getNotifPrefs(): Promise<NotifPrefs> {
  // از getSetting رد می‌شه نه fetchِ خام — این‌طوری هم از کش/دیدوپِ مشترک
  // استفاده می‌کنه، هم مقدارش رو از پاسخِ /api/bootstrap برمی‌داره (این کلید
  // اون‌جا هست) به‌جای یه رفت‌وبرگشتِ جدا. برای مهمون هم مثلِ بقیه‌ی تنظیمات
  // خودکار می‌ره سراغِ localStorage.
  const value = await getSetting<Partial<NotifPrefs> | null>(SETTING_KEYS.notifPrefs, null);
  return { ...DEFAULT_NOTIF_PREFS, ...(value || {}) };
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await fetch("/api/settings/notifPrefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: prefs }),
  });
}
