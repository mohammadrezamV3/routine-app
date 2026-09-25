// هوکِ عمومیِ ماژولِ نوتیفِ محلی. عمدا از هیچ فیچرِ سنگینی (fitness/trade/
// roadmaps) وارد نمی‌کنه — فقط جدول‌های هسته (@/db) که همیشه توی چانکِ اصلی
// هستن؛ وگرنه خودِ کد-اسپلیتینگِ App.tsx بی‌اثر می‌شد.
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { onLocalWrite } from "@/db/syncHooks";
import { useMoreContext } from "@/features/more/MoreContext";
import { useSync } from "@/sync/SyncProvider";
import { buildAllNotifications } from "./content";
import { reconcileScheduled, cancelAllScheduled } from "./scheduler";
import { getPermissionState, requestNotificationPermission } from "./permission";
import { getCalorieReminderEnabled, setCalorieReminderEnabled, subscribeCalorieReminder } from "./settingsStore";

const RESCHEDULE_DEBOUNCE_MS = 3000;
const RESUME_ONLY_THROTTLE_MS = 60_000; // زیرِ ۱ دقیقه از بازآوریِ قبلی، دوباره لازم نیست

export function useCalorieReminderSetting(): [boolean, (v: boolean) => void] {
  const enabled = useSyncExternalStore(subscribeCalorieReminder, getCalorieReminderEnabled, () => true);
  return [enabled, setCalorieReminderEnabled];
}

/**
 * (Re)scheduleِ کاملِ نوتیف‌های محلی + دیپ‌لینکِ تپ روی نوتیف. باید یک‌بار،
 * داخلِ Router و SyncProvider، مونت بشه (App.tsx → NotificationsBootstrap).
 * روی وب کاملا no-op است (Capacitor.isNativePlatform() فالس).
 */
export function useNotifications(): void {
  const navigate = useNavigate();
  const { notificationsEnabled } = useMoreContext();
  const { isModuleLocked } = useSync();
  const [calorieReminderEnabled] = useCalorieReminderSetting();
  const calorieUnlocked = !isModuleLocked("CALORIE");
  const lastRunRef = useRef(0);

  const reschedule = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!Capacitor.isNativePlatform()) return;
      if (!notificationsEnabled) {
        await cancelAllScheduled();
        return;
      }
      if (!opts.force) {
        const now = Date.now();
        if (now - lastRunRef.current < RESUME_ONLY_THROTTLE_MS) return;
        lastRunRef.current = now;
      } else {
        lastRunRef.current = Date.now();
      }
      const state = await getPermissionState();
      if (state !== "granted") return; // پرامپتِ اجازه فقط با تپِ خودِ کاربر روی سوییچ انجام می‌شه
      const list = await buildAllNotifications({ calorieReminderEnabled: calorieReminderEnabled && calorieUnlocked });
      await reconcileScheduled(list);
    },
    [notificationsEnabled, calorieReminderEnabled, calorieUnlocked]
  );

  // ۱) وقتی سوییچِ اصلی روشن می‌شه: اجازه رو (اگه لازمه) درخواست کن، بعد schedule.
  //    خاموش‌شدن: فقط لغوِ همه، بدونِ تماس با پرامپتِ اجازه.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      if (!notificationsEnabled) {
        await cancelAllScheduled();
        return;
      }
      const state = await getPermissionState();
      if (state !== "granted") {
        const granted = await requestNotificationPermission();
        if (!granted || cancelled) return;
      }
      await reschedule({ force: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsEnabled]);

  // ۲) شروعِ اپ + برگشت به فورگراند (resume) — با throttle، تا هر سوییچ‌کردنِ
  //    سریعِ بین اپ‌ها یک fetch/schedule سنگین اجرا نکنه.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !notificationsEnabled) return;
    void reschedule();
    let handle: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("appStateChange", (state) => {
          if (state.isActive) void reschedule();
        });
        if (cancelled) h.remove();
        else handle = h;
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [notificationsEnabled, reschedule]);

  // ۳) نوشتنِ محلی در جدول‌های هسته (dailyEntries/settings — یعنی
  //    customOccurrences/removedOccurrences/wakeSleepTimes) → بازآوریِ debounced.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !notificationsEnabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = onLocalWrite(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reschedule({ force: true }), RESCHEDULE_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [notificationsEnabled, reschedule]);

  // ۴) دیپ‌لینک: تپ روی نوتیف → مسیرِ ذخیره‌شده در extra.route
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const h = await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
          const route = (action.notification.extra as { route?: string } | undefined)?.route;
          if (route) navigate(route);
        });
        if (cancelled) h.remove();
        else handle = h;
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [navigate]);
}

export { requestNotificationPermission, getPermissionState, notificationsSupported } from "./permission";
