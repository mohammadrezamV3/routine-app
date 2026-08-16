// تنظیماتِ دقیق‌ترِ اطلاعیه‌ها — کاربر می‌تونه هر دسته رو جدا خاموش/روشن
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
  try {
    const res = await fetch("/api/settings/notifPrefs");
    if (!res.ok) return DEFAULT_NOTIF_PREFS;
    const json = await res.json();
    return { ...DEFAULT_NOTIF_PREFS, ...(json.value || {}) };
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await fetch("/api/settings/notifPrefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: prefs }),
  });
}
