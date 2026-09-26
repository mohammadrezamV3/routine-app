// یادآوری‌های محلی (Capacitor LocalNotifications) — روشن/خاموش از همون
// تنظیمِ وبِ notifPrefs (lib/notifPrefs.ts)، فقط برای کاربرِ واردشده (مثلِ
// NotificationEngine/پوشِ وب که بدونِ نشست هیچ یادآوری‌ای نمی‌فرسته).
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getNotifPrefs } from "@/lib/notifPrefs";
import { useNotifications } from "@m/notifications";

export function NotificationsBootstrap() {
  const { status } = useSession();
  const [prefsOn, setPrefsOn] = useState(false);
  useEffect(() => {
    if (status !== "authenticated") {
      setPrefsOn(false);
      return;
    }
    let cancelled = false;
    getNotifPrefs()
      .then((p) => {
        if (!cancelled) setPrefsOn(p.taskReminders || p.exerciseReminders);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status]);
  useNotifications({ notificationsEnabled: status === "authenticated" && prefsOn });
  return null;
}
